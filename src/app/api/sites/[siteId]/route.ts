import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SiteDetailResponseSchema } from '@/utils/schemas'
import { getAuthContext, createAuthError, canAccessSite } from '@/utils/auth'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
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

    const { profile } = authContext
    const { siteId } = await params

    // Check if user can access this site
    if (!canAccessSite(profile, siteId)) {
      const response = NextResponse.json(createAuthError('Access denied to this site'), { status: 403 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Use service role client for bypassed authentication
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      const response = NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get environments for this site
    const { data: environmentsData, error: environmentsError } = await supabase
      .from('environments')
      .select(`
        id,
        name,
        environment_type,
        description,
        created_at
      `)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (environmentsError) {
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
    const environments = await Promise.all(
      (environmentsData || []).map(async (env) => {
        // Get sensor count
        const { count: sensorCount } = await supabase
          .from('sensors')
          .select('*', { count: 'exact', head: true })
          .eq('environment_id', env.id)

        // Get active alerts count
        const { count: activeAlertsCount } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('environment_id', env.id)
          .in('status', ['open', 'acknowledged'])

        // Get recent readings for average temperature (last 24 hours)
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        // First get sensor IDs for this environment
        const { data: sensors } = await supabase
          .from('sensors')
          .select('id')
          .eq('environment_id', env.id)

        let avgTemperature = null
        if (sensors && sensors.length > 0) {
          const sensorIds = sensors.map(s => s.id)

          const { data: readings } = await supabase
            .from('readings')
            .select('value')
            .in('sensor_id', sensorIds)
            .gte('ts', yesterday.toISOString())
            .limit(100)

          avgTemperature = readings && readings.length > 0
            ? readings.reduce((sum, reading) => sum + reading.value, 0) / readings.length
            : null
        }

        return {
          id: env.id,
          name: env.name,
          environment_type: env.environment_type,
          description: env.description,
          sensor_count: sensorCount || 0,
          active_alerts: activeAlertsCount || 0,
          avg_temperature: avgTemperature,
          created_at: env.created_at
        }
      })
    )

    // Get recent alerts for this site
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        id,
        severity,
        status,
        title,
        message,
        triggered_at,
        sensor_id
      `)
      .eq('site_id', siteId)
      .in('status', ['active'])
      .order('triggered_at', { ascending: false })
      .limit(20)

    // Get environment and sensor names for each alert
    const alerts = await Promise.all(
      (alertsData || []).map(async (alert) => {
        let environment_name = null
        let sensor_name = null

        if (alert.sensor_id) {
          // Get sensor and environment info
          const { data: sensorData } = await supabase
            .from('sensors')
            .select(`
              name,
              environments(name)
            `)
            .eq('id', alert.sensor_id)
            .single()

          if (sensorData) {
            sensor_name = sensorData.name
            environment_name = (sensorData.environments as any)?.name || null
          }
        }

        return {
          id: alert.id,
          level: alert.severity, // Map severity to level
          status: alert.status,
          message: alert.title || alert.message, // Use title if available, otherwise message
          environment_name,
          sensor_name,
          opened_at: alert.triggered_at // Map triggered_at to opened_at
        }
      })
    )

    // Transform site data to match schema
    const transformedSite = {
      id: site.id,
      tenant_id: site.tenant_id,
      site_name: site.name, // Map 'name' field to 'site_name'
      location: site.location,
      timezone: site.timezone,
      created_at: new Date(site.created_at).toISOString(), // Convert to ISO format with Z
      updated_at: new Date(site.updated_at).toISOString() // Convert to ISO format with Z
    }

    // Transform environments data to match schema
    const transformedEnvironments = environments.map(env => ({
      id: env.id,
      name: env.name,
      environment_type: env.environment_type,
      description: env.description,
      sensor_count: env.sensor_count,
      active_alerts: env.active_alerts,
      avg_temperature: env.avg_temperature,
      created_at: new Date(env.created_at).toISOString() // Convert to ISO format with Z
    }))

    // Transform alerts data to match schema
    const transformedAlerts = alerts.map(alert => ({
      id: alert.id,
      level: alert.level,
      status: alert.status,
      message: alert.message,
      environment_name: alert.environment_name,
      sensor_name: alert.sensor_name,
      opened_at: new Date(alert.opened_at).toISOString() // Convert to ISO format with Z
    }))

    const responseData = {
      site: transformedSite,
      environments: transformedEnvironments,
      alerts: transformedAlerts
    }

    // Validate response against schema
    const validatedResponse = SiteDetailResponseSchema.parse(responseData)
    
    const response = NextResponse.json(validatedResponse)
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Site detail endpoint error:', error)
    
    const errorResponse = {
      error: {
        code: 'SITE_DETAIL_FAILED',
        message: 'Failed to fetch site details',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.get(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Use service role client for bypassed authentication (bypasses RLS)
    const { supabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = supabaseAdmin

    // Mock profile for bypassed authentication
    const profile = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'master'
    }

    const { siteId } = await params

    // Parse request body
    const body = await request.json()
    const { name, location, timezone } = body

    if (!name || !location) {
      const response = NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and location are required',
          requestId: crypto.randomUUID()
        }
      }, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check if site exists and belongs to tenant
    const { data: existingSite, error: fetchError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !existingSite) {
      const response = NextResponse.json({
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found',
          requestId: crypto.randomUUID()
        }
      }, { status: 404 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Generate site code if name changed
    const siteCode = name !== existingSite.name
      ? `SITE-${name.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}`
      : existingSite.site_code

    // Update site
    const { data: updatedSite, error: updateError } = await supabase
      .from('sites')
      .update({
        name,
        site_code: siteCode,
        location,
        timezone
      })
      .eq('id', siteId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Site update error:', updateError)
      const response = NextResponse.json({
        error: {
          code: 'SITE_UPDATE_FAILED',
          message: 'Failed to update site',
          requestId: crypto.randomUUID()
        }
      }, { status: 500 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json({
      site: {
        id: updatedSite.id,
        tenant_id: updatedSite.tenant_id,
        site_name: updatedSite.name,
        site_code: updatedSite.site_code,
        location: updatedSite.location,
        timezone: updatedSite.timezone,
        created_at: new Date(updatedSite.created_at).toISOString(),
        updated_at: new Date(updatedSite.updated_at).toISOString()
      }
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Site update endpoint error:', error)

    const errorResponse = {
      error: {
        code: 'SITE_UPDATE_FAILED',
        message: 'Failed to update site',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
