'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Shield, Search, Building, AlertTriangle, CheckCircle } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  created_at: string
  site_count?: number
  user_count?: number
}

export default function AdminLoginPage() {
  const { user, profile, isLoading } = useAuthStore()
  const router = useRouter()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  useEffect(() => {
    if (!isLoading && user && profile?.role === 'admin') {
      // Admin is already logged in, redirect to tenant selection
      setIsLoginMode(false)
      fetchTenants()
    } else if (!isLoading && user && profile?.role !== 'admin') {
      // Non-admin user, redirect to regular dashboard
      router.push('/overview')
    }
  }, [user, profile, isLoading, router])

  const fetchTenants = async () => {
    setIsSearching(true)
    try {
      // In a real implementation, this would be an admin API endpoint
      // For now, we'll simulate fetching tenants
      const mockTenants: Tenant[] = [
        {
          id: 'tenant-1',
          name: 'Acme Foods Ltd.',
          created_at: '2024-01-01T00:00:00Z',
          site_count: 5,
          user_count: 12
        },
        {
          id: 'tenant-2',
          name: 'Global Logistics Inc.',
          created_at: '2024-02-15T00:00:00Z',
          site_count: 8,
          user_count: 25
        },
        {
          id: 'tenant-3',
          name: 'Fresh Produce Co.',
          created_at: '2024-03-10T00:00:00Z',
          site_count: 3,
          user_count: 8
        }
      ]

      // Filter by search term
      const filtered = mockTenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

      setTenants(filtered)
    } catch (error) {
      setError('Failed to load organizations')
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!isLoginMode) {
      fetchTenants()
    }
  }, [searchTerm, isLoginMode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      })

      if (error) {
        setError('Invalid admin credentials')
        return
      }

      // Check if user is an admin
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (userProfile?.role !== 'admin') {
        await supabase.auth.signOut()
        setError('Access denied. Admin privileges required.')
        return
      }

      setToast({ message: 'Admin login successful', type: 'success' })
      setIsLoginMode(false)
      fetchTenants()

    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setToast({
      message: `Selected organization: ${tenant.name}. In a real implementation, you would now view this organization's dashboard in read-only mode.`,
      type: 'success'
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoginMode(true)
    setSelectedTenant(null)
    setLoginForm({ email: '', password: '' })
    setError('')
    setToast(null)
  }

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLoginMode ? 'Admin Portal' : 'Organization Selection'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLoginMode
            ? 'Sign in to access the admin dashboard'
            : 'Select an organization to view in read-only mode'
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLoginMode ? (
            /* Admin Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Admin Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="admin@platform.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign in as Admin'}
                </button>
              </div>
            </form>
          ) : (
            /* Organization Selection */
            <div className="space-y-6">
              {selectedTenant ? (
                /* Selected Organization View */
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Organization Selected
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900">{selectedTenant.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Sites: {selectedTenant.site_count} | Users: {selectedTenant.user_count}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    In a full implementation, you would now see this organization's dashboard in read-only mode.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedTenant(null)}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Select Different Organization
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                /* Organization Search and Selection */
                <>
                  <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                      Search Organizations
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Search by organization name..."
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {isSearching ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Searching organizations...</p>
                      </div>
                    ) : tenants.length === 0 ? (
                      <div className="text-center py-8">
                        <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          {searchTerm ? 'No organizations found matching your search.' : 'No organizations available.'}
                        </p>
                      </div>
                    ) : (
                      tenants.map((tenant) => (
                        <div
                          key={tenant.id}
                          onClick={() => handleTenantSelect(tenant)}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{tenant.name}</h4>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <span>Sites: {tenant.site_count}</span>
                                <span>Users: {tenant.user_count}</span>
                                <span>Created: {new Date(tenant.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Building className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div className={`rounded-md p-4 shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {toast.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
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
  )
}