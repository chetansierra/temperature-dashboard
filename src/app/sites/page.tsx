'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AllRoles } from '@/components/auth/RoleGuard'
import SitesList from '@/components/SitesList'



export default function SitesPage() {
  const { user, profile, isLoading: authLoading, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, isInitialized, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AllRoles>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
                <p className="text-gray-600 mt-1">
                  View and monitor sites from your organization
                </p>
              </div>
              {profile?.tenant_id && (
                <div className="text-sm text-gray-600">
                  Organization: {profile.tenant_id.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>

          {/* Organization-based Sites List */}
          <SitesList />
        </div>
      </DashboardLayout>
    </AllRoles>
  )
}