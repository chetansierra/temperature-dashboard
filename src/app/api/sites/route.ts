import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SitesResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get authenticated user context
    const authContext = await getAuthContext(request)
    if (!authContext) {
      const response = NextResponse.json(createAuthError('Authentication required'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const supabase = await createServerSupabaseClient()
    
    // Set the user context for RLS (critical for policies to work)
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }
    
    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Get sites with aggregated data - simplified query first
    console.log('Fetching sites for tenant:', profile.tenant_id)
    const { data: sitesData, error: sitesError, count } = await supabase
      .from('sites')
      .select('*', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id!)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    console.log('Sites query result:', { sitesData, sitesError, count })

    if (sitesError) {
      console.error('Sites query error details:', sitesError)
      const response = NextResponse.json({
        error: {
          code: 'SITES_FETCH_FAILED',
          message: 'Failed to fetch sites',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get counts for each site
    const siteIds = sitesData?.map(site => site.id) || []

    // Get environment counts per site
    const { data: envCounts } = siteIds.length > 0 ? await supabase
      .from('environments')
      .select('site_id')
      .in('site_id', siteIds) : { data: [] }

    const envCountMap = new Map()
    envCounts?.forEach(env => {
      envCountMap.set(env.site_id, (envCountMap.get(env.site_id) || 0) + 1)
    })

    // Get sensor counts per site
    const { data: sensorCounts } = siteIds.length > 0 ? await supabase
      .from('sensors')
      .select('site_id')
      .in('site_id', siteIds) : { data: [] }

    const sensorCountMap = new Map()
    sensorCounts?.forEach(sensor => {
      sensorCountMap.set(sensor.site_id, (sensorCountMap.get(sensor.site_id) || 0) + 1)
    })

    // Get active alerts counts per site
    const { data: alertCounts } = siteIds.length > 0 ? await supabase
      .from('alerts')
      .select('site_id')
      .in('site_id', siteIds)
      .eq('status', 'open') : { data: [] }

    const alertCountMap = new Map()
    alertCounts?.forEach(alert => {
      alertCountMap.set(alert.site_id, (alertCountMap.get(alert.site_id) || 0) + 1)
    })

    // Process sites data to match schema
    const sites = (sitesData || []).map((site: any) => {
      const envCount = envCountMap.get(site.id) || 0
      const sensorCount = sensorCountMap.get(site.id) || 0
      const activeAlerts = alertCountMap.get(site.id) || 0

      // Determine health status based on alerts
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (activeAlerts > 5) {
        healthStatus = 'critical'
      } else if (activeAlerts > 0) {
        healthStatus = 'warning'
      }

      const processedSite = {
        id: site.id,
        tenant_id: site.tenant_id,
        site_name: site.name, // Map 'name' field to 'site_name'
        site_code: site.site_code || `SITE-${site.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}`, // Generate from name if missing
        location: site.location,
        timezone: site.timezone,
        created_at: new Date(site.created_at).toISOString(), // Convert to ISO format with Z
        updated_at: new Date(site.updated_at).toISOString(), // Convert to ISO format with Z
        environment_count: envCount,
        sensor_count: sensorCount,
        active_alerts: activeAlerts,
        health_status: healthStatus
      }

      console.log(`Processed site ${site.name}:`, {
        envCount,
        sensorCount,
        activeAlerts,
        healthStatus
      })

      return processedSite
    })

    console.log('Final sites response:', sites)

    const responseData = {
      sites,
      pagination: {
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit
      }
    }

    // Validate response against schema
    const validatedResponse = SitesResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sites endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'SITES_FAILED',
        message: 'Failed to fetch sites data',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
