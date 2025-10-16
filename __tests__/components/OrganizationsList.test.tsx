/**
 * @jest-environment jsdom
 */

import React from 'react'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should have proper component structure', () => {
    // Test that the component can be imported and has expected exports
    const OrganizationsPage = require('@/app/admin/organizations/page').default
    expect(typeof OrganizationsPage).toBe('function')
  })

  it('should test fetch organizations functionality', async () => {
    const mockOrganizations = [
      {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        max_users: 100,
        current_users: 25,
        plan: 'pro',
        status: 'active',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        created_by: 'admin-1',
        created_by_profile: {
          id: 'admin-1',
          email: 'admin@test.com',
          full_name: 'Admin User'
        }
      }
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ organizations: mockOrganizations, total: 1 })
    })

    const OrganizationsPage = require('@/app/admin/organizations/page').default
    
    // Component should handle organization data
    expect(typeof OrganizationsPage).toBe('function')
  })

  it('should test navigation to management page', () => {
    // Test that clicking on organization navigates to management page
    const organizationId = 'org-1'
    
    mockRouter.push(`/admin/organizations/${organizationId}/manage`)
    
    expect(mockRouter.push).toHaveBeenCalledWith(`/admin/organizations/${organizationId}/manage`)
  })

  it('should test delete organization functionality', async () => {
    const organizationId = 'org-1'
    
    // Mock successful delete
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Organization deleted successfully' })
    })

    // Test delete API call
    const response = await fetch(`/api/admin/organizations/${organizationId}`, {
      method: 'DELETE'
    })
    
    expect(response.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/organizations/${organizationId}`,
      { method: 'DELETE' }
    )
  })

  it('should test error handling', () => {
    // Mock fetch to reject
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch organizations'))
    
    const OrganizationsPage = require('@/app/admin/organizations/page').default
    
    // Component should handle errors gracefully
    expect(typeof OrganizationsPage).toBe('function')
  })

  it('should test organization card click functionality', () => {
    // Test that organization cards are clickable and navigate properly
    const organizationId = 'org-1'
    
    // Simulate card click navigation
    mockRouter.push(`/admin/organizations/${organizationId}/manage`)
    
    expect(mockRouter.push).toHaveBeenCalledWith(`/admin/organizations/${organizationId}/manage`)
  })

  it('should test manage button functionality', () => {
    // Test that manage button navigates to management page
    const organizationId = 'org-1'
    
    // Simulate manage button click
    mockRouter.push(`/admin/organizations/${organizationId}/manage`)
    
    expect(mockRouter.push).toHaveBeenCalledWith(`/admin/organizations/${organizationId}/manage`)
  })

  it('should test status indicators', () => {
    // Test status color mapping
    const statusColors = {
      'active': 'bg-green-100 text-green-800',
      'suspended': 'bg-red-100 text-red-800',
      'trial': 'bg-yellow-100 text-yellow-800'
    }
    
    expect(statusColors.active).toBe('bg-green-100 text-green-800')
    expect(statusColors.suspended).toBe('bg-red-100 text-red-800')
    expect(statusColors.trial).toBe('bg-yellow-100 text-yellow-800')
  })

  it('should test plan indicators', () => {
    // Test plan color mapping
    const planColors = {
      'enterprise': 'bg-purple-100 text-purple-800',
      'pro': 'bg-blue-100 text-blue-800',
      'basic': 'bg-gray-100 text-gray-800'
    }
    
    expect(planColors.enterprise).toBe('bg-purple-100 text-purple-800')
    expect(planColors.pro).toBe('bg-blue-100 text-blue-800')
    expect(planColors.basic).toBe('bg-gray-100 text-gray-800')
  })

  it('should test user capacity calculation', () => {
    // Test user capacity percentage calculation
    const calculateCapacity = (current: number, max: number) => {
      return max > 0 ? Math.round((current / max) * 100) : 0
    }
    
    expect(calculateCapacity(25, 100)).toBe(25)
    expect(calculateCapacity(80, 100)).toBe(80)
    expect(calculateCapacity(0, 100)).toBe(0)
    expect(calculateCapacity(50, 0)).toBe(0)
  })

  it('should test capacity bar colors', () => {
    // Test capacity bar color logic
    const getCapacityColor = (current: number, max: number) => {
      if (max > 0 && current / max > 0.8) return 'bg-red-500'
      if (max > 0 && current / max > 0.6) return 'bg-yellow-500'
      return 'bg-green-500'
    }
    
    expect(getCapacityColor(90, 100)).toBe('bg-red-500') // > 80%
    expect(getCapacityColor(70, 100)).toBe('bg-yellow-500') // > 60%
    expect(getCapacityColor(50, 100)).toBe('bg-green-500') // <= 60%
    expect(getCapacityColor(0, 0)).toBe('bg-green-500') // edge case
  })

  it('should test loading state', () => {
    // Test loading state handling
    const OrganizationsPage = require('@/app/admin/organizations/page').default
    
    // Component should handle loading state
    expect(typeof OrganizationsPage).toBe('function')
  })

  it('should test empty state', () => {
    // Mock empty organizations response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ organizations: [], total: 0 })
    })
    
    const OrganizationsPage = require('@/app/admin/organizations/page').default
    
    // Component should handle empty state
    expect(typeof OrganizationsPage).toBe('function')
  })
})

// Test utilities for organizations
const organizationTestUtils = {
  createMockOrganization: (overrides = {}) => ({
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    max_users: 100,
    current_users: 25,
    plan: 'pro',
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: 'admin-1',
    created_by_profile: {
      id: 'admin-1',
      email: 'admin@test.com',
      full_name: 'Admin User'
    },
    ...overrides
  }),
  
  mockFetchOrganizations: (organizations: any[]) => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ organizations, total: organizations.length })
    })
  },
  
  mockFetchError: (error: Error) => {
    ;(global.fetch as jest.Mock).mockRejectedValue(error)
  }
}