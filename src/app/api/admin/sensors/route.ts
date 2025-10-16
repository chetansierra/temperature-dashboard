import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can access this endpoint
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organization_id')
    const siteId = url.searchParams.get('site_id')
    const environmentId = url.searchParams.get('environment_id')
    const status = url.searchParams.get('status')

    let query = supabase
      .from('sensors')
      .select(`
        id,
        name,
        type,
        status,
        battery_level,
        last_reading_at,
        created_at,
        updated_at,
        environment:environments(
          id,
          name,
          type,
          site:sites(
            id,
            name,
            location,
            tenant:tenants!sites_tenant_id_fkey(
              id,
              name,
              slug
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (organizationId) {
      query = query.eq('environment.site.tenant_id', organizationId)
    }
    if (siteId) {
      query = query.eq('environment.site_id', siteId)
    }
    if (environmentId) {
      query = query.eq('environment_id', environmentId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: sensors, error } = await query

    if (error) {
      console.error('Error fetching sensors:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch sensors',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get additional data for each sensor
    const sensorsWithDetails = await Promise.all(
      (sensors || []).map(async (sensor) => {
        // Get latest reading
        const { data: latestReading } = await supabase
          .from('sensor_readings')
          .select('temperature, humidity, created_at')
          .eq('sensor_id', sensor.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get active alerts count
        const { count: alertCount } = await supabase
          .from('alerts')
          .select('id', { count: 'exact' })
          .eq('sensor_id', sensor.id)
          .eq('status', 'open')

        // Calculate health status
        let healthStatus = 'unknown'
        if (sensor.status === 'inactive') {
          healthStatus = 'inactive'
        } else if (alertCount && alertCount > 0) {
          healthStatus = 'warning'
        } else if (sensor.battery_level && sensor.battery_level < 20) {
          healthStatus = 'low_battery'
        } else if (latestReading) {
          const lastReadingTime = new Date(latestReading.created_at).getTime()
          const now = new Date().getTime()
          const hoursSinceReading = (now - lastReadingTime) / (1000 * 60 * 60)
          
          if (hoursSinceReading > 24) {
            healthStatus = 'no_data'
          } else {
            healthStatus = 'healthy'
          }
        } else {
          healthStatus = 'no_data'
        }

        return {
          ...sensor,
          alert_count: alertCount || 0,
          last_temperature: latestReading?.temperature || null,
          last_humidity: latestReading?.humidity || null,
          last_reading: latestReading?.created_at || null,
          health_status: healthStatus
        }
      })
    )

    return NextResponse.json({
      sensors: sensorsWithDetails,
      total: sensorsWithDetails.length
    })

  } catch (error) {
    console.error('Admin sensors API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can create sensors
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, type, environment_id, status = 'active', battery_level = 100 } = body

    // Validate input
    if (!name || !type || !environment_id) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, type, and environment_id are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate sensor type
    const validTypes = ['temperature', 'humidity', 'temperature_humidity', 'pressure', 'air_quality', 'motion', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Type must be one of: ${validTypes.join(', ')}`,
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Check if environment exists
    const { data: environment } = await supabase
      .from('environments')
      .select(`
        id, 
        name, 
        site:sites(
          id, 
          name, 
          tenant:tenants!sites_tenant_id_fkey(name)
        )
      `)
      .eq('id', environment_id)
      .single()

    if (!environment) {
      return NextResponse.json({
        error: {
          code: 'ENVIRONMENT_NOT_FOUND',
          message: 'Environment not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Create sensor
    const { data: sensor, error: createError } = await supabase
      .from('sensors')
      .insert({
        name,
        type,
        environment_id,
        status,
        battery_level
      })
      .select(`
        id,
        name,
        type,
        status,
        battery_level,
        created_at,
        environment:environments(
          id,
          name,
          type,
          site:sites(
            id,
            name,
            location,
            tenant:tenants!sites_tenant_id_fkey(
              id,
              name,
              slug
            )
          )
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating sensor:', createError)
      return NextResponse.json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create sensor',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'create',
        resource_type: 'sensor',
        resource_id: sensor.id,
        resource_name: sensor.name,
        details: { 
          type: sensor.type,
          environment: environment.name,
          site: environment.site?.name,
          organization: environment.site?.tenant?.name,
          environment_id: environment_id
        }
      })

    return NextResponse.json({
      sensor,
      message: 'Sensor created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin create sensor API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}