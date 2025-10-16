import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

// GET /api/admin/organizations/[id]/sites - Get all sites for an organization
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

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Get sites for the organization
    const { data: sites, error } = await supabase
      .from('sites')
      .select(`
        id,
        name,
        location,
        status,
        created_at,
        updated_at,
        tenant_id
      `)
      .eq('tenant_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch sites',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      sites: sites || [],
      total: sites?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/admin/organizations/[id]/sites:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}

// POST /api/admin/organizations/[id]/sites - Create a new site for an organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can create sites
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
    const { name, location, status = 'active' } = body
    const { id: organizationId } = await params

    // Validate input
    if (!name || !location) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and location are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate name length
    if (name.length < 1 || name.length > 100) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name must be between 1 and 100 characters',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate location length
    if (location.length < 1 || location.length > 200) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location must be between 1 and 200 characters',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Validate status
    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, suspended, or cancelled',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Create the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        name,
        location,
        status,
        tenant_id: organizationId
      })
      .select(`
        id,
        name,
        location,
        status,
        created_at,
        updated_at,
        tenant_id
      `)
      .single()

    if (siteError) {
      console.error('Error creating site:', siteError)
      return NextResponse.json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create site',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    try {
      await supabase
        .from('admin_activity')
        .insert({
          admin_id: authContext.profile.id,
          action: 'create',
          resource_type: 'site',
          resource_id: site.id,
          resource_name: site.name,
          details: { 
            organization: organization.name,
            organization_id: organizationId,
            location: site.location,
            status: site.status
          }
        })
    } catch (activityError) {
      // Log activity error but don't fail the request
      console.warn('Failed to log admin activity:', activityError)
    }

    return NextResponse.json({
      site,
      message: 'Site created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/organizations/[id]/sites:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}