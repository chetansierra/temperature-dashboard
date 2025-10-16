import { NextRequest, NextResponse } from 'next/server'
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

    const supabase = await createServerSupabaseClient()
    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organization_id')

    let query = supabase
      .from('sites')
      .select(`
        id,
        name,
        location,
        description,
        status,
        created_at,
        updated_at,
        tenant_id,
        tenant:tenants!sites_tenant_id_fkey(
          id,
          name,
          slug,
          plan
        )
      `)
      .order('created_at', { ascending: false })

    // Filter based on user role
    if (authContext.profile.role === 'admin') {
      // Admins can see all sites, optionally filtered by organization
      if (organizationId) {
        query = query.eq('tenant_id', organizationId)
      }
    } else {
      // Master users can only see sites from their organization
      query = query.eq('tenant_id', authContext.profile.tenant_id)
    }

    const { data: sites, error } = await query

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

    // Get environment counts for each site
    const sitesWithCounts = await Promise.all(
      (sites || []).map(async (site) => {
        const { count } = await supabase
          .from('environments')
          .select('id', { count: 'exact' })
          .eq('site_id', site.id)

        return {
          ...site,
          environment_count: count || 0
        }
      })
    )

    return NextResponse.json({
      sites: sitesWithCounts,
      total: sitesWithCounts.length
    })

  } catch (error) {
    console.error('Admin sites API error:', error)
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

    // Only admins can create sites
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, location, description, tenant_id } = body

    // Validate input
    if (!name || !tenant_id) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and tenant_id are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Check if organization exists
    const { data: organization } = await supabase
      .from('tenants')
      .select('id, name')
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

    // Create site
    const { data: site, error } = await supabase
      .from('sites')
      .insert({
        name,
        location,
        description,
        tenant_id,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site:', error)
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
            organization_id: tenant_id,
            location: site.location
          }
        })
    } catch (activityError) {
      console.warn('Failed to log admin activity:', activityError)
    }

    return NextResponse.json({
      site,
      message: 'Site created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin create site API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}