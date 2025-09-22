import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SensorDetailResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sensorId: string }> }
) {
  const { sensorId } = await params
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

    // Get sensor details with related data
    const { data: sensor, error: sensorError } = await supabase
      .from('sensors')
      .select(`
        *,
        sites!inner(site_name, site_code, location),
        environments!inner(name, environment_type),
        thresholds(*)
      `)
      .eq('id', sensorId)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (sensorError || !sensor) {
      const response = NextResponse.json({
        error: {
          code: 'SENSOR_NOT_FOUND',
          message: 'Sensor not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get recent readings (last 100)
    const { data: recentReadings, error: readingsError } = await supabase
      .from('readings')
      .select('ts, value')
      .eq('sensor_id', sensorId)
      .order('ts', { ascending: false })
      .limit(100)

    if (readingsError) {
      const response = NextResponse.json({
        error: {
          code: 'READINGS_FETCH_FAILED',
          message: 'Failed to fetch sensor readings',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get alerts for this sensor
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        id,
        level,
        status,
        message,
        opened_at,
        acknowledged_at,
        resolved_at
      `)
      .eq('sensor_id', sensorId)
      .order('opened_at', { ascending: false })
      .limit(20)

    const alerts = alertsData || []

    // Calculate statistics from recent readings
    let statistics = null
    if (recentReadings && recentReadings.length > 0) {
      const values = recentReadings.map(r => r.value)
      const sortedValues = [...values].sort((a, b) => a - b)
      
      statistics = {
        current_value: values[0], // Most recent reading
        avg_value: values.reduce((sum, val) => sum + val, 0) / values.length,
        min_value: Math.min(...values),
        max_value: Math.max(...values),
        median_value: sortedValues[Math.floor(sortedValues.length / 2)],
        reading_count: values.length,
        last_reading_at: recentReadings[0].ts
      }
    }

    // Get hourly aggregated data for the last 24 hours for trend analysis
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('readings_hourly')
      .select('bucket, avg_value, min_value, max_value')
      .eq('sensor_id', sensorId)
      .gte('bucket', twentyFourHoursAgo)
      .order('bucket', { ascending: true })

    const trendData = hourlyData?.map(reading => ({
      timestamp: reading.bucket,
      avg_value: reading.avg_value,
      min_value: reading.min_value,
      max_value: reading.max_value
    })) || []

    const responseData = {
      sensor: {
        ...sensor,
        site: sensor.sites,
        environment: sensor.environments,
        thresholds: sensor.thresholds || []
      },
      statistics,
      recent_readings: recentReadings || [],
      trend_data: trendData,
      alerts
    }

    // Validate response against schema
    const validatedResponse = SensorDetailResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sensor detail endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'SENSOR_DETAIL_FAILED',
        message: 'Failed to fetch sensor details',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
