'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Environment {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  site: {
    id: string
    name: string
    location: string
    tenant: {
      id: string
      name: string
      slug: string
    } | null
  } | null
}

interface FormData {
  name: string
  type: string
  status: string
}

export default function EditEnvironmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'indoor',
    status: 'active'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchEnvironment()
  }, [params.id])

  const fetchEnvironment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/environments/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch environment')
      }
      
      const data = await response.json()
      const envData = data.environment
      
      setEnvironment(envData)
      setFormData({
        name: envData.name,
        type: envData.type,
        status: envData.status
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching environment:', err)
      setError('Failed to load environment')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/environments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update environment')
      }

      // Redirect back to environments page
      router.push('/admin/environments')
    } catch (err) {
      console.error('Error updating environment:', err)
      setError(err instanceof Error ? err.message : 'Failed to update environment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/environments/${params.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete environment')
      }

      // Redirect back to environments page
      router.push('/admin/environments')
    } catch (err) {
      console.error('Error deleting environment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete environment')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !environment) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/environments" className="hover:text-gray-900">
              Environments
            </Link>
            <span>/</span>
            <span className="text-gray-900">Edit Environment</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Environment</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Environment</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchEnvironment}
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
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <Link href="/admin/environments" className="hover:text-gray-900">
            Environments
          </Link>
          <span>/</span>
          <span className="text-gray-900">Edit Environment</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Environment</h1>
        <p className="text-gray-600 mt-1">Update environment settings and configuration</p>
      </div>

      {environment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">{environment.name}</h3>
              <p className="text-sm text-blue-800">
                {environment.site?.name} - {environment.site?.location} • {environment.site?.tenant?.name}
              </p>
              <p className="text-sm text-blue-700">
                Created: {new Date(environment.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {environment.type.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                environment.status === 'active' ? 'bg-green-100 text-green-800' :
                environment.status === 'inactive' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {environment.status}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Environment Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter environment name"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Environment Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="cold_storage">Cold Storage</option>
              <option value="warehouse">Warehouse</option>
              <option value="office">Office</option>
              <option value="laboratory">Laboratory</option>
              <option value="other">Other</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              The environment type helps categorize monitoring areas and may affect sensor configurations.
            </p>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Inactive environments will stop collecting data. Maintenance mode allows data collection but may suppress alerts.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Important</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Changes to environment status affect all sensors in this environment</li>
              <li>• Changing the environment type may affect sensor configurations</li>
              <li>• Environment location and site cannot be changed here</li>
              <li>• Deleting an environment will remove all associated sensors</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Environment
            </button>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/environments"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Delete Environment
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{environment?.name}"? This action cannot be undone and will remove all sensors in this environment.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}