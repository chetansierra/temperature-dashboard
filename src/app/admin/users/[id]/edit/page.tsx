'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  last_login: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    slug: string
  } | null
}

interface FormData {
  full_name: string
  role: string
  status: string
  password: string
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    role: 'user',
    status: 'active',
    password: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRoleConfirmation, setShowRoleConfirmation] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [params.id])

  const fetchUser = async () => {
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
      
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }
      
      const data = await response.json()
      const userData = data.user
      
      setUser(userData)
      setFormData({
        full_name: userData.full_name || '',
        role: userData.role,
        status: userData.status,
        password: ''
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching user:', err)
      setError('Failed to load user')
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

  const handleRoleChange = (newRole: string) => {
    // Check if role is actually changing and if it's a significant change
    if (user && newRole !== user.role && (newRole === 'master_user' || user.role === 'master_user')) {
      setPendingRole(newRole)
      setShowRoleConfirmation(true)
    } else {
      setFormData(prev => ({ ...prev, role: newRole }))
    }
  }

  const confirmRoleChange = () => {
    if (pendingRole) {
      setFormData(prev => ({ ...prev, role: pendingRole }))
    }
    setShowRoleConfirmation(false)
    setPendingRole(null)
  }

  const cancelRoleChange = () => {
    setShowRoleConfirmation(false)
    setPendingRole(null)
  }

  const handleDeleteUser = async () => {
    if (!user) return
    
    const expectedText = `delete ${user.email} user`
    if (deleteConfirmationText.toLowerCase() !== expectedText.toLowerCase()) {
      setError(`Please type exactly: "${expectedText}"`)
      return
    }

    setDeleting(true)
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

      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete user')
      }

      // Redirect back to organization users page
      if (user?.tenant?.id) {
        router.push(`/admin/organizations/${user.tenant.id}/users`)
      } else {
        router.push('/admin/organizations')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true)
    setDeleteConfirmationText('')
    setError(null)
  }

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false)
    setDeleteConfirmationText('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const updateData: any = {
        full_name: formData.full_name,
        role: formData.role,
        status: formData.status
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

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

      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update user')
      }

      // Redirect back to organization users page
      if (user?.tenant?.id) {
        router.push(`/admin/organizations/${user.tenant.id}/users`)
      } else {
        router.push('/admin/organizations')
      }
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSaving(false)
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
            {[...Array(5)].map((_, i) => (
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

  if (error && !user) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/organizations" className="hover:text-gray-900">
              Organizations
            </Link>
            <span>/</span>
            <span className="text-gray-900">Edit User</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading User</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUser}
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
          {user?.tenant && (
            <>
              <Link href={`/admin/organizations/${user.tenant.id}/users`} className="hover:text-gray-900">
                {user.tenant.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900">Edit User</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-600 mt-1">Update user account and permissions</p>
      </div>

      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">{user.email}</h3>
              <p className="text-sm text-blue-800">
                {user.tenant?.name || 'No organization'} • Created {new Date(user.created_at).toLocaleDateString()}
                {user.last_login && ` • Last login ${new Date(user.last_login).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                user.role === 'master_user' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role === 'master_user' ? 'Master User' : 'User'}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                user.status === 'active' ? 'bg-green-100 text-green-800' :
                user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {user.status}
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Email address cannot be changed.
            </p>
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
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="user">User (Read-only access)</option>
              <option value="master_user">Master User (Organization admin)</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Changing to master user requires no existing master user in the organization.
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-right-3 bg-center pr-10"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Suspended users cannot access the system.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Reset Password
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password (leave blank to keep current)"
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
              Leave blank to keep the current password. User will be notified of password changes.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Important</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Role changes take effect immediately</li>
              <li>• Suspended users will be logged out automatically</li>
              <li>• Password resets will notify the user via email</li>
              <li>• Master user changes affect organization permissions</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={openDeleteConfirmation}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete User Permanently'}
            </button>
            
            <div className="flex items-center space-x-4">
              <Link
                href={user?.tenant?.id ? `/admin/organizations/${user.tenant.id}/users` : '/admin/organizations'}
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
          </div>
        </form>
      </div>

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirmation && user && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4 text-center">
                Delete User Permanently
              </h3>
              <div className="mt-4 px-4">
                <p className="text-sm text-gray-500 mb-4">
                  This action will permanently delete the user <strong>{user.email}</strong> and cannot be undone. 
                  All user data, access permissions, and account information will be permanently removed.
                </p>
                <p className="text-sm text-gray-700 font-medium mb-2">
                  To confirm deletion, please type:
                </p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded border mb-3">
                  delete {user.email} user
                </p>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type the confirmation text here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  disabled={deleting}
                />
                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}
              </div>
              <div className="items-center px-4 py-3 mt-4">
                <div className="flex space-x-3">
                  <button
                    onClick={closeDeleteConfirmation}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleting || deleteConfirmationText.toLowerCase() !== `delete ${user.email} user`.toLowerCase()}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showRoleConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Confirm Role Change
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {pendingRole === 'master_user' 
                    ? `Are you sure you want to promote this user to Master User? This will give them full administrative access to the organization.`
                    : `Are you sure you want to demote this Master User to a regular user? This will remove their administrative privileges.`
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                  This change will take effect immediately.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={cancelRoleChange}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    className="px-4 py-2 bg-yellow-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    Confirm Change
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