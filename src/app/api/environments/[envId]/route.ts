import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { envId: string } }
) {
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

    // Use service role client for bypassed authentication
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext
    const { envId } = params

    // Get environment with site details
    const { data: environment, error } = await supabase
      .from('environments')
      .select(`
        id,
        site_id,
        environment_type,
        name,
        description,
        created_at,
        sites (
          site_name,
          site_code,
          location,
          timezone
        )
      `)
      .eq('id', envId)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (error || !environment) {
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENT_NOT_FOUND',
          message: 'Environment not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check permissions - verify user can access the site that contains this environment
    if (!canAccessSite(profile, environment.site_id)) {
      const response = NextResponse.json(createAuthError('Access denied to this environment'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({ environment })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Environment detail GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'ENVIRONMENT_DETAIL_FAILED',
        message: 'Failed to fetch environment details',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
