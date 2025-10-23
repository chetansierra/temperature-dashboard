import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { sendWelcomeEmail, getLoginUrl } from '@/lib/email'

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

    let query = supabase
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
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('tenant_id', organizationId)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch users',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get tenant names for users
    const usersWithTenants = await Promise.all(
      (users || []).map(async (user) => {
        if (user.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, slug')
            .eq('id', user.tenant_id)
            .single()
          return { ...user, tenant }
        }
        return { ...user, tenant: null }
      })
    )

    return NextResponse.json({
      users: usersWithTenants || [],
      total: usersWithTenants?.length || 0
    })

  } catch (error) {
    console.error('Admin users API error:', error)
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

    // Only admins can create users
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    // For admin operations like creating users, we need the service role client
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'Service role key not configured',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await request.json()
    const { email, password, full_name, role, tenant_id } = body

    // Validate input
    if (!email || !password || !role || !tenant_id) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, role, and tenant_id are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate role
    if (!['master_user', 'user'].includes(role)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be master_user or user',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Check if organization exists
    const { data: organization } = await supabase
      .from('tenants')
      .select('id, name, max_users')
      .eq('id', tenant_id)
      .single()

    if (!organization) {
      return NextResponse.json({
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Check user limit
    const { count: currentUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .neq('role', 'admin')

    if (currentUsers && currentUsers >= organization.max_users) {
      return NextResponse.json({
        error: {
          code: 'USER_LIMIT_EXCEEDED',
          message: `Organization has reached its user limit of ${organization.max_users}`,
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
    }

    // Check if master_user already exists for this organization
    if (role === 'master_user') {
      const { data: existingMaster } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role', 'master_user')
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

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({
        error: {
          code: 'AUTH_CREATE_FAILED',
          message: authError.message,
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        role,
        tenant_id,
        status: 'active'
      })
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        tenant_id
      `)
      .single()

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      
      console.error('Error creating profile:', profileError)
      return NextResponse.json({
        error: {
          code: 'PROFILE_CREATE_FAILED',
          message: 'Failed to create user profile',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get tenant information for the response
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', profile.tenant_id)
      .single()

    const profileWithTenant = { ...profile, tenant }

    // Log admin activity
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'create',
        resource_type: 'user',
        resource_id: profile.id,
        resource_name: profile.email,
        details: { 
          role: profile.role,
          organization: organization.name,
          organization_id: tenant_id
        }
      })

    // Send welcome email (don't fail the request if email fails)
    try {
      await sendWelcomeEmail({
        email: profile.email,
        full_name: profile.full_name || undefined,
        organization_name: organization.name,
        role: profile.role,
        login_url: getLoginUrl()
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Continue without failing the request
    }

    return NextResponse.json({
      user: profileWithTenant,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin create user API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}