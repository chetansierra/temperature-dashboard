'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const { signIn, user, profile, isInitialized } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && user && profile) {
      router.push('/overview')
    }
  }, [user, profile, isInitialized, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn(email, password)
      
      if (result.error) {
        setError(result.error)
      } else {
        // Success - redirect will happen via useEffect
        router.push('/overview')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading if not initialized yet
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-white rounded-full shadow-lg">
            <span className="text-4xl">🌡️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#10367D]">
            Temperature Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional B2B Temperature Monitoring
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10367D] focus:border-[#10367D] focus:z-10 sm:text-sm transition-colors"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10367D] focus:border-[#10367D] focus:z-10 sm:text-sm transition-colors"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Sign in failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#10367D] hover:bg-[#0d2a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10367D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                🧪 Demo Credentials for Testing
              </h3>
              <div className="space-y-2 text-xs">
                <div className="bg-[#EBEBEB] rounded-lg p-3">
                  <div className="font-semibold text-[#10367D]">Master User (Full Access)</div>
                  <div className="text-gray-600">master@acme.com / password123</div>
                </div>
                <div className="bg-[#EBEBEB] rounded-lg p-3">
                  <div className="font-semibold text-[#10367D]">Site Manager (Mumbai)</div>
                  <div className="text-gray-600">manager.mumbai@acme.com / password123</div>
                </div>
                <div className="bg-[#EBEBEB] rounded-lg p-3">
                  <div className="font-semibold text-[#10367D]">Auditor (Read-only)</div>
                  <div className="text-gray-600">auditor@temp-audit.com / password123</div>
                </div>
                <div className="bg-[#EBEBEB] rounded-lg p-3">
                  <div className="font-semibold text-[#10367D]">Platform Admin</div>
                  <div className="text-gray-600">admin@dashboard.com / password123</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                ⚠️ Note: These users need to be created in Supabase Auth first
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
