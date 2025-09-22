import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { HealthResponseSchema } from '@/utils/schemas'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const timestamp = new Date().toISOString()
    
    // Check database connectivity
    let databaseStatus: { status: 'ok' | 'error', message?: string } = { status: 'ok' }
    try {
      const { error } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .limit(1)
      
      if (error) {
        databaseStatus = { status: 'error', message: 'Database query failed' }
      }
    } catch (error) {
      databaseStatus = { status: 'error', message: 'Database connection failed' }
    }

    // Check auth service
    let authStatus: { status: 'ok' | 'error', message?: string } = { status: 'ok' }
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.getUser()
      
      // Note: This will return an error if no user is authenticated, which is expected
      // We're just checking if the auth service is responding
      if (error && !error.message.includes('JWT')) {
        authStatus = { status: 'error', message: 'Auth service unavailable' }
      }
    } catch (error) {
      authStatus = { status: 'error', message: 'Auth service connection failed' }
    }

    const healthData = {
      status: 'ok' as const,
      timestamp,
      database: databaseStatus,
      auth: authStatus
    }

    // Validate response against schema
    const validatedResponse = HealthResponseSchema.parse(healthData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Health check error:', error)
    
    const errorResponse = {
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Disable caching for health checks
export const dynamic = 'force-dynamic'
