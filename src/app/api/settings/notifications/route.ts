import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

interface NotificationSettings {
  tenant_id: string
  email_enabled: boolean
  sms_enabled: boolean
  webhook_enabled: boolean
  webhook_url?: string
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

    // For now, return default notification settings
    // In a real implementation, this would query a notification_settings table
    const notificationSettings: NotificationSettings = {
      tenant_id: profile.tenant_id!,
      email_enabled: true,
      sms_enabled: false,
      webhook_enabled: false,
      webhook_url: undefined
    }

    const response = NextResponse.json({ notification_settings: notificationSettings })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Notifications GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'NOTIFICATIONS_FETCH_FAILED',
        message: 'Failed to fetch notification settings',
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
    const { email_enabled, sms_enabled, webhook_enabled, webhook_url } = body

    // Validate input
    if (webhook_enabled && webhook_url && !webhook_url.startsWith('https://')) {
      const response = NextResponse.json({
        error: {
          code: 'INVALID_WEBHOOK_URL',
          message: 'Webhook URL must use HTTPS',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check permissions - only masters can modify notification settings
    if (profile.role !== 'master') {
      const response = NextResponse.json(createAuthError('Only masters can modify notification settings'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // For now, just return success - in a real implementation,
    // this would save to a notification_settings table
    const notificationSettings: NotificationSettings = {
      tenant_id: profile.tenant_id!,
      email_enabled: email_enabled !== false,
      sms_enabled: sms_enabled === true,
      webhook_enabled: webhook_enabled === true,
      webhook_url: webhook_enabled ? webhook_url : undefined
    }

    const response = NextResponse.json({
      success: true,
      notification_settings: notificationSettings
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Notifications POST endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'NOTIFICATIONS_SAVE_FAILED',
        message: 'Failed to save notification settings',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'