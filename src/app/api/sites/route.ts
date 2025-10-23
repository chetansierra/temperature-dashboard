import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SitesResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError, getOrganizationSiteFilter } from '@/utils/auth'
import { createStandardError, ErrorCodes } from '@/utils/errors'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get authentication context
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      const response = NextResponse.json(createAuthError('Authentication required'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )
    } else {
      // Use the standard server client for cookie-based auth
      supabase = await createServerSupabaseClient()
    }
    
    const profile = authContext.profile

    // Check if user has organization membership (except for admins)
    if (profile.role !== 'admin' && !profile.tenant_id) {
      const response = NextResponse.json(
        createStandardError('NO_ORGANIZATION_MEMBERSHIP'),
        { status: 403 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Apply organization-based filtering using new auth utilities
    const filter = getOrganizationSiteFilter(profile)
    
    let query = supabase
      .from('sites')
      .select(`
        id,
        name,
        location,
        description,
        status,
        created_at,
        updated_at,
        tenant_id,
        tenant:tenants!sites_tenant_id_fkey(
          id,
          name
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply organization filter for non-admin users
    if (filter) {
      query = query.eq('tenant_id', filter.tenant_id)
    }

    console.log('Fetching sites for tenant:', profile.tenant_id)
    const { data: sitesData, error: sitesError, count } = await query

    console.log('Sites query result:', { sitesData, sitesError, count })

    if (sitesError) {
      console.error('Sites query error details:', sitesError)
      const response = NextResponse.json(
        createStandardError('FETCH_FAILED', 'Failed to fetch sites data', { error: sitesError.message }),
        { status: 500 }
      )
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

    // Process sites data for organization users
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
        tenant_name: site.tenant?.name || 'Unknown Organization',
        site_name: site.name, // Map 'name' field to 'site_name'
        site_code: `SITE-${site.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}`, // Generate site code
        location: site.location,
        timezone: 'UTC', // Default timezone since column doesn't exist
        created_at: new Date(site.created_at).toISOString(),
        updated_at: new Date(site.updated_at).toISOString(),
        environment_count: envCount,
        sensor_count: sensorCount,
        active_alerts: activeAlerts,
        health_status: healthStatus,
        status: site.status || 'active',
        description: site.description
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

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get authentication context
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      const response = NextResponse.json(createAuthError('Authentication required'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )
    } else {
      // Use the standard server client for cookie-based auth
      supabase = await createServerSupabaseClient()
    }
    const profile = authContext.profile

    // Parse request body
    const body = await request.json()
    const { name, location, timezone = 'UTC' } = body

    if (!name || !location) {
      const response = NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and location are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Generate site code
    const siteCode = `SITE-${name.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}`

    // Create site
    const { data: newSite, error: createError } = await supabase
      .from('sites')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        location
      })
      .select()
      .single()

    if (createError) {
      console.error('Site creation error:', createError)
      const response = NextResponse.json({
        error: {
          code: 'SITE_CREATION_FAILED',
          message: 'Failed to create site',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({
      site: {
        id: newSite.id,
        tenant_id: newSite.tenant_id,
        site_name: newSite.name,
        site_code: siteCode,
        location: newSite.location,
        timezone: timezone,
        created_at: new Date(newSite.created_at).toISOString(),
        updated_at: new Date(newSite.updated_at).toISOString(),
        environment_count: 0,
        sensor_count: 0,
        active_alerts: 0,
        health_status: 'healthy'
      }
    }, { status: 201 })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Site creation endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'SITE_CREATION_FAILED',
        message: 'Failed to create site',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
