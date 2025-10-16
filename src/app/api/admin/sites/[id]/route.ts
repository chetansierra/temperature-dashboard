import { NextRequest, NextResponse } from 'next/server'
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

    const supabase = await createServerSupabaseClient()
    const { id: siteId } = await params

    // Get site details
    const { data: site, error } = await supabase
      .from('sites')
      .select(`
        id,
        name,
        location,
        description,
        status,
        created_at,
        updated_at,
        tenant_id
      `)
      .eq('id', siteId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Site not found',
            requestId: crypto.randomUUID()
          }
        }, { status: 404 })
      }

      console.error('Error fetching site:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch site',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    return NextResponse.json({ site })

  } catch (error) {
    console.error('Admin site detail API error:', error)
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

    // Only admins can update sites
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const body = await request.json()
    const { name, location, description, status } = body
    const { id: siteId } = await params

    const supabase = await createServerSupabaseClient()

    // Check if site exists
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id, name, tenant_id')
      .eq('id', siteId)
      .single()

    if (!existingSite) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Validate status
    if (status && !['active', 'suspended', 'cancelled'].includes(status)) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be active, suspended, or cancelled',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
    }

    // Update site
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status

    const { data: site, error: updateError } = await supabase
      .from('sites')
      .update(updateData)
      .eq('id', siteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating site:', updateError)
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update site',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    // Log admin activity
    const activityDetails: any = { updated_fields: Object.keys(updateData) }

    await supabase
      .from('admin_activity')
      .insert({
        admin_id: authContext.profile.id,
        action: 'update',
        resource_type: 'site',
        resource_id: siteId,
        resource_name: site.name,
        details: activityDetails
      })

    return NextResponse.json({
      site,
      message: 'Site updated successfully'
    })

  } catch (error) {
    console.error('Admin update site API error:', error)
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

    // Only admins can delete sites
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const { id: siteId } = await params
    const supabase = await createServerSupabaseClient()

    // Check if site exists and get details for logging
    const { data: site } = await supabase
      .from('sites')
      .select('id, name')
      .eq('id', siteId)
      .single()

    if (!site) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
    }

    // Delete site (this will cascade to environments and sensors)
    const { error: deleteError } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)

    if (deleteError) {
      console.error('Error deleting site:', deleteError)
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete site',
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
        resource_type: 'site',
        resource_id: siteId,
        resource_name: site.name,
        details: {}
      })

    return NextResponse.json({
      message: 'Site deleted successfully'
    })

  } catch (error) {
    console.error('Admin delete site API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}