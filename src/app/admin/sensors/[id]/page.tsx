'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Sensor {
  id: string
  environment_id: string
  site_id: string
  tenant_id: string
  name: string
  local_id: string | null
  model: string | null
  status: string
  battery_level: number | null
  last_reading_at: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
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
      }
    }
  }
}



export default function SensorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sensorId = params.id as string

  const [sensor, setSensor] = useState<Sensor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sensorId) {
      fetchSensorDetails()
    }
  }, [sensorId])

  const fetchSensorDetails = async () => {
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
      
      const response = await fetch(`/api/admin/sensors/${sensorId}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Sensor not found')
          return
        }
        throw new Error('Failed to fetch sensor details')
      }
      
      const data = await response.json()
      setSensor(data.sensor)
      setError(null)
    } catch (err) {
      console.error('Error fetching sensor details:', err)
      setError('Failed to load sensor details')
    } finally {
      setLoading(false)
    }
  }

  const getSensorIcon = () => {
    // Generic sensor icon since we don't have type field
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-400'
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }



  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sensor Details</h1>
          <p className="text-gray-600 mt-1">View sensor information and live data</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Sensor</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchSensorDetails}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/admin/sensors"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block"
            >
              Back to Sensors
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!sensor) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sensor Not Found</h3>
        <p className="text-gray-600 mb-6">The requested sensor could not be found.</p>
        <Link
          href="/admin/sensors"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Sensors
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/sensors" className="hover:text-gray-700">Sensors</Link>
              <span>›</span>
              <span>{sensor.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">
                {getSensorIcon()}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{sensor.name}</h1>
              {sensor.model && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  {sensor.model}
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sensor.status)}`}>
                {sensor.status}
              </span>
              {sensor.is_active === false && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {sensor.environment.site.name} - {sensor.environment.name} ({sensor.environment.type})
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSensorDetails}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link
              href={`/admin/sensors/${sensor.id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Sensor
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sensor Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Sensor ID</label>
                <p className="text-sm text-gray-900 font-mono">{sensor.id}</p>
              </div>
              {sensor.model && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Model</label>
                  <p className="text-sm text-gray-900">{sensor.model}</p>
                </div>
              )}
              {sensor.local_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Local ID</label>
                  <p className="text-sm text-gray-900 font-mono">{sensor.local_id}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Active</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  sensor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {sensor.is_active ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sensor.status)}`}>
                  {sensor.status}
                </span>
              </div>
              {sensor.battery_level !== null && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Battery Level</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          sensor.battery_level > 50 ? 'bg-green-500' :
                          sensor.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${sensor.battery_level}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getBatteryColor(sensor.battery_level)}`}>
                      {sensor.battery_level}%
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Last Reading</label>
                <p className="text-sm text-gray-900">
                  {sensor.last_reading_at 
                    ? new Date(sensor.last_reading_at).toLocaleString()
                    : 'No readings yet'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {new Date(sensor.created_at).toLocaleString()}
                </p>
              </div>
            </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Organization</label>
                <p className="text-sm text-gray-900">{sensor.environment.site.tenant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Site</label>
                <p className="text-sm text-gray-900">{sensor.environment.site.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="text-sm text-gray-900">{sensor.environment.site.location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Environment</label>
                <p className="text-sm text-gray-900">
                  {sensor.environment.name} ({sensor.environment.type})
                </p>
              </div>
            </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/sensors/${sensor.id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Sensor
          </Link>
          <Link
            href={`/admin/environments/${sensor.environment.id}`}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Environment
          </Link>
          <Link
            href={`/admin/view-as/${sensor.environment.site.tenant.id}`}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Organization
          </Link>
        </div>
      </div>
    </div>
  )
}