'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  max_users: number
  plan: string
  status: string
  current_users: number
  total_sites: number
  created_at: string
}

interface FormData {
  name: string
  max_users: string
  plan: string
  status: string
}

export default function EditOrganizationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    max_users: '',
    plan: 'basic',
    status: 'active'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganization()
  }, [params.id])

  const fetchOrganization = async () => {
    try {
      setLoading(true)
      
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      
      const response = await fetch(`/api/admin/organizations/${params.id}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization')
      }
      
      const data = await response.json()
      const org = data.organization
      
      setOrganization(org)
      setFormData({
        name: org.name,
        max_users: org.max_users.toString(),
        plan: org.plan,
        status: org.status
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching organization:', err)
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Get the current session to include in the request
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/admin/organizations/${params.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          max_users: parseInt(formData.max_users),
          plan: formData.plan,
          status: formData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update organization')
      }

      // Redirect to organizations list on success
      router.push('/admin/organizations')
    } catch (err) {
      console.error('Error updating organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!organization) return

    const confirmMessage = `Are you sure you want to delete "${organization.name}"?\n\nThis will permanently delete:\n• The organization and all its data\n• All sites (${organization.total_sites})\n• All users (${organization.current_users})\n• All sensors and readings\n\nThis action cannot be undone.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    // Double confirmation for safety
    const finalConfirm = prompt(`To confirm deletion, please type the organization name: "${organization.name}"`)
    if (finalConfirm !== organization.name) {
      alert('Organization name does not match. Deletion cancelled.')
      return
    }

    try {
      setDeleting(true)
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
      }
      
      const response = await fetch(`/api/admin/organizations/${params.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete organization')
      }

      // Redirect to organizations list on success
      router.push('/admin/organizations')
    } catch (err) {
      console.error('Error deleting organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete organization')
    } finally {
      setDeleting(false)
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

  if (error && !organization) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/organizations" className="hover:text-gray-900">
              Organizations
            </Link>
            <span>/</span>
            <span className="text-gray-900">Edit Organization</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Organization</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Organization</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrganization}
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
          <Link href="/admin/organizations" className="hover:text-gray-900">
            Organizations
          </Link>
          <span>/</span>
          <span className="text-gray-900">Edit Organization</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Organization</h1>
        <p className="text-gray-600 mt-1">Update organization settings and configuration</p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {organization && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{organization.name}</h3>
                <p className="text-sm text-gray-600">
                  {organization.current_users} users • {organization.total_sites} sites • Created {new Date(organization.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  organization.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                  organization.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {organization.plan}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  organization.status === 'active' ? 'bg-green-100 text-green-800' :
                  organization.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {organization.status}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <label htmlFor="max_users" className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Users
            </label>
            <input
              type="number"
              id="max_users"
              required
              min="1"
              max="1000"
              value={formData.max_users}
              onChange={(e) => setFormData(prev => ({ ...prev, max_users: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Current users: {organization?.current_users || 0}. Cannot set limit below current user count.
            </p>
          </div>

          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-2">
              Plan
            </label>
            <select
              id="plan"
              value={formData.plan}
              onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="trial">Trial</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Suspended organizations cannot access the system.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href="/admin/organizations"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 bg-white shadow-sm rounded-lg border border-red-200">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
          <p className="text-sm text-red-700 mt-1">
            Irreversible and destructive actions
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Delete Organization</h4>
              <p className="text-sm text-gray-600 mb-2">
                Permanently delete this organization and all associated data including sites, users, sensors, and readings.
              </p>
              {organization && (
                <div className="text-sm text-gray-500">
                  <p>This will delete:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>{organization.current_users} user{organization.current_users !== 1 ? 's' : ''}</li>
                    <li>{organization.total_sites} site{organization.total_sites !== 1 ? 's' : ''}</li>
                    <li>All sensors and their readings</li>
                    <li>All alerts and configurations</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={handleDeleteOrganization}
              disabled={deleting || saving}
              className="ml-6 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}