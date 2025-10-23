'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AllRoles } from '@/components/auth/RoleGuard'

import { fetcher } from '@/utils/fetchers'

interface Sensor {
  id: string
  name: string
  sensor_type: string
  unit: string
  location_details: string
  is_active: boolean
  site_name: string
  site_id: string
  environment_name: string
  environment_id: string
  current_temperature: number | null
  battery_level: number | null
  signal_strength: number | null
  last_reading_at: string | null
  status: 'online' | 'offline' | 'warning'
  alert_count: number
  readings_count_24h: number
  created_at: string
}

export default function SensorsPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch sensors data with frequent updates for real-time monitoring
  const { data: sensorsData, error, isLoading, mutate } = useSWR('/api/sensors', fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds for real-time monitoring
    revalidateOnFocus: true
  })

  const sensors: Sensor[] = sensorsData?.sensors || []
  
  // Extract unique sites and environments for filtering
  const sites = Array.from(new Set(sensors.map(sensor => sensor.site_id)))
    .map(siteId => sensors.find(sensor => sensor.site_id === siteId))
    .filter(sensor => sensor)
    .map(sensor => ({ id: sensor!.site_id, name: sensor!.site_name }))

  const environments = Array.from(new Set(sensors.map(sensor => sensor.environment_id)))
    .map(envId => sensors.find(sensor => sensor.environment_id === envId))
    .filter(sensor => sensor)
    .map(sensor => ({ 
      id: sensor!.environment_id, 
      name: sensor!.environment_name,
      site_id: sensor!.site_id 
    }))

  // Filter sensors
  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensor.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensor.environment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensor.location_details.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSite = selectedSite === 'all' || sensor.site_id === selectedSite
    const matchesEnvironment = selectedEnvironment === 'all' || sensor.environment_id === selectedEnvironment
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'online' && sensor.status === 'online') ||
      (statusFilter === 'offline' && sensor.status === 'offline') ||
      (statusFilter === 'warning' && (sensor.status === 'warning' || sensor.alert_count > 0)) ||
      (statusFilter === 'inactive' && !sensor.is_active)

    return matchesSearch && matchesSite && matchesEnvironment && matchesStatus
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
            <div className="text-red-500 mb-2">⚠️ Error Loading Sensors</div>
            <div className="text-sm text-gray-600">
              {error.message || 'Failed to load sensors data'}
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
                <h1 className="text-2xl font-bold text-gray-900">Sensors</h1>
                <p className="text-gray-600 mt-1">
                  Real-time monitoring of all temperature sensors across your facilities
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  🔴 Live • Updated every 10s
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

          {/* Real-time Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🌡️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Sensors</p>
                  <p className="text-2xl font-semibold text-gray-900">{sensors.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🟢</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Online</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {sensors.filter(s => s.status === 'online').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🟡</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Warnings</p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {sensors.filter(s => s.status === 'warning' || s.alert_count > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🔴</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Offline</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {sensors.filter(s => s.status === 'offline').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Sensors
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">🔍</span>
                  </div>
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by name, location..."
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
                  onChange={(e) => {
                    setSelectedSite(e.target.value)
                    setSelectedEnvironment('all') // Reset environment filter when site changes
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Environment Filter */}
              <div>
                <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Environment
                </label>
                <select
                  id="environment"
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Environments</option>
                  {environments
                    .filter(env => selectedSite === 'all' || env.site_id === selectedSite)
                    .map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="warning">Warning</option>
                  <option value="offline">Offline</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sensors Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-4 animate-pulse">
                  <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-8 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSensors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSensors.map((sensor) => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  userRole={profile?.role}
                  onUpdate={() => mutate()}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">🌡️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedSite !== 'all' || selectedEnvironment !== 'all' || statusFilter !== 'all'
                  ? 'No sensors found'
                  : 'No sensors configured'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedSite !== 'all' || selectedEnvironment !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Sensors will appear here once they are configured in your environments.'
                }
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}

// Sensor Card Component
interface SensorCardProps {
  sensor: Sensor
  userRole?: string
  onUpdate: () => void
}

const SensorCard: React.FC<SensorCardProps> = ({ sensor, userRole, onUpdate }) => {
  const getStatusIcon = (status: string, isActive: boolean) => {
    if (!isActive) return { icon: '⚫', color: 'text-gray-500 bg-gray-100' }
    
    switch (status) {
      case 'online':
        return { icon: '🟢', color: 'text-green-600 bg-green-100' }
      case 'warning':
        return { icon: '🟡', color: 'text-yellow-600 bg-yellow-100' }
      case 'offline':
        return { icon: '🔴', color: 'text-red-600 bg-red-100' }
      default:
        return { icon: '⚫', color: 'text-gray-500 bg-gray-100' }
    }
  }

  const getTemperatureColor = (temp: number | null) => {
    if (temp === null) return 'text-gray-500'
    if (temp < -20) return 'text-blue-600'
    if (temp < 0) return 'text-blue-500'
    if (temp < 10) return 'text-green-600'
    if (temp < 25) return 'text-green-500'
    if (temp < 35) return 'text-yellow-500'
    return 'text-red-500'
  }

  const status = getStatusIcon(sensor.status, sensor.is_active)
  const temperatureColor = getTemperatureColor(sensor.current_temperature)

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{sensor.name}</h3>
          <p className="text-xs text-gray-500 truncate">{sensor.location_details}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.icon}
        </span>
      </div>

      {/* Location */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 flex items-center">
          <span className="mr-1">🏢</span>
          <span className="truncate">{sensor.site_name}</span>
        </div>
        <div className="text-xs text-gray-600 flex items-center">
          <span className="mr-1">❄️</span>
          <span className="truncate">{sensor.environment_name}</span>
        </div>
      </div>

      {/* Current Temperature */}
      <div className="mb-3 text-center">
        <div className={`text-2xl font-bold ${temperatureColor}`}>
          {sensor.current_temperature !== null ? (
            `${sensor.current_temperature.toFixed(1)}°C`
          ) : (
            '-- °C'
          )}
        </div>
        <div className="text-xs text-gray-500">Current Temperature</div>
      </div>

      {/* Sensor Details */}
      <div className="space-y-2 mb-3">
        {sensor.battery_level !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Battery:</span>
            <span className={`font-medium ${
              sensor.battery_level > 50 ? 'text-green-600' :
              sensor.battery_level > 20 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {sensor.battery_level}%
            </span>
          </div>
        )}
        
        {sensor.signal_strength !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Signal:</span>
            <span className={`font-medium ${
              sensor.signal_strength > 70 ? 'text-green-600' :
              sensor.signal_strength > 30 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {sensor.signal_strength}%
            </span>
          </div>
        )}

        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Readings (24h):</span>
          <span className="font-medium text-blue-600">{sensor.readings_count_24h}</span>
        </div>

        {sensor.alert_count > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Active Alerts:</span>
            <span className="font-medium text-red-600">{sensor.alert_count}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-1">
        <button className="flex-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
          View Details
        </button>
        {sensor.alert_count > 0 && (
          <button className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-colors">
            Alerts
          </button>
        )}
      </div>

      {/* Last Reading */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {sensor.last_reading_at ? (
            <>Last: {new Date(sensor.last_reading_at).toLocaleString()}</>
          ) : (
            <>No recent readings</>
          )}
        </div>
      </div>
    </div>
  )
}