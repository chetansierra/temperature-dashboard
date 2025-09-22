'use client'

import React from 'react'
import { useAuthStore } from '@/stores/authStore'

export interface RoleGuardProps {
  allowedRoles: ('master' | 'site_manager' | 'auditor' | 'admin')[]
  children: React.ReactNode
  fallback?: React.ReactNode
  requireSiteAccess?: string // Site ID for site-specific access
  showError?: boolean
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback,
  requireSiteAccess,
  showError = true
}) => {
  const { user, profile, isLoading } = useAuthStore()

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  // Not authenticated
  if (!user || !profile) {
    if (fallback) return <>{fallback}</>
    
    if (showError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-2">🔒 Authentication Required</div>
            <div className="text-sm text-gray-600">Please log in to access this content</div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Check if user's role is allowed
  const hasAllowedRole = allowedRoles.includes(profile.role)
  
  if (!hasAllowedRole) {
    if (fallback) return <>{fallback}</>
    
    if (showError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-2">⛔ Access Denied</div>
            <div className="text-sm text-gray-600">
              Your role ({profile.role}) does not have permission to access this content
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Required roles: {allowedRoles.join(', ')}
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Check site-specific access if required
  if (requireSiteAccess) {
    const canAccessSite = checkSiteAccess(profile, requireSiteAccess)
    
    if (!canAccessSite) {
      if (fallback) return <>{fallback}</>
      
      if (showError) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-red-500 mb-2">🚫 Site Access Denied</div>
              <div className="text-sm text-gray-600">
                You do not have permission to access this site
              </div>
            </div>
          </div>
        )
      }
      
      return null
    }
  }

  // Check if auditor access has expired
  if (profile.role === 'auditor' && profile.access_expires_at) {
    const expiryDate = new Date(profile.access_expires_at)
    const now = new Date()
    
    if (expiryDate < now) {
      if (fallback) return <>{fallback}</>
      
      if (showError) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-red-500 mb-2">⏰ Access Expired</div>
              <div className="text-sm text-gray-600">
                Your auditor access expired on {expiryDate.toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Please contact your administrator for renewed access
              </div>
            </div>
          </div>
        )
      }
      
      return null
    }
  }

  // All checks passed, render children
  return <>{children}</>
}

// Helper function to check site access
function checkSiteAccess(profile: any, siteId: string): boolean {
  // Admin can access any site
  if (profile.role === 'admin') {
    return true
  }
  
  // Site manager can only access their assigned site
  if (profile.role === 'site_manager') {
    return profile.site_id === siteId
  }
  
  // Master and auditor can access any site in their tenant (handled by RLS)
  return profile.role === 'master' || profile.role === 'auditor'
}

export default RoleGuard

// Convenience components for common role combinations
export const MasterOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master']} />
)

export const SiteManagerOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['site_manager']} />
)

export const AuditorOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['auditor']} />
)

export const AdminOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['admin']} />
)

export const ManagementRoles: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master', 'site_manager']} />
)

export const AllRoles: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master', 'site_manager', 'auditor', 'admin']} />
)
