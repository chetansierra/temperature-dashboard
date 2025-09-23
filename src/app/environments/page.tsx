'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AllRoles } from '@/components/auth/RoleGuard'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, {
  credentials: 'include'
}).then((res) => res.json())

interface Environment {
  id: string
  name: string
  description: string
  site_name: string
  site_id: string
  sensors_count: number
  active_sensors_count: number
  avg_temperature: number | null
  min_temperature: number | null
  max_temperature: number | null
  alert_count: number
  threshold_min: number | null
  threshold_max: number | null
  last_reading_at: string | null
  created_at: string
}

export default function EnvironmentsPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch environments data
  const { data: environmentsData, error, isLoading, mutate } = useSWR('/api/environments', fetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds for real-time temperature updates
    revalidateOnFocus: true
  })

  // Fetch sites data for filter dropdown
  const { data: sitesData } = useSWR('/api/sites', fetcher, {
    revalidateOnFocus: true
  })

  const environments: Environment[] = environmentsData?.environments || []
  const sites = sitesData?.sites?.map((site: any) => ({
    id: site.id,
    name: site.site_name
  })) || []

  // Filter environments
  const filteredEnvironments = environments.filter(env => {
    const matchesSearch = env.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         env.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         env.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSite = selectedSite === 'all' || env.site_id === selectedSite
    
    const matchesTemperature = temperatureFilter === 'all' ||
      (temperatureFilter === 'normal' && env.alert_count === 0) ||
      (temperatureFilter === 'alerts' && env.alert_count > 0) ||
      (temperatureFilter === 'offline' && !env.last_reading_at)

    return matchesSearch && matchesSite && matchesTemperature
  })

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <AllRoles>
        <DashboardLayout>
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">⚠️ Error Loading Environments</div>
            <div className="text-sm text-gray-600">
              {error.message || 'Failed to load environments data'}
            </div>
          </div>
        </DashboardLayout>
      </AllRoles>
    )
  }

  return (
    <AllRoles>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Environments</h1>
                <p className="text-gray-600 mt-1">
                  Monitor temperature zones and environmental conditions across all sites
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                <button
                  onClick={() => mutate()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="mr-1">🔄</span>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">❄️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Environments</p>
                  <p className="text-2xl font-semibold text-gray-900">{environments.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🌡️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Sensors</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {environments.reduce((sum, env) => sum + (env.active_sensors_count || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Alerts</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {environments.reduce((sum, env) => sum + (env.alert_count || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Avg Temperature</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {environments.length > 0 
                      ? (environments
                          .filter(env => env.avg_temperature !== null)
                          .reduce((sum, env, _, arr) => sum + (env.avg_temperature || 0) / arr.length, 0)
                          .toFixed(1)
                        ) + '°C'
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Environments
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">🔍</span>
                  </div>
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by name, site, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Site Filter */}
              <div>
                <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Site
                </label>
                <select
                  id="site"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Sites</option>
                  {sites.map((site: any) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperature Status Filter */}
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature Status
                </label>
                <select
                  id="temperature"
                  value={temperatureFilter}
                  onChange={(e) => setTemperatureFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="normal">Normal</option>
                  <option value="alerts">Has Alerts</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Environments Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-20 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEnvironments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnvironments.map((environment) => (
                <EnvironmentCard
                  key={environment.id}
                  environment={environment}
                  userRole={profile?.role}
                  onUpdate={() => mutate()}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">❄️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedSite !== 'all' || temperatureFilter !== 'all'
                  ? 'No environments found'
                  : 'No environments configured'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedSite !== 'all' || temperatureFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Environments will appear here once sites and sensors are configured.'
                }
              </p>
              {!(searchTerm || selectedSite !== 'all' || temperatureFilter !== 'all') && (
                <button
                  onClick={() => router.push('/sites')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="mr-2">🏢</span>
                  Manage Sites
                </button>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}

// Environment Card Component
interface EnvironmentCardProps {
  environment: Environment
  userRole?: string
  onUpdate: () => void
}

const EnvironmentCard: React.FC<EnvironmentCardProps> = ({ environment, userRole, onUpdate }) => {
  const getTemperatureStatus = (env: Environment) => {
    if (!env.last_reading_at) return { color: 'text-gray-500 bg-gray-100', status: 'Offline', icon: '❌' }
    if (env.alert_count > 0) return { color: 'text-red-600 bg-red-100', status: 'Alert', icon: '🚨' }
    return { color: 'text-green-600 bg-green-100', status: 'Normal', icon: '✅' }
  }

  const getTemperatureColor = (temp: number | null, thresholdMin: number | null, thresholdMax: number | null) => {
    if (temp === null) return 'text-gray-500'
    if (thresholdMin !== null && temp < thresholdMin) return 'text-blue-600'
    if (thresholdMax !== null && temp > thresholdMax) return 'text-red-600'
    return 'text-green-600'
  }

  const status = getTemperatureStatus(environment)

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{environment.name}</h3>
          <p className="text-sm text-gray-600 flex items-center mb-1">
            <span className="mr-1">🏢</span>
            {environment.site_name}
          </p>
          {environment.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{environment.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.icon} {status.status}
        </span>
      </div>

      {/* Current Temperature */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold mb-1">
            {environment.avg_temperature !== null ? (
              <span className={getTemperatureColor(environment.avg_temperature, environment.threshold_min, environment.threshold_max)}>
                {environment.avg_temperature.toFixed(1)}°C
              </span>
            ) : (
              <span className="text-gray-400">--</span>
            )}
          </div>
          <div className="text-xs text-gray-500">Average Temperature</div>
          {environment.min_temperature !== null && environment.max_temperature !== null && (
            <div className="text-xs text-gray-400 mt-1">
              Range: {environment.min_temperature.toFixed(1)}°C to {environment.max_temperature.toFixed(1)}°C
            </div>
          )}
        </div>
      </div>

      {/* Threshold Info */}
      {(environment.threshold_min !== null || environment.threshold_max !== null) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-xs font-medium text-blue-800 mb-1">Temperature Thresholds</div>
          <div className="text-xs text-blue-600">
            {environment.threshold_min !== null && (
              <span>Min: {environment.threshold_min}°C</span>
            )}
            {environment.threshold_min !== null && environment.threshold_max !== null && (
              <span className="mx-2">•</span>
            )}
            {environment.threshold_max !== null && (
              <span>Max: {environment.threshold_max}°C</span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{environment.sensors_count || 0}</div>
          <div className="text-xs text-gray-500">Total Sensors</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{environment.active_sensors_count || 0}</div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">{environment.alert_count || 0}</div>
          <div className="text-xs text-gray-500">Alerts</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors">
          View Sensors
        </button>
        {environment.alert_count > 0 && (
          <button className="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition-colors">
            View Alerts
          </button>
        )}
      </div>

      {/* Last Reading Time */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {environment.last_reading_at ? (
            <>Last reading: {new Date(environment.last_reading_at).toLocaleString()}</>
          ) : (
            <>No recent readings</>
          )}
        </div>
      </div>
    </div>
  )
}