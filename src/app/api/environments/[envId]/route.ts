import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EnvironmentDetailResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string }> }
) {
  const { envId } = await params
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
    const supabase = await createServerSupabaseClient()

    // Get environment details
    const { data: environment, error: envError } = await supabase
      .from('environments')
      .select(`
        *,
        sites!inner(site_name, site_code, location)
      `)
      .eq('id', envId)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (envError || !environment) {
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENT_NOT_FOUND',
          message: 'Environment not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get sensors for this environment
    const { data: sensorsData, error: sensorsError } = await supabase
      .from('sensors')
      .select(`
        id,
        sensor_id_local,
        sensor_type,
        status,
        location_description,
        created_at,
        readings!readings_sensor_id_fkey(value, ts)
      `)
      .eq('environment_id', envId)
      .order('created_at', { ascending: false })

    if (sensorsError) {
      const response = NextResponse.json({
        error: {
          code: 'SENSORS_FETCH_FAILED',
          message: 'Failed to fetch sensors',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Process sensors data with latest readings
    const sensors = sensorsData?.map(sensor => {
      const readings = (sensor.readings as any[]) || []
      const latestReading = readings.length > 0 ? readings[0] : null

      return {
        id: sensor.id,
        sensor_id_local: sensor.sensor_id_local,
        sensor_type: sensor.sensor_type,
        status: sensor.status,
        location_description: sensor.location_description,
        current_value: latestReading?.value || null,
        last_reading_at: latestReading?.ts || null,
        created_at: sensor.created_at
      }
    }) || []

    // Get recent alerts for this environment
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        id,
        level,
        status,
        message,
        opened_at,
        sensors(sensor_id_local)
      `)
      .eq('environment_id', envId)
      .in('status', ['open', 'acknowledged'])
      .order('opened_at', { ascending: false })
      .limit(10)

    const alerts = alertsData?.map(alert => ({
      id: alert.id,
      level: alert.level,
      status: alert.status,
      message: alert.message,
      sensor_name: (alert.sensors as any)?.sensor_id_local || null,
      opened_at: alert.opened_at
    })) || []

    // Get temperature statistics for the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: statsData, error: statsError } = await supabase
      .from('readings')
      .select('value')
      .in('sensor_id', sensors.map(s => s.id))
      .gte('ts', twentyFourHoursAgo)

    let temperatureStats = null
    if (!statsError && statsData && statsData.length > 0) {
      const values = statsData.map(r => r.value)
      temperatureStats = {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        reading_count: values.length
      }
    }

    const responseData = {
      environment: {
        ...environment,
        site: environment.sites
      },
      sensors,
      alerts,
      temperature_stats: temperatureStats
    }

    // Validate response against schema
    const validatedResponse = EnvironmentDetailResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Environment detail endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'ENVIRONMENT_DETAIL_FAILED',
        message: 'Failed to fetch environment details',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
