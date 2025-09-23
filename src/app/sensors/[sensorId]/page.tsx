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
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp
} from 'lucide-react'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, {
  credentials: 'include'
}).then((res) => res.json())

interface Sensor {
  id: string
  sensor_id_local: string | null
  property_measured: string
  installation_date: string | null
  location_details: string | null
  status: 'active' | 'maintenance' | 'decommissioned'
  created_at: string
  environment: {
    name: string
    environment_type: string
  }
  site: {
    site_name: string
    site_code: string
    location: string
    timezone: string
  }
  latest_reading?: {
    value: number
    timestamp: string
  }
}

export default function SensorDetailPage() {
  const { sensorId } = useParams()
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch sensor details
  const { data: sensorData, error: sensorError, mutate: mutateSensor } = useSWR(
    user && sensorId ? `/api/sensors/${sensorId}` : null,
    fetcher
  )

  const sensor: Sensor | null = sensorData?.sensor || null

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

  if (sensorError) {
    return (
      <AllRoles>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sensor Not Found</h3>
            <p className="text-gray-600 mb-4">
              The requested sensor could not be found or you don't have access to it.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go Back
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
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {sensor?.sensor_id_local || `Sensor ${sensor?.id.slice(-8)}`}
              </h1>
              <p className="text-gray-600 mt-1">
                {sensor?.environment.name} • {sensor?.site.site_name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  mutateSensor()
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Sensor Stats */}
          {sensor && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {sensor.property_measured === 'temperature_c' ? 'Temperature (°C)' : sensor.property_measured}
                    </p>
                  </div>
                  <Thermometer className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-lg font-semibold ${
                      sensor.status === 'active' ? 'text-green-600' :
                      sensor.status === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sensor.status}
                    </p>
                  </div>
                  <CheckCircle className={`w-8 h-8 ${
                    sensor.status === 'active' ? 'text-green-500' :
                    sensor.status === 'maintenance' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Latest Reading</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {sensor.latest_reading ? `${sensor.latest_reading.value}°C` : 'No data'}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Environment</p>
                    <p className="text-lg font-semibold text-gray-900">{sensor.environment.name}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Sensor Details */}
          {sensor && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sensor Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Sensor ID</dt>
                      <dd className="text-sm text-gray-900">{sensor.id}</dd>
                    </div>
                    {sensor.sensor_id_local && (
                      <div>
                        <dt className="text-xs text-gray-500">Local ID</dt>
                        <dd className="text-sm text-gray-900">{sensor.sensor_id_local}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-gray-500">Property Measured</dt>
                      <dd className="text-sm text-gray-900">
                        {sensor.property_measured === 'temperature_c' ? 'Temperature (°C)' :
                         sensor.property_measured === 'humidity_pct' ? 'Humidity (%)' :
                         sensor.property_measured}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900 capitalize">{sensor.status}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Location & Installation</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Site</dt>
                      <dd className="text-sm text-gray-900">{sensor.site.site_name} ({sensor.site.site_code})</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Environment</dt>
                      <dd className="text-sm text-gray-900">{sensor.environment.name}</dd>
                    </div>
                    {sensor.location_details && (
                      <div>
                        <dt className="text-xs text-gray-500">Location Details</dt>
                        <dd className="text-sm text-gray-900">{sensor.location_details}</dd>
                      </div>
                    )}
                    {sensor.installation_date && (
                      <div>
                        <dt className="text-xs text-gray-500">Installation Date</dt>
                        <dd className="text-sm text-gray-900">{new Date(sensor.installation_date).toLocaleDateString()}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{new Date(sensor.created_at).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for Charts/Readings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sensor Readings</h2>
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reading History</h3>
              <p className="text-gray-600">
                Sensor reading charts and historical data will be displayed here.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}