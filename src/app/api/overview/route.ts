import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
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

    // Use service role client for bypassed authentication (bypasses RLS)
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Mock profile for bypassed authentication
    const profile = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'master'
    }

    // Get counts
    const [sitesResult, sensorsResult, alertsResult] = await Promise.all([
      supabase.from('sites').select('id', { count: 'exact' }),
      supabase.from('sensors').select('id', { count: 'exact' }),
      supabase.from('alerts').select('id', { count: 'exact' })
    ])

    // Get recent alerts (last 5)
    const { data: recentAlerts } = await supabase
      .from('alerts')
      .select(`
        id,
        message,
        level,
        status,
        opened_at,
        site:sites!site_id (
          name
        ),
        environment:environments!environment_id (
          name
        )
      `)
      .order('opened_at', { ascending: false })
      .limit(5)

    // Get sensor health (current readings for last 5 sensors)
    const { data: sensors } = await supabase
      .from('sensors')
      .select(`
        id,
        name,
        site:sites!inner(name),
        environment:environments!inner(name)
      `)
      .limit(5)

    // Get current readings for these sensors
    const sensorIds = sensors?.map(s => s.id) || []
    const { data: currentReadings } = sensorIds.length > 0 ? await supabase
      .from('readings')
      .select('sensor_id, temperature_c, ts')
      .in('sensor_id', sensorIds)
      .order('ts', { ascending: false })
      .limit(sensorIds.length) : { data: [] }

    // Group readings by sensor
    const readingsBySensor = new Map()
    currentReadings?.forEach(reading => {
      if (!readingsBySensor.has(reading.sensor_id)) {
        readingsBySensor.set(reading.sensor_id, reading)
      }
    })

    // Build sensor health data
    const sensorHealth = sensors?.map(sensor => {
      const latestReading = readingsBySensor.get(sensor.id)
      return {
        sensor_id: sensor.id,
        sensor_name: sensor.name || `Sensor ${sensor.id.slice(-8)}`,
        site_name: sensor.site?.[0]?.name || 'Unknown Site',
        environment_name: sensor.environment?.[0]?.name || 'Unknown Environment',
        current_value: latestReading?.temperature_c || null,
        last_reading: latestReading?.ts || null,
        status: latestReading ? 'active' : 'inactive'
      }
    }) || []

    // Count critical alerts
    const { count: criticalAlertsCount } = await supabase
      .from('alerts')
      .select('id', { count: 'exact' })
      .eq('level', 'high')

    const overviewData = {
      tenant: {
        id: profile.tenant_id || 'default',
        name: 'Acme Foods Ltd.'
      },
      stats: {
        total_sites: sitesResult.count || 0,
        total_sensors: sensorsResult.count || 0,
        active_alerts: alertsResult.count || 0,
        critical_alerts: criticalAlertsCount || 0
      },
      recent_alerts: recentAlerts?.map(alert => ({
        id: alert.id,
        message: alert.message || 'Temperature alert',
        level: alert.level || 'medium',
        status: alert.status || 'open',
        opened_at: alert.opened_at,
        site_name: alert.site?.[0]?.name || 'Unknown Site',
        environment_name: alert.environment?.[0]?.name || 'Unknown Environment'
      })) || [],
      sensor_health: sensorHealth
    }

    const response = NextResponse.json(overviewData, { status: 200 })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Overview API error:', error)
    const errorResponse = {
      error: {
        code: 'OVERVIEW_FAILED',
        message: 'Failed to fetch overview data',
        requestId: crypto.randomUUID()
      }
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}