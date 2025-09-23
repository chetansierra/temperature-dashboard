'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MasterOnly } from '@/components/auth/RoleGuard'
import { UserPlus, Users, Mail, Calendar, Shield, RefreshCw, AlertTriangle } from 'lucide-react'

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, {
  credentials: 'include'
}).then((res) => res.json())

interface User {
  id: string
  email: string
  role: 'master' | 'site_manager' | 'auditor' | 'admin'
  site_id: string | null
  created_at: string
  last_sign_in_at: string | null
  sites?: {
    site_name: string
    site_code: string
  } | null
}

interface UsersResponse {
  success: boolean
  users: User[]
}

export default function UsersManagementPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'site_manager' as 'master' | 'site_manager' | 'auditor',
    site_id: '',
    expiry_date: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch users data
  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR<UsersResponse>(
    user ? '/api/users' : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch sites for site manager selection
  const { data: sitesData } = useSWR(
    user ? '/api/sites' : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true
    }
  )

  const users = usersData?.users || []
  const sites = sitesData?.sites || []

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(inviteForm)
      })

      const result = await response.json()

      if (response.ok) {
        setToast({ message: 'User invitation sent successfully', type: 'success' })
        setShowInviteModal(false)
        setInviteForm({
          email: '',
          role: 'site_manager',
          site_id: '',
          expiry_date: ''
        })
        mutateUsers() // Refresh the users list
      } else {
        setToast({ message: result.error?.message || 'Failed to send invitation', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'An error occurred while sending the invitation', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'master': return 'bg-blue-100 text-blue-800'
      case 'site_manager': return 'bg-green-100 text-green-800'
      case 'auditor': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑'
      case 'master': return '🏢'
      case 'site_manager': return '🏭'
      case 'auditor': return '👁️'
      default: return '👤'
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

  return (
    <MasterOnly>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">
                Manage users, roles, and permissions for your organization
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => mutateUsers()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Masters</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === 'master').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Site Managers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.role === 'site_manager').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Auditors</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {users.filter(u => u.role === 'auditor').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Organization Users</h2>
            </div>

            {usersError ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load users. Please try refreshing.</p>
              </div>
            ) : usersLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600 mb-4">Get started by inviting your first user.</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite First User
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Site
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Sign In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.email}</div>
                              <div className="text-sm text-gray-500">ID: {user.id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            <span className="mr-1">{getRoleIcon(user.role)}</span>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.sites ? `${user.sites.site_name} (${user.sites.site_code})` : 'All Sites'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invite User Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Invite New User</h3>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>

                  <form onSubmit={handleInviteUser} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="user@company.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        id="role"
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm({...inviteForm, role: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="site_manager">Site Manager</option>
                        <option value="auditor">Auditor</option>
                        <option value="master">Master</option>
                      </select>
                    </div>

                    {inviteForm.role === 'site_manager' && (
                      <div>
                        <label htmlFor="site_id" className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Site *
                        </label>
                        <select
                          id="site_id"
                          required
                          value={inviteForm.site_id}
                          onChange={(e) => setInviteForm({...inviteForm, site_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a site...</option>
                          {sites.map((site: any) => (
                            <option key={site.id} value={site.id}>
                              {site.site_name} ({site.site_code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {inviteForm.role === 'auditor' && (
                      <div>
                        <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                          Access Expiry Date *
                        </label>
                        <input
                          id="expiry_date"
                          type="date"
                          required
                          value={inviteForm.expiry_date}
                          onChange={(e) => setInviteForm({...inviteForm, expiry_date: e.target.value})}
                          min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </form>
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
                      <Mail className="h-5 w-5 text-green-400" aria-hidden="true" />
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