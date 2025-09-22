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
    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Get sites with aggregated data
    const { data: sitesData, error: sitesError, count } = await supabase
      .from('sites')
      .select(`
        *,
        environments:environments(count),
        sensors:sensors(count),
        alerts:alerts!inner(count, level, status)
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id!)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (sitesError) {
      const response = NextResponse.json({
        error: {
          code: 'SITES_FETCH_FAILED',
          message: 'Failed to fetch sites',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Process sites data with health status
    const sites = sitesData?.map(site => {
      const environmentCount = (site.environments as any[])?.length || 0
      const sensorCount = (site.sensors as any[])?.length || 0
      const alerts = (site.alerts as any[]) || []
      
      const activeAlerts = alerts.filter(alert => 
        alert.status === 'open' || alert.status === 'acknowledged'
      ).length
      
      const criticalAlerts = alerts.filter(alert => 
        alert.level === 'critical' && (alert.status === 'open' || alert.status === 'acknowledged')
      ).length

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (criticalAlerts > 0) {
        healthStatus = 'critical'
      } else if (activeAlerts > 0) {
        healthStatus = 'warning'
      }

      return {
        id: site.id,
        tenant_id: site.tenant_id,
        site_name: site.site_name,
        site_code: site.site_code,
        location: site.location,
        timezone: site.timezone,
        created_at: site.created_at,
        updated_at: site.updated_at,
        environment_count: environmentCount,
        sensor_count: sensorCount,
        active_alerts: activeAlerts,
        health_status: healthStatus
      }
    }) || []

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
