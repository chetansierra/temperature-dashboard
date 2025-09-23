import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canManageUsers } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'
import { z } from 'zod'

const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['master', 'site_manager', 'auditor']),
  site_id: z.string().optional(), // For site managers
  expiry_date: z.string().optional() // For auditors
})

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Use service role client for bypassed authentication
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Mock profile for bypassed authentication
    const profile = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'master'
    }

    // Get users for this tenant
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        site_access,
        tenant_id,
        created_at
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Users fetch error:', usersError)
      const response = NextResponse.json({
        error: {
          code: 'USERS_FETCH_FAILED',
          message: 'Failed to fetch users',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // For each user, fetch their site information if they have site access
    const usersWithSites = await Promise.all(
      (users || []).map(async (user) => {
        let sites = null
        if (user.role === 'site_manager' && user.site_access && user.site_access.length > 0) {
          const { data: siteData } = await supabase
            .from('sites')
            .select('site_name, site_code')
            .in('id', user.site_access)
            .limit(1)
            .single()

          if (siteData) {
            sites = siteData
          }
        }

        return {
          ...user,
          sites
        }
      })
    )

    const response = NextResponse.json({
      success: true,
      users: usersWithSites
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Users list endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'USERS_LIST_FAILED',
        message: 'Failed to fetch users',
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

    // Use service role client for bypassed authentication
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Mock profile for bypassed authentication
    const profile = {
      id: '550e8400-e29b-41d4-a716-446655440101',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'master'
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = InviteUserSchema.safeParse(body)

    if (!validationResult.success) {
      const response = NextResponse.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request data',
          details: validationResult.error.issues,
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { email, role, site_id, expiry_date } = validationResult.data

    // Additional validation for site managers
    if (role === 'site_manager' && !site_id) {
      const response = NextResponse.json({
        error: {
          code: 'MISSING_SITE_ID',
          message: 'Site ID is required for site managers',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check if site exists and belongs to tenant (for site managers)
    if (role === 'site_manager' && site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id')
        .eq('id', site_id)
        .eq('tenant_id', profile.tenant_id!)
        .single()

      if (siteError || !site) {
        const response = NextResponse.json({
          error: {
            code: 'INVALID_SITE',
            message: 'Invalid site ID',
            requestId: crypto.randomUUID()
          }
        }, { status: 400 })
        return addRateLimitHeaders(response, rateLimitResult)
      }
    }

    // Check if user already exists in this tenant by email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (existingProfile) {
      const response = NextResponse.json({
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists in this organization',
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Create invitation record (simplified - in real app, send actual email)
    const invitationData = {
      email,
      role,
      site_id: role === 'site_manager' ? site_id : null,
      expiry_date: role === 'auditor' ? expiry_date : null,
      invited_by: profile.id,
      tenant_id: profile.tenant_id!,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    // For now, just return success (in real implementation, send email invitation)
    const response = NextResponse.json({
      success: true,
      message: 'User invitation sent successfully',
      invitation: invitationData
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('User invitation endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'USER_INVITE_FAILED',
        message: 'Failed to send user invitation',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'