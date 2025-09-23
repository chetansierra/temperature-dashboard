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
  X
} from 'lucide-react'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, {
  credentials: 'include'
}).then((res) => res.json())

interface Environment {
  id: string
  environment_type: 'cold_storage' | 'blast_freezer' | 'chiller' | 'other'
  name: string
  description: string | null
  created_at: string
  sensor_count: number
}

interface Site {
  id: string
  site_name: string
  site_code: string
  location: string
  timezone: string
  created_at: string
}

export default function SiteDetailPage() {
  const { siteId } = useParams()
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Form state for creating environments
  const [envForm, setEnvForm] = useState({
    environment_type: 'cold_storage' as 'cold_storage' | 'blast_freezer' | 'chiller' | 'other',
    name: '',
    description: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch site details
  const { data: siteData, error: siteError, mutate: mutateSite } = useSWR(
    user && siteId ? `/api/sites/${siteId}` : null,
    fetcher
  )

  // Fetch environments for this site
  const { data: envData, error: envError, mutate: mutateEnvs } = useSWR(
    user && siteId ? `/api/environments?site_id=${siteId}` : null,
    fetcher
  )

  const site: Site | null = siteData?.site || null
  const environments: Environment[] = envData?.environments || []

  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          site_id: siteId,
          ...envForm
        })
      })

      const result = await response.json()

      if (response.ok) {
        setToast({ message: 'Environment created successfully', type: 'success' })
        setShowCreateModal(false)
        setEnvForm({
          environment_type: 'cold_storage',
          name: '',
          description: ''
        })
        mutateEnvs() // Refresh environments list
      } else {
        setToast({ message: result.error?.message || 'Failed to create environment', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred while creating the environment', type: 'error' })
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

  const getEnvironmentTypeColor = (type: string) => {
    switch (type) {
      case 'cold_storage': return 'bg-blue-100 text-blue-800'
      case 'blast_freezer': return 'bg-purple-100 text-purple-800'
      case 'chiller': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
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

  if (siteError) {
    return (
      <AllRoles>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Site Not Found</h3>
            <p className="text-gray-600 mb-4">
              The requested site could not be found or you don't have access to it.
            </p>
            <button
              onClick={() => router.push('/sites')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Sites
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
                  onClick={() => router.push('/sites')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back to Sites
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {site?.site_name || 'Loading...'}
              </h1>
              <p className="text-gray-600 mt-1">
                {site?.location} • {site?.timezone}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  mutateSite()
                  mutateEnvs()
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              {(profile?.role === 'master' || (profile?.role === 'site_manager' && profile.site_access?.includes(siteId as string))) && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Environment
                </button>
              )}
            </div>
          </div>

          {/* Site Stats */}
          {site && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Site Code</p>
                    <p className="text-lg font-semibold text-gray-900">{site.site_code}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Environments</p>
                    <p className="text-lg font-semibold text-gray-900">{environments.length}</p>
                  </div>
                  <Thermometer className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sensors</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {environments.reduce((sum, env) => sum + (env.sensor_count || 0), 0)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Environments Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Environments</h2>
              <p className="text-sm text-gray-600 mt-1">
                Temperature-controlled areas in this site
              </p>
            </div>

            {envError ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load environments. Please try refreshing.</p>
              </div>
            ) : !envData ? (
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
            ) : environments.length === 0 ? (
              <div className="p-12 text-center">
                <Thermometer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No environments yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first environment.</p>
                {(profile?.role === 'master' || (profile?.role === 'site_manager' && profile.site_access?.includes(siteId as string))) && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Environment
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {environments.map((environment) => (
                  <div key={environment.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{environment.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentTypeColor(environment.environment_type)}`}>
                            {getEnvironmentTypeLabel(environment.environment_type)}
                          </span>
                        </div>
                        {environment.description && (
                          <p className="text-sm text-gray-600 mb-2">{environment.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{environment.sensor_count || 0} sensors</span>
                          <span>•</span>
                          <span>Created {new Date(environment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/environments/${environment.id}`)}
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

          {/* Create Environment Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Environment</h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateEnvironment} className="space-y-4">
                    <div>
                      <label htmlFor="env_type" className="block text-sm font-medium text-gray-700 mb-1">
                        Environment Type *
                      </label>
                      <select
                        id="env_type"
                        value={envForm.environment_type}
                        onChange={(e) => setEnvForm({...envForm, environment_type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="cold_storage">Cold Storage</option>
                        <option value="blast_freezer">Blast Freezer</option>
                        <option value="chiller">Chiller</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="env_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Environment Name *
                      </label>
                      <input
                        id="env_name"
                        type="text"
                        required
                        value={envForm.name}
                        onChange={(e) => setEnvForm({...envForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Main Cold Room"
                      />
                    </div>

                    <div>
                      <label htmlFor="env_desc" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="env_desc"
                        value={envForm.description}
                        onChange={(e) => setEnvForm({...envForm, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description of the environment..."
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
                        {isCreating ? 'Creating...' : 'Create Environment'}
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