'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Sensor {
  id: string
  name: string
  type: string
  status: string
  battery_level: number | null
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

interface FormData {
  name: string
  type: string
  status: string
  battery_level: number
}

export default function EditSensorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [sensor, setSensor] = useState<Sensor | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'temperature',
    status: 'active',
    battery_level: 100
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchSensor()
  }, [params.id])

  const fetchSensor = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/sensors/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sensor')
      }
      
      const data = await response.json()
      const sensorData = data.sensor
      
      setSensor(sensorData)
      setFormData({
        name: sensorData.name,
        type: sensorData.type,
        status: sensorData.status,
        battery_level: sensorData.battery_level || 100
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching sensor:', err)
      setError('Failed to load sensor')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/sensors/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update sensor')
      }

      // Redirect back to sensors page
      router.push('/admin/sensors')
    } catch (err) {
      console.error('Error updating sensor:', err)
      setError(err instanceof Error ? err.message : 'Failed to update sensor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/sensors/${params.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete sensor')
      }

      // Redirect back to sensors page
      router.push('/admin/sensors')
    } catch (err) {
      console.error('Error deleting sensor:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete sensor')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !sensor) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/sensors" className="hover:text-gray-900">
              Sensors
            </Link>
            <span>/</span>
            <span className="text-gray-900">Edit Sensor</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Sensor</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Sensor</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSensor}
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
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <Link href="/admin/sensors" className="hover:text-gray-900">
            Sensors
          </Link>
          <span>/</span>
          <span className="text-gray-900">Edit Sensor</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Sensor</h1>
        <p className="text-gray-600 mt-1">Update sensor settings and configuration</p>
      </div>

      {sensor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">
                {getSensorTypeIcon(sensor.type)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">{sensor.name}</h3>
                <p className="text-sm text-blue-800">
                  {sensor.environment?.site?.name} - {sensor.environment?.site?.location} • {sensor.environment?.name}
                </p>
                <p className="text-sm text-blue-700">
                  {sensor.environment?.site?.tenant?.name} • Created: {new Date(sensor.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Sensor Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter sensor name"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Sensor Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="temperature_humidity">Temperature & Humidity</option>
              <option value="pressure">Pressure</option>
              <option value="air_quality">Air Quality</option>
              <option value="motion">Motion</option>
              <option value="other">Other</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              The sensor type determines what data is collected and how alerts are configured.
            </p>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Inactive sensors will stop collecting data. Maintenance mode allows data collection but may suppress alerts.
            </p>
          </div>

          <div>
            <label htmlFor="battery_level" className="block text-sm font-medium text-gray-700 mb-2">
              Battery Level (%)
            </label>
            <input
              type="number"
              id="battery_level"
              min="0"
              max="100"
              value={formData.battery_level}
              onChange={(e) => setFormData(prev => ({ ...prev, battery_level: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Battery level helps with maintenance scheduling. Low battery alerts are triggered below 20%.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Important</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Changes to sensor status affect data collection immediately</li>
              <li>• Changing the sensor type may affect alert configurations</li>
              <li>• Sensor location and environment cannot be changed here</li>
              <li>• Deleting a sensor will remove all historical data and readings</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Sensor
            </button>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/sensors"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Delete Sensor
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{sensor?.name}"? This action cannot be undone and will remove all historical data and readings.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}