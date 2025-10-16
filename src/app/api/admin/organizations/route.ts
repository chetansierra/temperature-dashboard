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

    // Only admins and master users can access this endpoint
    if (!['admin', 'master', 'master_user'].includes(authContext.profile.role)) {
      return NextResponse.json(createAuthError('Admin or master access required'), { status: 403 })
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

    // Build query based on user role
    let query = supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        max_users,
        plan,
        status,
        plan_limits,
        created_by,
        created_at,
        updated_at,
        created_by_profile:profiles!tenants_created_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter based on user role
    if (authContext.profile.role !== 'admin') {
      // Master users can only see their own organization
      query = query.eq('id', authContext.profile.tenant_id)
    }

    // Get organizations with creator information
    const { data: organizations, error } = await query

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch organizations',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Get user counts for each organization
    const orgsWithCounts = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('tenant_id', org.id)
          .neq('role', 'admin')

        return {
          ...org,
          current_users: count || 0
        }
      })
    )

    return NextResponse.json({
      organizations: orgsWithCounts,
      total: orgsWithCounts.length
    })

  } catch (error) {
    console.error('Admin organizations API error:', error)
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

    // Only admins can create organizations
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, slug, max_users, plan = 'basic' } = body

    // Validate input
    if (!name || !slug || !max_users) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, slug, and max_users are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate plan
    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plan must be basic, pro, or enterprise',
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

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return NextResponse.json({
        error: {
          code: 'SLUG_EXISTS',
          message: 'An organization with this slug already exists',
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
    }

    // Create organization with created_by field
    const { data: organization, error } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        max_users: parseInt(max_users),
        plan,
        status: 'active',
        plan_limits: {},
        created_by: authContext.profile.id // Track which admin created this organization
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      return NextResponse.json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create organization',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity (optional - only if admin_activity table exists)
    try {
      await supabase
        .from('admin_activity')
        .insert({
          admin_id: authContext.profile.id,
          action: 'create',
          resource_type: 'organization',
          resource_id: organization.id,
          resource_name: organization.name,
          details: { 
            plan: organization.plan,
            max_users: organization.max_users,
            slug: organization.slug,
            created_by: organization.created_by
          }
        })
    } catch (activityError) {
      // Log activity error but don't fail the request
      console.warn('Failed to log admin activity:', activityError)
    }

    return NextResponse.json({
      organization,
      message: 'Organization created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin create organization API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}