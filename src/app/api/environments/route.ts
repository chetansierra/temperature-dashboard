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
    let environmentsQuery = supabase
      .from('environments')
      .select(`
        id,
        name,
        description,
        site_id,
        tenant_id,
        created_at,
        sites!inner(
          id,
          name,
          location
        )
      `)

    // Apply tenant/role-based filtering
    if (profile.role === 'admin') {
      // Admin can see all environments
    } else if (profile.role === 'auditor') {
      // Auditor can see environments in their assigned tenant
      if (profile.auditor_expires_at && new Date(profile.auditor_expires_at) <= new Date()) {
        const response = NextResponse.json(
          { error: { code: 'ACCESS_EXPIRED', message: 'Auditor access has expired' } },
          { status: 403 }
        )
        return addRateLimitHeaders(response, rateLimitResult)
      }
      environmentsQuery = environmentsQuery.eq('tenant_id', profile.tenant_id)
    } else if (profile.role === 'master') {
      // Master can see all environments in their tenant
      environmentsQuery = environmentsQuery.eq('tenant_id', profile.tenant_id)
    } else if (profile.role === 'site_manager') {
      // Site manager can only see environments in their assigned sites
      if (!profile.site_access || profile.site_access.length === 0) {
        const response = NextResponse.json({
          success: true,
          environments: [],
          total: 0,
          timestamp: new Date().toISOString()
        })
        return addRateLimitHeaders(response, rateLimitResult)
      }
      environmentsQuery = environmentsQuery
        .eq('tenant_id', profile.tenant_id)
        .in('site_id', profile.site_access)
    }

    const { data: environments, error: environmentsError } = await environmentsQuery

    if (environmentsError) {
      console.error('Database error fetching environments:', environmentsError)
      const response = NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch environments' } },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Extract environment IDs for batch queries
    const environmentIds = environments.map((env: any) => env.id)
    
    // Batch query 1: Get all sensors for all environments
    const { data: allSensors } = await supabase
      .from('sensors')
      .select('id, environment_id, is_active, last_reading_at')
      .in('environment_id', environmentIds)
    
    // Batch query 2: Get all thresholds for environments
    const { data: allThresholds } = await supabase
      .from('thresholds')
      .select('environment_id, min_temperature, max_temperature')
      .in('environment_id', environmentIds)
      .eq('is_active', true)
    
    // Extract sensor IDs for readings and alerts queries
    const sensorIds = allSensors?.map((s: any) => s.id) || []
    
    // Batch query 3: Get recent readings for all sensors
    const { data: allReadings } = await supabase
      .from('readings')
      .select('sensor_id, temperature_c, ts')
      .in('sensor_id', sensorIds)
      .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('ts', { ascending: false })
    
    // Batch query 4: Get active alerts for all sensors
    const { data: allAlerts } = await supabase
      .from('alerts')
      .select('sensor_id, severity, status')
      .in('sensor_id', sensorIds)
      .eq('status', 'active')
    
    // Group data by environment for efficient processing
    const sensorsByEnv = new Map<string, any[]>()
    const readingsByEnv = new Map<string, any[]>()
    const alertsByEnv = new Map<string, number>()
    const thresholdsByEnv = new Map<string, any>()
    
    // Build sensor ID to environment ID map for O(1) lookups (avoids O(R×S) performance)
    const sensorIdToEnvId = new Map<string, string>()
    
    // Group sensors by environment
    allSensors?.forEach((sensor: any) => {
      const envId = sensor.environment_id
      sensorIdToEnvId.set(sensor.id, envId)
      if (!sensorsByEnv.has(envId)) sensorsByEnv.set(envId, [])
      sensorsByEnv.get(envId)!.push(sensor)
    })
    
    // Group readings by environment (using O(1) map lookup)
    allReadings?.forEach((reading: any) => {
      const envId = sensorIdToEnvId.get(reading.sensor_id)
      if (envId) {
        if (!readingsByEnv.has(envId)) readingsByEnv.set(envId, [])
        readingsByEnv.get(envId)!.push(reading)
      }
    })
    
    // Count alerts by environment (using O(1) map lookup)
    allAlerts?.forEach((alert: any) => {
      const envId = sensorIdToEnvId.get(alert.sensor_id)
      if (envId) {
        const currentCount = alertsByEnv.get(envId) || 0
        alertsByEnv.set(envId, currentCount + 1)
      }
    })
    
    // Group thresholds by environment
    allThresholds?.forEach((threshold: any) => {
      thresholdsByEnv.set(threshold.environment_id, threshold)
    })
    
    // Process environments with pre-grouped data
    const environmentsWithStats = environments.map((env: any) => {
      const sensors = sensorsByEnv.get(env.id) || []
      const readings = readingsByEnv.get(env.id) || []
      const alertCount = alertsByEnv.get(env.id) || 0
      const threshold = thresholdsByEnv.get(env.id)
      
      const sensorsCount = sensors.length
      const activeSensorsCount = sensors.filter((s: any) => s.is_active).length
      
      // Calculate temperature statistics
      let avgTemperature = null
      let minTemperature = null
      let maxTemperature = null
      let lastReadingAt = null
      
      if (readings.length > 0) {
        const temps = readings.map((r: any) => r.temperature_c).filter((t: any) => t !== null)
        if (temps.length > 0) {
          avgTemperature = temps.reduce((sum: number, temp: number) => sum + temp, 0) / temps.length
          minTemperature = Math.min(...temps)
          maxTemperature = Math.max(...temps)
          // Get most recent reading timestamp
          const sortedReadings = readings.sort((a: any, b: any) => 
            new Date(b.ts).getTime() - new Date(a.ts).getTime()
          )
          lastReadingAt = sortedReadings[0].ts
        }
      }
      
      // Fallback to sensor last_reading_at if no recent readings
      if (!lastReadingAt && sensors.length > 0) {
        const sensorReadingTimes = sensors
          .map((s: any) => s.last_reading_at)
          .filter((t: any) => t)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
        
        if (sensorReadingTimes.length > 0) {
          lastReadingAt = sensorReadingTimes[0]
        }
      }
      
      return {
        id: env.id,
        name: env.name,
        description: env.description,
        site_name: env.sites.name,
        site_id: env.site_id,
        sensors_count: sensorsCount,
        active_sensors_count: activeSensorsCount,
        avg_temperature: avgTemperature,
        min_temperature: minTemperature,
        max_temperature: maxTemperature,
        alert_count: alertCount,
        threshold_min: threshold?.min_temperature || null,
        threshold_max: threshold?.max_temperature || null,
        last_reading_at: lastReadingAt,
        created_at: env.created_at
      }
    })

    const response = NextResponse.json({
      success: true,
      environments: environmentsWithStats,
      total: environmentsWithStats.length,
      timestamp: new Date().toISOString()
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Environments API error:', error)
    const response = NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
    // rateLimitResult is now available from outer scope
    return addRateLimitHeaders(response, rateLimitResult)
  }
}