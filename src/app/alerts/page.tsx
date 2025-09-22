'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import useSWR from 'swr'
import { AlertTriangle, CheckCircle, Clock, Filter, RefreshCw, Search, X } from 'lucide-react'

interface Alert {
  id: string
  level: 'warning' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved'
  message: string
  site_name: string
  environment_name: string
  sensor_id_local: string
  value: number | null
  threshold_min: number | null
  threshold_max: number | null
  opened_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  acknowledged_by: string | null
  resolved_by: string | null
}

interface AlertsResponse {
  success: boolean
  alerts: Alert[]
  total: number
  pagination: {
    page: number
    limit: number
    total_pages: number
  }
  stats: {
    total: number
    open: number
    acknowledged: number
    resolved: number
    critical: number
    warning: number
  }
  timestamp: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch alerts')
  return res.json()
}

export default function AlertsPage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  // Filters and pagination
  const [filters, setFilters] = useState({
    status: '',
    level: '',
    site_id: '',
    search: ''
  })
  const [page, setPage] = useState(1)
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type: 'acknowledge' | 'resolve'
  } | null>(null)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Build API URL with filters
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '20')
    
    if (filters.status) params.set('status', filters.status)
    if (filters.level) params.set('level', filters.level)
    if (filters.site_id) params.set('site_id', filters.site_id)
    if (filters.search) params.set('search', filters.search)
    
    return `/api/alerts?${params.toString()}`
  }, [page, filters])

  // Fetch alerts data with SWR
  const { data: alertsData, error, mutate, isValidating } = useSWR<AlertsResponse>(
    user ? buildApiUrl() : null,
    fetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000
    }
  )

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
    setSelectedAlerts(new Set()) // Clear selections
  }

  // Clear selections when page changes
  useEffect(() => {
    setSelectedAlerts(new Set())
  }, [page])

  // Handle bulk actions with confirmation
  const handleBulkAction = (action: 'acknowledge' | 'resolve') => {
    if (selectedAlerts.size === 0) return

    // Filter out ineligible alerts
    const eligibleAlerts = alertsData?.alerts.filter(alert => {
      if (!selectedAlerts.has(alert.id)) return false
      if (action === 'acknowledge' && alert.status !== 'open') return false
      if (action === 'resolve' && alert.status === 'resolved') return false
      return true
    }) || []

    if (eligibleAlerts.length === 0) {
      setToast({ message: `No alerts are eligible for ${action}`, type: 'error' })
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: `${action === 'acknowledge' ? 'Acknowledge' : 'Resolve'} Alerts`,
      message: `Are you sure you want to ${action} ${eligibleAlerts.length} alert${eligibleAlerts.length !== 1 ? 's' : ''}?`,
      onConfirm: () => executeBulkAction(action, eligibleAlerts),
      type: action
    })
  }

  // Execute bulk actions with optimistic updates and concurrency control
  const executeBulkAction = async (action: 'acknowledge' | 'resolve', eligibleAlerts: Alert[]) => {
    setIsProcessing(true)
    const newStatus = action === 'acknowledge' ? 'acknowledged' : 'resolved'
    
    // Optimistic update for bulk actions
    mutate(
      (currentData: AlertsResponse | undefined) => {
        if (!currentData) return currentData
        
        const updatedAlerts = currentData.alerts.map(alert => {
          const eligibleAlert = eligibleAlerts.find(ea => ea.id === alert.id)
          if (eligibleAlert) {
            return {
              ...alert,
              status: newStatus as Alert['status'],
              [`${action}d_at`]: new Date().toISOString()
            }
          }
          return alert
        })
        
        // Calculate stats changes
        const statusChanges = new Map<string, number>()
        eligibleAlerts.forEach(alert => {
          statusChanges.set(alert.status, (statusChanges.get(alert.status) || 0) + 1)
        })
        
        const updatedStats = { ...currentData.stats }
        statusChanges.forEach((count, oldStatus) => {
          updatedStats[oldStatus as keyof typeof updatedStats] = Math.max(0, updatedStats[oldStatus as keyof typeof updatedStats] - count)
          updatedStats[newStatus as keyof typeof updatedStats] += count
        })
        
        return {
          ...currentData,
          alerts: updatedAlerts,
          stats: updatedStats
        }
      },
      { revalidate: false }
    )
    
    const successes: string[] = []
    const failures: string[] = []

    // Process in batches of 5 to avoid overwhelming the server
    const batchSize = 5
    let hasFailures = false
    
    for (let i = 0; i < eligibleAlerts.length; i += batchSize) {
      const batch = eligibleAlerts.slice(i, i + batchSize)
      const promises = batch.map(async (alert) => {
        try {
          const response = await fetch(`/api/alerts/${alert.id}/${action === 'acknowledge' ? 'ack' : 'resolve'}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-CSRF-Token': 'bulk-operation' // Basic CSRF protection
            },
            body: JSON.stringify({ notes: `Bulk ${action} from alerts management` })
          })
          if (response.ok) {
            successes.push(alert.id)
          } else {
            failures.push(alert.id)
            hasFailures = true
          }
        } catch (error) {
          failures.push(alert.id)
          hasFailures = true
        }
      })
      await Promise.all(promises)
    }

    setSelectedAlerts(new Set())
    setConfirmDialog(null)
    
    // Show results with detailed feedback
    if (failures.length === 0) {
      setToast({ message: `Successfully ${action}d ${successes.length} alert${successes.length !== 1 ? 's' : ''}`, type: 'success' })
    } else if (successes.length === 0) {
      setToast({ message: `Failed to ${action} all alerts`, type: 'error' })
      // Rollback optimistic update on complete failure
      mutate()
    } else {
      setToast({ message: `${action}d ${successes.length} alerts, ${failures.length} failed`, type: 'success' })
    }
    
    // Always revalidate after bulk operation to ensure consistency
    setTimeout(() => mutate(), 1000)
    setIsProcessing(false)
  }

  // Handle individual alert actions with confirmation
  const handleAlertAction = (alertId: string, action: 'acknowledge' | 'resolve') => {
    const alert = alertsData?.alerts.find(a => a.id === alertId)
    if (!alert) return

    setConfirmDialog({
      isOpen: true,
      title: `${action === 'acknowledge' ? 'Acknowledge' : 'Resolve'} Alert`,
      message: `Are you sure you want to ${action} this alert?\n\n"${alert.message}"`,
      onConfirm: () => executeAlertAction(alertId, action),
      type: action
    })
  }

  // Execute individual alert action with optimistic updates
  const executeAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    setIsProcessing(true)
    const newStatus = action === 'acknowledge' ? 'acknowledged' : 'resolved'
    const targetAlert = alertsData?.alerts.find(a => a.id === alertId)
    
    // Optimistic update
    mutate(
      (currentData: AlertsResponse | undefined) => {
        if (!currentData || !targetAlert) return currentData
        return {
          ...currentData,
          alerts: currentData.alerts.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: newStatus as Alert['status'],
                  [`${action}d_at`]: new Date().toISOString()
                }
              : alert
          ),
          stats: {
            ...currentData.stats,
            [targetAlert.status]: Math.max(0, currentData.stats[targetAlert.status] - 1),
            [newStatus]: currentData.stats[newStatus as keyof typeof currentData.stats] + 1
          }
        }
      },
      { revalidate: false }
    )

    try {
      const response = await fetch(`/api/alerts/${alertId}/${action === 'acknowledge' ? 'ack' : 'resolve'}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'single-operation' // Basic CSRF protection
        },
        body: JSON.stringify({ notes: `${action} from alerts management` })
      })
      
      if (response.ok) {
        setToast({ message: `Alert ${action}d successfully`, type: 'success' })
      } else {
        throw new Error('Server error')
      }
    } catch (error) {
      setToast({ message: `Failed to ${action} alert`, type: 'error' })
      // Rollback optimistic update
      mutate()
    } finally {
      setConfirmDialog(null)
      setIsProcessing(false)
      // Revalidate to ensure consistency
      setTimeout(() => mutate(), 1000)
    }
  }

  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    const newSelection = new Set(selectedAlerts)
    if (newSelection.has(alertId)) {
      newSelection.delete(alertId)
    } else {
      newSelection.add(alertId)
    }
    setSelectedAlerts(newSelection)
  }

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedAlerts.size === alertsData?.alerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(alertsData?.alerts.map(a => a.id) || []))
    }
  }

  // Get alert status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800'
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Loading and auth checks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Alerts Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              Monitor and manage temperature alerts across your organization.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:flex sm:items-center sm:space-x-3">
            <button
              onClick={() => mutate()}
              disabled={isValidating}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {alertsData?.stats && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{alertsData.stats.total}</div>
              <div className="text-sm text-gray-600">Total Alerts</div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-4">
              <div className="text-2xl font-bold text-red-600">{alertsData.stats.open}</div>
              <div className="text-sm text-gray-600">Open</div>
            </div>
            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <div className="text-2xl font-bold text-yellow-600">{alertsData.stats.acknowledged}</div>
              <div className="text-sm text-gray-600">Acknowledged</div>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-4">
              <div className="text-2xl font-bold text-green-600">{alertsData.stats.resolved}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-4">
              <div className="text-2xl font-bold text-red-600">{alertsData.stats.critical}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <div className="text-2xl font-bold text-yellow-600">{alertsData.stats.warning}</div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Active Filters</label>
                  <button
                    onClick={() => {
                      setFilters({ status: '', level: '', site_id: '', search: '' })
                      setPage(1)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.status && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Status: {filters.status}
                      <button
                        onClick={() => handleFilterChange('status', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.level && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Level: {filters.level}
                      <button
                        onClick={() => handleFilterChange('level', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.search && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Search: {filters.search}
                      <button
                        onClick={() => handleFilterChange('search', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedAlerts.size > 0 && (
          <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-blue-700">
                  {selectedAlerts.size} alert{selectedAlerts.size !== 1 ? 's' : ''} selected on this page
                </span>
                {isProcessing && (
                  <div className="ml-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-blue-600">Processing...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleBulkAction('acknowledge')}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Acknowledge
                </button>
                <button
                  onClick={() => handleBulkAction('resolve')}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </button>
                <button
                  onClick={() => setSelectedAlerts(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Table */}
        <div className="mt-6 bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load alerts. Please try refreshing.</p>
            </div>
          ) : !alertsData ? (
            <div className="p-6">
              <div className="animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : alertsData.alerts.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No alerts found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.size === alertsData.alerts.length && alertsData.alerts.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">
                    Select All ({alertsData.alerts.length})
                  </label>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {alertsData.alerts.map((alert) => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedAlerts.has(alert.id)}
                          onChange={() => toggleAlertSelection(alert.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className={`w-5 h-5 ${getLevelColor(alert.level)}`} />
                            <span className={`text-sm font-medium ${getLevelColor(alert.level)}`}>
                              {alert.level.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                              {alert.status}
                            </span>
                          </div>
                          {alert.status !== 'resolved' && (
                            <div className="flex items-center space-x-2">
                              {alert.status === 'open' && (
                                <button
                                  onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                                  disabled={isProcessing}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded disabled:opacity-50"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  Acknowledge
                                </button>
                              )}
                              <button
                                onClick={() => handleAlertAction(alert.id, 'resolve')}
                                disabled={isProcessing}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{alert.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{alert.site_name}</span>
                          <span>•</span>
                          <span>{alert.environment_name}</span>
                          {alert.sensor_id_local && (
                            <>
                              <span>•</span>
                              <span>Sensor {alert.sensor_id_local}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(alert.opened_at).toLocaleString()}</span>
                        </div>
                        {alert.value !== null && (alert.threshold_min !== null || alert.threshold_max !== null) && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Value:</span> {alert.value}°C
                            {alert.threshold_min !== null && <span className="ml-2"><span className="font-medium">Min:</span> {alert.threshold_min}°C</span>}
                            {alert.threshold_max !== null && <span className="ml-2"><span className="font-medium">Max:</span> {alert.threshold_max}°C</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {alertsData && alertsData.pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min((page - 1) * 20 + 1, alertsData.total)} to {Math.min(page * 20, alertsData.total)} of {alertsData.total} alerts
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page} of {alertsData.pagination.total_pages}
              </span>
              <button
                onClick={() => setPage(Math.min(alertsData.pagination.total_pages, page + 1))}
                disabled={page === alertsData.pagination.total_pages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmDialog(null)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                      confirmDialog.type === 'acknowledge' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      {confirmDialog.type === 'acknowledge' ? (
                        <Clock className={`h-6 w-6 text-yellow-600`} aria-hidden="true" />
                      ) : (
                        <CheckCircle className={`h-6 w-6 text-green-600`} aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {confirmDialog.title}
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 whitespace-pre-line">
                          {confirmDialog.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={confirmDialog.onConfirm}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 ${
                      confirmDialog.type === 'acknowledge'
                        ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                        : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : (confirmDialog.type === 'acknowledge' ? 'Acknowledge' : 'Resolve')}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmDialog(null)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
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
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}