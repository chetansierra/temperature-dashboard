import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )
    } else {
      // Use the standard server client for cookie-based auth
      supabase = await createServerSupabaseClient()
    }

    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organization_id')
    const siteId = url.searchParams.get('site_id')
    const environmentType = url.searchParams.get('type')

    let query = supabase
      .from('environments')
      .select(`
        id,
        name,
        type,
        status,
        created_at,
        updated_at,
        site:sites(
          id,
          name,
          location,
          tenant:tenants(
            id,
            name,
            slug
          )
        ),
        sensors(count),
        alerts(count)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (organizationId) {
      query = query.eq('site.tenant_id', organizationId)
    }
    if (siteId) {
      query = query.eq('site_id', siteId)
    }
    if (environmentType) {
      query = query.eq('type', environmentType)
    }

    const { data: environments, error } = await query

    if (error) {
      console.error('Error fetching environments:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch environments',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get additional data for each environment (sensor count, alerts, etc.)
    const environmentsWithDetails = await Promise.all(
      (environments || []).map(async (environment) => {
        // Get sensor count
        const { count: sensorCount } = await supabase
          .from('sensors')
          .select('id', { count: 'exact' })
          .eq('environment_id', environment.id)

        // Get active alerts count
        const { count: alertCount } = await supabase
          .from('alerts')
          .select('id', { count: 'exact' })
          .eq('environment_id', environment.id)
          .eq('status', 'open')

        // Get latest sensor reading
        const { data: latestReading } = await supabase
          .from('readings')
          .select('ts, temperature, humidity, sensor:sensors(environment_id)')
          .eq('sensor.environment_id', environment.id)
          .order('ts', { ascending: false })
          .limit(1)
          .single()

        return {
          ...environment,
          sensor_count: sensorCount || 0,
          alert_count: alertCount || 0,
          last_reading: latestReading?.ts || null,
          last_temperature: latestReading?.temperature || null,
          last_humidity: latestReading?.humidity || null,
          health_status: alertCount && alertCount > 0 ? 'warning' : 
                       sensorCount && sensorCount > 0 ? 'healthy' : 'no_sensors'
        }
      })
    )

    return NextResponse.json({
      environments: environmentsWithDetails,
      total: environmentsWithDetails.length
    })

  } catch (error) {
    console.error('Admin environments API error:', error)
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

    // Only admins can create environments
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, type, site_id, status = 'active' } = body

    // Validate input
    if (!name || !type || !site_id) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, type, and site_id are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate environment type
    const validTypes = ['indoor', 'outdoor', 'warehouse', 'office', 'production']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Type must be one of: ${validTypes.join(', ')}`,
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )
    } else {
      // Use the standard server client for cookie-based auth
      supabase = await createServerSupabaseClient()
    }

    // Check if site exists
    const { data: site } = await supabase
      .from('sites')
      .select('id, name, tenant_id, tenant:tenants!sites_tenant_id_fkey(name)')
      .eq('id', site_id)
      .single()

    if (!site) {
      return NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Create environment
    const { data: environment, error: createError } = await supabase
      .from('environments')
      .insert({
        name,
        type,
        site_id,
        status
      })
      .select(`
        id,
        name,
        type,
        status,
        created_at,
        site:sites(
          id,
          name,
          location,
          tenant:tenants(
            id,
            name,
            slug
          )
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating environment:', createError)
      return NextResponse.json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create environment',
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
        resource_type: 'environment',
        resource_id: environment.id,
        resource_name: environment.name,
        details: { 
          type: environment.type,
          site: site.name,
          organization: (site.tenant as any)?.name || 'Unknown Organization',
          site_id: site_id
        }
      })

    return NextResponse.json({
      environment,
      message: 'Environment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin create environment API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}