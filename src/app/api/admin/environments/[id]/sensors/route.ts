import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can access this endpoint
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
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

    const { id } = await params
    const environmentId = id

    // Get sensors for this environment
    const { data: sensors, error } = await supabase
      .from('sensors')
      .select(`
        id,
        name,
        local_id,
        model,
        status,
        battery_level,
        last_reading_at,
        created_at,
        updated_at
      `)
      .eq('environment_id', environmentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sensors:', error)
      return NextResponse.json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch sensors',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
    }

    return NextResponse.json({ sensors: sensors || [] })

  } catch (error) {
    console.error('Admin environment sensors API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}