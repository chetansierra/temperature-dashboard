import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

interface BulkSensorData {
  name: string
  local_id?: string
  model?: string
  environment_id: string
  status?: string
  battery_level?: number
  is_active?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can bulk create sensors
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { sensors } = body

    if (!Array.isArray(sensors) || sensors.length === 0) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sensors array is required and must not be empty',
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

    const results = {
      created: [] as any[],
      errors: [] as any[]
    }

    // Process each sensor
    for (let i = 0; i < sensors.length; i++) {
      const sensorData: BulkSensorData = sensors[i]
      
      try {
        // Validate required fields
        if (!sensorData.name || !sensorData.environment_id) {
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: 'Name and environment_id are required'
          })
          continue
        }

        // Check if environment exists
        const { data: environment } = await supabaseAdmin
          .from('environments')
          .select(`
            id, 
            name,
            site_id
          `)
          .eq('id', sensorData.environment_id)
          .single()

        if (!environment) {
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: `Environment with ID ${sensorData.environment_id} not found`
          })
          continue
        }

        // Get site and tenant info
        const { data: site } = await supabaseAdmin
          .from('sites')
          .select(`
            id,
            name,
            tenant_id,
            tenants!sites_tenant_id_fkey(
              id,
              name
            )
          `)
          .eq('id', environment.site_id)
          .single()

        if (!site) {
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: `Site not found for environment ${sensorData.environment_id}`
          })
          continue
        }

        // Create sensor using admin client to bypass RLS
        const { data: sensor, error: createError } = await supabaseAdmin
          .from('sensors')
          .insert({
            name: sensorData.name,
            local_id: sensorData.local_id || null,
            model: sensorData.model || null,
            environment_id: sensorData.environment_id,
            site_id: environment.site_id,
            tenant_id: site?.tenant_id,
            status: sensorData.status || 'active',
            battery_level: sensorData.battery_level || 100,
            is_active: sensorData.is_active !== false
          })
          .select(`
            id,
            name,
            local_id,
            model,
            status,
            battery_level,
            is_active,
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
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: createError.message
          })
          continue
        }

        results.created.push(sensor)

        // Log admin activity for each created sensor
        await supabaseAdmin
          .from('admin_activity')
          .insert({
            admin_id: authContext.profile.id,
            action: 'create',
            resource_type: 'sensor',
            resource_id: sensor.id,
            resource_name: sensor.name,
            details: { 
              model: sensor.model,
              local_id: sensor.local_id,
              environment: environment.name,
              site: site?.name,
              organization: site?.tenants?.[0]?.name,
              bulk_import: true,
              environment_id: sensorData.environment_id
            }
          })

      } catch (error) {
        results.errors.push({
          row: i + 1,
          data: sensorData,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Bulk sensor creation completed. ${results.created.length} created, ${results.errors.length} errors.`,
      results
    }, { status: 201 })

  } catch (error) {
    console.error('Admin bulk create sensors API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}