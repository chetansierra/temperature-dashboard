'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CreateSensorForm from '@/components/admin/CreateSensorForm'
import BulkSensorImport from '@/components/admin/BulkSensorImport'

interface Sensor {
  id: string
  name: string
  type: string
  status: string
  battery_level: number | null
  alert_count: number
  last_temperature: number | null
  last_humidity: number | null
  last_reading: string | null
  health_status: string
  created_at: string
  environment: {
    id: string
    name: string
    type: string
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
}

interface Environment {
  id: string
  name: string
  type: string
}

export default function AdminSensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [filters, setFilters] = useState({
    organization: '',
    site: '',
    environment: '',
    type: '',
    status: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchSensors()
  }, [filters])

  useEffect(() => {
    if (filters.organization) {
      fetchSitesForOrganization(filters.organization)
    } else {
      setSites([])
      setEnvironments([])
      setFilters(prev => ({ ...prev, site: '', environment: '' }))
    }
  }, [filters.organization])

  useEffect(() => {
    if (filters.site) {
      fetchEnvironmentsForSite(filters.site)
    } else {
      setEnvironments([])
      setFilters(prev => ({ ...prev, environment: '' }))
    }
  }, [filters.site])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch organizations for filter dropdown
      const orgResponse = await fetch('/api/admin/organizations')
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganizations(orgData.organizations || [])
      }

      await fetchSensors()
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load sensors data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSensors = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.organization) params.append('organization_id', filters.organization)
      if (filters.site) params.append('site_id', filters.site)
      if (filters.environment) params.append('environment_id', filters.environment)
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/admin/sensors?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sensors')
      }
      
      const data = await response.json()
      setSensors(data.sensors || [])
    } catch (err) {
      console.error('Error fetching sensors:', err)
      if (!loading) {
        setError('Failed to load sensors')
      }
    }
  }

  const fetchSitesForOrganization = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/admin/sites?organization_id=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setSites(data.sites || [])
      }
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }

  const fetchEnvironmentsForSite = async (siteId: string) => {
    try {
      const response = await fetch(`/api/admin/environments?site_id=${siteId}`)
      if (response.ok) {
        const data = await response.json()
        setEnvironments(data.environments || [])
      }
    } catch (err) {
      console.error('Error fetching environments:', err)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      // Clear dependent filters when parent changes
      if (key === 'organization') {
        newFilters.site = ''
        newFilters.environment = ''
      } else if (key === 'site') {
        newFilters.environment = ''
      }
      return newFilters
    })
  }

  const clearFilters = () => {
    setFilters({ organization: '', site: '', environment: '', type: '', status: '' })
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'low_battery': return 'bg-orange-100 text-orange-800'
      case 'no_data': return 'bg-gray-100 text-gray-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy'
      case 'warning': return 'Alerts'
      case 'low_battery': return 'Low Battery'
      case 'no_data': return 'No Data'
      case 'inactive': return 'Inactive'
      default: return 'Unknown'
    }
  }

  const getSensorTypeIcon = (type: string) => {
    switch (type) {
      case 'temperature':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'humidity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'temperature_humidity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
    }
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-400'
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Group sensors by organization
  const sensorsByOrganization = sensors.reduce((acc, sensor) => {
    const orgName = sensor.environment?.site?.tenant?.name || 'Unknown Organization'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push(sensor)
    return acc
  }, {} as Record<string, Sensor[]>)

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
          <h1 className="text-2xl font-bold text-gray-900">Sensor Management</h1>
          <p className="text-gray-600 mt-1">Manage sensors across all organizations</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Sensors</h3>
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
            <h1 className="text-2xl font-bold text-gray-900">Sensor Management</h1>
            <p className="text-gray-600 mt-1">Manage sensors across all organizations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Bulk Import
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Sensor
            </button>
          </div>
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
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select
              id="environment"
              value={filters.environment}
              onChange={(e) => handleFilterChange('environment', e.target.value)}
              disabled={!filters.site}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">All Environments</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name} ({env.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Sensor Type
            </label>
            <select
              id="type"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="temperature_humidity">Temperature & Humidity</option>
              <option value="pressure">Pressure</option>
              <option value="air_quality">Air Quality</option>
              <option value="motion">Motion</option>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sensors</p>
              <p className="text-2xl font-bold text-gray-900">{sensors.length}</p>
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
              <p className="text-sm font-medium text-gray-600">Healthy Sensors</p>
              <p className="text-2xl font-bold text-gray-900">
                {sensors.filter(sensor => sensor.health_status === 'healthy').length}
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
                {sensors.filter(sensor => sensor.alert_count > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Battery</p>
              <p className="text-2xl font-bold text-gray-900">
                {sensors.filter(sensor => sensor.health_status === 'low_battery').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">No Data</p>
              <p className="text-2xl font-bold text-gray-900">
                {sensors.filter(sensor => sensor.health_status === 'no_data').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sensors by Organization */}
      {Object.keys(sensorsByOrganization).length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensors Found</h3>
          <p className="text-gray-600 mb-6">No sensors match your current filters.</p>
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
              Create Sensor
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(sensorsByOrganization).map(([orgName, orgSensors]) => (
            <div key={orgName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{orgName}</h3>
                  <span className="text-sm text-gray-500">{orgSensors.length} sensors</span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {orgSensors.map((sensor) => (
                  <div key={sensor.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-400">
                            {getSensorTypeIcon(sensor.type)}
                          </div>
                          <h4 className="text-lg font-medium text-gray-900">{sensor.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            {sensor.type.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            sensor.status === 'active' ? 'bg-green-100 text-green-800' :
                            sensor.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sensor.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(sensor.health_status)}`}>
                            {getHealthStatusText(sensor.health_status)}
                          </span>
                          {sensor.battery_level !== null && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${getBatteryColor(sensor.battery_level)}`}>
                              🔋 {sensor.battery_level}%
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{sensor.environment?.site?.name} - {sensor.environment?.site?.location}</span>
                          <span>•</span>
                          <span>{sensor.environment?.name} ({sensor.environment?.type})</span>
                          {sensor.alert_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-medium">{sensor.alert_count} alerts</span>
                            </>
                          )}
                          {sensor.last_reading && (
                            <>
                              <span>•</span>
                              <span>Last reading: {new Date(sensor.last_reading).toLocaleString()}</span>
                              {sensor.last_temperature && (
                                <span>({sensor.last_temperature}°C)</span>
                              )}
                            </>
                          )}
                          <span>•</span>
                          <span>Created: {new Date(sensor.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex items-center space-x-3">
                        <Link
                          href={`/admin/sensors/${sensor.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/view-as/${sensor.environment?.site?.tenant?.id}`}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
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

      {/* Create Sensor Form */}
      {showCreateForm && (
        <CreateSensorForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            fetchData()
          }}
        />
      )}

      {/* Bulk Import Form */}
      {showBulkImport && (
        <BulkSensorImport
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            fetchData()
          }}
        />
      )}
    </div>
  )
}