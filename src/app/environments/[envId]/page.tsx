'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AllRoles } from '@/components/auth/RoleGuard'
import {
  Thermometer,
  MapPin,
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  Activity
} from 'lucide-react'

import { fetcher } from '@/utils/fetchers'

interface Sensor {
  id: string
  sensor_id_local: string | null
  property_measured: string
  installation_date: string | null
  location_details: string | null
  status: 'active' | 'maintenance' | 'decommissioned'
  created_at: string
  last_reading?: {
    value: number
    timestamp: string
  }
}

interface Environment {
  id: string
  site_id: string
  environment_type: 'cold_storage' | 'blast_freezer' | 'chiller' | 'other'
  name: string
  description: string | null
  created_at: string
  site: {
    site_name: string
    site_code: string
    location: string
    timezone: string
  }
}

export default function EnvironmentDetailPage() {
  const { envId } = useParams()
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Form state for creating sensors
  const [sensorForm, setSensorForm] = useState({
    sensor_id_local: '',
    property_measured: 'temperature_c',
    installation_date: '',
    location_details: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch environment details
  const { data: envData, error: envError, mutate: mutateEnv } = useSWR(
    user && envId ? `/api/environments/${envId}` : null,
    fetcher
  )

  // Fetch sensors for this environment
  const { data: sensorsData, error: sensorsError, mutate: mutateSensors } = useSWR(
    user && envId ? `/api/sensors?environment_id=${envId}` : null,
    fetcher
  )

  const environment: Environment | null = envData?.environment || null
  const sensors: Sensor[] = sensorsData?.sensors || []

  const handleCreateSensor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

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

      const response = await fetch('/api/sensors', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          environment_id: envId,
          ...sensorForm,
          installation_date: sensorForm.installation_date || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        setToast({ message: 'Sensor created successfully', type: 'success' })
        setShowCreateModal(false)
        setSensorForm({
          sensor_id_local: '',
          property_measured: 'temperature_c',
          installation_date: '',
          location_details: ''
        })
        mutateSensors() // Refresh sensors list
      } else {
        setToast({ message: result.error?.message || 'Failed to create sensor', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred while creating the sensor', type: 'error' })
    } finally {
      setIsCreating(false)
    }
  }

  const getEnvironmentTypeLabel = (type: string) => {
    switch (type) {
      case 'cold_storage': return 'Cold Storage'
      case 'blast_freezer': return 'Blast Freezer'
      case 'chiller': return 'Chiller'
      default: return 'Other'
    }
  }

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'decommissioned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPropertyLabel = (property: string) => {
    switch (property) {
      case 'temperature_c': return 'Temperature (°C)'
      case 'humidity_pct': return 'Humidity (%)'
      default: return property
    }
  }

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  if (envError) {
    return (
      <AllRoles>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Environment Not Found</h3>
            <p className="text-gray-600 mb-4">
              The requested environment could not be found or you don't have access to it.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </DashboardLayout>
      </AllRoles>
    )
  }

  return (
    <AllRoles>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {environment?.name || 'Loading...'}
              </h1>
              <p className="text-gray-600 mt-1">
                {environment?.site.site_name} • {getEnvironmentTypeLabel(environment?.environment_type || '')}
              </p>
              {environment?.description && (
                <p className="text-sm text-gray-500 mt-1">{environment.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  mutateEnv()
                  mutateSensors()
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              {(profile?.role === 'master' || (profile?.role === 'site_manager' && profile.site_access?.includes(environment?.site_id || ''))) && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sensor
                </button>
              )}
            </div>
          </div>

          {/* Environment Stats */}
          {environment && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Site</p>
                    <p className="text-lg font-semibold text-gray-900">{environment.site.site_name}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-lg font-semibold text-gray-900">{environment.site.location}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sensors</p>
                    <p className="text-lg font-semibold text-gray-900">{sensors.length}</p>
                  </div>
                  <Thermometer className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Timezone</p>
                    <p className="text-lg font-semibold text-gray-900">{environment.site.timezone}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Sensors Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sensors</h2>
              <p className="text-sm text-gray-600 mt-1">
                Temperature monitoring devices in this environment
              </p>
            </div>

            {sensorsError ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load sensors. Please try refreshing.</p>
              </div>
            ) : !sensorsData ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                      <div className="w-20 h-6 bg-gray-300 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                      </div>
                      <div className="w-16 h-6 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : sensors.length === 0 ? (
              <div className="p-12 text-center">
                <Thermometer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sensors yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first sensor.</p>
                {(profile?.role === 'master' || (profile?.role === 'site_manager' && profile.site_access?.includes(environment?.site_id || ''))) && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Sensor
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {sensor.sensor_id_local || `Sensor ${sensor.id.slice(-8)}`}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSensorStatusColor(sensor.status)}`}>
                            {sensor.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Property: </span>
                            <span className="text-sm text-gray-600">{getPropertyLabel(sensor.property_measured)}</span>
                          </div>
                          {sensor.installation_date && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Installed: </span>
                              <span className="text-sm text-gray-600">{new Date(sensor.installation_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        {sensor.location_details && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Location: </span>{sensor.location_details}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created {new Date(sensor.created_at).toLocaleDateString()}</span>
                          {sensor.last_reading && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <Activity className="w-3 h-3 mr-1" />
                                Last reading: {sensor.last_reading.value}°C at {new Date(sensor.last_reading.timestamp).toLocaleTimeString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/sensors/${sensor.id}`)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Sensor Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Sensor</h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateSensor} className="space-y-4">
                    <div>
                      <label htmlFor="sensor_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Local Sensor ID
                      </label>
                      <input
                        id="sensor_id"
                        type="text"
                        value={sensorForm.sensor_id_local}
                        onChange={(e) => setSensorForm({...sensorForm, sensor_id_local: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional local identifier"
                      />
                    </div>

                    <div>
                      <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
                        Property Measured *
                      </label>
                      <select
                        id="property"
                        value={sensorForm.property_measured}
                        onChange={(e) => setSensorForm({...sensorForm, property_measured: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="temperature_c">Temperature (°C)</option>
                        <option value="humidity_pct">Humidity (%)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="install_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Installation Date
                      </label>
                      <input
                        id="install_date"
                        type="date"
                        value={sensorForm.installation_date}
                        onChange={(e) => setSensorForm({...sensorForm, installation_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                        Location Details
                      </label>
                      <textarea
                        id="location"
                        value={sensorForm.location_details}
                        onChange={(e) => setSensorForm({...sensorForm, location_details: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Aisle 3, middle rack, position 5"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? 'Creating...' : 'Create Sensor'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
              <div className={`rounded-md p-4 shadow-lg ${
                toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {toast.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      toast.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {toast.message}
                    </p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        type="button"
                        onClick={() => setToast(null)}
                        className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          toast.type === 'success'
                            ? 'text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600'
                            : 'text-red-500 hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600'
                        }`}
                      >
                        <span className="sr-only">Dismiss</span>
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}