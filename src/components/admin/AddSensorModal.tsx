'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
}

interface Site {
  id: string
  name: string
  location: string
  tenant_id: string
  tenant?: {
    id: string
    name: string
    slug: string
  }
}

interface Environment {
  id: string
  name: string
  type: string
}

interface AddSensorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  preselectedSite?: string
  preselectedEnvironment?: string
}



export default function AddSensorModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  preselectedSite,
  preselectedEnvironment
}: AddSensorModalProps) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [userTriggeredSubmit, setUserTriggeredSubmit] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    local_id: '',
    model: '',
    organization_id: '',
    site_id: preselectedSite || '',
    environment_id: preselectedEnvironment || '',
    status: 'active',
    battery_level: 100,
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchAllSites()
      // If environment is preselected, fetch its details to auto-populate site
      if (preselectedEnvironment) {
        fetchEnvironmentDetails(preselectedEnvironment)
      }
      setStep(1)
      setError(null)
      setUserTriggeredSubmit(false) // Reset submit flag when modal opens
    }
  }, [isOpen, preselectedEnvironment])

  useEffect(() => {
    if (formData.site_id) {
      // Auto-populate organization based on selected site
      const selectedSite = sites.find(site => site.id === formData.site_id)
      if (selectedSite && selectedSite.tenant_id !== formData.organization_id) {
        setFormData(prev => ({ 
          ...prev, 
          organization_id: selectedSite.tenant_id 
        }))
      }
      fetchEnvironmentsForSite(formData.site_id)
    } else {
      setEnvironments([])
      setFormData(prev => ({ ...prev, environment_id: '' }))
    }
  }, [formData.site_id, sites])



  const fetchAllSites = async () => {
    try {
      setLoading(true)
      
      const { apiGet } = await import('@/utils/api')
      const response = await apiGet('/api/admin/sites')
      
      if (response.data) {
        const data = response.data
        setSites(data.sites || [])
        
        // Extract unique organizations from sites
        const uniqueOrgs = data.sites?.reduce((acc: Organization[], site: Site) => {
          if (site.tenant && !acc.find(org => org.id === site.tenant!.id)) {
            acc.push({
              id: site.tenant.id,
              name: site.tenant.name,
              slug: site.tenant.slug
            })
          }
          return acc
        }, []) || []
        
        setOrganizations(uniqueOrgs)
      }
    } catch (err) {
      console.error('Error fetching sites:', err)
      setError('Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvironmentDetails = async (environmentId: string) => {
    try {
      const { apiGet } = await import('@/utils/api')
      const response = await apiGet(`/api/admin/environments/${environmentId}`)
      
      if (response.data) {
        const data = response.data
        const environment = data.environment
        
        // Auto-populate site_id based on environment
        if (environment?.site?.id) {
          setFormData(prev => ({
            ...prev,
            site_id: environment.site.id,
            organization_id: environment.site.tenant?.id || ''
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching environment details:', err)
    }
  }

  const fetchEnvironmentsForSite = async (siteId: string) => {
    try {
      const { apiGet } = await import('@/utils/api')
      const response = await apiGet(`/api/admin/environments?site_id=${siteId}`)
      
      if (response.data) {
        const data = response.data
        setEnvironments(data.environments || [])
      }
    } catch (err) {
      console.error('Error fetching environments:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Only allow submission on step 3 and when explicitly triggered by user
    if (step !== 3 || !userTriggeredSubmit) {
      return
    }
    setCreating(true)
    setError(null)
    setUserTriggeredSubmit(false) // Reset the flag

    try {
      const { apiPost } = await import('@/utils/api')
      const response = await apiPost('/api/admin/sensors', {
        name: formData.name,
        local_id: formData.local_id || null,
        model: formData.model || null,
        environment_id: formData.environment_id,
        status: formData.status,
        battery_level: formData.battery_level,
        is_active: formData.is_active
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create sensor')
      }

      const result = response.data
      
      if (onSuccess) {
        onSuccess()
      }
      
      // Navigate to the new sensor's detail page
      if (result.sensor?.id) {
        router.push(`/admin/sensors/${result.sensor.id}`)
      }
      
      onClose()
    } catch (err) {
      console.error('Error creating sensor:', err)
      setError(err instanceof Error ? err.message : 'Failed to create sensor')
    } finally {
      setCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (step < 3) {
      setUserTriggeredSubmit(false) // Reset submit flag when changing steps
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const canProceedToStep2 = () => {
    return formData.name
  }

  const canProceedToStep3 = () => {
    return formData.site_id && formData.environment_id
  }

  const canSubmit = () => {
    return formData.name && formData.environment_id
  }

  const getSensorIcon = () => {
    return '📡' // Generic sensor icon
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
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
      <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl leading-6 font-medium text-gray-900">Add New Sensor</h3>
              <p className="text-sm text-gray-600 mt-1">Create a new sensor to monitor your environment</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Sensor Details</span>
              <span>Site & Environment</span>
              <span>Configuration</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            // Prevent form submission on Enter key unless on final step
            if (e.key === 'Enter') {
              if (step < 3) {
                e.preventDefault()
                e.stopPropagation()
                if (step === 1 && canProceedToStep2()) {
                  nextStep()
                } else if (step === 2 && canProceedToStep3()) {
                  nextStep()
                }
              }
            }
          }} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Sensor Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Sensor Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Warehouse Temperature Sensor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="local_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Local ID (Optional)
                    </label>
                    <input
                      type="text"
                      id="local_id"
                      value={formData.local_id}
                      onChange={(e) => handleInputChange('local_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., TEMP-001"
                    />
                  </div>

                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                      Model (Optional)
                    </label>
                    <input
                      type="text"
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., DHT22, DS18B20"
                    />
                  </div>
                </div>


              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getSensorIcon()}</span>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">{formData.name}</h4>
                      {formData.model && <p className="text-xs text-blue-700">{formData.model}</p>}
                    </div>
                  </div>
                </div>



                <div>
                  <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-2">
                    Site *
                  </label>
                  <select
                    id="site"
                    required
                    value={formData.site_id}
                    onChange={(e) => handleInputChange('site_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.tenant?.name} - {site.name} ({site.location})
                      </option>
                    ))}
                  </select>
                </div>



                <div>
                  <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
                    Environment *
                  </label>
                  <select
                    id="environment"
                    required
                    value={formData.environment_id}
                    onChange={(e) => handleInputChange('environment_id', e.target.value)}
                    disabled={!formData.site_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                      Please select a site first
                    </p>
                  )}
                </div>

                {environments.length === 0 && formData.site_id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">No Environments Available</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The selected site doesn't have any environments. You may need to create an environment first.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Configuration */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Sensor Summary</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Name:</strong> {formData.name}</p>
                    {formData.local_id && <p><strong>Local ID:</strong> {formData.local_id}</p>}
                    {formData.model && <p><strong>Model:</strong> {formData.model}</p>}
                    <p><strong>Organization:</strong> {sites.find(s => s.id === formData.site_id)?.tenant?.name}</p>
                    <p><strong>Site:</strong> {sites.find(s => s.id === formData.site_id)?.name}</p>
                    <p><strong>Environment:</strong> {environments.find(e => e.id === formData.environment_id)?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                  <div>
                    <label htmlFor="is_active" className="block text-sm font-medium text-gray-700 mb-2">
                      Active
                    </label>
                    <select
                      id="is_active"
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Sensor Information</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Sensors collect data from their assigned environment</li>
                    <li>• Local ID helps identify sensors within your organization</li>
                    <li>• Model information helps with maintenance and support</li>
                    <li>• Active status controls whether the sensor can collect data</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>

              <div>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !canProceedToStep2()) ||
                      (step === 2 && !canProceedToStep3())
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={creating || !canSubmit()}
                    onClick={() => setUserTriggeredSubmit(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating Sensor...' : 'Create Sensor'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}