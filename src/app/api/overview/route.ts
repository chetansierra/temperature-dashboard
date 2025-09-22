import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
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

    // Use the same authenticated supabase client
    const authHeader = request.headers.get('authorization')
    let supabase
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Create client with the bearer token for API requests
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