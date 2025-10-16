# Role-Based Access Control (RBAC) Revamp - Requirements

## Introduction

This document outlines the requirements for revamping the role-based access control system in the Temperature Dashboard application. The new system will implement a three-tier hierarchy with clear separation of responsibilities and access controls.

## Requirements

### Requirement 1: Role Hierarchy Implementation

**User Story:** As a system architect, I want to implement a three-tier role hierarchy, so that access control is clearly defined and scalable.

#### Acceptance Criteria

1. WHEN the system is configured THEN it SHALL support exactly three roles: `admin`, `master_user`, and `user`
2. WHEN a user is assigned a role THEN the system SHALL enforce role-specific permissions consistently across all interfaces
3. WHEN roles are checked THEN the system SHALL use the new role names throughout the application
4. IF a user has `admin` role THEN they SHALL have global access across all organizations
5. IF a user has `master_user` role THEN they SHALL have organization-scoped access with permission management capabilities
6. IF a user has `user` role THEN they SHALL have site-scoped read-only access

### Requirement 2: Admin Portal Separation

**User Story:** As an admin (Relationship Manager), I want a separate login portal, so that I can manage organizations and users independently from regular users.

#### Acceptance Criteria

1. WHEN an admin accesses the system THEN they SHALL use a dedicated admin portal at `/admin/*` routes
2. WHEN regular users access the system THEN they SHALL use the standard user portal
3. WHEN authentication occurs THEN the system SHALL route users to appropriate portals based on their role
4. IF an admin tries to access user routes THEN the system SHALL redirect them to admin portal
5. IF a non-admin tries to access admin routes THEN the system SHALL deny access with appropriate error

### Requirement 3: Organization Management

**User Story:** As an admin, I want to create and manage organizations, so that I can onboard new clients with defined user limits.

#### Acceptance Criteria

1. WHEN an admin creates an organization THEN they SHALL be able to set a maximum user limit
2. WHEN an organization is created THEN the system SHALL enforce the user limit for that organization
3. WHEN an admin views organizations THEN they SHALL see all organizations with their current user counts
4. IF user limit is reached THEN the system SHALL prevent creation of additional users for that organization
5. WHEN an organization is modified THEN the admin SHALL be able to update the user limit

### Requirement 4: User Account Management

**User Story:** As an admin, I want to create master users and regular users for organizations, so that I can establish the user hierarchy.

#### Acceptance Criteria

1. WHEN an admin creates users THEN they SHALL be able to create one master user per organization
2. WHEN an admin creates users THEN they SHALL be able to create multiple regular users per organization
3. WHEN a master user is created THEN they SHALL automatically have access to all sites in their organization
4. WHEN regular users are created THEN they SHALL have no site access until assigned by master user
5. IF an organization already has a master user THEN the system SHALL prevent creation of additional master users

### Requirement 5: Site Access Control Management

**User Story:** As a master user, I want to assign site access to regular users, so that I can control what data each user can view.

#### Acceptance Criteria

1. WHEN a master user accesses the system THEN they SHALL see an Access Control page
2. WHEN managing access THEN master users SHALL be able to assign/unassign sites to regular users in their organization
3. WHEN viewing users THEN master users SHALL only see users from their own organization
4. WHEN assigning access THEN master users SHALL only be able to assign sites from their own organization
5. IF a user is assigned to sites THEN they SHALL immediately gain read access to those sites

### Requirement 6: Read-Only Data Access

**User Story:** As a regular user, I want to view sensor data from my assigned sites, so that I can monitor temperature conditions.

#### Acceptance Criteria

1. WHEN a regular user logs in THEN they SHALL only see sites assigned to them by their master user
2. WHEN viewing data THEN regular users SHALL have read-only access to sensor readings, alerts, and reports
3. WHEN accessing unassigned sites THEN the system SHALL deny access with appropriate error
4. IF no sites are assigned THEN the user SHALL see an appropriate message indicating no access
5. WHEN data is displayed THEN it SHALL be filtered to show only the user's assigned sites

### Requirement 7: Database Schema Updates

**User Story:** As a developer, I want the database schema to support the new role system, so that access control is properly enforced at the data level.

#### Acceptance Criteria

1. WHEN roles are stored THEN the system SHALL use the new role values: `admin`, `master_user`, `user`
2. WHEN organizations are created THEN they SHALL include a `max_users` field
3. WHEN user-site relationships are managed THEN there SHALL be a proper mapping table
4. WHEN data is queried THEN RLS policies SHALL enforce the new role-based access rules
5. IF legacy roles exist THEN they SHALL be migrated to the new role system

### Requirement 8: API Security Updates

**User Story:** As a security-conscious developer, I want all APIs to enforce the new role-based access, so that data access is properly controlled.

#### Acceptance Criteria

1. WHEN API endpoints are accessed THEN they SHALL validate user roles according to the new hierarchy
2. WHEN admin APIs are called THEN only users with `admin` role SHALL be allowed access
3. WHEN organization-scoped APIs are called THEN master users SHALL only access their organization's data
4. WHEN site-scoped APIs are called THEN regular users SHALL only access their assigned sites
5. IF unauthorized access is attempted THEN the API SHALL return appropriate HTTP error codes

### Requirement 9: Frontend Route Protection

**User Story:** As a user, I want to be automatically directed to appropriate pages based on my role, so that I have a seamless experience.

#### Acceptance Criteria

1. WHEN users log in THEN they SHALL be redirected to role-appropriate dashboards
2. WHEN accessing protected routes THEN the system SHALL verify role permissions
3. WHEN unauthorized routes are accessed THEN users SHALL be redirected with appropriate messaging
4. IF admin accesses user routes THEN they SHALL be redirected to admin portal
5. WHEN navigation occurs THEN menu items SHALL be filtered based on user role
