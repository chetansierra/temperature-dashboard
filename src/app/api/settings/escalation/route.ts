import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'
import { canManageThresholds } from '@/utils/auth'

interface EscalationSettings {
  site_id: string
  escalation_minutes: number
  enabled: boolean
}

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

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const siteId = url.searchParams.get('site_id')

    // Get escalation settings - for now, return default settings
    // In a real implementation, this would query a settings table
    let escalationSettings: EscalationSettings[] = []

    if (siteId) {
      // Return settings for specific site
      escalationSettings = [{
        site_id: siteId,
        escalation_minutes: 15,
        enabled: true
      }]
    } else {
      // Return settings for all sites in tenant
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('tenant_id', profile.tenant_id!)

      if (sites) {
        escalationSettings = sites.map(site => ({
          site_id: site.id,
          escalation_minutes: 15,
          enabled: true
        }))
      }
    }

    const response = NextResponse.json({ escalation_settings: escalationSettings })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Escalation GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'ESCALATION_FETCH_FAILED',
        message: 'Failed to fetch escalation settings',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const supabase = await createServerSupabaseClient()

    // Set the user context for RLS
    const { error: authSetError } = await supabase.auth.getUser()
    if (authSetError) {
      console.error('Failed to set auth context:', authSetError)
      const response = NextResponse.json(createAuthError('Authentication failed'), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { profile } = authContext

    // Parse request body
    const body = await request.json()
    const { site_id, escalation_minutes, enabled } = body

    // Validate input
    if (!site_id || typeof escalation_minutes !== 'number' || escalation_minutes < 5 || escalation_minutes > 120) {
      const response = NextResponse.json({
        error: {
          code: 'INVALID_ESCALATION_DATA',
          message: 'Invalid escalation settings. Minutes must be between 5 and 120.',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check permissions - only masters can modify escalation settings
    if (profile.role !== 'master') {
      const response = NextResponse.json(createAuthError('Only masters can modify escalation settings'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Verify site belongs to tenant
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('id', site_id)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (!site) {
      const response = NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // For now, just return success - in a real implementation,
    // this would save to a settings table
    const escalationSetting = {
      site_id,
      escalation_minutes,
      enabled: enabled !== false,
      updated_at: new Date().toISOString()
    }

    const response = NextResponse.json({
      success: true,
      escalation_setting: escalationSetting
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Escalation POST endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'ESCALATION_SAVE_FAILED',
        message: 'Failed to save escalation settings',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'