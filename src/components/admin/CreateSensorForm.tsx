'use client'

import { useState, useEffect } from 'react'

interface Organization {
  id: string
  name: string
  slug: string
}

interface Site {
  id: string
  name: string
  location: string
}

interface Environment {
  id: string
  name: string
  type: string
}

interface CreateSensorFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSensorForm({ onClose, onSuccess }: CreateSensorFormProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'temperature',
    organization_id: '',
    site_id: '',
    environment_id: '',
    status: 'active',
    battery_level: 100
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (formData.organization_id) {
      fetchSitesForOrganization(formData.organization_id)
    } else {
      setSites([])
      setEnvironments([])
      setFormData(prev => ({ ...prev, site_id: '', environment_id: '' }))
    }
  }, [formData.organization_id])

  useEffect(() => {
    if (formData.site_id) {
      fetchEnvironmentsForSite(formData.site_id)
    } else {
      setEnvironments([])
      setFormData(prev => ({ ...prev, environment_id: '' }))
    }
  }, [formData.site_id])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/organizations')
      
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])
      }
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchSitesForOrganization = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/admin/sites?organization_id=${organizationId}`)
      
      if (response.ok) {
        const data = await response.json()
        setSites(data.sites || [])
      }
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }

  const fetchEnvironmentsForSite = async (siteId: string) => {
    try {
      const response = await fetch(`/api/admin/environments?site_id=${siteId}`)
      
      if (response.ok) {
        const data = await response.json()
        setEnvironments(data.environments || [])
      }
    } catch (err) {
      console.error('Error fetching environments:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/sensors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          environment_id: formData.environment_id,
          status: formData.status,
          battery_level: formData.battery_level
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create sensor')
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creating sensor:', err)
      setError(err instanceof Error ? err.message : 'Failed to create sensor')
    } finally {
      setCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Create Sensor</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Sensor Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sensor name"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Sensor Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="temperature_humidity">Temperature & Humidity</option>
                <option value="pressure">Pressure</option>
                <option value="air_quality">Air Quality</option>
                <option value="motion">Motion</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                id="organization"
                required
                value={formData.organization_id}
                onChange={(e) => handleInputChange('organization_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <select
                id="site"
                required
                value={formData.site_id}
                onChange={(e) => handleInputChange('site_id', e.target.value)}
                disabled={!formData.organization_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select Site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} - {site.location}
                  </option>
                ))}
              </select>
              {!formData.organization_id && (
                <p className="mt-1 text-sm text-gray-500">
                  Select an organization first
                </p>
              )}
            </div>

            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <select
                id="environment"
                required
                value={formData.environment_id}
                onChange={(e) => handleInputChange('environment_id', e.target.value)}
                disabled={!formData.site_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select Environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name} ({env.type})
                  </option>
                ))}
              </select>
              {!formData.site_id && (
                <p className="mt-1 text-sm text-gray-500">
                  Select a site first
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label htmlFor="battery_level" className="block text-sm font-medium text-gray-700 mb-2">
                  Battery Level (%)
                </label>
                <input
                  type="number"
                  id="battery_level"
                  min="0"
                  max="100"
                  value={formData.battery_level}
                  onChange={(e) => handleInputChange('battery_level', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Sensor Information</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sensors collect data from their assigned environment</li>
                <li>• Choose the sensor type that matches your monitoring needs</li>
                <li>• Battery level tracking helps with maintenance scheduling</li>
                <li>• Sensor status affects data collection and alerting</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !formData.name || !formData.environment_id}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Sensor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}