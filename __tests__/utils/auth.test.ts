import { 
  canAccessSite, 
  getOrganizationSiteFilter, 
  validateOrganizationAccess,
  UserProfile 
} from '@/utils/auth'

describe('Authentication Utilities - Organization Access', () => {
  const mockAdminProfile: UserProfile = {
    id: 'admin-1',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin',
    tenant_id: null,
    site_access: null,
    auditor_expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockMasterUserProfile: UserProfile = {
    id: 'master-1',
    email: 'master@org1.com',
    full_name: 'Master User',
    role: 'master_user',
    tenant_id: 'org-1',
    site_access: null,
    auditor_expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockRegularUserProfile: UserProfile = {
    id: 'user-1',
    email: 'user@org1.com',
    full_name: 'Regular User',
    role: 'user',
    tenant_id: 'org-1',
    site_access: null,
    auditor_expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockUserWithoutOrg: UserProfile = {
    id: 'user-2',
    email: 'user@noorg.com',
    full_name: 'User Without Org',
    role: 'user',
    tenant_id: null,
    site_access: null,
    auditor_expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  describe('canAccessSite', () => {
    it('should allow admin to access any site', () => {
      expect(canAccessSite(mockAdminProfile, 'site-1')).toBe(true)
      expect(canAccessSite(mockAdminProfile, 'site-2')).toBe(true)
      expect(canAccessSite(mockAdminProfile)).toBe(true)
    })

    it('should allow master user with organization to access sites', () => {
      expect(canAccessSite(mockMasterUserProfile, 'site-1')).toBe(true)
      expect(canAccessSite(mockMasterUserProfile)).toBe(true)
    })

    it('should allow regular user with organization to access sites', () => {
      expect(canAccessSite(mockRegularUserProfile, 'site-1')).toBe(true)
      expect(canAccessSite(mockRegularUserProfile)).toBe(true)
    })

    it('should deny access to users without organization membership', () => {
      expect(canAccessSite(mockUserWithoutOrg, 'site-1')).toBe(false)
      expect(canAccessSite(mockUserWithoutOrg)).toBe(false)
    })

    it('should deny access to master user without organization', () => {
      const masterWithoutOrg = { ...mockMasterUserProfile, tenant_id: null }
      expect(canAccessSite(masterWithoutOrg, 'site-1')).toBe(false)
    })
  })

  describe('getOrganizationSiteFilter', () => {
    it('should return null filter for admin (no restrictions)', () => {
      const filter = getOrganizationSiteFilter(mockAdminProfile)
      expect(filter).toBeNull()
    })

    it('should return tenant_id filter for master user with organization', () => {
      const filter = getOrganizationSiteFilter(mockMasterUserProfile)
      expect(filter).toEqual({ tenant_id: 'org-1' })
    })

    it('should return tenant_id filter for regular user with organization', () => {
      const filter = getOrganizationSiteFilter(mockRegularUserProfile)
      expect(filter).toEqual({ tenant_id: 'org-1' })
    })

    it('should return no-access filter for user without organization', () => {
      const filter = getOrganizationSiteFilter(mockUserWithoutOrg)
      expect(filter).toEqual({ tenant_id: 'no-access' })
    })

    it('should return no-access filter for master user without organization', () => {
      const masterWithoutOrg = { ...mockMasterUserProfile, tenant_id: null }
      const filter = getOrganizationSiteFilter(masterWithoutOrg)
      expect(filter).toEqual({ tenant_id: 'no-access' })
    })
  })

  describe('validateOrganizationAccess', () => {
    it('should allow admin to access any organization resource', () => {
      expect(validateOrganizationAccess(null, 'org-1', 'admin')).toBe(true)
      expect(validateOrganizationAccess('org-2', 'org-1', 'admin')).toBe(true)
      expect(validateOrganizationAccess('org-1', 'org-1', 'admin')).toBe(true)
    })

    it('should allow access when user and resource belong to same organization', () => {
      expect(validateOrganizationAccess('org-1', 'org-1', 'master_user')).toBe(true)
      expect(validateOrganizationAccess('org-1', 'org-1', 'user')).toBe(true)
    })

    it('should deny access when user and resource belong to different organizations', () => {
      expect(validateOrganizationAccess('org-1', 'org-2', 'master_user')).toBe(false)
      expect(validateOrganizationAccess('org-1', 'org-2', 'user')).toBe(false)
    })

    it('should deny access when user has no organization membership', () => {
      expect(validateOrganizationAccess(null, 'org-1', 'master_user')).toBe(false)
      expect(validateOrganizationAccess(null, 'org-1', 'user')).toBe(false)
    })

    it('should handle edge cases with empty or undefined values', () => {
      expect(validateOrganizationAccess('', 'org-1', 'user')).toBe(false)
      expect(validateOrganizationAccess('org-1', '', 'user')).toBe(false)
      expect(validateOrganizationAccess(undefined as any, 'org-1', 'user')).toBe(false)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete organization access workflow for master user', () => {
      const profile = mockMasterUserProfile
      const siteId = 'site-1'
      const resourceTenantId = 'org-1'

      // Check if user can access sites in general
      expect(canAccessSite(profile, siteId)).toBe(true)

      // Get filter for API queries
      const filter = getOrganizationSiteFilter(profile)
      expect(filter).toEqual({ tenant_id: 'org-1' })

      // Validate specific resource access
      expect(validateOrganizationAccess(profile.tenant_id, resourceTenantId, profile.role)).toBe(true)
    })

    it('should handle complete organization access workflow for regular user', () => {
      const profile = mockRegularUserProfile
      const siteId = 'site-1'
      const resourceTenantId = 'org-1'

      // Check if user can access sites in general
      expect(canAccessSite(profile, siteId)).toBe(true)

      // Get filter for API queries
      const filter = getOrganizationSiteFilter(profile)
      expect(filter).toEqual({ tenant_id: 'org-1' })

      // Validate specific resource access
      expect(validateOrganizationAccess(profile.tenant_id, resourceTenantId, profile.role)).toBe(true)
    })

    it('should handle cross-organization access attempt', () => {
      const profile = mockRegularUserProfile // belongs to org-1
      const siteId = 'site-2'
      const resourceTenantId = 'org-2' // different organization

      // User can access sites in general (based on their org membership)
      expect(canAccessSite(profile, siteId)).toBe(true)

      // But validation should fail for cross-org resource
      expect(validateOrganizationAccess(profile.tenant_id, resourceTenantId, profile.role)).toBe(false)
    })

    it('should handle user without organization membership', () => {
      const profile = mockUserWithoutOrg
      const siteId = 'site-1'
      const resourceTenantId = 'org-1'

      // User cannot access sites without org membership
      expect(canAccessSite(profile, siteId)).toBe(false)

      // Filter should prevent access to any sites
      const filter = getOrganizationSiteFilter(profile)
      expect(filter).toEqual({ tenant_id: 'no-access' })

      // Validation should fail
      expect(validateOrganizationAccess(profile.tenant_id, resourceTenantId, profile.role)).toBe(false)
    })
  })
})