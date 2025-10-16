import { NextRequest } from 'next/server'
import { GET as sitesGET } from '@/app/api/sites/route'
import { GET as environmentsGET } from '@/app/api/sites/[siteId]/environments/route'
import { getAuthContext } from '@/utils/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Mock dependencies
jest.mock('@/utils/auth')
jest.mock('@/lib/supabase-server')
jest.mock('@/utils/rate-limit', () => ({
  rateLimiters: {
    get: jest.fn().mockResolvedValue({ success: true })
  },
  addRateLimitHeaders: jest.fn((response) => response)
}))

const mockGetAuthContext = getAuthContext as jest.MockedFunction<typeof getAuthContext>
const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>

describe('Organization User Site Access API Tests', () => {
  const mockAdminAuthContext = {
    user: { id: 'admin-1', email: 'admin@test.com' },
    profile: {
      id: 'admin-1',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin' as const,
      tenant_id: null,
      site_access: null,
      auditor_expires_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }

  const mockMasterUserAuthContext = {
    user: { id: 'master-1', email: 'master@org1.com' },
    profile: {
      id: 'master-1',
      email: 'master@org1.com',
      full_name: 'Master User',
      role: 'master_user' as const,
      tenant_id: 'org-1',
      site_access: null,
      auditor_expires_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }

  const mockRegularUserAuthContext = {
    user: { id: 'user-1', email: 'user@org1.com' },
    profile: {
      id: 'user-1',
      email: 'user@org1.com',
      full_name: 'Regular User',
      role: 'user' as const,
      tenant_id: 'org-1',
      site_access: null,
      auditor_expires_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }

  const mockUserWithoutOrgAuthContext = {
    user: { id: 'user-2', email: 'user@noorg.com' },
    profile: {
      id: 'user-2',
      email: 'user@noorg.com',
      full_name: 'User Without Org',
      role: 'user' as const,
      tenant_id: null,
      site_access: null,
      auditor_expires_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }

  const mockSitesData = [
    {
      id: 'site-1',
      name: 'Site 1',
      location: 'Location 1',
      description: 'Test site 1',
      status: 'active',
      tenant_id: 'org-1',
      site_code: 'SITE-1',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'site-2',
      name: 'Site 2',
      location: 'Location 2',
      description: 'Test site 2',
      status: 'active',
      tenant_id: 'org-2',
      site_code: 'SITE-2',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockEnvironmentsData = [
    {
      id: 'env-1',
      name: 'Environment 1',
      environment_type: 'cold_storage',
      status: 'active',
      description: 'Test environment 1',
      site_id: 'site-1',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'env-2',
      name: 'Environment 2',
      environment_type: 'chiller',
      status: 'active',
      description: 'Test environment 2',
      site_id: 'site-1',
      created_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateServerSupabaseClient.mockResolvedValue(mockSupabaseClient as any)
  })

  describe('Sites API (/api/sites)', () => {
    const createMockRequest = (url = 'http://localhost:3000/api/sites') => {
      return new NextRequest(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    }

    it('should allow admin to access all sites', async () => {
      mockGetAuthContext.mockResolvedValue(mockAdminAuthContext)
      mockSupabaseClient.select.mockResolvedValue({
        data: mockSitesData,
        error: null,
        count: 2
      })

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sites).toHaveLength(2)
      expect(mockSupabaseClient.eq).not.toHaveBeenCalledWith('tenant_id', expect.anything())
    })

    it('should filter sites by organization for master user', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext)
      const orgSites = mockSitesData.filter(site => site.tenant_id === 'org-1')
      mockSupabaseClient.select.mockResolvedValue({
        data: orgSites,
        error: null,
        count: 1
      })

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sites).toHaveLength(1)
      expect(data.sites[0].tenant_id).toBe('org-1')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', 'org-1')
    })

    it('should filter sites by organization for regular user', async () => {
      mockGetAuthContext.mockResolvedValue(mockRegularUserAuthContext)
      const orgSites = mockSitesData.filter(site => site.tenant_id === 'org-1')
      mockSupabaseClient.select.mockResolvedValue({
        data: orgSites,
        error: null,
        count: 1
      })

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sites).toHaveLength(1)
      expect(data.sites[0].tenant_id).toBe('org-1')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', 'org-1')
    })

    it('should return 403 for user without organization membership', async () => {
      mockGetAuthContext.mockResolvedValue(mockUserWithoutOrgAuthContext)

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('NO_ORGANIZATION_MEMBERSHIP')
      expect(data.error.message).toBe('User has no organization membership')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetAuthContext.mockResolvedValue(null)

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database errors gracefully', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext)
      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
        count: null
      })

      const request = createMockRequest()
      const response = await sitesGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('FETCH_FAILED')
      expect(data.error.message).toBe('Failed to fetch sites data')
    })
  })

  describe('Site Environments API (/api/sites/[siteId]/environments)', () => {
    const createMockRequest = (siteId = 'site-1') => {
      return new NextRequest(`http://localhost:3000/api/sites/${siteId}/environments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const mockParams = { siteId: 'site-1' }

    it('should allow admin to access environments from any site', async () => {
      mockGetAuthContext.mockResolvedValue(mockAdminAuthContext)
      
      // Mock site lookup
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-1', tenant_id: 'org-1', name: 'Site 1' },
        error: null
      })
      
      // Mock environments query
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockEnvironmentsData,
        error: null
      })

      const request = createMockRequest('site-1')
      const response = await environmentsGET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.environments).toHaveLength(2)
      expect(data.site.id).toBe('site-1')
    })

    it('should allow organization user to access environments from their organization sites', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext)
      
      // Mock site lookup - same organization
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-1', tenant_id: 'org-1', name: 'Site 1' },
        error: null
      })
      
      // Mock environments query
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockEnvironmentsData,
        error: null
      })

      const request = createMockRequest('site-1')
      const response = await environmentsGET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.environments).toHaveLength(2)
    })

    it('should deny access to environments from different organization sites', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext) // org-1 user
      
      // Mock site lookup - different organization
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-2', tenant_id: 'org-2', name: 'Site 2' },
        error: null
      })

      const request = createMockRequest('site-2')
      const response = await environmentsGET(request, { params: { siteId: 'site-2' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('ORGANIZATION_ACCESS_DENIED')
    })

    it('should return 404 for non-existent site', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext)
      
      // Mock site lookup - not found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Site not found' }
      })

      const request = createMockRequest('non-existent-site')
      const response = await environmentsGET(request, { params: { siteId: 'non-existent-site' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('SITE_NOT_FOUND')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetAuthContext.mockResolvedValue(null)

      const request = createMockRequest('site-1')
      const response = await environmentsGET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database errors when fetching environments', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext)
      
      // Mock site lookup - success
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-1', tenant_id: 'org-1', name: 'Site 1' },
        error: null
      })
      
      // Mock environments query - error
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const request = createMockRequest('site-1')
      const response = await environmentsGET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('FETCH_FAILED')
      expect(data.error.message).toBe('Failed to fetch environments data')
    })
  })

  describe('Cross-organization access validation', () => {
    it('should prevent user from org-1 accessing site from org-2', async () => {
      mockGetAuthContext.mockResolvedValue(mockMasterUserAuthContext) // org-1 user
      
      // Mock site lookup - org-2 site
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-2', tenant_id: 'org-2', name: 'Site 2' },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/site-2/environments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const response = await environmentsGET(request, { params: { siteId: 'site-2' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('ORGANIZATION_ACCESS_DENIED')
      expect(data.error.details.userOrganization).toBe('org-1')
      expect(data.error.details.resourceOrganization).toBe('org-2')
    })

    it('should allow same organization access for regular users', async () => {
      mockGetAuthContext.mockResolvedValue(mockRegularUserAuthContext) // org-1 user
      
      // Mock site lookup - org-1 site
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'site-1', tenant_id: 'org-1', name: 'Site 1' },
        error: null
      })
      
      // Mock environments query
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockEnvironmentsData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/site-1/environments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const response = await environmentsGET(request, { params: { siteId: 'site-1' } })

      expect(response.status).toBe(200)
    })
  })
})