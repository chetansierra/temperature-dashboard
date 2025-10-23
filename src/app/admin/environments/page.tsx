'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CreateEnvironmentForm from '@/components/admin/CreateEnvironmentForm'

interface Environment {
  id: string
  name: string
  type: string
  status: string
  sensor_count: number
  alert_count: number
  last_reading: string | null
  last_temperature: number | null
  last_humidity: number | null
  health_status: string
  created_at: string
  site: {
    id: string
    name: string
    location: string
    tenant: {
      id: string
      name: string
      slug: string
    } | null
  } | null
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface Site {
  id: string
  name: string
  location: string
  tenant_id: string
}

export default function AdminEnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filters, setFilters] = useState({
    organization: '',
    site: '',
    type: '',
    status: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchEnvironments()
  }, [filters])

  useEffect(() => {
    if (filters.organization) {
      fetchSitesForOrganization(filters.organization)
    } else {
      setSites([])
    }
  }, [filters.organization])

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
      
      // Fetch organizations for filter dropdown
      const orgResponse = await fetch('/api/admin/organizations', {
        headers,
        credentials: 'include'
      })
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganizations(orgData.organizations || [])
      }

      await fetchEnvironments()
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load environments data')
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvironments = async () => {
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
      if (filters.site) params.append('site_id', filters.site)
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/admin/environments?${params.toString()}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch environments')
      }
      
      const data = await response.json()
      setEnvironments(data.environments || [])
    } catch (err) {
      console.error('Error fetching environments:', err)
      if (!loading) {
        setError('Failed to load environments')
      }
    }
  }

  const fetchSitesForOrganization = async (organizationId: string) => {
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

      const response = await fetch(`/api/admin/sites?organization_id=${organizationId}`, {
        headers,
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSites(data.sites || [])
      }
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      // Clear site filter when organization changes
      if (key === 'organization') {
        newFilters.site = ''
      }
      return newFilters
    })
  }

  const clearFilters = () => {
    setFilters({ organization: '', site: '', type: '', status: '' })
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'no_sensors': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy'
      case 'warning': return 'Alerts'
      case 'error': return 'Error'
      case 'no_sensors': return 'No Sensors'
      default: return 'Unknown'
    }
  }

  const getEnvironmentTypeIcon = (type: string) => {
    switch (type) {
      case 'indoor':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      case 'outdoor':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'cold_storage':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
    }
  }

  // Group environments by organization
  const environmentsByOrganization = environments.reduce((acc, env) => {
    const orgName = env.site?.tenant?.name || 'Unknown Organization'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push(env)
    return acc
  }, {} as Record<string, Environment[]>)

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
          <h1 className="text-2xl font-bold text-gray-900">Environment Management</h1>
          <p className="text-gray-600 mt-1">Manage environments across all organizations</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Environments</h3>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Environment Management</h1>
            <p className="text-gray-600 mt-1">Manage environments across all organizations</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Environment
          </button>
        </div>
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              id="organization"
              value={filters.organization}
              onChange={(e) => handleFilterChange('organization', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-2">
              Site
            </label>
            <select
              id="site"
              value={filters.site}
              onChange={(e) => handleFilterChange('site', e.target.value)}
              disabled={!filters.organization}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} - {site.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              id="type"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="cold_storage">Cold Storage</option>
              <option value="warehouse">Warehouse</option>
              <option value="office">Office</option>
              <option value="laboratory">Laboratory</option>
              <option value="other">Other</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Environments</p>
              <p className="text-2xl font-bold text-gray-900">{environments.length}</p>
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
              <p className="text-sm font-medium text-gray-600">Healthy Environments</p>
              <p className="text-2xl font-bold text-gray-900">
                {environments.filter(env => env.health_status === 'healthy').length}
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
              <p className="text-sm font-medium text-gray-600">With Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {environments.filter(env => env.alert_count > 0).length}
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
                {environments.reduce((total, env) => total + env.sensor_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environments by Organization */}
      {Object.keys(environmentsByOrganization).length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Environments Found</h3>
          <p className="text-gray-600 mb-6">No environments match your current filters.</p>
          <div className="space-x-4">
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Environment
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(environmentsByOrganization).map(([orgName, orgEnvironments]) => (
            <div key={orgName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{orgName}</h3>
                  <span className="text-sm text-gray-500">{orgEnvironments.length} environments</span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {orgEnvironments.map((environment) => (
                  <div key={environment.id} className="p-6 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.location.href = `/admin/environments/${environment.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-400">
                            {getEnvironmentTypeIcon(environment.type)}
                          </div>
                          <h4 className="text-lg font-medium text-gray-900">{environment.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {environment.type.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            environment.status === 'active' ? 'bg-green-100 text-green-800' :
                            environment.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {environment.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(environment.health_status)}`}>
                            {getHealthStatusText(environment.health_status)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{environment.site?.name} - {environment.site?.location}</span>
                          <span>•</span>
                          <span>{environment.sensor_count} sensors</span>
                          {environment.alert_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-medium">{environment.alert_count} alerts</span>
                            </>
                          )}
                          {environment.last_reading && (
                            <>
                              <span>•</span>
                              <span>Last reading: {new Date(environment.last_reading).toLocaleString()}</span>
                              {environment.last_temperature && (
                                <span>({environment.last_temperature}°C)</span>
                              )}
                            </>
                          )}
                          <span>•</span>
                          <span>Created: {new Date(environment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex items-center space-x-3">
                        <Link
                          href={`/admin/environments/${environment.id}`}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/admin/environments/${environment.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/view-as/${environment.site?.tenant?.id}`}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Organization
                        </Link>
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Environment Form */}
      {showCreateForm && (
        <CreateEnvironmentForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            fetchData()
          }}
        />
      )}
    </div>
  )
}