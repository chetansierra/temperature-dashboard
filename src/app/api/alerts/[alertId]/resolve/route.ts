import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canManageAlerts } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.post(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get authenticated user context
    const authContext = await getAuthContext(request)
    if (!authContext) {
      const response = NextResponse.json(createAuthError('Authentication required'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { user, profile } = authContext
    const supabase = await createServerSupabaseClient()

    // Parse request body for optional resolution notes
    const body = await request.json().catch(() => ({}))
    const { notes } = body

    // Get alert details to check permissions
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('id, status, site_id, tenant_id')
      .eq('id', alertId)
      .single()

    if (alertError || !alert) {
      const response = NextResponse.json({
        error: {
          code: 'ALERT_NOT_FOUND',
          message: 'Alert not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check if user can manage alerts for this site
    if (!canManageAlerts(profile, alert.site_id)) {
      const response = NextResponse.json(createAuthError('Access denied - cannot manage alerts'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check if alert is in a valid state for resolution
    if (alert.status === 'resolved') {
      const response = NextResponse.json({
        error: {
          code: 'INVALID_ALERT_STATUS',
          message: 'Alert is already resolved',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Prepare update data
    const updateData: any = {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    }

    // If alert was never acknowledged, acknowledge it now
    if (alert.status === 'open') {
      updateData.acknowledged_at = new Date().toISOString()
      updateData.acknowledged_by = user.id
    }

    // Add resolution notes if provided
    if (notes) {
      updateData.resolution_notes = notes
    }

    // Update alert status to resolved
    const { data: updatedAlert, error: updateError } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single()

    if (updateError) {
      const response = NextResponse.json({
        error: {
          code: 'ALERT_UPDATE_FAILED',
          message: 'Failed to resolve alert',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Log the action
    console.log('Alert resolved:', {
      alertId,
      userId: user.id,
      userEmail: user.email,
      hasNotes: !!notes,
      timestamp: new Date().toISOString()
    })

    const responseData = {
      success: true,
      alert: updatedAlert,
      message: 'Alert resolved successfully'
    }

    const response = NextResponse.json(responseData)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Alert resolve endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'ALERT_RESOLVE_FAILED',
        message: 'Failed to resolve alert',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
