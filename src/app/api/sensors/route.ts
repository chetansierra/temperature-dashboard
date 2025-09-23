import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'
import { z } from 'zod'

const CreateSensorSchema = z.object({
  environment_id: z.string().uuid(),
  sensor_id_local: z.string().max(50).optional(),
  property_measured: z.string().min(1).max(50),
  installation_date: z.string().optional(),
  location_details: z.string().max(200).optional()
})

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

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const environmentId = url.searchParams.get('environment_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200) // Default 50, max 200

    // Get sensors with joined data using a manual approach
    const { data: rawSensors, error } = await supabase
      .from('sensors')
      .select(`
        id,
        sensor_id_local,
        property_measured,
        installation_date,
        location_details,
        status,
        created_at,
        environment_id,
        site_id
      `)
      .eq('tenant_id', profile.tenant_id!)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Sensors query error:', error)
      const response = NextResponse.json({
        error: {
          code: 'SENSORS_FETCH_FAILED',
          message: 'Failed to fetch sensors',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get environment and site data separately
    const sensorIds = rawSensors?.map(s => s.id) || []
    let sensorsWithDetails: any[] = []

    if (rawSensors && rawSensors.length > 0) {
      // Get environments
      const { data: environments } = await supabase
        .from('environments')
        .select('id, name, environment_type')
        .in('id', rawSensors.map(s => s.environment_id))

      // Get sites
      const { data: sites } = await supabase
        .from('sites')
        .select('id, site_name, site_code, location')
        .in('id', rawSensors.map(s => s.site_id))

      // Combine the data
      const envMap = new Map(environments?.map(e => [e.id, e]) || [])
      const siteMap = new Map(sites?.map(s => [s.id, s]) || [])

      sensorsWithDetails = rawSensors.map(sensor => ({
        id: sensor.id,
        sensor_id_local: sensor.sensor_id_local,
        property_measured: sensor.property_measured,
        installation_date: sensor.installation_date,
        location_details: sensor.location_details,
        status: sensor.status,
        created_at: sensor.created_at,
        environment_id: sensor.environment_id,
        site_id: sensor.site_id,
        // Add computed fields for frontend compatibility
        name: sensor.sensor_id_local || `Sensor ${sensor.id.slice(-8)}`,
        sensor_type: sensor.property_measured,
        unit: sensor.property_measured === 'temperature_c' ? '°C' : '',
        is_active: sensor.status === 'active',
        site_name: siteMap.get(sensor.site_id)?.site_name || 'Unknown Site',
        environment_name: envMap.get(sensor.environment_id)?.name || 'Unknown Environment',
        current_temperature: null, // Will be populated from readings if needed
        battery_level: null,
        signal_strength: null,
        last_reading_at: null,
        alert_count: 0,
        readings_count_24h: 0
      }))
    }

    const response = NextResponse.json({ sensors: sensorsWithDetails })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sensors GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'SENSORS_FAILED',
        message: 'Failed to fetch sensors data',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.post(request)
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

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateSensorSchema.parse(body)

    // Get environment details to verify access and get site information
    const { data: environment, error: envError } = await supabase
      .from('environments')
      .select(`
        id,
        site_id,
        tenant_id,
        name,
        sites (
          site_name,
          site_code
        )
      `)
      .eq('id', validatedData.environment_id)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (envError || !environment) {
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENT_NOT_FOUND',
          message: 'Environment not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check permissions - verify user can access the site that contains this environment
    if (!canAccessSite(profile, environment.site_id)) {
      const response = NextResponse.json(createAuthError('Access denied to this environment'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check for duplicate sensor_id_local in the same environment (if provided)
    if (validatedData.sensor_id_local) {
      const { data: existingSensor } = await supabase
        .from('sensors')
        .select('id')
        .eq('environment_id', validatedData.environment_id)
        .eq('sensor_id_local', validatedData.sensor_id_local)
        .single()

      if (existingSensor) {
        const response = NextResponse.json({
          error: {
            code: 'SENSOR_ID_EXISTS',
            message: 'A sensor with this local ID already exists in this environment',
            requestId: crypto.randomUUID()
          }
        }, { status: 409 })
        return addRateLimitHeaders(response, rateLimitResult)
      }
    }

    // Generate a unique global sensor ID
    const sensorId = crypto.randomUUID()

    // Create the sensor
    const sensorData = {
      id: sensorId,
      tenant_id: profile.tenant_id!,
      site_id: environment.site_id,
      environment_id: validatedData.environment_id,
      sensor_id_local: validatedData.sensor_id_local || null,
      property_measured: validatedData.property_measured,
      installation_date: validatedData.installation_date ? new Date(validatedData.installation_date).toISOString().split('T')[0] : null,
      location_details: validatedData.location_details || null,
      status: 'active' as const
    }

    const { data: sensor, error: createError } = await supabase
      .from('sensors')
      .insert(sensorData)
      .select(`
        id,
        sensor_id_local,
        property_measured,
        installation_date,
        location_details,
        status,
        created_at,
        environments (
          name
        )
      `)
      .single()

    if (createError) {
      console.error('Sensor creation error:', createError)
      const response = NextResponse.json({
        error: {
          code: 'SENSOR_CREATE_FAILED',
          message: 'Failed to create sensor',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({
      success: true,
      sensor: {
        id: sensor.id,
        sensor_id_local: sensor.sensor_id_local,
        property_measured: sensor.property_measured,
        installation_date: sensor.installation_date,
        location_details: sensor.location_details,
        status: sensor.status,
        created_at: sensor.created_at,
        environment: sensor.environments,
        site: environment.sites
      }
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sensors POST endpoint error:', error)

    let statusCode = 500
    let errorMessage = 'Failed to create sensor'

    if (error instanceof z.ZodError) {
      statusCode = 400
      errorMessage = 'Invalid sensor data'
    }

    const errorResponse = {
      error: {
        code: 'SENSOR_CREATION_FAILED',
        message: errorMessage,
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

export const dynamic = 'force-dynamic'