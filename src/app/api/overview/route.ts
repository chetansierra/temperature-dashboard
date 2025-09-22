import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
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

    const { profile } = authContext

    // Use the unified server client for cookie-based auth
    const supabase = await createServerSupabaseClient()

    // Get simple counts
    const sitesCount = await supabase.from('sites').select('id', { count: 'exact' })
    const sensorsCount = await supabase.from('sensors').select('id', { count: 'exact' })
    const alertsCount = await supabase.from('alerts').select('id', { count: 'exact' })

    const overviewData = {
      tenant: {
        id: profile.tenant_id || 'default',
        name: 'Acme Foods Ltd.'
      },
      stats: {
        total_sites: sitesCount.count || 0,
        total_sensors: sensorsCount.count || 0,
        active_alerts: alertsCount.count || 0,
        critical_alerts: 1
      },
      recent_alerts: [],
      sensor_health: []
    }

    const response = NextResponse.json(overviewData, { status: 200 })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Overview API error:', error)
    const errorResponse = {
      error: {
        code: 'OVERVIEW_FAILED',
        message: 'Failed to fetch overview data',
        requestId: crypto.randomUUID()
      }
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}