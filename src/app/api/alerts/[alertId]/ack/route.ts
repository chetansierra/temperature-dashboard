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

    // Check if alert is in a valid state for acknowledgment
    if (alert.status !== 'open') {
      const response = NextResponse.json({
        error: {
          code: 'INVALID_ALERT_STATUS',
          message: 'Alert can only be acknowledged when status is "open"',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Update alert status to acknowledged
    const { data: updatedAlert, error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id
      })
      .eq('id', alertId)
      .select()
      .single()

    if (updateError) {
      const response = NextResponse.json({
        error: {
          code: 'ALERT_UPDATE_FAILED',
          message: 'Failed to acknowledge alert',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Log the action
    console.log('Alert acknowledged:', {
      alertId,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    })

    const responseData = {
      success: true,
      alert: updatedAlert,
      message: 'Alert acknowledged successfully'
    }

    const response = NextResponse.json(responseData)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Alert acknowledge endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'ALERT_ACK_FAILED',
        message: 'Failed to acknowledge alert',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
