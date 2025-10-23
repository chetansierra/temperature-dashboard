import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const environmentId = id

    console.log('Fetching environment with ID:', environmentId)

    // Get environment details
    const { data: environment, error } = await supabase
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
        )
      `)
      .eq('id', environmentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Environment not found',
            requestId: crypto.randomUUID()
          }
        }, { status: 404 })
      }

      console.error('Error fetching environment:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch environment',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    return NextResponse.json({ environment })

  } catch (error) {
    console.error('Admin environment detail API error:', error)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can update environments
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, type, status } = body
    
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
    
    const { id } = await params
    const environmentId = id

    // Check if environment exists
    const { data: existingEnvironment } = await supabase
      .from('environments')
      .select('id, name, type, site:sites(name, tenant:tenants!sites_tenant_id_fkey(name))')
      .eq('id', environmentId)
      .single()

    if (!existingEnvironment) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Environment not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Validate environment type if provided
    if (type) {
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

    // Update environment
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (type) updateData.type = type
    if (status) updateData.status = status

    const { data: environment, error: updateError } = await supabase
      .from('environments')
      .update(updateData)
      .eq('id', environmentId)
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
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating environment:', updateError)
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update environment',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    const activityDetails: any = { updated_fields: Object.keys(updateData) }
    if (name !== existingEnvironment.name) activityDetails.old_name = existingEnvironment.name
    if (type !== existingEnvironment.type) activityDetails.old_type = existingEnvironment.type

    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'update',
        resource_type: 'environment',
        resource_id: environmentId,
        resource_name: environment.name,
        details: activityDetails
      })

    return NextResponse.json({
      environment,
      message: 'Environment updated successfully'
    })

  } catch (error) {
    console.error('Admin update environment API error:', error)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can delete environments
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
    
    const { id } = await params
    const environmentId = id

    // Check if environment exists and get details for logging
    const { data: environment } = await supabase
      .from('environments')
      .select('id, name, type, site:sites(name, tenant:tenants!sites_tenant_id_fkey(name))')
      .eq('id', environmentId)
      .single()

    if (!environment) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Environment not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Check if environment has sensors
    const { count: sensorCount } = await supabase
      .from('sensors')
      .select('id', { count: 'exact' })
      .eq('environment_id', environmentId)

    if (sensorCount && sensorCount > 0) {
      return NextResponse.json({
        error: {
          code: 'ENVIRONMENT_HAS_SENSORS',
          message: `Cannot delete environment with ${sensorCount} sensors. Remove sensors first.`,
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
    }

    // Delete environment
    const { error: deleteError } = await supabase
      .from('environments')
      .delete()
      .eq('id', environmentId)

    if (deleteError) {
      console.error('Error deleting environment:', deleteError)
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete environment',
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
        resource_type: 'environment',
        resource_id: environmentId,
        resource_name: environment.name,
        details: { 
          type: environment.type,
          site: (environment.site as any)?.name || 'Unknown Site',
          organization: (environment.site as any)?.tenant?.name || 'Unknown Organization'
        }
      })

    return NextResponse.json({
      message: 'Environment deleted successfully'
    })

  } catch (error) {
    console.error('Admin delete environment API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}