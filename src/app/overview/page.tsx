'use client'

import React from 'react'
import { AllRoles } from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { OverviewContent } from '@/components/pages/OverviewContent'

export default function OverviewPage() {
  return (
    <AllRoles>
      <DashboardLayout>
        <OverviewContent />
      </DashboardLayout>
    </AllRoles>
  )
}
