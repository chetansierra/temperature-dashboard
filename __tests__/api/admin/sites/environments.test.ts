import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/sites/[id]/environments/route'

// Mock the dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/utils/auth')

const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn()
}

const mockAuthContext = {
  profile: { id: 'admin-id', role: 'admin' }
}

describe('/api/admin/sites/[id]/environments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    require('@/lib/supabase-server').createServerSupabaseClient.mockResolvedValue(mockSupabaseClient)
    require('@/utils/auth').getAuthContext.mockResolvedValue(mockAuthContext)
    require('@/utils/auth').createAuthError.mockImplementation((message: string) => ({ error: message }))
  })

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments')
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when user is not admin', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue({
        profile: { id: 'user-id', role: 'user' }
      })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments')
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 404 when site does not exist', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments')
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Site not found')
    })

    it('should return environments for valid site', async () => {
      const mockSite = { id: 'site-1', name: 'Test Site', tenant_id: 'org-1' }
      const mockEnvironments = [
        {
          id: 'env-1',
          name: 'Environment 1',
          type: 'indoor',
          status: 'active',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          site_id: 'site-1'
        }
      ]

      // Mock site check
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSite, error: null })

      // Mock environments fetch
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValueOnce({ data: mockEnvironments, error: null })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments')
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.environments).toEqual(mockEnvironments)
      expect(data.total).toBe(1)
    })
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment', type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when user is not admin', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue({
        profile: { id: 'user-id', role: 'user' }
      })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment', type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when required fields are missing', async () => {
      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment' }) // missing type
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Name and type are required')
    })

    it('should return 400 when name is too long', async () => {
      const longName = 'a'.repeat(101) // exceeds 100 character limit

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: longName, type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Name must be between 1 and 100 characters')
    })

    it('should return 400 when environment type is invalid', async () => {
      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment', type: 'invalid' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Type must be one of: indoor, outdoor, warehouse, office, production')
    })

    it('should return 400 when status is invalid', async () => {
      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ 
          name: 'Test Environment', 
          type: 'indoor', 
          status: 'invalid' 
        })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Status must be active, suspended, or cancelled')
    })

    it('should return 404 when site does not exist', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment', type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Site not found')
    })

    it('should create environment successfully', async () => {
      const mockSite = { 
        id: 'site-1', 
        name: 'Test Site', 
        tenant_id: 'org-1',
        tenant: { name: 'Test Org' }
      }
      const mockEnvironment = {
        id: 'env-1',
        name: 'Test Environment',
        type: 'indoor',
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
        body: JSON.stringify({ name: 'Test Environment', type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.environment).toEqual(mockEnvironment)
      expect(data.message).toBe('Environment created successfully')
    })

    it('should accept all valid environment types', async () => {
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
        
        const response = await POST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.environment.type).toBe(type)
      }
    })

    it('should handle environment creation errors', async () => {
      const mockSite = { 
        id: 'site-1', 
        name: 'Test Site', 
        tenant_id: 'org-1',
        tenant: { name: 'Test Org' }
      }

      // Mock site check success
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSite, error: null })

      // Mock environment creation error
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      const request = new NextRequest('http://localhost/api/admin/sites/site-1/environments', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Environment', type: 'indoor' })
      })
      const params = Promise.resolve({ id: 'site-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('CREATE_FAILED')
    })
  })
})