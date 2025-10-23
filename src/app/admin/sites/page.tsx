'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Site {
  id: string
  name: string
  location: string
  status: string
  sensor_count: number
  alert_count: number
  last_reading: string | null
  health_status: string
  created_at: string
  tenant: {
    id: string
    name: string
    slug: string
    plan: string
  } | null
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    organization: '',
    status: '',
    location: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchSites()
  }, [filters])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      // Fetch organizations for filter dropdown (only for admins)
      try {
        const orgResponse = await fetch('/api/admin/organizations', {
          headers,
          credentials: 'include'
        })
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          setOrganizations(orgData.organizations || [])
        }
      } catch (err) {
        // Non-admin users might not have access to organizations endpoint
        console.log('Could not fetch organizations (likely non-admin user)')
      }

      await fetchSites()
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load sites data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSites = async () => {
    try {
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const params = new URLSearchParams()
      if (filters.organization) params.append('organization_id', filters.organization)
      if (filters.status) params.append('status', filters.status)
      if (filters.location) params.append('location', filters.location)

      const response = await fetch(`/api/admin/sites?${params.toString()}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch sites')
      }
      
      const data = await response.json()
      setSites(data.sites || [])
    } catch (err) {
      console.error('Error fetching sites:', err)
      if (!loading) {
        setError('Failed to load sites')
      }
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ organization: '', status: '', location: '' })
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy'
      case 'warning': return 'Alerts'
      case 'error': return 'Error'
      case 'no_data': return 'No Data'
      default: return 'Unknown'
    }
  }

  // Group sites by organization
  const sitesByOrganization = sites.reduce((acc, site) => {
    const orgName = site.tenant?.name || 'Unknown Organization'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push(site)
    return acc
  }, {} as Record<string, Site[]>)

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sites Overview</h1>
          <p className="text-gray-600 mt-1">Monitor all sites across organizations</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Sites</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites Overview</h1>
        <p className="text-gray-600 mt-1">Monitor all sites across organizations</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              id="organization"
              value={filters.organization}
              onChange={(e) => handleFilterChange('organization', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              placeholder="Search by location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sites</p>
              <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Healthy Sites</p>
              <p className="text-2xl font-bold text-gray-900">
                {sites.filter(site => site.health_status === 'healthy').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sites with Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {sites.filter(site => site.alert_count > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sensors</p>
              <p className="text-2xl font-bold text-gray-900">
                {sites.reduce((total, site) => total + site.sensor_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sites by Organization */}
      {Object.keys(sitesByOrganization).length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
          <p className="text-gray-600 mb-6">No sites match your current filters.</p>
          <button
            onClick={clearFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(sitesByOrganization).map(([orgName, orgSites]) => (
            <div key={orgName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{orgName}</h3>
                  <span className="text-sm text-gray-500">{orgSites.length} sites</span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {orgSites.map((site) => (
                  <div key={site.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{site.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            site.status === 'active' ? 'bg-green-100 text-green-800' :
                            site.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {site.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(site.health_status)}`}>
                            {getHealthStatusText(site.health_status)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{site.location}</span>
                          <span>•</span>
                          <span>{site.sensor_count} sensors</span>
                          {site.alert_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-medium">{site.alert_count} alerts</span>
                            </>
                          )}
                          {site.last_reading && (
                            <>
                              <span>•</span>
                              <span>Last reading: {new Date(site.last_reading).toLocaleString()}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Created: {new Date(site.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex items-center space-x-3">
                        <Link
                          href={`/admin/sensors/new?site=${site.id}`}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Add Sensor
                        </Link>
                        <Link
                          href={`/admin/view-as/${site.tenant?.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Organization
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}