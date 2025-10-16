'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface Site {
  id: string
  name: string
  location: string
}

interface UserSiteAccess {
  user_id: string
  site_id: string
  granted_at: string
}

export default function AccessControlPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [userAccess, setUserAccess] = useState<UserSiteAccess[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is master_user
    if (profile && profile.role !== 'master_user' && profile.role !== 'master') {
      router.push('/overview')
      return
    }

    // TODO: Fetch actual data from API
    // For now, show mock data
    setTimeout(() => {
      setUsers([
        {
          id: 'user-1',
          email: 'user1@acme.com',
          full_name: 'Alice Johnson',
          role: 'user',
          created_at: '2025-09-22T16:24:36.116Z'
        },
        {
          id: 'user-2',
          email: 'user2@acme.com',
          full_name: 'Bob Wilson',
          role: 'user',
          created_at: '2025-09-23T10:15:22.445Z'
        },
        {
          id: 'user-3',
          email: 'user3@acme.com',
          full_name: 'Carol Davis',
          role: 'user',
          created_at: '2025-09-24T14:30:18.789Z'
        }
      ])

      setSites([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Mumbai Warehouse',
          location: 'Mumbai, India'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Delhi Distribution Center',
          location: 'Delhi, India'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Bangalore Cold Storage',
          location: 'Bangalore, India'
        }
      ])

      setUserAccess([
        {
          user_id: 'user-1',
          site_id: '550e8400-e29b-41d4-a716-446655440001',
          granted_at: '2025-09-22T16:24:36.116Z'
        },
        {
          user_id: 'user-1',
          site_id: '550e8400-e29b-41d4-a716-446655440002',
          granted_at: '2025-09-22T16:24:36.116Z'
        },
        {
          user_id: 'user-2',
          site_id: '550e8400-e29b-41d4-a716-446655440003',
          granted_at: '2025-09-23T10:15:22.445Z'
        }
      ])

      setLoading(false)
    }, 1000)
  }, [profile, router])

  const toggleSiteAccess = async (userId: string, siteId: string) => {
    const hasAccess = userAccess.some(
      access => access.user_id === userId && access.site_id === siteId
    )

    if (hasAccess) {
      // Remove access
      setUserAccess(prev => 
        prev.filter(access => !(access.user_id === userId && access.site_id === siteId))
      )
    } else {
      // Grant access
      setUserAccess(prev => [
        ...prev,
        {
          user_id: userId,
          site_id: siteId,
          granted_at: new Date().toISOString()
        }
      ])
    }

    // TODO: Make API call to update access
    console.log(`${hasAccess ? 'Removing' : 'Granting'} access for user ${userId} to site ${siteId}`)
  }

  const getUserSiteAccess = (userId: string): string[] => {
    return userAccess
      .filter(access => access.user_id === userId)
      .map(access => access.site_id)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
        <p className="text-gray-600 mt-1">
          Manage which users have access to which sites in your organization
        </p>
      </div>

      <div className="space-y-6">
        {users.map((user) => {
          const userSiteAccess = getUserSiteAccess(user.id)
          
          return (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {user.full_name || user.email}
                  </h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    {user.role}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Access to {userSiteAccess.length} of {sites.length} sites
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Site Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sites.map((site) => {
                    const hasAccess = userSiteAccess.includes(site.id)
                    
                    return (
                      <div
                        key={site.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          hasAccess
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleSiteAccess(user.id, site.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{site.name}</p>
                            <p className="text-xs text-gray-600">{site.location}</p>
                          </div>
                          <div className="ml-2">
                            {hasAccess ? (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no regular users in your organization yet.
          </p>
        </div>
      )}
    </div>
  )
}