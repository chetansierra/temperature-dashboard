'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  max_users: number
  current_users: number
}

interface FormData {
  email: string
  password: string
  full_name: string
  role: string
}

export default function NewUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'user'
  })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMasterUser, setHasMasterUser] = useState(false)

  useEffect(() => {
    fetchOrganization()
  }, [params.id])

  const fetchOrganization = async () => {
    try {
      setLoading(true)
      
      // Fetch organization details and existing users
      const [orgResponse, usersResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${params.id}`),
        fetch(`/api/admin/users?organization_id=${params.id}`)
      ])
      
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization')
      }
      
      const orgData = await orgResponse.json()
      setOrganization(orgData.organization)
      
      // Check if organization already has a master user
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const masterUser = usersData.users?.find((user: any) => user.role === 'master_user')
        setHasMasterUser(!!masterUser)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching organization:', err)
      setError('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          tenant_id: params.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create user')
      }

      // Redirect to organization users page on success
      router.push(`/admin/organizations/${params.id}/users`)
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
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
            <span className="text-gray-900">Create User</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
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

  const canCreateUser = organization && organization.current_users < organization.max_users

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <Link href="/admin/organizations" className="hover:text-gray-900">
            Organizations
          </Link>
          <span>/</span>
          <Link href={`/admin/organizations/${params.id}/users`} className="hover:text-gray-900">
            {organization?.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Create User</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
        <p className="text-gray-600 mt-1">Add a new user to {organization?.name}</p>
      </div>

      {organization && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">{organization.name}</h3>
              <p className="text-sm text-blue-800">
                {organization.current_users}/{organization.max_users} users
              </p>
            </div>
          </div>
          
          {!canCreateUser && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                User limit reached. Cannot create more users for this organization.
              </p>
            </div>
          )}
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name (optional)"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">User (Read-only access)</option>
              <option value="master_user" disabled={hasMasterUser}>
                Master User (Organization admin) {hasMasterUser ? '- Already exists' : ''}
              </option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Master users can manage all aspects of their organization. Only one master user per organization is allowed.
              {hasMasterUser && (
                <span className="text-yellow-600 font-medium"> This organization already has a master user.</span>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              The user can change this password after their first login.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Important</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• The user will receive their login credentials via email</li>
              <li>• They should change their password on first login</li>
              <li>• Master users have full access to manage the organization</li>
              <li>• Regular users have read-only access to assigned sites</li>
            </ul>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href={`/admin/organizations/${params.id}/users`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={creating || !canCreateUser}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}