import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

// GET /api/admin/sites/[id]/environments - Get all environments for a site
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
    
    const { id: siteId } = await params

    // Verify site exists and get its organization
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, tenant_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Get environments for the site
    const { data: environments, error } = await supabase
      .from('environments')
      .select(`
        id,
        name,
        type,
        status,
        created_at,
        updated_at,
        site_id
      `)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

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

    return NextResponse.json({
      environments: environments || [],
      total: environments?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/admin/sites/[id]/environments:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}

// POST /api/admin/sites/[id]/environments - Create a new environment for a site
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { name, type, status = 'active' } = body
    const { id: siteId } = await params

    // Validate input
    if (!name || !type) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and type are required',
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

    const supabase = await createServerSupabaseClient()

    // Verify site exists and get its organization
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select(`
        id, 
        name, 
        tenant_id,
        tenant:tenants!sites_tenant_id_fkey(name)
      `)
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Create the environment
    const { data: environment, error: envError } = await supabase
      .from('environments')
      .insert({
        name,
        type,
        status,
        site_id: siteId,
        tenant_id: site.tenant_id
      })
      .select(`
        id,
        name,
        type,
        status,
        created_at,
        updated_at,
        site_id
      `)
      .single()

    if (envError) {
      console.error('Error creating environment:', envError)
      return NextResponse.json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create environment',
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
          resource_type: 'environment',
          resource_id: environment.id,
          resource_name: environment.name,
          details: { 
            type: environment.type,
            site: site.name,
            organization: (site.tenant as any)?.name || 'Unknown Organization',
            site_id: siteId,
            status: environment.status
          }
        })
    } catch (activityError) {
      // Log activity error but don't fail the request
      console.warn('Failed to log admin activity:', activityError)
    }

    return NextResponse.json({
      environment,
      message: 'Environment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/sites/[id]/environments:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}