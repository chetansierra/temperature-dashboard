import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { ChartQueryRequestSchema, ChartQueryResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply chart-specific rate limiting
    const rateLimitResult = await rateLimiters.chartQuery(request)
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

    // Parse and validate request body
    const body = await request.json()
    console.debug('Chart query - raw request body:', body)

    const validationResult = ChartQueryRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      const response = NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chart query request',
          requestId: crypto.randomUUID(),
          details: validationResult.error.issues
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { sensor_ids, start_time, end_time, aggregation = 'raw', metrics = ['avg'] } = validationResult.data
    console.debug('Chart query - validated request:', {
      sensor_ids,
      start_time,
      end_time,
      aggregation,
      metrics
    })
    const supabase = await createServerSupabaseClient()

    // Validate time range (max 30 days for raw data)
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 30 && aggregation === 'raw') {
      const response = NextResponse.json({
        error: {
          code: 'TIME_RANGE_TOO_LARGE',
          message: 'Raw data queries are limited to 30 days. Use hourly or daily aggregation for longer periods.',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Verify user has access to all requested sensors
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select(`
        id,
        name,
        sites!inner(name),
        environments!inner(name)
      `)
      .in('id', sensor_ids)

    if (sensorsError || !sensors || sensors.length !== sensor_ids.length) {
      console.error('Chart query - sensor lookup failed:', { sensorsError, sensorsLength: sensors?.length, requested: sensor_ids.length })
      const response = NextResponse.json({
        error: {
          code: 'SENSORS_NOT_FOUND',
          message: 'One or more sensors not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Determine which table/view to query based on aggregation
    let tableName: string
    let timeColumn: string
    let selectColumns: string

    switch (aggregation) {
      case 'hourly':
        tableName = 'readings_hourly'
        timeColumn = 'hour_bucket'
        selectColumns = 'sensor_id, ts:hour_bucket, value:avg_temp, min_value:min_temp, max_value:max_temp, reading_count'
        break
      case 'daily':
        tableName = 'readings_daily'
        timeColumn = 'day_bucket'
        selectColumns = 'sensor_id, ts:day_bucket, value:avg_temp, min_value:min_temp, max_value:max_temp, reading_count'
        break
      default: // raw
        tableName = 'readings'
        timeColumn = 'ts'
        selectColumns = 'sensor_id, ts, value:temperature_c'
        break
    }

    // Query readings data
    const { data: readingsData, error: readingsError } = await supabaseAdmin
      .from(tableName)
      .select(selectColumns)
      .in('sensor_id', sensor_ids)
      .gte(timeColumn, start_time)
      .lte(timeColumn, end_time)
      .order(timeColumn, { ascending: true })
      .limit(5000) // Enforce max 5000 points

    if (readingsError) {
      console.error('Chart query - readings fetch failed:', readingsError)
      const response = NextResponse.json({
        error: {
          code: 'READINGS_FETCH_FAILED',
          message: 'Failed to fetch readings data',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    console.debug('Chart query - raw readings sample:', readingsData?.slice(0, 3))

    // Group readings by sensor
    const sensorReadings = new Map<string, any[]>()
    sensor_ids.forEach(sensorId => {
      sensorReadings.set(sensorId, [])
    })

    const normaliseTimestamp = (value: string) => {
      try {
        return new Date(value).toISOString()
      } catch (err) {
        console.warn('Chart query - failed to normalise timestamp, using original value', value)
        return value
      }
    }

    readingsData?.forEach((reading: any) => {
      const sensorData = sensorReadings.get(reading.sensor_id)
      if (sensorData) {
        const readingData: any = {
          timestamp: normaliseTimestamp(reading.ts),
          value: reading.value
        }

        // Add aggregated values if available
        if (aggregation !== 'raw') {
          if (reading.value !== undefined) readingData.avg_value = reading.value
          if (reading.min_value !== undefined) readingData.min_value = reading.min_value
          if (reading.max_value !== undefined) readingData.max_value = reading.max_value
        }

        sensorData.push(readingData)
      }
    })

    // Build response data
    const data = sensors.map(sensor => ({
      sensor_id: sensor.id,
      sensor_name: sensor.name || `Sensor ${sensor.id.slice(-8)}`,
      readings: sensorReadings.get(sensor.id) || []
    }))

    console.debug('Chart query - response payload preview:', {
      sensors: data.map(item => ({
        sensor_id: item.sensor_id,
        sensor_name: item.sensor_name,
        readings_count: item.readings.length
      })),
      metadata: {
        total_points: readingsData?.length || 0,
        aggregation,
        start_time,
        end_time
      }
    })

    // Check if data was downsampled
    const totalPoints = readingsData?.length || 0
    const wasDownsampled = totalPoints >= 5000

    const responseData = {
      data,
      metadata: {
        total_points: totalPoints,
        aggregation_used: aggregation,
        downsampled: wasDownsampled,
        time_range: {
          start: start_time,
          end: end_time
        }
      }
    }

    // Validate response against schema
    const validatedResponse = ChartQueryResponseSchema.safeParse(responseData)

    if (!validatedResponse.success) {
      console.error('Chart query - response validation failed:', validatedResponse.error.flatten())
      const response = NextResponse.json({
        error: {
          code: 'RESPONSE_VALIDATION_FAILED',
          message: 'Chart response failed validation',
          details: validatedResponse.error.issues,
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json(validatedResponse.data)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Chart query endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'CHART_QUERY_FAILED',
        message: 'Failed to execute chart query',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
