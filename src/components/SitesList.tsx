'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { getUserFriendlyErrorMessage, StandardErrorResponse } from '@/utils/errors'

interface Site {
  id: string
  site_name: string
  location: string
  status: string
  environment_count: number
  sensor_count: number
  active_alerts: number
  health_status: 'healthy' | 'warning' | 'critical'
  description?: string
  created_at: string
  tenant_name: string
}

interface SitesResponse {
  sites: Site[]
  total: number
  pagination: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
}

export default function SitesList() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    async function fetchSites() {
      if (!profile) return

      try {
        setLoading(true)
        setError(null)

        // Get the current session to include in the request
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`
          console.log('Adding Bearer token to sites request')
        } else {
          console.warn('No session or access token found for sites request')
        }

        const response = await fetch('/api/sites', {
          headers,
          credentials: 'include'
        })
        
        if (!response.ok) {
          const errorData: StandardErrorResponse = await response.json()
          const friendlyMessage = getUserFriendlyErrorMessage(errorData)
          throw new Error(friendlyMessage)
        }

        const data: SitesResponse = await response.json()
        setSites(data.sites)
      } catch (err) {
        console.error('Failed to fetch sites:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch sites')
      } finally {
        setLoading(false)
      }
    }

    fetchSites()
  }, [profile])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthStatusColor = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading sites...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading sites</div>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No sites available</div>
        {profile?.role === 'master_user' ? (
          <p className="text-sm text-gray-600">
            Contact your administrator to add sites to your organization.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            No sites have been assigned to your organization yet.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Sites ({sites.length})
          </h2>
          {sites.length > 0 && sites[0].tenant_name && (
            <p className="text-sm text-gray-600 mt-1">
              {sites[0].tenant_name}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div 
            key={site.id} 
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            onClick={() => router.push(`/sites/${site.id}`)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{site.site_name}</h3>
                <p className="text-gray-600 text-sm">{site.location}</p>
                {site.description && (
                  <p className="text-gray-500 text-xs mt-1">{site.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(site.status)}`}>
                  {site.status}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthStatusColor(site.health_status)}`}>
                  {site.health_status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900">{site.environment_count}</div>
                <div className="text-gray-500 text-xs">Environments</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900">{site.sensor_count}</div>
                <div className="text-gray-500 text-xs">Sensors</div>
              </div>
              <div className="text-center">
                <div className={`font-medium ${site.active_alerts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {site.active_alerts}
                </div>
                <div className="text-gray-500 text-xs">Alerts</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Created {new Date(site.created_at).toLocaleDateString()}
                </span>
                <span className="text-blue-600 text-sm font-medium">
                  View Details →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}