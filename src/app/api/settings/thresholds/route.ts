import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ThresholdRequestSchema, ThresholdResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'
import { canManageThresholds } from '@/utils/auth'

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

    // Use service role client for bypassed authentication (bypasses RLS)
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    const { profile } = authContext

    // Parse query parameters
    const url = new URL(request.url)
    const level = url.searchParams.get('level') as 'org' | 'site' | 'environment' | 'sensor' | null
    const levelRefId = url.searchParams.get('level_ref_id')

    // Build query based on parameters
    let query = supabase
      .from('thresholds')
      .select('*')
      .eq('tenant_id', profile.tenant_id!)

    if (level) {
      query = query.eq('level', level)
    }

    if (levelRefId) {
      query = query.eq('level_ref_id', levelRefId)
    }

    const { data: thresholds, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Thresholds query error:', error)
      const response = NextResponse.json({
        error: {
          code: 'THRESHOLDS_FETCH_FAILED',
          message: 'Failed to fetch thresholds',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({ thresholds: thresholds || [] })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Thresholds GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'THRESHOLDS_FAILED',
        message: 'Failed to fetch thresholds data',
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

    // Use service role client for bypassed authentication (bypasses RLS)
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    const { profile } = authContext

    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = ThresholdRequestSchema.parse(body)

    // Check permissions based on level
    const canManage = canManageThresholds(profile, validatedRequest.level === 'site' ? validatedRequest.level_ref_id : undefined)
    if (!canManage) {
      const response = NextResponse.json(createAuthError('Insufficient permissions to manage thresholds'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Prepare threshold data
    const thresholdData = {
      tenant_id: profile.tenant_id!,
      level: validatedRequest.level,
      level_ref_id: validatedRequest.level_ref_id,
      min_c: validatedRequest.min_c,
      max_c: validatedRequest.max_c,
      created_by: profile.id
    }

    // Check if threshold already exists for this level and ref
    const { data: existingThreshold } = await supabase
      .from('thresholds')
      .select('id')
      .eq('tenant_id', profile.tenant_id!)
      .eq('level', validatedRequest.level)
      .eq('level_ref_id', validatedRequest.level_ref_id)
      .single()

    let result
    if (existingThreshold) {
      // Update existing threshold
      const { data, error } = await supabase
        .from('thresholds')
        .update({
          min_c: validatedRequest.min_c,
          max_c: validatedRequest.max_c,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingThreshold.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new threshold
      const { data, error } = await supabase
        .from('thresholds')
        .insert(thresholdData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    // Validate response
    const validatedResponse = ThresholdResponseSchema.parse({
      success: true,
      threshold: {
        id: result.id,
        level: result.level,
        level_ref_id: result.level_ref_id,
        min_c: result.min_c,
        max_c: result.max_c,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    })

    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Thresholds POST endpoint error:', error)

    let statusCode = 500
    let errorMessage = 'Failed to save threshold'

    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        statusCode = 400
        errorMessage = 'Invalid threshold data'
      } else if (error.message.includes('permission')) {
        statusCode = 403
        errorMessage = 'Insufficient permissions'
      }
    }

    const errorResponse = {
      error: {
        code: 'THRESHOLD_SAVE_FAILED',
        message: errorMessage,
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

export const dynamic = 'force-dynamic'