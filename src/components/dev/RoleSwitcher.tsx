'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

const roles = [
  { value: 'admin', label: 'Admin (Relationship Manager)', color: 'bg-red-600' },
  { value: 'master_user', label: 'Master User (Org Admin)', color: 'bg-blue-600' },
  { value: 'user', label: 'User (Read-only)', color: 'bg-green-600' },
]

export default function RoleSwitcher() {
  const { profile } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const currentRole = typeof window !== 'undefined' ? localStorage.getItem('dev_role_override') || profile?.role : profile?.role

  const switchRole = (role: string) => {
    localStorage.setItem('dev_role_override', role)
    window.location.reload()
  }

  const clearOverride = () => {
    localStorage.removeItem('dev_role_override')
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          🔄 Role: {currentRole}
        </button>
        
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-64">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Development Role Switcher</h3>
              <p className="text-xs text-gray-600 mt-1">Switch roles for testing</p>
            </div>
            
            <div className="p-2 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => switchRole(role.value)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentRole === role.value
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${role.color} mr-2`}></div>
                    {role.label}
                  </div>
                </button>
              ))}
              
              <div className="border-t border-gray-200 pt-2 mt-2">
                <button
                  onClick={clearOverride}
                  className="w-full text-left px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-50"
                >
                  🔄 Reset to Default
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}