import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const sensorId = params.id

    // Get sensor details
    const { data: sensor, error } = await supabase
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
            tenant:tenants(
              id,
              name,
              slug
            )
          )
        )
      `)
      .eq('id', sensorId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Sensor not found',
            requestId: crypto.randomUUID()
          }
        }, { status: 404 })
      }

      console.error('Error fetching sensor:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch sensor',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    return NextResponse.json({ sensor })

  } catch (error) {
    console.error('Admin sensor detail API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can update sensors
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, type, status, battery_level } = body
    const sensorId = params.id

    const supabase = await createServerSupabaseClient()

    // Check if sensor exists
    const { data: existingSensor } = await supabase
      .from('sensors')
      .select(`
        id, 
        name, 
        type, 
        environment:environments(
          name, 
          site:sites(
            name, 
            tenant:tenants!sites_tenant_id_fkey(name)
          )
        )
      `)
      .eq('id', sensorId)
      .single()

    if (!existingSensor) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Sensor not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Validate sensor type if provided
    if (type) {
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
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'maintenance'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, inactive, or maintenance',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate battery level if provided
    if (battery_level !== undefined && (battery_level < 0 || battery_level > 100)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Battery level must be between 0 and 100',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Update sensor
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (type) updateData.type = type
    if (status) updateData.status = status
    if (battery_level !== undefined) updateData.battery_level = battery_level

    const { data: sensor, error: updateError } = await supabase
      .from('sensors')
      .update(updateData)
      .eq('id', sensorId)
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
            tenant:tenants(
              id,
              name,
              slug
            )
          )
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating sensor:', updateError)
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update sensor',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    const activityDetails: any = { updated_fields: Object.keys(updateData) }
    if (name !== existingSensor.name) activityDetails.old_name = existingSensor.name
    if (type !== existingSensor.type) activityDetails.old_type = existingSensor.type

    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'update',
        resource_type: 'sensor',
        resource_id: sensorId,
        resource_name: sensor.name,
        details: activityDetails
      })

    return NextResponse.json({
      sensor,
      message: 'Sensor updated successfully'
    })

  } catch (error) {
    console.error('Admin update sensor API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can delete sensors
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const sensorId = params.id
    const supabase = await createServerSupabaseClient()

    // Check if sensor exists and get details for logging
    const { data: sensor } = await supabase
      .from('sensors')
      .select(`
        id, 
        name, 
        type, 
        environment:environments(
          name, 
          site:sites(
            name, 
            tenant:tenants!sites_tenant_id_fkey(name)
          )
        )
      `)
      .eq('id', sensorId)
      .single()

    if (!sensor) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Sensor not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Delete sensor (this will cascade to readings and alerts due to foreign keys)
    const { error: deleteError } = await supabase
      .from('sensors')
      .delete()
      .eq('id', sensorId)

    if (deleteError) {
      console.error('Error deleting sensor:', deleteError)
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete sensor',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'delete',
        resource_type: 'sensor',
        resource_id: sensorId,
        resource_name: sensor.name,
        details: { 
          type: sensor.type,
          environment: sensor.environment?.name,
          site: sensor.environment?.site?.name,
          organization: sensor.environment?.site?.tenant?.name
        }
      })

    return NextResponse.json({
      message: 'Sensor deleted successfully'
    })

  } catch (error) {
    console.error('Admin delete sensor API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}