'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AllRoles } from '@/components/auth/RoleGuard'
import Chart from '@/components/ui/Chart'
import { ChartDataPoint } from '@/components/ui/Chart'
import { Thermometer, TrendingUp, TrendingDown, Activity, BarChart3, Calendar, Clock } from 'lucide-react'

import { fetcher } from '@/utils/fetchers'

interface Sensor {
  id: string
  sensor_id_local: string | null
  environment_name: string
  site_name: string
  status: 'active' | 'maintenance' | 'decommissioned'
}

interface ChartQueryResponse {
  data: Array<{
    sensor_id: string
    sensor_name: string
    readings: Array<{
      timestamp: string
      value: number
      avg_value?: number
      min_value?: number
      max_value?: number
    }>
  }>
  metadata: {
    total_points: number
    aggregation_used: 'raw' | 'hourly' | 'daily'
    downsampled: boolean
    time_range: {
      start: string
      end: string
    }
  }
}

interface EnvironmentStats {
  id: string
  name: string
  site_name: string
  avg_temperature: number | null
  min_temperature: number | null
  max_temperature: number | null
  sensors_count: number
  active_sensors_count: number
}

export default function AnalyticsPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  
  // Chart configuration state
  const [selectedSensors, setSelectedSensors] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [aggregation, setAggregation] = useState<'raw' | 'hourly' | 'daily'>('hourly')
  const [viewType, setViewType] = useState<'trends' | 'comparison' | 'overview'>('trends')
  const [refreshInterval, setRefreshInterval] = useState<number>(15000) // User-configurable refresh interval

  // Auto-calculate time range
  const getTimeRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch (timeRange) {
      case '1h':
        start.setHours(end.getHours() - 1)
        return { start: start.toISOString(), end: end.toISOString() }
      case '6h':
        start.setHours(end.getHours() - 6)
        return { start: start.toISOString(), end: end.toISOString() }
      case '24h':
        start.setHours(end.getHours() - 24)
        return { start: start.toISOString(), end: end.toISOString() }
      case '7d':
        start.setDate(end.getDate() - 7)
        return { start: start.toISOString(), end: end.toISOString() }
      case '30d':
        start.setDate(end.getDate() - 30)
        return { start: start.toISOString(), end: end.toISOString() }
      default:
        start.setHours(end.getHours() - 24)
        return { start: start.toISOString(), end: end.toISOString() }
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Auto-set aggregation based on time range
  useEffect(() => {
    switch (timeRange) {
      case '1h':
      case '6h':
        setAggregation('raw')
        break
      case '24h':
      case '7d':
        setAggregation('hourly')
        break
      case '30d':
        setAggregation('daily')
        break
    }
  }, [timeRange])

  // Fetch sensors data
  const { data: sensorsData, error: sensorsError, isLoading: sensorsLoading } = useSWR('/api/sensors', fetcher, {
    refreshInterval: refreshInterval,
    revalidateOnFocus: true
  })

  // Fetch environment stats
  const { data: environmentsData, error: environmentsError, isLoading: environmentsLoading } = useSWR('/api/environments', fetcher, {
    refreshInterval: refreshInterval,
    revalidateOnFocus: true
  })

  const sensors: Sensor[] = sensorsData?.sensors || []
  const activeSensors = sensors.filter(sensor => sensor.status === 'active')
  const environments: EnvironmentStats[] = environmentsData?.environments || []

  // Auto-select first few active sensors for initial display
  useEffect(() => {
    if (activeSensors.length > 0 && selectedSensors.length === 0) {
      setSelectedSensors(activeSensors.slice(0, 3).map(s => s.id))
    }
  }, [activeSensors, selectedSensors.length])

  // Build chart query URL
  const buildChartUrl = () => {
    if (selectedSensors.length === 0) return null
    
    const { start, end } = getTimeRange()
    const params = new URLSearchParams({
      start_time: start,
      end_time: end,
      aggregation: aggregation
    })
    
    selectedSensors.forEach(sensorId => {
      params.append('sensor_ids', sensorId)
    })
    
    return `/api/chart/query?${params.toString()}`
  }

  // Fetch chart data
  const chartUrl = buildChartUrl()
  const { data: chartData, error: chartError, isLoading: chartLoading } = useSWR<ChartQueryResponse>(
    chartUrl,
    fetcher,
    {
      refreshInterval: refreshInterval,
      revalidateOnFocus: true
    }
  )

  // Transform chart data for different view types
  const transformChartData = (): ChartDataPoint[] => {
    if (!chartData?.data) return []

    if (viewType === 'comparison') {
      // Multi-sensor comparison - overlay multiple sensors
      const timestampMap = new Map<string, any>()
      
      chartData.data.forEach(sensorData => {
        sensorData.readings.forEach(reading => {
          const timestamp = reading.timestamp
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, { timestamp })
          }
          timestampMap.get(timestamp)![sensorData.sensor_name] = reading.value
        })
      })
      
      return Array.from(timestampMap.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    } else {
      // Trends view - aggregate multiple sensors or show combined average
      if (chartData.data.length === 1) {
        // Single sensor trend
        const sensor = chartData.data[0]
        return sensor.readings.map(reading => ({
          timestamp: reading.timestamp,
          value: reading.value,
          avg_value: reading.avg_value,
          min_value: reading.min_value,
          max_value: reading.max_value
        }))
      } else {
        // Multi-sensor trends - calculate average across sensors
        const timestampMap = new Map<string, { values: number[], timestamp: string }>()
        
        chartData.data.forEach(sensorData => {
          sensorData.readings.forEach(reading => {
            const timestamp = reading.timestamp
            if (!timestampMap.has(timestamp)) {
              timestampMap.set(timestamp, { values: [], timestamp })
            }
            timestampMap.get(timestamp)!.values.push(reading.value)
          })
        })
        
        return Array.from(timestampMap.values())
          .map(({ values, timestamp }) => ({
            timestamp,
            value: values.reduce((sum, val) => sum + val, 0) / values.length, // Average
            min_value: Math.min(...values),
            max_value: Math.max(...values)
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }
    }
  }

  // Calculate summary statistics
  const calculateStats = () => {
    if (!chartData?.data || chartData.data.length === 0) {
      return { current: null, avg: null, min: null, max: null, trend: null }
    }

    const allReadings = chartData.data.flatMap(sensor => 
      sensor.readings.map(reading => reading.value)
    )

    if (allReadings.length === 0) {
      return { current: null, avg: null, min: null, max: null, trend: null }
    }

    const current = allReadings[allReadings.length - 1]
    const avg = allReadings.reduce((sum, val) => sum + val, 0) / allReadings.length
    const min = Math.min(...allReadings)
    const max = Math.max(...allReadings)
    
    // Calculate trend (last 20% vs first 20%)
    const segmentSize = Math.max(1, Math.floor(allReadings.length * 0.2))
    const firstSegment = allReadings.slice(0, segmentSize)
    const lastSegment = allReadings.slice(-segmentSize)
    const firstAvg = firstSegment.reduce((sum, val) => sum + val, 0) / firstSegment.length
    const lastAvg = lastSegment.reduce((sum, val) => sum + val, 0) / lastSegment.length
    const trend = lastAvg - firstAvg

    return { current, avg, min, max, trend }
  }

  const stats = calculateStats()

  // Loading and error handling
  const isLoading = authLoading || environmentsLoading || sensorsLoading
  const hasErrors = sensorsError || environmentsError

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (hasErrors) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️ Error Loading Data</div>
            <div className="text-sm text-gray-600">
              {sensorsError && <p>Failed to load sensors: {sensorsError.message}</p>}
              {environmentsError && <p>Failed to load environments: {environmentsError.message}</p>}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <AllRoles>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Temperature Analytics</h1>
              <p className="text-gray-600">Real-time temperature monitoring and trend analysis</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5000}>Refresh: 5s</option>
                  <option value={15000}>Refresh: 15s</option>
                  <option value={30000}>Refresh: 30s</option>
                  <option value={60000}>Refresh: 1m</option>
                  <option value={0}>Refresh: Off</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="trends">Temperature Trends</option>
                  <option value="comparison">Sensor Comparison</option>
                  <option value="overview">Environment Overview</option>
                </select>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats.current !== null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.current.toFixed(1)}°C
                    </p>
                  </div>
                  <Thermometer className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.avg?.toFixed(1)}°C
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Minimum</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.min?.toFixed(1)}°C
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Maximum</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.max?.toFixed(1)}°C
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Trend</p>
                    <p className={`text-2xl font-bold ${stats.trend && stats.trend > 0 ? 'text-red-600' : stats.trend && stats.trend < 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                      {stats.trend !== null ? (stats.trend > 0 ? '+' : '') + stats.trend.toFixed(1) + '°C' : 'N/A'}
                    </p>
                  </div>
                  {stats.trend !== null && (
                    stats.trend > 0 ? 
                      <TrendingUp className="w-8 h-8 text-red-500" /> :
                      stats.trend < 0 ?
                        <TrendingDown className="w-8 h-8 text-blue-500" /> :
                        <Activity className="w-8 h-8 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chart Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Chart Configuration</h3>
              
              {/* Sensor Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sensors ({selectedSensors.length} selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {activeSensors.map(sensor => (
                    <label key={sensor.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(sensor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedSensors.length < 10) { // Limit to 10 sensors
                              setSelectedSensors(prev => [...prev, sensor.id])
                            }
                          } else {
                            setSelectedSensors(prev => prev.filter(id => id !== sensor.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">
                        {sensor.sensor_id_local || `Sensor ${sensor.id.slice(-8)}`} ({sensor.site_name} - {sensor.environment_name})
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Select up to 10 sensors for comparison. Only active sensors are shown.</p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSensors(activeSensors.slice(0, 1).map(s => s.id))}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select First Sensor
                </button>
                <button
                  onClick={() => setSelectedSensors(activeSensors.slice(0, Math.min(3, 10)).map(s => s.id))}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select Top 3
                </button>
                <button
                  onClick={() => setSelectedSensors(activeSensors.slice(0, Math.min(10, activeSensors.length)).map(s => s.id))}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  title={activeSensors.length > 10 ? `Limited to 10 sensors (${activeSensors.length} total)` : undefined}
                >
                  Select All Active ({Math.min(10, activeSensors.length)}/{activeSensors.length})
                </button>
                <button
                  onClick={() => setSelectedSensors([])}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Chart Display */}
            {viewType !== 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {viewType === 'trends' ? 'Temperature Trends' : 'Sensor Comparison'}
                  </h3>
                  {chartData?.metadata && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {chartData.metadata.aggregation_used}
                      </span>
                      <span>{chartData.metadata.total_points} points</span>
                      {chartData.metadata.downsampled && (
                        <span className="text-orange-600">Downsampled</span>
                      )}
                    </div>
                  )}
                </div>

                {selectedSensors.length === 0 ? (
                  <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Select sensors to view {viewType === 'trends' ? 'temperature trends' : 'sensor comparison'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Chart
                    type="line"
                    data={transformChartData()}
                    height={400}
                    loading={chartLoading}
                    error={chartError?.message}
                    showGrid={true}
                    showTooltip={true}
                    showLegend={viewType === 'comparison'}
                    className="w-full"
                  />
                )}
              </div>
            )}
          </div>

          {/* Environment Overview Grid */}
          {viewType === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {environments.map(env => (
                <div key={env.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{env.name}</h4>
                      <p className="text-sm text-gray-500">{env.site_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {env.active_sensors_count}/{env.sensors_count} sensors
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {env.avg_temperature !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average</span>
                        <span className="text-sm font-medium">{env.avg_temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {env.min_temperature !== null && env.max_temperature !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Range</span>
                        <span className="text-sm font-medium">
                          {env.min_temperature.toFixed(1)}°C - {env.max_temperature.toFixed(1)}°C
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}