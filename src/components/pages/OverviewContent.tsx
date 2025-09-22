'use client'

import React from 'react'
import useSWR from 'swr'
import KPITile from '@/components/ui/KPITile'
import Chart from '@/components/ui/Chart'

// Fetcher function for SWR - includes credentials for authentication cookies
const fetcher = (url: string) => fetch(url, {
  credentials: 'include' // This sends cookies with the request
}).then((res) => res.json())

export const OverviewContent: React.FC = () => {
  // Fetch overview data
  const { data: overviewData, error, isLoading } = useSWR('/api/overview', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true
  })

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
