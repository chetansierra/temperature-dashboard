import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

interface BulkSensorData {
  name: string
  type: string
  environment_id: string
  status?: string
  battery_level?: number
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

    const supabase = await createServerSupabaseClient()
    const validTypes = ['temperature', 'humidity', 'temperature_humidity', 'pressure', 'air_quality', 'motion', 'other']
    const results = {
      created: [] as any[],
      errors: [] as any[]
    }

    // Process each sensor
    for (let i = 0; i < sensors.length; i++) {
      const sensorData: BulkSensorData = sensors[i]
      
      try {
        // Validate required fields
        if (!sensorData.name || !sensorData.type || !sensorData.environment_id) {
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: 'Name, type, and environment_id are required'
          })
          continue
        }

        // Validate sensor type
        if (!validTypes.includes(sensorData.type)) {
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: `Invalid sensor type. Must be one of: ${validTypes.join(', ')}`
          })
          continue
        }

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

        // Create sensor
        const { data: sensor, error: createError } = await supabase
          .from('sensors')
          .insert({
            name: sensorData.name,
            type: sensorData.type,
            environment_id: sensorData.environment_id,
            status: sensorData.status || 'active',
            battery_level: sensorData.battery_level || 100
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
          results.errors.push({
            row: i + 1,
            data: sensorData,
            error: createError.message
          })
          continue
        }

        results.created.push(sensor)

        // Log admin activity for each created sensor
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