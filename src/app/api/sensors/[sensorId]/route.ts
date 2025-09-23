import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { sensorId: string } }
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

    // Use service role client for bypassed authentication
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext
    const { sensorId } = params

    // Get sensor with environment and site details
    const { data: sensor, error } = await supabase
      .from('sensors')
      .select(`
        id,
        sensor_id_local,
        property_measured,
        installation_date,
        location_details,
        status,
        created_at,
        environments (
          name,
          environment_type
        ),
        sites (
          site_name,
          site_code,
          location,
          timezone
        )
      `)
      .eq('id', sensorId)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (error || !sensor) {
      const response = NextResponse.json({
        error: {
          code: 'SENSOR_NOT_FOUND',
          message: 'Sensor not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check permissions - verify user can access the site that contains this sensor
    // We need to get the site_id from the sensor's environment
    const { data: envData, error: envError } = await supabase
      .from('sensors')
      .select('site_id')
      .eq('id', sensorId)
      .single()

    if (!envError && envData && !canAccessSite(profile, envData.site_id)) {
      const response = NextResponse.json(createAuthError('Access denied to this sensor'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get latest reading for the sensor (optional)
    const { data: latestReading } = await supabase
      .from('readings')
      .select('value, ts')
      .eq('sensor_id', sensorId)
      .order('ts', { ascending: false })
      .limit(1)
      .single()

    const sensorWithReading = {
      ...sensor,
      latest_reading: latestReading ? {
        value: latestReading.value,
        timestamp: latestReading.ts
      } : undefined
    }

    const response = NextResponse.json({ sensor: sensorWithReading })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sensor detail GET endpoint error:', error)

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
