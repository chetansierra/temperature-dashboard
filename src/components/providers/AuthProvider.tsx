'use client'

import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  return <>{children}</>
}
