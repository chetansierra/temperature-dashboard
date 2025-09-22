'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function HomePage() {
  const router = useRouter()
  const { user, profile, isLoading, isInitialized } = useAuthStore()

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (user && profile) {
        // Redirect authenticated users to overview
        router.push('/overview')
      } else {
        // Redirect unauthenticated users to login
        router.push('/login')
      }
    }
  }, [user, profile, isLoading, isInitialized, router])

  // Show loading while determining auth state
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Temperature Dashboard</h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // This should not be reached due to the redirect logic above
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Temperature Dashboard</h1>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
