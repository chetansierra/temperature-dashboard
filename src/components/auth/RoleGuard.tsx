'use client'

import React from 'react'
import { useAuthStore } from '@/stores/authStore'

export interface RoleGuardProps {
  allowedRoles: ('master_user' | 'user' | 'admin')[]
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

  // No longer checking auditor expiry since we don't use auditor role

  // All checks passed, render children
  return <>{children}</>
}

// Helper function to check site access
function checkSiteAccess(profile: any, siteId: string): boolean {
  // Admin can access any site
  if (profile.role === 'admin') {
    return true
  }
  
  // Users can only access their assigned sites
  if (profile.role === 'user') {
    return profile.site_access && profile.site_access.includes(siteId)
  }
  
  // Master users can access any site in their tenant (handled by RLS)
  return profile.role === 'master_user'
}

export default RoleGuard

// Convenience components for common role combinations
export const MasterUserOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master_user']} />
)

export const UserOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['user']} />
)

export const AdminOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['admin']} />
)

export const ManagementRoles: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master_user', 'admin']} />
)

export const AllRoles: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard {...props} allowedRoles={['master_user', 'user', 'admin']} />
)
