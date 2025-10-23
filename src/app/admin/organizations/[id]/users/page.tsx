'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  last_login: string | null
  created_at: string
}

interface Organization {
  id: string
  name: string
  slug: string
  max_users: number
  current_users: number
  plan: string
  status: string
}

export default function OrganizationUsersPage({ params }: { params: { id: string } }) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
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
        console.log('Adding Bearer token to organization users requests')
      } else {
        console.warn('No session or access token found for organization users requests')
      }
      
      // Fetch organization details and users in parallel
      const [orgResponse, usersResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${params.id}`, {
          headers,
          credentials: 'include'
        }),
        fetch(`/api/admin/users?organization_id=${params.id}`, {
          headers,
          credentials: 'include'
        })
      ])

      if (!orgResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [orgData, usersData] = await Promise.all([
        orgResponse.json(),
        usersResponse.json()
      ])

      setOrganization(orgData.organization)
      setUsers(usersData.users)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load organization data')
    } finally {
      setLoading(false)
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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/admin/organizations" className="hover:text-gray-900">
              Organizations
            </Link>
            <span>/</span>
            <span className="text-gray-900">User Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
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
          <span className="text-gray-900">User Management</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage users for {organization?.name}
            </p>
          </div>
          <Link
            href={`/admin/organizations/${params.id}/users/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create User
          </Link>
        </div>
      </div>

      {organization && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">{organization.name}</h3>
              <p className="text-sm text-blue-800">
                {organization.current_users}/{organization.max_users} users • {organization.plan} plan
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
          
          {organization.current_users >= organization.max_users && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                User limit reached. Increase the limit to add more users.
              </p>
            </div>
          )}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Users</h3>
          <p className="text-gray-600 mb-6">This organization doesn't have any users yet.</p>
          <Link
            href={`/admin/organizations/${params.id}/users/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First User
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Users ({users.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">
                        {user.full_name || user.email}
                      </h4>
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
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>{user.email}</span>
                      <span>•</span>
                      <span>
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                      {user.last_login && (
                        <>
                          <span>•</span>
                          <span>
                            Last login: {new Date(user.last_login).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-6 flex items-center space-x-3">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}