import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { sendPasswordResetEmail } from '@/lib/email'

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
    
    const { id: userId } = await params

    // Get user details
    const { data: user, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at,
        tenant_id
      `)
      .eq('id', userId)
      .neq('role', 'admin')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            requestId: crypto.randomUUID()
          }
        }, { status: 404 })
      }

      console.error('Error fetching user:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch user',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get tenant information
    let userWithTenant: any = user
    if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', user.tenant_id)
        .single()
      userWithTenant = { ...user, tenant }
    }

    return NextResponse.json({ user: userWithTenant })

  } catch (error) {
    console.error('Admin user detail API error:', error)
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

    // Only admins can update users
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { full_name, role, status, password } = body
    const { id: userId } = await params

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

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, role, tenant_id')
      .eq('id', userId)
      .neq('role', 'admin')
      .single()

    if (!existingUser) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Get tenant information for existingUser
    let existingUserTenant = null
    if (existingUser.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', existingUser.tenant_id)
        .single()
      existingUserTenant = tenant
    }

    // Validate role
    if (role && !['master_user', 'user'].includes(role as any)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be master_user or user',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate status
    if (status && !['active', 'suspended', 'pending'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, suspended, or pending',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Check if changing to master_user and one already exists
    if (role && role !== existingUser.role && role === 'master_user') {
        const { data: existingMaster } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', existingUser.tenant_id)
          .eq('role', 'master_user')
          .neq('id', userId)
          .single()

        if (existingMaster) {
          return NextResponse.json({
            error: {
              code: 'MASTER_USER_EXISTS',
              message: 'Organization already has a master user',
              requestId: crypto.randomUUID()
            }
          }, { status: 409 })
        }
    }

    // Validate status
    if (status && !['active', 'suspended', 'pending'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, suspended, or pending',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Update profile
    const updateData: any = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updateData.full_name = full_name
    if (role) updateData.role = role
    if (status) updateData.status = status

    const { data: user, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at,
        tenant_id
      `)
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (passwordError) {
        console.error('Error updating password:', passwordError)
        // Don't fail the entire request for password update errors
      } else {
        // Send password reset notification email
        try {
          await sendPasswordResetEmail({
            email: user.email,
            full_name: user.full_name || undefined,
            organization_name: existingUserTenant?.name || 'Unknown Organization'
          })
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError)
          // Continue without failing the request
        }
      }
    }

    // Log admin activity
    const activityDetails: any = { updated_fields: Object.keys(updateData) }
    if (password) activityDetails.password_reset = true

    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'update',
        resource_type: 'user',
        resource_id: userId,
        resource_name: user.email,
        details: activityDetails
      })

    // Get tenant information for the updated user
    let updatedUserWithTenant: any = user
    if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', user.tenant_id)
        .single()
      updatedUserWithTenant = { ...user, tenant }
    }

    return NextResponse.json({
      user: updatedUserWithTenant,
      message: 'User updated successfully'
    })

  } catch (error) {
    console.error('Admin update user API error:', error)
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

    // Only admins can delete users
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const { id: userId } = await params
    
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

    // Check if user exists and get details for logging
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, role, tenant_id')
      .eq('id', userId)
      .neq('role', 'admin')
      .single()

    if (!user) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Get tenant information for logging
    let userTenant = null
    if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', user.tenant_id)
        .single()
      userTenant = tenant
    }

    // Delete auth user (this will cascade to profile due to foreign key)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete user',
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
        resource_type: 'user',
        resource_id: userId,
        resource_name: user.email,
        details: { 
          role: user.role,
          organization: userTenant?.name || 'Unknown Organization'
        }
      })

    return NextResponse.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Admin delete user API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}