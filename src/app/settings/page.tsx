'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MasterOnly } from '@/components/auth/RoleGuard'
import { Settings, Thermometer, Bell, Clock, Shield, Save, RefreshCw, AlertTriangle } from 'lucide-react'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, {
  credentials: 'include'
}).then((res) => res.json())

interface Threshold {
  id: string
  level: 'org' | 'site' | 'environment' | 'sensor'
  level_ref_id: string
  min_c: number | null
  max_c: number | null
  created_at: string
}

interface EscalationSetting {
  id: string
  site_id: string
  escalation_minutes: number
  enabled: boolean
}

interface NotificationSetting {
  id: string
  type: 'email' | 'in_app'
  enabled: boolean
  recipients?: string[]
}

export default function SettingsPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'thresholds' | 'escalation' | 'notifications'>('thresholds')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Form states
  const [thresholdForm, setThresholdForm] = useState({
    level: 'org' as 'org' | 'site' | 'environment' | 'sensor',
    level_ref_id: '',
    min_c: '',
    max_c: ''
  })

  const [escalationForm, setEscalationForm] = useState({
    site_id: '',
    escalation_minutes: '15',
    enabled: true
  })

  const [notificationForm, setNotificationForm] = useState({
    email_enabled: true,
    in_app_enabled: true,
    email_recipients: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch settings data
  const { data: thresholdsData, mutate: mutateThresholds } = useSWR('/api/settings/thresholds', fetcher)
  const { data: escalationData, mutate: mutateEscalation } = useSWR('/api/settings/escalation', fetcher)
  const { data: notificationsData, mutate: mutateNotifications } = useSWR('/api/settings/notifications', fetcher)

  // Fetch sites for dropdowns
  const { data: sitesData } = useSWR(user ? '/api/sites' : null, fetcher)

  const sites = sitesData?.sites || []

  const handleSaveThreshold = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...thresholdForm,
          min_c: thresholdForm.min_c ? parseFloat(thresholdForm.min_c) : null,
          max_c: thresholdForm.max_c ? parseFloat(thresholdForm.max_c) : null
        })
      })

      if (response.ok) {
        setToast({ message: 'Threshold saved successfully', type: 'success' })
        setThresholdForm({
          level: 'org',
          level_ref_id: '',
          min_c: '',
          max_c: ''
        })
        mutateThresholds()
      } else {
        setToast({ message: 'Failed to save threshold', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEscalation = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...escalationForm,
          escalation_minutes: parseInt(escalationForm.escalation_minutes)
        })
      })

      if (response.ok) {
        setToast({ message: 'Escalation settings saved successfully', type: 'success' })
        mutateEscalation()
      } else {
        setToast({ message: 'Failed to save escalation settings', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email_enabled: notificationForm.email_enabled,
          in_app_enabled: notificationForm.in_app_enabled,
          email_recipients: notificationForm.email_recipients.split(',').map(email => email.trim()).filter(email => email)
        })
      })

      if (response.ok) {
        setToast({ message: 'Notification settings saved successfully', type: 'success' })
        mutateNotifications()
      } else {
        setToast({ message: 'Failed to save notification settings', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred', type: 'error' })
    } finally {
      setIsSaving(false)
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

  const thresholds = thresholdsData?.thresholds || []

  return (
    <MasterOnly>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure temperature thresholds, alert escalation, and notification preferences
              </p>
            </div>
            <button
              onClick={() => {
                mutateThresholds()
                mutateEscalation()
                mutateNotifications()
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Settings Tabs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('thresholds')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'thresholds'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Thermometer className="w-4 h-4 inline mr-2" />
                  Temperature Thresholds
                </button>
                <button
                  onClick={() => setActiveTab('escalation')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'escalation'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Alert Escalation
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'notifications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Bell className="w-4 h-4 inline mr-2" />
                  Notifications
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Temperature Thresholds Tab */}
              {activeTab === 'thresholds' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Temperature Thresholds</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                          value={thresholdForm.level}
                          onChange={(e) => setThresholdForm({...thresholdForm, level: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="org">Organization</option>
                          <option value="site">Site</option>
                          <option value="environment">Environment</option>
                          <option value="sensor">Sensor</option>
                        </select>
                      </div>
                      {(thresholdForm.level === 'site' || thresholdForm.level === 'environment') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {thresholdForm.level === 'site' ? 'Site' : 'Environment'}
                          </label>
                          <select
                            value={thresholdForm.level_ref_id}
                            onChange={(e) => setThresholdForm({...thresholdForm, level_ref_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select...</option>
                            {sites.map((site: any) => (
                              <option key={site.id} value={site.id}>{site.site_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={thresholdForm.min_c}
                          onChange={(e) => setThresholdForm({...thresholdForm, min_c: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="-20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={thresholdForm.max_c}
                          onChange={(e) => setThresholdForm({...thresholdForm, max_c: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveThreshold}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Threshold'}
                    </button>
                  </div>

                  {/* Existing Thresholds */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Current Thresholds</h4>
                    <div className="space-y-2">
                      {thresholds.map((threshold: any) => (
                        <div key={threshold.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium capitalize">{threshold.level}</span>
                            <span className="text-sm text-gray-600">
                              Min: {threshold.min_c}°C, Max: {threshold.max_c}°C
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(threshold.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {thresholds.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No thresholds configured yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Escalation Tab */}
              {activeTab === 'escalation' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Escalation Settings</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                        <select
                          value={escalationForm.site_id}
                          onChange={(e) => setEscalationForm({...escalationForm, site_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select site...</option>
                          {sites.map((site: any) => (
                            <option key={site.id} value={site.id}>{site.site_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Delay (minutes)</label>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={escalationForm.escalation_minutes}
                          onChange={(e) => setEscalationForm({...escalationForm, escalation_minutes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={escalationForm.enabled}
                            onChange={(e) => setEscalationForm({...escalationForm, enabled: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Enable escalation</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveEscalation}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Escalation Settings'}
                    </button>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Escalation Process</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          If a site manager doesn't acknowledge an alert within the specified time, it will automatically escalate to the master user for immediate attention.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center">
                        <input
                          id="email-notifications"
                          type="checkbox"
                          checked={notificationForm.email_enabled}
                          onChange={(e) => setNotificationForm({...notificationForm, email_enabled: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="email-notifications" className="ml-3 text-sm font-medium text-gray-700">
                          Enable email notifications
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="in-app-notifications"
                          type="checkbox"
                          checked={notificationForm.in_app_enabled}
                          onChange={(e) => setNotificationForm({...notificationForm, in_app_enabled: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="in-app-notifications" className="ml-3 text-sm font-medium text-gray-700">
                          Enable in-app notifications
                        </label>
                      </div>
                      {notificationForm.email_enabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Additional email recipients (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={notificationForm.email_recipients}
                            onChange={(e) => setNotificationForm({...notificationForm, email_recipients: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="ops@company.com, manager@company.com"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex">
                      <Bell className="w-5 h-5 text-green-400" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-green-800">Notification Types</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Alerts will appear in the dashboard regardless of email settings. Email notifications provide additional redundancy for critical alerts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
              <div className={`rounded-md p-4 shadow-lg ${
                toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {toast.type === 'success' ? (
                      <Save className="h-5 w-5 text-green-400" aria-hidden="true" />
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
    </MasterOnly>
  )
}