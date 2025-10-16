import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthContext, createAuthError } from '@/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json(createAuthError('Authentication required'), { status: 401 })
    }

    // Only admins can access this endpoint
    if (authContext.profile.role !== 'admin') {
      return NextResponse.json(createAuthError('Admin access required'), { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const type = url.searchParams.get('type') // organizations, users, sites, environments, sensors, all
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: {
          organizations: [],
          users: [],
          sites: [],
          environments: [],
          sensors: []
        },
        total: 0
      })
    }

    const searchTerm = `%${query.trim()}%`
    const results: any = {
      organizations: [],
      users: [],
      sites: [],
      environments: [],
      sensors: []
    }

    // Search Organizations
    if (!type || type === 'organizations' || type === 'all') {
      const { data: organizations } = await supabase
        .from('tenants')
        .select('id, name, slug, plan, status, max_users, created_at')
        .or(`name.ilike.${searchTerm},slug.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(type === 'all' ? 10 : limit)

      results.organizations = (organizations || []).map(org => ({
        ...org,
        type: 'organization',
        title: org.name,
        subtitle: `${org.slug} • ${org.plan} plan`,
        url: `/admin/organizations/${org.id}/users`
      }))
    }

    // Search Users
    if (!type || type === 'users' || type === 'all') {
      const { data: users } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, role, status, created_at, tenant_id
        `)
        .neq('role', 'admin')
        .or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(type === 'all' ? 10 : limit)

      // Get tenant names for users
      const usersWithTenants = await Promise.all(
        (users || []).map(async (user) => {
          if (user.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name, slug')
              .eq('id', user.tenant_id)
              .single()
            return { ...user, tenant }
          }
          return { ...user, tenant: null }
        })
      )

      results.users = usersWithTenants.map(user => ({
        ...user,
        type: 'user',
        title: user.full_name || user.email,
        subtitle: `${user.email} • ${user.role} • ${user.tenant?.name || 'No organization'}`,
        url: `/admin/users/${user.id}/edit`
      }))
    }

    // Search Sites
    if (!type || type === 'sites' || type === 'all') {
      const { data: sites } = await supabase
        .from('sites')
        .select(`
          id, name, location, status, created_at, tenant_id
        `)
        .or(`name.ilike.${searchTerm},location.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(type === 'all' ? 10 : limit)

      // Get tenant names for sites
      const sitesWithTenants = await Promise.all(
        (sites || []).map(async (site) => {
          if (site.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name, slug')
              .eq('id', site.tenant_id)
              .single()
            return { ...site, tenant }
          }
          return { ...site, tenant: null }
        })
      )

      results.sites = sitesWithTenants.map(site => ({
        ...site,
        type: 'site',
        title: site.name,
        subtitle: `${site.location} • ${site.tenant?.name || 'Unknown organization'}`,
        url: `/admin/view-as/${site.tenant?.id}`
      }))
    }

    // Search Environments
    if (!type || type === 'environments' || type === 'all') {
      const { data: environments } = await supabase
        .from('environments')
        .select(`
          id, name, type, status, created_at, site_id,
          sites(id, name, location, tenant_id)
        `)
        .ilike('name', searchTerm)
        .order('created_at', { ascending: false })
        .limit(type === 'all' ? 10 : limit)

      // Get tenant names for environments
      const environmentsWithTenants = await Promise.all(
        (environments || []).map(async (env) => {
          if (env.sites?.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name, slug')
              .eq('id', env.sites.tenant_id)
              .single()
            return { ...env, site: { ...env.sites, tenant } }
          }
          return { ...env, site: env.sites }
        })
      )

      results.environments = environmentsWithTenants.map(env => ({
        ...env,
        type: 'environment',
        title: env.name,
        subtitle: `${env.type} • ${env.site?.name} • ${env.site?.tenant?.name || 'Unknown organization'}`,
        url: `/admin/environments/${env.id}/edit`
      }))
    }

    // Search Sensors
    if (!type || type === 'sensors' || type === 'all') {
      const { data: sensors } = await supabase
        .from('sensors')
        .select(`
          id, name, type, status, created_at, environment_id,
          environments(id, name, type, site_id, sites(id, name, location, tenant_id))
        `)
        .ilike('name', searchTerm)
        .order('created_at', { ascending: false })
        .limit(type === 'all' ? 10 : limit)

      // Get tenant names for sensors
      const sensorsWithTenants = await Promise.all(
        (sensors || []).map(async (sensor) => {
          if (sensor.environments?.sites?.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name, slug')
              .eq('id', sensor.environments.sites.tenant_id)
              .single()
            return { 
              ...sensor, 
              environment: { 
                ...sensor.environments, 
                site: { ...sensor.environments.sites, tenant } 
              } 
            }
          }
          return { ...sensor, environment: sensor.environments }
        })
      )

      results.sensors = sensorsWithTenants.map(sensor => ({
        ...sensor,
        type: 'sensor',
        title: sensor.name,
        subtitle: `${sensor.type} • ${sensor.environment?.name} • ${sensor.environment?.site?.tenant?.name || 'Unknown organization'}`,
        url: `/admin/sensors/${sensor.id}/edit`
      }))
    }

    const total = Object.values(results).reduce((sum: number, items: any[]) => sum + (Array.isArray(items) ? items.length : 0), 0)

    return NextResponse.json({
      results,
      total,
      query: query.trim()
    })

  } catch (error) {
    console.error('Admin search API error:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: crypto.randomUUID()
      }
    }, { status: 500 })
  }
}