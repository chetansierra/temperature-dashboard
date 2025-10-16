'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  status: string
}

interface OrganizationSelectorProps {
  currentOrgId?: string | null
}

export default function OrganizationSelector({ currentOrgId }: OrganizationSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isViewingAsOrg, setIsViewingAsOrg] = useState(false)

  useEffect(() => {
    fetchOrganizations()
    
    // Check if currently viewing as an organization
    const viewingAs = localStorage.getItem('admin_viewing_as_org')
    setIsViewingAsOrg(!!viewingAs)
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/organizations')
      
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationSelect = (orgId: string) => {
    if (orgId === 'admin') {
      // Return to admin view
      localStorage.removeItem('admin_viewing_as_org')
      setIsViewingAsOrg(false)
      router.push('/admin/dashboard')
    } else {
      // Switch to organization view
      localStorage.setItem('admin_viewing_as_org', orgId)
      setIsViewingAsOrg(true)
      router.push(`/admin/view-as/${orgId}`)
    }
  }

  const getCurrentViewingOrg = () => {
    const viewingOrgId = localStorage.getItem('admin_viewing_as_org')
    if (viewingOrgId) {
      return organizations.find(org => org.id === viewingOrgId)
    }
    return null
  }

  const currentViewingOrg = getCurrentViewingOrg()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      {isViewingAsOrg && currentViewingOrg && (
        <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-sm font-medium text-blue-900">
            Viewing as: {currentViewingOrg.name}
          </span>
        </div>
      )}
      
      <div className="relative">
        <select
          value={isViewingAsOrg ? currentViewingOrg?.id || '' : 'admin'}
          onChange={(e) => handleOrganizationSelect(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="admin">👑 Admin View</option>
          <optgroup label="Organizations">
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                🏢 {org.name} ({org.plan})
              </option>
            ))}
          </optgroup>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isViewingAsOrg && (
        <button
          onClick={() => handleOrganizationSelect('admin')}
          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Return to Admin</span>
        </button>
      )}
    </div>
  )
}