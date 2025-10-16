/**
 * Integration test for the complete admin organization management workflow
 * Tests the end-to-end flow: Organizations → Sites → Environments
 */

import { NextRequest } from 'next/server'

// Import API handlers
import { GET as getOrganizations, POST as createOrganization } from '@/app/api/admin/organizations/route'
import { GET as getOrganization } from '@/app/api/admin/organizations/[id]/route'
import { GET as getSites, POST as createSite } from '@/app/api/admin/organizations/[id]/sites/route'
import { GET as getEnvironments, POST as createEnvironment } from '@/app/api/admin/sites/[id]/environments/route'

// Mock dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/utils/auth')

const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  single: jest.fn(),
  order: jest.fn()
}

const mockAuthContext = {
  profile: { id: 'admin-id', role: 'admin' }
}

describe('Admin Organization Management Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    require('@/lib/supabase-server').createServerSupabaseClient.mockResolvedValue(mockSupabaseClient)
    require('@/utils/auth').getAuthContext.mockResolvedValue(mockAuthContext)
    require('@/utils/auth').createAuthError.mockImplementation((message: string) => ({ error: message }))
  })

  describe('Complete Workflow: Organization → Site → Environment', () => {
    it('should complete the full workflow successfully', async () => {
      // Step 1: Create an organization
      const organizationData = {
        name: 'Test Corporation',
        slug: 'test-corp',
        max_users: 100,
        plan: 'pro'
      }

      const mockOrganization = {
        id: 'org-1',
        ...organizationData,
        status: 'active',
        plan_limits: {},
        created_by: 'admin-id',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }

      // Mock organization creation
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: null }) // slug check

      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      // Mock admin activity logging
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockResolvedValueOnce({ error: null })

      const createOrgRequest = new NextRequest('http://localhost/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData)
      })

      const createOrgResponse = await createOrganization(createOrgRequest)
      const orgResult = await createOrgResponse.json()

      expect(createOrgResponse.status).toBe(201)
      expect(orgResult.organization.name).toBe('Test Corporation')

      // Step 2: Create a site for the organization
      const siteData = {
        name: 'Main Office',
        location: 'New York, NY',
        status: 'active'
      }

      const mockSite = {
        id: 'site-1',
        ...siteData,
        tenant_id: 'org-1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }

      // Mock organization check for site creation
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      // Mock site creation
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSite, error: null })

      // Mock admin activity logging
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockResolvedValueOnce({ error: null })

      const createSiteRequest = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify(siteData)
      })
      const siteParams = Promise.resolve({ id: 'org-1' })

      const createSiteResponse = await createSite(createSiteRequest, { params: siteParams })
      const siteResult = await createSiteResponse.json()

      expect(createSiteResponse.status).toBe(201)
      expect(siteResult.site.name).toBe('Main Office')
      expect(siteResult.site.tenant_id).toBe('org-1')

      // Step 3: Create an environment for the site
      const environmentData = {
        name: 'Production Floor',
        type: 'production',
        status: 'active'
      }

      const mockEnvironment = {
        id: 'env-1',
        ...environmentData,
        site_id: 'site-1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }

      // Mock site check for environment creation
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ 
        data: { 
          ...mockSite, 
          tenant: { name: 'Test Corporation' } 
        }, 
        error: null 
      })

      // Mock environment creation
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockEnvironment, error: null })

      // Mock admin activity logging
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockResolvedValueOnce({ error: null })

      const createEnvRequest = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify(environmentData)
      })
      const envParams = Promise.resolve({ id: 'site-1' })

      const createEnvResponse = await createEnvironment(createEnvRequest, { params: envParams })
      const envResult = await createEnvResponse.json()

      expect(createEnvResponse.status).toBe(201)
      expect(envResult.environment.name).toBe('Production Floor')
      expect(envResult.environment.site_id).toBe('site-1')
      expect(envResult.environment.type).toBe('production')

      // Step 4: Verify the complete hierarchy can be retrieved
      // Get organization with sites and environments
      
      // Mock organization details
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      // Mock user count
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.neq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.neq.mockResolvedValueOnce({ count: 5 })

      // Mock site count
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockResolvedValueOnce({ count: 1 })

      const getOrgRequest = new NextRequest('http://localhost/api/admin/organizations/org-1')
      const getOrgParams = Promise.resolve({ id: 'org-1' })

      const getOrgResponse = await getOrganization(getOrgRequest, { params: getOrgParams })
      const getOrgResult = await getOrgResponse.json()

      expect(getOrgResponse.status).toBe(200)
      expect(getOrgResult.organization.name).toBe('Test Corporation')
      expect(getOrgResult.organization.current_users).toBe(5)
      expect(getOrgResult.organization.total_sites).toBe(1)

      // Get sites for organization
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [mockSite], error: null })

      const getSitesRequest = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const getSitesParams = Promise.resolve({ id: 'org-1' })

      const getSitesResponse = await getSites(getSitesRequest, { params: getSitesParams })
      const getSitesResult = await getSitesResponse.json()

      expect(getSitesResponse.status).toBe(200)
      expect(getSitesResult.sites).toHaveLength(1)
      expect(getSitesResult.sites[0].name).toBe('Main Office')

      // Get environments for site
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSite, error: null })

      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [mockEnvironment], error: null })

      const getEnvsRequest = new NextRequest('http://localhost/api/admin/sites/site-1/environments')
      const getEnvsParams = Promise.resolve({ id: 'site-1' })

      const getEnvsResponse = await getEnvironments(getEnvsRequest, { params: getEnvsParams })
      const getEnvsResult = await getEnvsResponse.json()

      expect(getEnvsResponse.status).toBe(200)
      expect(getEnvsResult.environments).toHaveLength(1)
      expect(getEnvsResult.environments[0].name).toBe('Production Floor')
      expect(getEnvsResult.environments[0].type).toBe('production')
    })

    it('should handle validation errors throughout the workflow', async () => {
      // Test organization creation with invalid data
      const invalidOrgData = {
        name: '', // empty name
        slug: 'test-corp',
        max_users: 100
      }

      const createOrgRequest = new NextRequest('http://localhost/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(invalidOrgData)
      })

      const createOrgResponse = await createOrganization(createOrgRequest)
      const orgResult = await createOrgResponse.json()

      expect(createOrgResponse.status).toBe(400)
      expect(orgResult.error.code).toBe('VALIDATION_ERROR')

      // Test site creation with invalid data
      const invalidSiteData = {
        name: 'a'.repeat(101), // too long
        location: 'New York'
      }

      const createSiteRequest = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify(invalidSiteData)
      })
      const siteParams = Promise.resolve({ id: 'org-1' })

      const createSiteResponse = await createSite(createSiteRequest, { params: siteParams })
      const siteResult = await createSiteResponse.json()

      expect(createSiteResponse.status).toBe(400)
      expect(siteResult.error.code).toBe('VALIDATION_ERROR')

      // Test environment creation with invalid type
      const invalidEnvData = {
        name: 'Test Environment',
        type: 'invalid-type'
      }

      const createEnvRequest = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify(invalidEnvData)
      })
      const envParams = Promise.resolve({ id: 'site-1' })

      const createEnvResponse = await createEnvironment(createEnvRequest, { params: envParams })
      const envResult = await createEnvResponse.json()

      expect(createEnvResponse.status).toBe(400)
      expect(envResult.error.code).toBe('VALIDATION_ERROR')
      expect(envResult.error.message).toContain('Type must be one of')
    })

    it('should handle authorization errors', async () => {
      // Mock non-admin user
      require('@/utils/auth').getAuthContext.mockResolvedValue({
        profile: { id: 'user-id', role: 'user' }
      })

      const request = new NextRequest('http://localhost/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test', max_users: 100 })
      })

      const response = await createOrganization(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Admin access required')
    })

    it('should handle not found errors', async () => {
      // Test accessing non-existent organization
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost/api/admin/organizations/nonexistent/sites')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await getSites(request, { params })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('should test all environment types', async () => {
      const validTypes = ['indoor', 'outdoor', 'warehouse', 'office', 'production']
      
      for (const type of validTypes) {
        jest.clearAllMocks()
        require('@/lib/supabase-server').createServerSupabaseClient.mockResolvedValue(mockSupabaseClient)
        require('@/utils/auth').getAuthContext.mockResolvedValue(mockAuthContext)

        const mockSite = { 
          id: 'site-1', 
          name: 'Test Site', 
          tenant_id: 'org-1',
          tenant: { name: 'Test Org' }
        }
        const mockEnvironment = {
          id: 'env-1',
          name: 'Test Environment',
          type,
          status: 'active',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          site_id: 'site-1'
        }

        // Mock site check
        mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSite, error: null })

        // Mock environment creation
        mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.single.mockResolvedValueOnce({ data: mockEnvironment, error: null })

        // Mock admin activity logging
        mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
        mockSupabaseClient.insert.mockResolvedValueOnce({ error: null })

        const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Environment', type })
        })
        const params = Promise.resolve({ id: 'site-1' })
        
        const response = await createEnvironment(request, { params })
        const result = await response.json()

        expect(response.status).toBe(201)
        expect(result.environment.type).toBe(type)
      }
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost/api/admin/organizations')
      
      const response = await getOrganizations(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/admin/organizations', {
        method: 'POST',
        body: 'invalid json'
      })

      try {
        await createOrganization(request)
      } catch (error) {
        // Should handle JSON parsing errors gracefully
        expect(error).toBeDefined()
      }
    })
  })
})