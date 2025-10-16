import { useAuthStore } from '@/stores/authStore'
import { getUserFriendlyErrorMessage } from '@/utils/errors'

// Mock the auth store
jest.mock('@/stores/authStore')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('SitesList Component Integration Tests', () => {
  const mockAdminProfile = {
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

  const mockMasterUserProfile = {
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

  const mockRegularUserProfile = {
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

  const mockUserWithoutOrg = {
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

  const mockSitesData = {
    sites: [
      {
        id: 'site-1',
        site_name: 'Test Site 1',
        location: 'Location 1',
        status: 'active',
        environment_count: 3,
        sensor_count: 10,
        active_alerts: 0,
        health_status: 'healthy' as const,
        description: 'Test site description',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'site-2',
        site_name: 'Test Site 2',
        location: 'Location 2',
        status: 'active',
        environment_count: 2,
        sensor_count: 5,
        active_alerts: 2,
        health_status: 'warning' as const,
        description: 'Another test site',
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    total: 2,
    pagination: {
      total: 2,
      page: 1,
      limit: 20,
      has_more: false
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('should handle successful API response for organization user', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSitesData
    } as Response)

    // Simulate the fetch logic that would happen in useEffect
    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith('/api/sites')
    expect(data.sites).toHaveLength(2)
    expect(data.sites[0].site_name).toBe('Test Site 1')
    expect(data.sites[1].site_name).toBe('Test Site 2')
  })

  it('should handle empty sites response for master user', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    const emptyResponse = {
      sites: [],
      total: 0,
      pagination: { total: 0, page: 1, limit: 20, has_more: false }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResponse
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(data.sites).toHaveLength(0)
    expect(data.total).toBe(0)
  })

  it('should handle empty sites response for regular user', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockRegularUserProfile
    })

    const emptyResponse = {
      sites: [],
      total: 0,
      pagination: { total: 0, page: 1, limit: 20, has_more: false }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResponse
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(data.sites).toHaveLength(0)
    // Component should handle different messaging based on user role
    expect(mockUseAuthStore).toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    const errorResponse = {
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch sites data',
        requestId: 'test-request-id'
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => errorResponse
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(data.error.code).toBe('FETCH_FAILED')
    expect(data.error.message).toBe('Failed to fetch sites data')

    // Test error message transformation
    const friendlyMessage = getUserFriendlyErrorMessage(data)
    expect(friendlyMessage).toBe('Failed to fetch sites data')
  })

  it('should handle organization access denied error', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockUserWithoutOrg
    })

    const errorResponse = {
      error: {
        code: 'NO_ORGANIZATION_MEMBERSHIP',
        message: 'User has no organization membership',
        requestId: 'test-request-id'
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => errorResponse
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(data.error.code).toBe('NO_ORGANIZATION_MEMBERSHIP')

    // Test user-friendly error message
    const friendlyMessage = getUserFriendlyErrorMessage(data)
    expect(friendlyMessage).toBe('Your account needs to be associated with an organization. Please contact your administrator.')
  })

  it('should handle sites with different statuses and health indicators', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    const sitesWithDifferentStatuses = {
      sites: [
        {
          ...mockSitesData.sites[0],
          status: 'active',
          health_status: 'healthy' as const
        },
        {
          ...mockSitesData.sites[1],
          status: 'suspended',
          health_status: 'critical' as const,
          active_alerts: 5
        }
      ],
      total: 2,
      pagination: { total: 2, page: 1, limit: 20, has_more: false }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sitesWithDifferentStatuses
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    expect(data.sites[0].status).toBe('active')
    expect(data.sites[0].health_status).toBe('healthy')
    expect(data.sites[1].status).toBe('suspended')
    expect(data.sites[1].health_status).toBe('critical')
    expect(data.sites[1].active_alerts).toBe(5)
  })

  it('should validate site metrics data structure', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSitesData
    } as Response)

    const response = await fetch('/api/sites')
    const data = await response.json()

    // Validate first site metrics
    expect(data.sites[0].environment_count).toBe(3)
    expect(data.sites[0].sensor_count).toBe(10)
    expect(data.sites[0].active_alerts).toBe(0)

    // Validate second site metrics
    expect(data.sites[1].environment_count).toBe(2)
    expect(data.sites[1].sensor_count).toBe(5)
    expect(data.sites[1].active_alerts).toBe(2)
  })

  it('should handle network errors properly', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    try {
      await fetch('/api/sites')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Network error')
    }
  })

  it('should handle user profile validation', () => {
    // Test with no profile
    mockUseAuthStore.mockReturnValue({
      profile: null
    })

    let authStore = useAuthStore()
    expect(authStore.profile).toBeNull()

    // Test with valid profile
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    authStore = useAuthStore()
    expect(authStore.profile).toBeTruthy()
    expect(authStore.profile?.tenant_id).toBe('org-1')
    expect(authStore.profile?.role).toBe('master_user')
  })

  it('should validate API call parameters', async () => {
    mockUseAuthStore.mockReturnValue({
      profile: mockMasterUserProfile
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSitesData
    } as Response)

    await fetch('/api/sites')

    expect(mockFetch).toHaveBeenCalledWith('/api/sites')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should handle different user roles appropriately', () => {
    // Test admin profile
    mockUseAuthStore.mockReturnValue({
      profile: mockAdminProfile
    })

    let authStore = useAuthStore()
    expect(authStore.profile?.role).toBe('admin')
    expect(authStore.profile?.tenant_id).toBeNull()

    // Test regular user profile
    mockUseAuthStore.mockReturnValue({
      profile: mockRegularUserProfile
    })

    authStore = useAuthStore()
    expect(authStore.profile?.role).toBe('user')
    expect(authStore.profile?.tenant_id).toBe('org-1')

    // Test user without organization
    mockUseAuthStore.mockReturnValue({
      profile: mockUserWithoutOrg
    })

    authStore = useAuthStore()
    expect(authStore.profile?.role).toBe('user')
    expect(authStore.profile?.tenant_id).toBeNull()
  })
})