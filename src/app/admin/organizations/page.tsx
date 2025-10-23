'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  max_users: number
  current_users: number
  plan: string
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  created_by_profile?: {
    id: string
    email: string
    full_name: string | null
  } | null
}

interface OrganizationsResponse {
  organizations: Organization[]
  total: number
}

export default function OrganizationsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
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
        console.log('Adding Bearer token to organizations request')
      } else {
        console.warn('No session or access token found for organizations request')
      }
      
      const response = await fetch('/api/admin/organizations', {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }
      
      const data: OrganizationsResponse = await response.json()
      setOrganizations(data.organizations)
      setError(null)
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Organizations</h1>
            <p className="text-gray-600 mt-1">Manage organizations you've created and onboarded</p>
          </div>
          <Link
            href="/admin/organizations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Organization
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Organizations</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrganizations}
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Organizations</h1>
          <p className="text-gray-600 mt-1">Manage organizations you've created and onboarded</p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Organization
        </Link>
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first organization.</p>
          <Link
            href="/admin/organizations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Organization
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">My Organizations ({organizations.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {organizations.map((org) => (
              <div 
                key={org.id} 
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/organizations/${org.id}/manage`)}
              >
                <div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{org.name}</h4>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {org.slug}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        org.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                        org.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {org.plan}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        org.status === 'active' ? 'bg-green-100 text-green-800' :
                        org.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {org.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        Users: {org.current_users}/{org.max_users}
                      </span>
                      <span>•</span>
                      <span>
                        Created: {new Date(org.created_at).toLocaleDateString()}
                      </span>
                      {org.created_by_profile && (
                        <>
                          <span>•</span>
                          <span>
                            Created by: {org.created_by_profile.full_name || org.created_by_profile.email}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* User limit progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">User Capacity</span>
                        <span className="text-gray-900 font-medium">
                          {org.max_users > 0 ? Math.round((org.current_users / org.max_users) * 100) : 0}%
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            org.max_users > 0 && org.current_users / org.max_users > 0.8
                              ? 'bg-red-500'
                              : org.max_users > 0 && org.current_users / org.max_users > 0.6
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${org.max_users > 0 ? (org.current_users / org.max_users) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
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