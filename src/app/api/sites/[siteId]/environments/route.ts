import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, validateOrganizationAccess } from '@/utils/auth'
import { createStandardError, createOrganizationAccessError, createNotFoundError } from '@/utils/errors'

export async function GET(request: NextRequest, { params }: { params: { siteId: string } }) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
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
    
    // First verify the site exists and get its organization
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, tenant_id, name')
      .eq('id', params.siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        createNotFoundError('site', params.siteId),
        { status: 404 }
      )
    }

    // Check organization access using the new validation function
    if (!validateOrganizationAccess(authContext.profile.tenant_id, site.tenant_id, authContext.profile.role)) {
      return NextResponse.json(
        createOrganizationAccessError(authContext.profile.tenant_id, site.tenant_id),
        { status: 403 }
      )
    }

    // Get environments for the site
    const { data: environments, error } = await supabase
      .from('environments')
      .select(`
        id,
        name,
        type,
        status,
        description,
        created_at,
        site_id
      `)
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching environments:', error)
      return NextResponse.json(
        createStandardError('FETCH_FAILED', 'Failed to fetch environments data', { error: error.message }),
        { status: 500 }
      )
    }

    // Get sensor counts for each environment
    const environmentsWithCounts = await Promise.all(
      (environments || []).map(async (env) => {
        const { count } = await supabase
          .from('sensors')
          .select('id', { count: 'exact' })
          .eq('environment_id', env.id)

        return {
          ...env,
          sensor_count: count || 0
        }
      })
    )

    return NextResponse.json({
      environments: environmentsWithCounts,
      total: environmentsWithCounts.length,
      site: {
        id: site.id,
        name: site.name
      }
    })

  } catch (error) {
    console.error('Site environments API error:', error)
    return NextResponse.json(
      createStandardError('INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'