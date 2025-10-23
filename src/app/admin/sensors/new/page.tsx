'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AddSensorModal from '@/components/admin/AddSensorModal'

export default function NewSensorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isModalOpen, setIsModalOpen] = useState(true)

  // Get preselected values from URL params
  const preselectedSite = searchParams.get('site') || undefined
  const preselectedEnvironment = searchParams.get('environment') || undefined

  const handleClose = () => {
    setIsModalOpen(false)
    router.back()
  }

  const handleSuccess = () => {
    // The modal will handle navigation to the sensor detail page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AddSensorModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        preselectedSite={preselectedSite}
        preselectedEnvironment={preselectedEnvironment}
      />
    </div>
  )
}