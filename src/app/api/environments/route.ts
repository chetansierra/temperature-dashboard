import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'
import { z } from 'zod'

const CreateEnvironmentSchema = z.object({
  site_id: z.string().uuid(),
  environment_type: z.enum(['cold_storage', 'blast_freezer', 'chiller', 'other']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
})

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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200) // Default 50, max 200

    let environmentsQuery = supabase
      .from('environments')
      .select(`
        id,
        environment_type,
        name,
        description,
        created_at,
        site_id
      `)
      .eq('tenant_id', profile.tenant_id!)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (siteId) {
      // Check permissions - verify user can access the site
      if (!canAccessSite(profile, siteId)) {
        const response = NextResponse.json(createAuthError('Access denied to this site'), { status: 403 })
        return addRateLimitHeaders(response, rateLimitResult)
      }

      // Filter by specific site
      environmentsQuery = environmentsQuery.eq('site_id', siteId)
    } else {
      // For overview/all environments, only return environments from sites the user can access
      // This is a simplified approach - in production you might want more sophisticated filtering
      if (profile.role !== 'master' && profile.role !== 'admin') {
        // For site managers, only show environments from their assigned sites
        if (profile.site_access && profile.site_access.length > 0) {
          environmentsQuery = environmentsQuery.in('site_id', profile.site_access)
        } else {
          // No site access - return empty
          const response = NextResponse.json({ environments: [] })
          return addRateLimitHeaders(response, rateLimitResult)
        }
      }
    }

    // Get environments
    const { data: environments, error } = await environmentsQuery

    if (error) {
      console.error('Environments query error:', error)
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENTS_FETCH_FAILED',
          message: 'Failed to fetch environments',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get additional data for each environment
    const environmentsWithDetails = await Promise.all(
      (environments || []).map(async (env) => {
        // Get sensor count and active sensor count
        const { data: sensors } = await supabase
          .from('sensors')
          .select('id, status')
          .eq('environment_id', env.id)

        const sensorCount = sensors?.length || 0
        const activeSensorCount = sensors?.filter(s => s.status === 'active').length || 0

        // Get active alerts count
        const { count: activeAlertsCount } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('environment_id', env.id)
          .in('status', ['open', 'acknowledged'])

        // Get site information
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', env.site_id)
          .single()

        // Get thresholds for this environment
        const { data: thresholds } = await supabase
          .from('thresholds')
          .select('min_temperature, max_temperature')
          .eq('environment_id', env.id)
          .eq('is_active', true)
          .limit(1)
          .single()

        // Get recent readings for average temperature (last 24 hours)
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        let avgTemperature = null
        let minTemperature = null
        let maxTemperature = null
        let lastReadingAt = null

        if (sensors && sensors.length > 0) {
          const sensorIds = sensors.map(s => s.id)

          const { data: readings } = await supabase
            .from('readings')
            .select('temperature_c, ts')
            .in('sensor_id', sensorIds)
            .gte('ts', yesterday.toISOString())
            .order('ts', { ascending: false })
            .limit(100)

          if (readings && readings.length > 0) {
            const values = readings.map(r => r.temperature_c)
            const timestamps = readings.map(r => r.ts)

            avgTemperature = values.reduce((sum, val) => sum + val, 0) / values.length
            minTemperature = Math.min(...values)
            maxTemperature = Math.max(...values)
            lastReadingAt = timestamps[0] // Most recent reading
          }
        }

        return {
          id: env.id,
          name: env.name,
          environment_type: env.environment_type,
          description: env.description,
          site_name: site?.name || 'Unknown Site',
          site_id: env.site_id,
          sensors_count: sensorCount,
          active_sensors_count: activeSensorCount,
          alert_count: activeAlertsCount || 0,
          avg_temperature: avgTemperature,
          min_temperature: minTemperature,
          max_temperature: maxTemperature,
          threshold_min: thresholds?.min_temperature || null,
          threshold_max: thresholds?.max_temperature || null,
          last_reading_at: lastReadingAt,
          created_at: env.created_at
        }
      })
    )

    const response = NextResponse.json({ environments: environmentsWithDetails })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Environments GET endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'ENVIRONMENTS_FAILED',
        message: 'Failed to fetch environments data',
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateEnvironmentSchema.parse(body)

    // Check permissions - verify user can access the site
    if (!canAccessSite(profile, validatedData.site_id)) {
      const response = NextResponse.json(createAuthError('Access denied to this site'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Verify the site exists and belongs to the user's tenant
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, tenant_id')
      .eq('id', validatedData.site_id)
      .eq('tenant_id', profile.tenant_id!)
      .single()

    if (siteError || !site) {
      const response = NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found or access denied',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check for duplicate environment name in the same site
    const { data: existingEnv } = await supabase
      .from('environments')
      .select('id')
      .eq('site_id', validatedData.site_id)
      .eq('name', validatedData.name)
      .single()

    if (existingEnv) {
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENT_EXISTS',
          message: 'An environment with this name already exists in this site',
          requestId: crypto.randomUUID()
        }
      }, { status: 409 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Create the environment
    const environmentData = {
      site_id: validatedData.site_id,
      tenant_id: profile.tenant_id!,
      environment_type: validatedData.environment_type,
      name: validatedData.name,
      description: validatedData.description || null
    }

    const { data: environment, error: createError } = await supabase
      .from('environments')
      .insert(environmentData)
      .select(`
        id,
        site_id,
        environment_type,
        name,
        description,
        created_at,
        sites (
          site_name,
          site_code
        )
      `)
      .single()

    if (createError) {
      console.error('Environment creation error:', createError)
      const response = NextResponse.json({
        error: {
          code: 'ENVIRONMENT_CREATE_FAILED',
          message: 'Failed to create environment',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({
      success: true,
      environment: {
        id: environment.id,
        site_id: environment.site_id,
        environment_type: environment.environment_type,
        name: environment.name,
        description: environment.description,
        created_at: environment.created_at,
        site: environment.sites
      }
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Environments POST endpoint error:', error)

    let statusCode = 500
    let errorMessage = 'Failed to create environment'

    if (error instanceof z.ZodError) {
      statusCode = 400
      errorMessage = 'Invalid environment data'
    }

    const errorResponse = {
      error: {
        code: 'ENVIRONMENT_CREATION_FAILED',
        message: errorMessage,
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

export const dynamic = 'force-dynamic'