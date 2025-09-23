import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AlertsResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
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

    const supabase = await createServerSupabaseClient()
    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const status = url.searchParams.get('status') // open, acknowledged, resolved
    const level = url.searchParams.get('level') // info, warning, critical
    const siteId = url.searchParams.get('site_id')

    // Query alerts using the actual remote database schema
    let query = supabase
      .from('alerts')
      .select(`
        *,
        sensors(sensor_id_local)
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id!)

    // Apply filters based on actual schema
    if (status) {
      // Map frontend status to database status
      let dbStatus = status
      if (status === 'open') dbStatus = 'active'
      if (status === 'acknowledged') dbStatus = 'acknowledged'
      if (status === 'resolved') dbStatus = 'resolved'
      query = query.eq('status', dbStatus)
    }
    if (level) {
      // Map frontend level to database severity
      let dbSeverity = level
      if (level === 'warning') dbSeverity = 'low'
      if (level === 'critical') dbSeverity = 'high'
      query = query.eq('severity', dbSeverity)
    }
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    // Execute query with pagination
    const { data: alertsData, error: alertsError, count } = await query
      .range(offset, offset + limit - 1)
      .order('triggered_at', { ascending: false })

    if (alertsError) {
      const response = NextResponse.json({
        error: {
          code: 'ALERTS_FETCH_FAILED',
          message: 'Failed to fetch alerts',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Process alerts data using actual remote database schema
    const alerts = alertsData?.map(alert => {
      // Map database severity to frontend level
      let level = 'warning'
      if (alert.severity === 'low') level = 'warning'
      else if (alert.severity === 'medium') level = 'warning'
      else if (alert.severity === 'high') level = 'critical'

      // Map database status to frontend status
      let status = 'open'
      if (alert.status === 'active') status = 'open'
      else if (alert.status === 'acknowledged') status = 'acknowledged'
      else if (alert.status === 'resolved') status = 'resolved'

      // Convert datetime strings to ISO format for Zod validation
      const openedAt = alert.triggered_at ? new Date(alert.triggered_at).toISOString() : new Date().toISOString()
      const acknowledgedAt = alert.acknowledged_at ? new Date(alert.acknowledged_at).toISOString() : null
      const resolvedAt = alert.resolved_at ? new Date(alert.resolved_at).toISOString() : null

      return {
        id: alert.id,
        rule_id: alert.alert_rule_id || alert.id,
        level,
        status,
        message: alert.message || alert.title || 'Temperature alert',
        value: (alert.metadata as any)?.trigger_temp || null,
        threshold_min: null, // Not available in current schema
        threshold_max: null, // Not available in current schema
        site_name: 'Site Data', // Would need site lookup
        environment_name: null, // Would need environment lookup
        sensor_name: (alert.sensors as any)?.sensor_id_local || null,
        opened_at: openedAt,
        acknowledged_at: acknowledgedAt,
        resolved_at: resolvedAt,
        acknowledged_by: alert.acknowledged_by,
        resolved_by: alert.resolved_by
      }
    }) || []

    const responseData = {
      alerts,
      pagination: {
        total: count || 0,
        limit,
        cursor: null, // For now, using null as cursor (could implement proper cursor later)
        has_more: (count || 0) > offset + limit
      }
    }

    // Validate response against schema
    const validatedResponse = AlertsResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Alerts endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'ALERTS_FAILED',
        message: 'Failed to fetch alerts data',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
