# Implementation Plan

- [x] 1. Update authentication utilities for organization-based access

  - Modify `canAccessSite` function to support organization-based access for all user roles
  - Add `getOrganizationSiteFilter` helper function for API query filtering
  - Add `validateOrganizationAccess` middleware function for consistent access validation
  - _Requirements: 1.1, 1.4, 5.1, 5.2_

- [x] 2. Create user-facing sites API endpoint

  - Create new `/api/sites/route.ts` endpoint for organization users to list their sites
  - Implement organization-based filtering using tenant_id matching
  - Add environment count aggregation for each site
  - Include proper error handling for authentication and authorization failures
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 5.1_

- [x] 3. Implement site environments API with organization access control

  - Create `/api/sites/[siteId]/environments/route.ts` endpoint for accessing site environments
  - Add organization membership validation before returning environment data
  - Implement proper error responses for cross-organization access attempts
  - _Requirements: 2.1, 2.2, 1.4, 5.1, 5.3_

- [x] 4. Create organization-aware sites listing component

  - Build `SitesList` component that fetches and displays organization sites
  - Implement loading states and empty state messaging for users with no sites
  - Add organization context display and status indicators
  - Include environment count display for each site
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Add comprehensive error handling and user messaging

  - Implement standardized error response format with request IDs
  - Add specific error messages for organization access scenarios
  - Create user-friendly messaging for empty states and access denied cases
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Write unit tests for authentication utilities

  - Test `canAccessSite` function with different roles and organization scenarios
  - Test `getOrganizationSiteFilter` function output for various user profiles
  - Test `validateOrganizationAccess` middleware with cross-organization attempts
  - _Requirements: 1.1, 1.4, 5.1_

- [x] 7. Write API endpoint tests

  - Test sites API with different user roles and organization memberships
  - Test environment API access control and cross-organization validation
  - Test error responses for authentication and authorization failures
  - _Requirements: 1.1, 1.2, 2.1, 5.1, 5.2_

- [x] 8. Write component integration tests

  - Test SitesList component rendering with different data scenarios
  - Test loading states and error handling in frontend components
  - Test organization context display and user messaging
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Update database RLS policies for organization access

  - Create or update RLS policies on sites table for organization-based access
  - Create or update RLS policies on environments table for organization filtering
  - Test policy enforcement with different user roles and organization memberships
  - _Requirements: 5.1, 5.2, 3.1_

- [x] 10. Integrate organization access into existing user dashboard
  - Update main dashboard to use new organization-based sites API
  - Replace any existing site access logic with organization-based approach
  - Ensure consistent user experience across all site-related interfaces
  - _Requirements: 4.1, 4.2, 6.1, 6.2_
