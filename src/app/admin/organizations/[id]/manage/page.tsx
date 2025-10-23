'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  max_users: number
  plan: string
  status: string
  created_at: string
  updated_at: string
  current_users?: number
  total_sites?: number
}

interface Site {
  id: string
  name: string
  location: string
  status: string
  created_at: string
  updated_at: string
  tenant_id: string
}

interface Environment {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  updated_at: string
  site_id: string
}

interface OrganizationResponse {
  organization: Organization
}

interface SitesResponse {
  sites: Site[]
  total: number
}

interface EnvironmentsResponse {
  environments: Environment[]
  total: number
}

export default function OrganizationManagePage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [environments, setEnvironments] = useState<{ [siteId: string]: Environment[] }>({})
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false)
  const [showCreateEnvironmentModal, setShowCreateEnvironmentModal] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizationData()
  }, [organizationId])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
        console.log('Adding Bearer token to organization management requests')
      } else {
        console.warn('No session or access token found for organization management requests')
      }

      // Fetch organization details
      const orgResponse = await fetch(`/api/admin/organizations/${organizationId}`, {
        headers,
        credentials: 'include'
      })
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization')
      }
      const orgData: OrganizationResponse = await orgResponse.json()
      setOrganization(orgData.organization)

      // Fetch sites for this organization
      const sitesResponse = await fetch(`/api/admin/organizations/${organizationId}/sites`, {
        headers,
        credentials: 'include'
      })
      if (!sitesResponse.ok) {
        throw new Error('Failed to fetch sites')
      }
      const sitesData: SitesResponse = await sitesResponse.json()
      setSites(sitesData.sites)

      // Fetch environments for each site
      const envPromises = sitesData.sites.map(async (site) => {
        const envResponse = await fetch(`/api/admin/sites/${site.id}/environments`, {
          headers,
          credentials: 'include'
        })
        if (envResponse.ok) {
          const envData: EnvironmentsResponse = await envResponse.json()
          return { siteId: site.id, environments: envData.environments }
        }
        return { siteId: site.id, environments: [] }
      })

      const envResults = await Promise.all(envPromises)
      const envMap: { [siteId: string]: Environment[] } = {}
      envResults.forEach(({ siteId, environments }) => {
        envMap[siteId] = environments
      })
      setEnvironments(envMap)

    } catch (err) {
      console.error('Error fetching organization data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const toggleSiteExpansion = (siteId: string) => {
    const newExpanded = new Set(expandedSites)
    if (newExpanded.has(siteId)) {
      newExpanded.delete(siteId)
    } else {
      newExpanded.add(siteId)
    }
    setExpandedSites(newExpanded)
  }

  const handleCreateSite = async (formData: { name: string; location: string; status: string }) => {
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

      const response = await fetch(`/api/admin/organizations/${organizationId}/sites`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchOrganizationData() // Refresh data
        setShowCreateSiteModal(false)
      } else {
        const error = await response.json()
        alert(`Error creating site: ${error.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating site:', error)
      alert('Error creating site')
    }
  }

  const handleCreateEnvironment = async (formData: { name: string; type: string; status: string }) => {
    if (!selectedSiteId) return

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

      const response = await fetch(`/api/admin/sites/${selectedSiteId}/environments`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchOrganizationData() // Refresh data
        setShowCreateEnvironmentModal(false)
        setSelectedSiteId(null)
      } else {
        const error = await response.json()
        alert(`Error creating environment: ${error.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating environment:', error)
      alert('Error creating environment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading organization</div>
        <p className="text-gray-600 mb-4">{error || 'Organization not found'}</p>
        <button
          onClick={fetchOrganizationData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Link
          href="/admin/organizations"
          className="flex items-center hover:text-gray-900 transition-colors"
        >
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Organizations
        </Link>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">{organization.name}</span>
      </div>

      {/* Organization Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-gray-600">Organization Management</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/admin/organizations/${organization.id}/users`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Manage Users
            </Link>
            <Link
              href={`/admin/organizations/${organization.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Plan</div>
            <div className="text-lg font-semibold capitalize">{organization.plan}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Status</div>
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(organization.status)}`}>
                {organization.status}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Users</div>
            <div className="text-lg font-semibold">{organization.current_users || 0}/{organization.max_users}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Sites</div>
            <div className="text-lg font-semibold">{sites.length}</div>
          </div>
        </div>
      </div>

      {/* Sites Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sites & Environments</h2>
            <button
              onClick={() => setShowCreateSiteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Site
            </button>
          </div>
        </div>

        <div className="p-6">
          {sites.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sites yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first site.</p>
              <button
                onClick={() => setShowCreateSiteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Site
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sites.map((site) => {
                const isExpanded = expandedSites.has(site.id)
                const siteEnvironments = environments[site.id] || []

                return (
                  <div key={site.id} className="border border-gray-200 rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleSiteExpansion(site.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{site.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {site.location}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(site.status)}`}>
                            {site.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSiteId(site.id)
                              setShowCreateEnvironmentModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Add Environment"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 ml-8">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Environments ({siteEnvironments.length})
                          </h4>
                          {siteEnvironments.length === 0 ? (
                            <p className="text-sm text-gray-600">No environments in this site</p>
                          ) : (
                            <div className="space-y-2">
                              {siteEnvironments.map((env) => (
                                <div 
                                  key={env.id} 
                                  onClick={() => {
                                    console.log('Navigating to environment:', env.id, env.name)
                                    router.push(`/admin/environments/${env.id}`)
                                  }}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-sm cursor-pointer transition-all duration-200"
                                  title={`Click to view ${env.name} environment details`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    <div>
                                      <div className="font-medium text-gray-900">{env.name}</div>
                                      <div className="text-sm text-gray-600 capitalize">{env.type}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(env.status)}`}>
                                      {env.status}
                                    </span>
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateSiteModal && (
        <CreateSiteModal
          onClose={() => setShowCreateSiteModal(false)}
          onSubmit={handleCreateSite}
        />
      )}

      {/* Create Environment Modal */}
      {showCreateEnvironmentModal && selectedSiteId && (
        <CreateEnvironmentModal
          siteId={selectedSiteId}
          siteName={sites.find(s => s.id === selectedSiteId)?.name || ''}
          onClose={() => {
            setShowCreateEnvironmentModal(false)
            setSelectedSiteId(null)
          }}
          onSubmit={handleCreateEnvironment}
        />
      )}
    </div>
  )
}

// Create Site Modal Component
function CreateSiteModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (data: { name: string; location: string; status: string }) => void 
}) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    status: 'active'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim() && formData.location.trim()) {
      onSubmit(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Create New Site</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter site name"
              required
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter location address"
              required
              maxLength={200}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Site Information</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Sites represent physical locations where monitoring equipment is deployed. You can add environments and sensors to sites after creation.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.location.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Site
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Environment Modal Component
function CreateEnvironmentModal({ 
  siteId,
  siteName,
  onClose, 
  onSubmit 
}: { 
  siteId: string
  siteName: string
  onClose: () => void
  onSubmit: (data: { name: string; type: string; status: string }) => void 
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'indoor',
    status: 'active'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      onSubmit(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Create New Environment</h3>
              <p className="text-sm text-gray-600 mt-1">Adding to: {siteName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter environment name"
              required
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="warehouse">Warehouse</option>
              <option value="office">Office</option>
              <option value="production">Production</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-900">Environment Information</h4>
                <p className="text-sm text-green-800 mt-1">
                  Environments are specific areas within a site where sensors are deployed for monitoring temperature, humidity, and other conditions.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Environment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}