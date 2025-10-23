'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Environment {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  updated_at: string
  sensor_count: number
  alert_count: number
  last_reading: string | null
  last_temperature: number | null
  last_humidity: number | null
  health_status: string
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

interface Sensor {
  id: string
  name: string
  local_id: string | null
  model: string | null
  status: string
  battery_level: number | null
  last_reading_at: string | null
  created_at: string
}

export default function EnvironmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [sensorsLoading, setSensorsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEnvironment()
    fetchSensors()
  }, [resolvedParams.id])

  const fetchEnvironment = async () => {
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
      
      const response = await fetch(`/api/admin/environments/${resolvedParams.id}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Environment not found. It may have been deleted or you may not have access to it.')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch environment (${response.status})`)
      }
      
      const data = await response.json()
      setEnvironment(data.environment)
      setError(null)
    } catch (err) {
      console.error('Error fetching environment:', err)
      setError(err instanceof Error ? err.message : 'Failed to load environment')
    } finally {
      setLoading(false)
    }
  }

  const fetchSensors = async () => {
    try {
      setSensorsLoading(true)
      
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch(`/api/admin/environments/${resolvedParams.id}/sensors`, {
        headers,
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSensors(data.sensors || [])
      }
    } catch (err) {
      console.error('Error fetching sensors:', err)
    } finally {
      setSensorsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'no_sensors':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-200 rounded-lg h-96"></div>
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !environment) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/environments" className="hover:text-gray-900">
              Environments
            </Link>
            <span>/</span>
            <span className="text-gray-900">Environment Details</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Environment Details</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Environment</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={fetchEnvironment}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <Link href="/admin/environments" className="hover:text-gray-900">
            Environments
          </Link>
          <span>/</span>
          <span className="text-gray-900">{environment?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{environment?.name}</h1>
            <p className="text-gray-600 mt-1">
              {environment?.site?.name} • {environment?.site?.location} • {environment?.site?.tenant?.name}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(environment?.status || '')}`}>
              {environment?.status}
            </span>
            <Link
              href={`/admin/environments/${environment?.id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Environment
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Layout Area */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Layout Visualization</h3>
            <p className="text-gray-600 mb-4">
              This area will display a 2D/3D model or image of the environment layout
            </p>
            <p className="text-sm text-gray-500">
              Coming soon: Interactive environment mapping
            </p>
          </div>
        </div>

        {/* Right Column - Environment Info & Sensor Management */}
        <div className="space-y-6">
          {/* Environment Information Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Information</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className="text-sm text-gray-900 capitalize">{environment?.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(environment?.status || '')}`}>
                  {environment?.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
                <p className={`text-sm font-medium capitalize ${getHealthStatusColor(environment?.health_status || '')}`}>
                  {environment?.health_status?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sensors</label>
                <p className="text-sm text-gray-900">{environment?.sensor_count || 0} sensors</p>
              </div>
              {environment?.alert_count && environment.alert_count > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active Alerts</label>
                  <p className="text-sm text-red-600 font-medium">{environment.alert_count} alerts</p>
                </div>
              )}
              {environment?.last_reading && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Reading</label>
                  <p className="text-sm text-gray-900">
                    {new Date(environment.last_reading).toLocaleString()}
                    {environment.last_temperature && (
                      <span className="ml-2 text-gray-600">({environment.last_temperature}°C)</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  <p className="text-sm text-gray-900">{environment?.site?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-sm text-gray-900">{environment?.site?.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <p className="text-sm text-gray-900">{environment?.site?.tenant?.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Management Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sensors</h2>
              <Link
                href={`/admin/sensors/new?site=${environment?.site?.id}&environment=${environment?.id}`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Add Sensor
              </Link>
            </div>

            {sensorsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : sensors.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensors</h3>
                <p className="text-gray-600 mb-4">This environment doesn't have any sensors yet.</p>
                <Link
                  href={`/admin/sensors/new?site=${environment?.site?.id}&environment=${environment?.id}`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add First Sensor
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sensors.map((sensor) => (
                  <div
                    key={sensor.id}
                    onClick={() => router.push(`/admin/sensors/${sensor.id}`)}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{sensor.name}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          {sensor.local_id && <span>ID: {sensor.local_id}</span>}
                          {sensor.model && <span>• {sensor.model}</span>}
                          {sensor.last_reading_at && (
                            <span>• Last reading: {new Date(sensor.last_reading_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {sensor.battery_level !== null && (
                        <div className="flex items-center space-x-1">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                          <span className="text-xs text-gray-600">{sensor.battery_level}%</span>
                        </div>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sensor.status)}`}>
                        {sensor.status}
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
        </div>
      </div>
    </div>
  )
}