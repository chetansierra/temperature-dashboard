'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  max_users: number
  current_users: number
  plan: string
  status: string
  created_at: string
  updated_at: string
}

interface Site {
  id: string
  name: string
  location: string
  description: string | null
  status: string
  environment_count: number
  created_at: string
}

interface Environment {
  id: string
  name: string
  type: string
  status: string
  site_id: string
  created_at: string
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'environments'>('overview')

  useEffect(() => {
    if (params.id) {
      fetchOrganizationData()
    }
  }, [params.id])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
        console.log('Adding Bearer token to organization detail requests')
      } else {
        console.warn('No session or access token found for organization detail requests')
      }
      
      // Fetch organization details
      const orgResponse = await fetch(`/api/admin/organizations/${params.id}`, {
        headers,
        credentials: 'include'
      })
      if (!orgResponse.ok) throw new Error('Failed to fetch organization')
      const orgData = await orgResponse.json()
      setOrganization(orgData.organization)

      // Fetch sites for this organization
      const sitesResponse = await fetch(`/api/admin/sites?organization_id=${params.id}`, {
        headers,
        credentials: 'include'
      })
      if (!sitesResponse.ok) throw new Error('Failed to fetch sites')
      const sitesData = await sitesResponse.json()
      setSites(sitesData.sites || [])

      // Fetch environments for this organization
      const envsResponse = await fetch(`/api/admin/environments?organization_id=${params.id}`, {
        headers,
        credentials: 'include'
      })
      if (!envsResponse.ok) throw new Error('Failed to fetch environments')
      const envsData = await envsResponse.json()
      setEnvironments(envsData.environments || [])

      setError(null)
    } catch (err) {
      console.error('Error fetching organization data:', err)
      setError('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`Are you sure you want to delete "${siteName}"? This will also delete all environments and sensors in this site.`)) {
      return
    }

    try {
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete site')
      }

      // Refresh data
      fetchOrganizationData()
    } catch (err) {
      console.error('Error deleting site:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete site')
    }
  }

  const handleDeleteEnvironment = async (envId: string, envName: string) => {
    if (!confirm(`Are you sure you want to delete "${envName}"? This will also delete all sensors in this environment.`)) {
      return
    }

    try {
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/admin/environments/${envId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete environment')
      }

      // Refresh data
      fetchOrganizationData()
    } catch (err) {
      console.error('Error deleting environment:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete environment')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organization Details</h1>
          <Link
            href="/admin/organizations"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Organizations
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Organization</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrganizationData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organization Details</h1>
          <Link
            href="/admin/organizations"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Organizations
          </Link>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Organization Not Found</h3>
          <p className="text-yellow-600">The requested organization could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-gray-600 mt-1">Manage all aspects of this organization</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/organizations/${organization.id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Organization
          </Link>
          <Link
            href="/admin/organizations"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Organizations
          </Link>
        </div>
      </div>

      {/* Organization Overview */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Plan</div>
              <div className="text-lg font-medium text-gray-900 capitalize">{organization.plan}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-lg font-medium capitalize ${
                organization.status === 'active' ? 'text-green-600' :
                organization.status === 'suspended' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {organization.status}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Users</div>
              <div className="text-lg font-medium text-gray-900">
                {organization.current_users}/{organization.max_users}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Sites</div>
              <div className="text-lg font-medium text-gray-900">{sites.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sites')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sites ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('environments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'environments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Environments ({environments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Sites</h3>
            {sites.slice(0, 3).map((site) => (
              <div key={site.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">{site.name}</div>
                  <div className="text-sm text-gray-600">{site.location}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {site.environment_count} environments
                </div>
              </div>
            ))}
            {sites.length === 0 && (
              <p className="text-gray-500 text-center py-4">No sites created yet</p>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Environments</h3>
            {environments.slice(0, 3).map((env) => (
              <div key={env.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">{env.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{env.type}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {sites.find(s => s.id === env.site_id)?.name || 'Unknown Site'}
                </div>
              </div>
            ))}
            {environments.length === 0 && (
              <p className="text-gray-500 text-center py-4">No environments created yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sites' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Sites</h2>
            <Link
              href={`/admin/organizations/${organization.id}/sites/new`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Site
            </Link>
          </div>

          {sites.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites</h3>
              <p className="text-gray-600 mb-6">Get started by adding the first site to this organization.</p>
              <Link
                href={`/admin/organizations/${organization.id}/sites/new`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Site
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="divide-y divide-gray-200">
                {sites.map((site) => (
                  <div key={site.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{site.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            site.status === 'active' ? 'bg-green-100 text-green-800' :
                            site.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {site.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{site.location}</span>
                          <span>•</span>
                          <span>{site.environment_count} environments</span>
                          <span>•</span>
                          <span>Created: {new Date(site.created_at).toLocaleDateString()}</span>
                        </div>
                        {site.description && (
                          <p className="mt-2 text-sm text-gray-600">{site.description}</p>
                        )}
                      </div>
                      
                      <div className="ml-6 flex items-center space-x-3">
                        <Link
                          href={`/admin/sites/${site.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteSite(site.id, site.name)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'environments' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Environments</h2>
            <Link
              href={`/admin/organizations/${organization.id}/environments/new`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Environment
            </Link>
          </div>

          {environments.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Environments</h3>
              <p className="text-gray-600 mb-6">Add environments to sites in this organization.</p>
              <Link
                href={`/admin/organizations/${organization.id}/environments/new`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Environment
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="divide-y divide-gray-200">
                {environments.map((env) => {
                  const site = sites.find(s => s.id === env.site_id)
                  return (
                    <div key={env.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">{env.name}</h4>
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                              {env.type}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              env.status === 'active' ? 'bg-green-100 text-green-800' :
                              env.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {env.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Site: {site?.name || 'Unknown Site'}</span>
                            <span>•</span>
                            <span>Created: {new Date(env.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="ml-6 flex items-center space-x-3">
                          <Link
                            href={`/admin/environments/${env.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteEnvironment(env.id, env.name)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}