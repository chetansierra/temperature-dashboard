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
    
    const { id: organizationId } = await params

    // Get organization details
    const { data: organization, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        max_users,
        plan,
        status,
        plan_limits,
        created_at,
        updated_at
      `)
      .eq('id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Organization not found',
            requestId: crypto.randomUUID()
          }
        }, { status: 404 })
      }

      console.error('Error fetching organization:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch organization',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get user count for this organization
    const { count: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('tenant_id', organizationId)
      .neq('role', 'admin')

    // Get site count for this organization
    const { count: siteCount } = await supabase
      .from('sites')
      .select('id', { count: 'exact' })
      .eq('tenant_id', organizationId)

    return NextResponse.json({
      organization: {
        ...organization,
        current_users: userCount || 0,
        total_sites: siteCount || 0
      }
    })

  } catch (error) {
    console.error('Admin organization detail API error:', error)
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

    // Only admins can update organizations
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

    const body = await request.json()
    const { name, max_users, plan, status } = body
    const { id: organizationId } = await params

    // Validate input
    if (!name || !max_users) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and max_users are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate plan if provided
    if (plan && !['basic', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plan must be basic, pro, or enterprise',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate status if provided
    if (status && !['active', 'suspended', 'trial'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, suspended, or trial',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Check if organization exists
    const { data: existingOrg } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (!existingOrg) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Update organization
    const updateData: any = {
      name,
      max_users: parseInt(max_users),
      updated_at: new Date().toISOString()
    }

    if (plan) updateData.plan = plan
    if (status) updateData.status = status

    const { data: organization, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update organization',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'update',
        resource_type: 'organization',
        resource_id: organizationId,
        resource_name: organization.name,
        details: { updated_fields: Object.keys(updateData) }
      })

    return NextResponse.json({
      organization,
      message: 'Organization updated successfully'
    })

  } catch (error) {
    console.error('Admin update organization API error:', error)
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

    // Only admins can delete organizations
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

    const { id: organizationId } = await params

    // Check if organization exists and get details for logging
    const { data: organization } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Check if organization has users (prevent deletion if users exist)
    const { count: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('tenant_id', organizationId)
      .neq('role', 'admin')

    if (userCount && userCount > 0) {
      return NextResponse.json({
        error: {
          code: 'ORGANIZATION_HAS_USERS',
          message: `Cannot delete organization with ${userCount} users. Remove all users first.`,
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
    }

    // Delete organization (cascade will handle related data)
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', organizationId)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete organization',
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
        resource_type: 'organization',
        resource_id: organizationId,
        resource_name: organization.name,
        details: { reason: 'Admin deletion' }
      })

    return NextResponse.json({
      message: 'Organization deleted successfully'
    })

  } catch (error) {
    console.error('Admin delete organization API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}