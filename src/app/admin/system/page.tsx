'use client'

import { useEffect, useState } from 'react'

interface SystemHealth {
  database: {
    status: string
    response_time: number
    connections: number
  }
  api: {
    status: string
    response_time: number
    uptime: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
}

interface AdminActivity {
  id: string
  action: string
  resource_type: string
  resource_name: string
  created_at: string
  admin: {
    full_name: string | null
    email: string
  }
}

export default function SystemAdministrationPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [adminActivity, setAdminActivity] = useState<AdminActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSystemData()
    
    // Refresh system health every 30 seconds
    const interval = setInterval(fetchSystemData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSystemData = async () => {
    try {
      setLoading(true)
      
      // Simulate system health data (in production, this would come from real monitoring)
      const mockSystemHealth: SystemHealth = {
        database: {
          status: 'healthy',
          response_time: Math.random() * 50 + 10, // 10-60ms
          connections: Math.floor(Math.random() * 20) + 5 // 5-25 connections
        },
        api: {
          status: 'healthy',
          response_time: Math.random() * 100 + 50, // 50-150ms
          uptime: 99.9
        },
        storage: {
          used: 2.4,
          total: 10,
          percentage: 24
        }
      }
      
      setSystemHealth(mockSystemHealth)
      
      // Fetch real admin activity
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setAdminActivity(data.recent_activity || [])
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching system data:', err)
      setError('Failed to load system data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`
  }

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)} GB`
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-600 mt-1">Monitor system health and performance</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading System Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSystemData}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
            <p className="text-gray-600 mt-1">Monitor system health and performance</p>
          </div>
          <button
            onClick={fetchSystemData}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Cards */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Database Health */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Database</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(systemHealth.database.status)}`}>
                {systemHealth.database.status}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemHealth.database.response_time.toFixed(1)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Connections</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemHealth.database.connections}
                </span>
              </div>
            </div>
          </div>

          {/* API Health */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">API</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(systemHealth.api.status)}`}>
                {systemHealth.api.status}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemHealth.api.response_time.toFixed(1)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatUptime(systemHealth.api.uptime)}
                </span>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Storage</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                systemHealth.storage.percentage > 80 ? 'text-red-600 bg-red-100' :
                systemHealth.storage.percentage > 60 ? 'text-yellow-600 bg-yellow-100' :
                'text-green-600 bg-green-100'
              }`}>
                {systemHealth.storage.percentage}% used
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Used</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatBytes(systemHealth.storage.used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatBytes(systemHealth.storage.total)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.storage.percentage > 80 ? 'bg-red-500' :
                    systemHealth.storage.percentage > 60 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.storage.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Activity Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Admin Activity</h3>
        </div>
        
        {adminActivity.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h4>
            <p className="text-gray-600">Admin activities will appear here when performed.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {adminActivity.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        activity.action === 'create' ? 'bg-green-100 text-green-800' :
                        activity.action === 'update' ? 'bg-blue-100 text-blue-800' :
                        activity.action === 'delete' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.action}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {activity.resource_type}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.resource_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        by {activity.admin.full_name || activity.admin.email} • {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}