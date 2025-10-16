'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  max_users: number
  current_users: number
}

interface Site {
  id: string
  name: string
  location: string
  status: string
  sensor_count: number
  last_reading: string | null
  alert_count: number
}

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  last_login: string | null
}

export default function ViewAsOrganizationPage({ params }: { params: { orgId: string } }) {
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Store the organization ID in localStorage for the selector
    localStorage.setItem('admin_viewing_as_org', params.orgId)
    
    fetchOrganizationData()
  }, [params.orgId])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      
      // Fetch organization details, sites, and users in parallel
      const [orgResponse, sitesResponse, usersResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${params.orgId}`),
        fetch(`/api/admin/sites?organization_id=${params.orgId}`),
        fetch(`/api/admin/users?organization_id=${params.orgId}`)
      ])

      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization')
      }

      const orgData = await orgResponse.json()
      setOrganization(orgData.organization)

      // Sites API might not exist yet, so handle gracefully
      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json()
        setSites(sitesData.sites || [])
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching organization data:', err)
      setError('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const returnToAdminView = () => {
    localStorage.removeItem('admin_viewing_as_org')
    router.push('/admin/dashboard')
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={returnToAdminView}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Admin View</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Organization View</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Organization</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrganizationData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Organization not found</p>
        <button
          onClick={returnToAdminView}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Return to Admin View
        </button>
      </div>
    )
  }

  const masterUser = users.find(user => user.role === 'master_user')

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={returnToAdminView}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Return to Admin View</span>
        </button>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              Viewing as Master User would see for: <strong>{organization.name}</strong>
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{organization.name} Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Organization overview and management
        </p>
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Users</p>
              <p className="text-2xl font-bold text-gray-900">{organization.current_users}/{organization.max_users}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sites</p>
              <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sensors</p>
              <p className="text-2xl font-bold text-gray-900">{sites.reduce((total, site) => total + site.sensor_count, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{sites.reduce((total, site) => total + site.alert_count, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Master User Info */}
      {masterUser && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Master User</h3>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{masterUser.full_name || masterUser.email}</p>
              <p className="text-sm text-gray-600">{masterUser.email}</p>
              <p className="text-sm text-gray-500">
                Last login: {masterUser.last_login ? new Date(masterUser.last_login).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sites Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Sites</h3>
          <span className="text-sm text-gray-500">{sites.length} total</span>
        </div>
        
        {sites.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Sites</h4>
            <p className="text-gray-600">This organization doesn't have any monitoring sites yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sites.map((site) => (
              <div key={site.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{site.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        site.status === 'active' ? 'bg-green-100 text-green-800' :
                        site.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {site.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>{site.location}</span>
                      <span>•</span>
                      <span>{site.sensor_count} sensors</span>
                      {site.alert_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-medium">{site.alert_count} alerts</span>
                        </>
                      )}
                      {site.last_reading && (
                        <>
                          <span>•</span>
                          <span>Last reading: {new Date(site.last_reading).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          <Link
            href={`/admin/organizations/${organization.id}/users`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Manage Users
          </Link>
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
                    {user.last_login && (
                      <>
                        <span>•</span>
                        <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}