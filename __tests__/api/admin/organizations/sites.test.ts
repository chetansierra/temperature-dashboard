import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/organizations/[id]/sites/route'

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

describe('/api/admin/organizations/[id]/sites', () => {
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

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when user is not admin', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue({
        profile: { id: 'user-id', role: 'user' }
      })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 404 when organization does not exist', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Organization not found')
    })

    it('should return sites for valid organization', async () => {
      const mockOrganization = { id: 'org-1', name: 'Test Org' }
      const mockSites = [
        {
          id: 'site-1',
          name: 'Site 1',
          location: 'Location 1',
          status: 'active',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          tenant_id: 'org-1'
        }
      ]

      // Mock organization check
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      // Mock sites fetch
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValueOnce({ data: mockSites, error: null })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sites).toEqual(mockSites)
      expect(data.total).toBe(1)
    })

    it('should handle database errors gracefully', async () => {
      // Mock organization check success
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ 
        data: { id: 'org-1', name: 'Test Org' }, 
        error: null 
      })

      // Mock sites fetch error
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites')
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('FETCH_FAILED')
    })
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when user is not admin', async () => {
      require('@/utils/auth').getAuthContext.mockResolvedValue({
        profile: { id: 'user-id', role: 'user' }
      })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when required fields are missing', async () => {
      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site' }) // missing location
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Name and location are required')
    })

    it('should return 400 when name is too long', async () => {
      const longName = 'a'.repeat(101) // exceeds 100 character limit

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: longName, location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Name must be between 1 and 100 characters')
    })

    it('should return 400 when location is too long', async () => {
      const longLocation = 'a'.repeat(201) // exceeds 200 character limit

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: longLocation })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Location must be between 1 and 200 characters')
    })

    it('should return 400 when status is invalid', async () => {
      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ 
          name: 'Test Site', 
          location: 'Test Location', 
          status: 'invalid' 
        })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Status must be active, suspended, or cancelled')
    })

    it('should return 404 when organization does not exist', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Organization not found')
    })

    it('should create site successfully', async () => {
      const mockOrganization = { id: 'org-1', name: 'Test Org' }
      const mockSite = {
        id: 'site-1',
        name: 'Test Site',
        location: 'Test Location',
        status: 'active',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        tenant_id: 'org-1'
      }

      // Mock organization check
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

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.site).toEqual(mockSite)
      expect(data.message).toBe('Site created successfully')
    })

    it('should handle site creation errors', async () => {
      const mockOrganization = { id: 'org-1', name: 'Test Org' }

      // Mock organization check success
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOrganization, error: null })

      // Mock site creation error
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient)
      mockSupabaseClient.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      const request = new NextRequest('http://localhost/api/admin/organizations/org-1/sites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Site', location: 'Test Location' })
      })
      const params = Promise.resolve({ id: 'org-1' })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('CREATE_FAILED')
    })
  })
})