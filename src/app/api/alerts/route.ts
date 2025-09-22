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

    // Build query
    let query = supabase
      .from('alerts')
      .select(`
        *,
        sites!inner(site_name),
        environments!inner(name),
        sensors(sensor_id_local)
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id!)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (level) {
      query = query.eq('level', level)
    }
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    // Execute query with pagination
    const { data: alertsData, error: alertsError, count } = await query
      .range(offset, offset + limit - 1)
      .order('opened_at', { ascending: false })

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

    // Process alerts data
    const alerts = alertsData?.map(alert => ({
      id: alert.id,
      level: alert.level,
      status: alert.status,
      message: alert.message,
      site_name: (alert.sites as any).site_name,
      environment_name: (alert.environments as any).name,
      sensor_name: (alert.sensors as any)?.sensor_id_local || null,
      opened_at: alert.opened_at,
      acknowledged_at: alert.acknowledged_at,
      resolved_at: alert.resolved_at,
      acknowledged_by: alert.acknowledged_by,
      resolved_by: alert.resolved_by
    })) || []

    const responseData = {
      alerts,
      pagination: {
        total: count || 0,
        page,
        limit,
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
