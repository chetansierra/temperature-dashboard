import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SiteDetailResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
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

    const { profile } = authContext
    const { siteId } = await params

    // Check if user can access this site
    if (!canAccessSite(profile, siteId)) {
      const response = NextResponse.json(createAuthError('Access denied to this site'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const supabase = await createServerSupabaseClient()

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      const response = NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get environments for this site
    const { data: environmentsData, error: environmentsError } = await supabase
      .from('environments')
      .select(`
        id,
        name,
        environment_type,
        description,
        created_at,
        sensors:sensors(count),
        alerts:alerts(count, level, status),
        readings:readings(value)
      `)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (environmentsError) {
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENTS_FETCH_FAILED',
          message: 'Failed to fetch environments',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Process environments data
    const environments = environmentsData?.map(env => {
      const sensors = (env.sensors as any[]) || []
      const alerts = (env.alerts as any[]) || []
      const readings = (env.readings as any[]) || []
      
      const activeAlerts = alerts.filter(alert => 
        alert.status === 'open' || alert.status === 'acknowledged'
      ).length

      // Calculate average temperature from recent readings
      const avgTemperature = readings.length > 0 
        ? readings.reduce((sum, reading) => sum + reading.value, 0) / readings.length
        : null

      return {
        id: env.id,
        name: env.name,
        environment_type: env.environment_type,
        description: env.description,
        sensor_count: sensors.length,
        active_alerts: activeAlerts,
        avg_temperature: avgTemperature,
        created_at: env.created_at
      }
    }) || []

    // Get recent alerts for this site
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        id,
        level,
        status,
        message,
        opened_at,
        environments!inner(name),
        sensors(sensor_id_local)
      `)
      .eq('site_id', siteId)
      .in('status', ['open', 'acknowledged'])
      .order('opened_at', { ascending: false })
      .limit(20)

    const alerts = alertsData?.map(alert => ({
      id: alert.id,
      level: alert.level,
      status: alert.status,
      message: alert.message,
      environment_name: (alert.environments as any).name,
      sensor_name: (alert.sensors as any)?.sensor_id_local || null,
      opened_at: alert.opened_at
    })) || []

    const responseData = {
      site,
      environments,
      alerts
    }

    // Validate response against schema
    const validatedResponse = SiteDetailResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Site detail endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'SITE_DETAIL_FAILED',
        message: 'Failed to fetch site details',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
