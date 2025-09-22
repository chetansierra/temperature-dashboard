'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import KPITile from '@/components/ui/KPITile'
import Chart from '@/components/ui/Chart'
import { supabase } from '@/lib/supabase'

// Fetcher function for SWR with Authorization header
const fetcher = async (url: string) => {
  // Get the current session and access token
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  // Add Authorization header if we have a session
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return fetch(url, {
    credentials: 'include',
    headers
  }).then((res) => res.json())
}

export const OverviewContent: React.FC = () => {
  // State for chart data
  const [chartData, setChartData] = useState<any[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)

  // Fetch overview data
  const { data: overviewData, error, isLoading } = useSWR('/api/overview', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true
  })

  // Fetch sensors for chart data
  const { data: sensorsData } = useSWR('/api/sensors', fetcher)

  // Fetch chart data when sensors are available
  React.useEffect(() => {
    if (sensorsData?.data && Array.isArray(sensorsData.data) && sensorsData.data.length > 0) {
      fetchChartData(sensorsData.data.slice(0, 3)) // Show first 3 sensors
    }
  }, [sensorsData])

  const fetchChartData = async (sensors: any[]) => {
    if (!sensors || sensors.length === 0) {
      setChartLoading(false)
      return
    }

    try {
      setChartLoading(true)
      setChartError(null)

      const endTime = new Date()
      const startTime = new Date()
      startTime.setHours(endTime.getHours() - 6) // Last 6 hours

      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/chart/query', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          sensor_ids: sensors.map(s => s.id),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          aggregation: 'hourly',
          metrics: ['avg']
        })
      })

      if (!response.ok) {
        throw new Error(`Chart API error: ${response.status}`)
      }

      const chartResponse = await response.json()
      
      // Transform data for chart component
      if (chartResponse.data && chartResponse.data.length > 0) {
        const transformedData: any[] = []
        const timeSlots = new Set<string>()
        
        // Collect all unique timestamps
        chartResponse.data.forEach((sensor: any) => {
          sensor.readings.forEach((reading: any) => {
            timeSlots.add(reading.timestamp)
          })
        })
        
        // Create data points for each timestamp
        Array.from(timeSlots).sort().forEach(timestamp => {
          const dataPoint: any = { timestamp }
          
          chartResponse.data.forEach((sensor: any) => {
            const reading = sensor.readings.find((r: any) => r.timestamp === timestamp)
            dataPoint[sensor.sensor_name] = reading ? reading.avg_value || reading.value : null
          })
          
          transformedData.push(dataPoint)
        })
        
        setChartData(transformedData)
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
      setChartError(error instanceof Error ? error.message : 'Failed to load chart data')
    } finally {
      setChartLoading(false)
    }
  }

  // Debug logging
  React.useEffect(() => {
    console.log('OverviewContent - Data:', overviewData)
    console.log('OverviewContent - Error:', error)
    console.log('OverviewContent - Loading:', isLoading)
  }, [overviewData, error, isLoading])

  if (error) {
    console.error('Overview API Error:', error)
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">⚠️ Error Loading Dashboard</div>
        <div className="text-sm text-gray-600">
          {error.message || 'Failed to load overview data'}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Check console for more details
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">
          {overviewData?.tenant?.name || 'Loading...'} - Real-time temperature monitoring
        </p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPITile
          title="Total Sites"
          value={overviewData?.stats?.total_sites || 0}
          icon={<span className="text-2xl">🏢</span>}
          loading={isLoading}
          status="neutral"
        />
        
        <KPITile
          title="Active Sensors"
          value={overviewData?.stats?.total_sensors || 0}
          icon={<span className="text-2xl">🌡️</span>}
          loading={isLoading}
          status="healthy"
        />
        
        <KPITile
          title="Active Alerts"
          value={overviewData?.stats?.active_alerts || 0}
          icon={<span className="text-2xl">🚨</span>}
          loading={isLoading}
          status={
            !overviewData ? 'neutral' :
            (overviewData.stats?.critical_alerts || 0) > 0 ? 'critical' :
            (overviewData.stats?.active_alerts || 0) > 0 ? 'warning' : 'healthy'
          }
        />
        
        <KPITile
          title="Critical Alerts"
          value={overviewData?.stats?.critical_alerts || 0}
          icon={<span className="text-2xl">🔥</span>}
          loading={isLoading}
          status={
            !overviewData ? 'neutral' :
            (overviewData.stats?.critical_alerts || 0) > 0 ? 'critical' : 'healthy'
          }
        />
      </div>

      {/* Temperature Trends Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Temperature Trends (Last 6 Hours)</h2>
        
        {chartLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading chart data...</span>
          </div>
        ) : chartError ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️ Chart Error</div>
              <div className="text-sm text-gray-600">{chartError}</div>
            </div>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <Chart
            type="area"
            data={chartData}
            height={300}
            color="#10367D"
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            className="mt-4"
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📊 No Chart Data</div>
              <div className="text-sm text-gray-500">No temperature data available for charts</div>
            </div>
          </div>
        )}
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : overviewData?.recent_alerts?.length > 0 ? (
            <div className="space-y-3">
              {overviewData.recent_alerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    alert.level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {alert.site_name} • {new Date(alert.opened_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    alert.status === 'open' ? 'bg-red-100 text-red-800' :
                    alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-2xl mb-2 block">✅</span>
              <p>No recent alerts</p>
            </div>
          )}
        </div>

        {/* Sensor Health */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sensor Health</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : overviewData?.sensor_health?.length > 0 ? (
            <div className="space-y-3">
              {overviewData.sensor_health.slice(0, 5).map((sensor: any) => (
                <div key={sensor.sensor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sensor.sensor_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sensor.site_name} • {sensor.environment_name}
                    </p>
                  </div>
                  <div className="text-right">
                    {sensor.current_value !== null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {sensor.current_value.toFixed(1)}°C
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No data</span>
                    )}
                    <div className={`w-2 h-2 rounded-full mt-1 ml-auto ${
                      sensor.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-2xl mb-2 block">📊</span>
              <p>No sensor data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="mr-2">🏢</span>
            View All Sites
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="mr-2">🚨</span>
            Manage Alerts
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="mr-2">📊</span>
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
