import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(request: NextRequest) {
  // Apply rate limiting (moved outside try for catch block access)
  let rateLimitResult
  try {
    rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const supabase = await createServerSupabaseClient()
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      const response = NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get user profile to check tenant access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      const response = NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' } },
        { status: 404 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Build the query based on user role and tenant access
    let sensorsQuery = supabase
      .from('sensors')
      .select(`
        id,
        name,
        sensor_type,
        unit,
        location_details,
        is_active,
        last_reading_at,
        site_id,
        environment_id,
        tenant_id,
        created_at,
        sites!inner(
          id,
          name,
          location
        ),
        environments!inner(
          id,
          name,
          description
        )
      `)

    // Apply tenant/role-based filtering
    if (profile.role === 'admin') {
      // Admin can see all sensors
    } else if (profile.role === 'auditor') {
      // Auditor can see sensors in their assigned tenant
      if (profile.auditor_expires_at && new Date(profile.auditor_expires_at) <= new Date()) {
        const response = NextResponse.json(
          { error: { code: 'ACCESS_EXPIRED', message: 'Auditor access has expired' } },
          { status: 403 }
        )
        return addRateLimitHeaders(response, rateLimitResult)
      }
      sensorsQuery = sensorsQuery.eq('tenant_id', profile.tenant_id)
    } else if (profile.role === 'master') {
      // Master can see all sensors in their tenant
      sensorsQuery = sensorsQuery.eq('tenant_id', profile.tenant_id)
    } else if (profile.role === 'site_manager') {
      // Site manager can only see sensors in their assigned sites
      if (!profile.site_access || profile.site_access.length === 0) {
        const response = NextResponse.json({
          success: true,
          sensors: [],
          total: 0,
          stats: {
            total: 0,
            online: 0,
            warning: 0,
            offline: 0,
            inactive: 0,
            active_alerts: 0
          },
          timestamp: new Date().toISOString()
        })
        return addRateLimitHeaders(response, rateLimitResult)
      }
      sensorsQuery = sensorsQuery
        .eq('tenant_id', profile.tenant_id)
        .in('site_id', profile.site_access)
    }

    const { data: sensors, error: sensorsError } = await sensorsQuery.order('name')

    if (sensorsError) {
      console.error('Database error fetching sensors:', sensorsError)
      const response = NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch sensors' } },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Early return if no sensors to avoid unnecessary queries
    if (!sensors || sensors.length === 0) {
      const response = NextResponse.json({
        success: true,
        sensors: [],
        total: 0,
        stats: {
          total: 0,
          online: 0,
          warning: 0,
          offline: 0,
          inactive: 0,
          active_alerts: 0
        },
        timestamp: new Date().toISOString()
      })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Extract sensor IDs for batch queries
    const sensorIds = sensors.map((sensor: any) => sensor.id)
    const now24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const now48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    // Batch query 1: Get most recent reading per sensor (bounded to last 48h)
    const { data: allRecentReadings } = await supabase
      .from('readings')
      .select('sensor_id, temperature_c, humidity, metadata, ts')
      .in('sensor_id', sensorIds)
      .gte('ts', now48hAgo)
      .order('ts', { ascending: false })

    // Batch query 2: Get 24h reading counts per sensor
    const { data: readingCountsData } = await supabase
      .from('readings')
      .select('sensor_id')
      .in('sensor_id', sensorIds)
      .gte('ts', now24hAgo)

    // Batch query 3: Get active alert counts per sensor
    const { data: alertCountsData } = await supabase
      .from('alerts')
      .select('sensor_id')
      .in('sensor_id', sensorIds)
      .eq('status', 'active')

    // Process reading counts
    const readingCounts: Array<{ sensor_id: string; count: number }> = []
    if (readingCountsData) {
      const counts = new Map<string, number>()
      readingCountsData.forEach((reading: any) => {
        const current = counts.get(reading.sensor_id) || 0
        counts.set(reading.sensor_id, current + 1)
      })
      counts.forEach((count, sensor_id) => {
        readingCounts.push({ sensor_id, count })
      })
    }

    // Process alert counts
    const alertCounts: Array<{ sensor_id: string; count: number }> = []
    if (alertCountsData) {
      const counts = new Map<string, number>()
      alertCountsData.forEach((alert: any) => {
        const current = counts.get(alert.sensor_id) || 0
        counts.set(alert.sensor_id, current + 1)
      })
      counts.forEach((count, sensor_id) => {
        alertCounts.push({ sensor_id, count })
      })
    }

    // Create lookup maps for O(1) access
    const recentReadingMap = new Map<string, any>()
    const readingCountMap = new Map<string, number>()
    const alertCountMap = new Map<string, number>()

    // Group recent readings by sensor (get most recent per sensor)
    if (allRecentReadings && allRecentReadings.length > 0) {
      const sensorReadings = new Map<string, any>()
      allRecentReadings.forEach((reading: any) => {
        if (!sensorReadings.has(reading.sensor_id) || 
            new Date(reading.ts) > new Date(sensorReadings.get(reading.sensor_id).ts)) {
          sensorReadings.set(reading.sensor_id, reading)
        }
      })
      sensorReadings.forEach((reading, sensorId) => {
        recentReadingMap.set(sensorId, reading)
      })
    }

    // Populate count maps
    readingCounts.forEach((item) => {
      readingCountMap.set(item.sensor_id, item.count)
    })
    alertCounts.forEach((item) => {
      alertCountMap.set(item.sensor_id, item.count)
    })

    // Process sensors with pre-grouped data
    const sensorsWithStats = sensors.map((sensor: any) => {
      const recentReading = recentReadingMap.get(sensor.id)
      const readingsCount24h = readingCountMap.get(sensor.id) || 0
      const alertsCount = alertCountMap.get(sensor.id) || 0

      // Determine sensor status
      let status: 'online' | 'offline' | 'warning' = 'offline'
      
      if (sensor.is_active && recentReading) {
        const lastReadingTime = new Date(recentReading.ts).getTime()
        const now = new Date().getTime()
        const minutesAgo = (now - lastReadingTime) / (1000 * 60)
        
        if (minutesAgo <= 30) {
          status = alertsCount > 0 ? 'warning' : 'online'
        } else if (minutesAgo <= 120) {
          status = 'warning'
        } else {
          status = 'offline'
        }
      }

      // Extract metadata for battery and signal info
      const metadata = recentReading?.metadata || {}
      const batteryLevel = metadata?.device_battery || null
      const signalStrength = metadata?.signal_strength || null

      return {
        id: sensor.id,
        name: sensor.name,
        sensor_type: sensor.sensor_type,
        unit: sensor.unit,
        location_details: sensor.location_details,
        is_active: sensor.is_active,
        site_name: sensor.sites.name,
        site_id: sensor.site_id,
        environment_name: sensor.environments.name,
        environment_id: sensor.environment_id,
        current_temperature: recentReading?.temperature_c || null,
        battery_level: batteryLevel,
        signal_strength: signalStrength,
        last_reading_at: sensor.last_reading_at,
        status: status,
        alert_count: alertsCount,
        readings_count_24h: readingsCount24h,
        created_at: sensor.created_at
      }
    })

    // Sort by status priority (offline first, then warnings, then online)
    const statusPriority = { 'offline': 0, 'warning': 1, 'online': 2 }
    sensorsWithStats.sort((a, b) => {
      return statusPriority[a.status] - statusPriority[b.status]
    })

    const response = NextResponse.json({
      success: true,
      sensors: sensorsWithStats,
      total: sensorsWithStats.length,
      stats: {
        total: sensorsWithStats.length,
        online: sensorsWithStats.filter(s => s.status === 'online').length,
        warning: sensorsWithStats.filter(s => s.status === 'warning').length,
        offline: sensorsWithStats.filter(s => s.status === 'offline').length,
        inactive: sensorsWithStats.filter(s => !s.is_active).length,
        active_alerts: sensorsWithStats.reduce((sum, s) => sum + s.alert_count, 0)
      },
      timestamp: new Date().toISOString()
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Sensors API error:', error)
    const response = NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
    // rateLimitResult is now available from outer scope
    return addRateLimitHeaders(response, rateLimitResult)
  }
}