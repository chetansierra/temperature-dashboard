# Admin Portal Implementation Tasks

## Overview

Implement complete admin functionality for the Temperature Dashboard with full global access, organization management, and user administration.

## Key Requirements

- **1 Admin globally** (can manage multiple organizations)
- **1 Master User per organization** (organization admin)
- **Admin sets passwords** (users can change later)
- **Admin manages environments & sensors**
- **Organization view switching** (admin can view as master user would)
- **Plan tracking** (show current plan, details added later)

---

## Phase 1: Core Admin APIs & Infrastructure

### 1.1 Admin Organizations API

- [ ] Create `/api/admin/organizations` GET endpoint (list all organizations)
- [ ] Create `/api/admin/organizations` POST endpoint (create organization)
- [ ] Create `/api/admin/organizations/[id]` GET endpoint (get single organization)
- [ ] Create `/api/admin/organizations/[id]` PUT endpoint (update organization)
- [ ] Create `/api/admin/organizations/[id]` DELETE endpoint (delete organization)
- [ ] Add organization validation schemas (name, slug, max_users, plan)
- [ ] Add proper error handling and admin role verification

### 1.2 Admin Users API

- [ ] Create `/api/admin/users` GET endpoint (list users across all organizations)
- [ ] Create `/api/admin/users` POST endpoint (create user with admin-set password)
- [ ] Create `/api/admin/users/[id]` GET endpoint (get single user)
- [ ] Create `/api/admin/users/[id]` PUT endpoint (update user, reset password)
- [ ] Create `/api/admin/users/[id]` DELETE endpoint (delete user)
- [ ] Add user validation schemas (email, role, organization, password)
- [ ] Enforce "1 master_user per organization" constraint

### 1.3 Admin Dashboard Stats API

- [ ] Create `/api/admin/stats` GET endpoint (global statistics)
- [ ] Return real counts: total organizations, total users, total sites, total sensors
- [ ] Add organization health status (active users, recent activity)
- [ ] Add system-wide alerts summary

### 1.4 Admin Sites & Sensors API

- [ ] Create `/api/admin/sites` GET endpoint (all sites across organizations)
- [ ] Create `/api/admin/environments` POST/PUT/DELETE endpoints (admin manages environments)
- [ ] Create `/api/admin/sensors` POST/PUT/DELETE endpoints (admin manages sensors)
- [ ] Add environment/sensor validation and organization association

---

## Phase 2: Organization Management UI

### 2.1 Organizations List Page (Replace Mock Data)

- [ ] Update `/admin/organizations` to fetch real data from API
- [x] Add loading states and error handling
- [ ] Display real organization count, user count, plan info
- [ ] Add "No organizations" empty state

### 2.2 Create Organization Form

- [ ] Update `/admin/organizations/new` page with working form
- [ ] Add form fields: name, slug, max_users, plan (dropdown)
- [ ] Add form validation and submission
- [ ] Redirect to organization list on success
- [ ] Add error handling and user feedback

### 2.3 Edit Organization Functionality

- [ ] Create `/admin/organizations/[id]/edit` page
- [ ] Pre-populate form with existing organization data
- [ ] Allow updating name, max_users, plan
- [ ] Prevent slug changes (or handle carefully)
- [ ] Add save/cancel functionality

### 2.4 Organization Deletion

- [ ] Add delete button to organization list
- [ ] Add confirmation modal with organization name verification
- [ ] Handle cascade deletion (warn about users, sites, data)
- [ ] Implement soft delete or hard delete based on requirements

### 2.5 User Limit Enforcement

- [ ] Display current user count vs max_users limit
- [ ] Add visual indicators (progress bars, warnings)
- [ ] Prevent user creation when limit reached
- [ ] Add ability to increase limits

---

## Phase 3: User Management

### 3.1 User Management Pages

- [x] Create `/admin/organizations/[id]/users` page
- [x] List all users for specific organization
- [x] Show user roles, status, last login
- [x] Add "Create User" button

### 3.2 Create Master User Functionality

- [x] Create `/admin/organizations/[id]/users/new` page
- [x] Add form for creating master_user
- [x] Admin sets initial password (strong password generator option)
- [x] Enforce "only 1 master_user per organization" rule
- [x] Send welcome email with login instructions

### 3.3 Create Regular User Functionality

- [x] Add option to create regular users on same form
- [x] Role selection: master_user or user
- [x] Admin sets initial password
- [x] Assign to organization automatically
- [x] Handle user limit validation

### 3.4 User Role Management

- [x] Add ability to change user roles (master_user ↔ user)
- [x] Add role change confirmation (especially master_user changes)
- [x] Update user permissions immediately
- [x] Log role changes for audit

### 3.5 User Administration

- [x] Add "Reset Password" functionality (admin sets new password)
- [x] Add "Suspend/Activate User" functionality
- [x] Add user deletion with confirmation
- [x] Show user activity/last login information

---

## Phase 4: Dashboard & Organization Switching

### 4.1 Real Dashboard Stats

- [x] Update `/admin/dashboard` to use real API data
- [x] Remove hardcoded mock statistics
- [x] Add real-time data refresh
- [ ] Add loading states and error handling

### 4.2 Organization View Switching

- [x] Add organization selector dropdown in admin header
- [x] Create `/admin/view-as/[orgId]` functionality
- [x] Switch admin view to see organization as master_user would
- [x] Add "Return to Admin View" option
- [x] Maintain admin permissions while viewing

### 4.3 Cross-Organization Site Overview

- [x] Create `/admin/sites` page showing all sites across organizations
- [x] Group sites by organization
- [x] Show site health, sensor count, recent alerts
- [x] Add filtering by organization, status, location

---

## Phase 5: Environment & Sensor Management

### 5.1 Environment Management

- [x] Create `/admin/environments` page (global view)
- [x] Add create environment form (select organization/site)
- [x] Add edit/delete environment functionality
- [x] Show environment types, sensor counts, status

### 5.2 Sensor Management

- [x] Create `/admin/sensors` page (global view)
- [x] Add create sensor form (select organization/site/environment)
- [x] Add edit/delete sensor functionality
- [x] Show sensor status, last reading, battery level

### 5.3 Bulk Operations

- [x] Add bulk sensor creation (CSV import)
- [x] Add bulk environment setup for new sites
- [x] Add bulk user operations (create multiple users)

---

## Phase 6: Advanced Admin Features

### 6.1 Search & Filtering

- [x] Add global search across organizations, users, sites
- [x] Add advanced filtering options
- [x] Add sorting and pagination
- [x] Save search preferences

### 6.2 Plan Management

- [x] Add plan selection dropdown (Basic, Pro, Enterprise)
- [x] Display current plan features and limits
- [x] Add plan upgrade/downgrade functionality
- [x] Track plan usage and billing (placeholder for now)

### 6.3 System Administration

- [x] Add system health monitoring page
- [x] Add database statistics and performance metrics
- [x] Add admin activity log
- [x] Add system configuration options

---

## UI/UX Design Guidelines

### Professional B2B Design Principles

- [x] **Clean & Minimal**: Remove all emojis, use professional iconography only
- [x] **Typography**: Use consistent, readable fonts (Inter/system fonts)
- [x] **Color Scheme**: Neutral grays, blues for actions, red for destructive actions
- [x] **Layout**: Consistent spacing, clear hierarchy, generous white space
- [x] **Components**: Standard form elements, professional buttons, clean tables
- [x] **Language**: Direct, professional copy - no casual language or emojis
- [x] **Navigation**: Clear breadcrumbs, logical information architecture
- [x] **Data Display**: Clean tables, professional charts, clear status indicators

### Component Standards

- [x] Use standard button styles (Primary: blue, Secondary: gray, Destructive: red)
- [x] Consistent form layouts with proper labels and validation messages
- [x] Professional loading states (spinners, skeleton screens)
- [x] Clean modal dialogs with clear actions
- [x] Subtle hover states and transitions
- [x] Professional empty states with clear next actions
- [x] Consistent spacing using Tailwind's spacing scale

### Content Guidelines

- [x] Use clear, direct headings ("Manage Organizations" not "Manage Your Orgs")
- [x] Professional button labels ("Create Organization" not "Add New Org")
- [x] Clear status messages ("Organization created successfully")
- [x] Professional error messages with actionable guidance
- [x] Consistent terminology throughout the application

---

## Database Schema Updates Needed

### Organizations Table

- [x] Add `plan` column (varchar: 'basic', 'pro', 'enterprise')
- [x] Add `plan_limits` JSONB column for plan-specific limits
- [x] Add `status` column ('active', 'suspended', 'trial')

### Profiles Table

- [x] Ensure master_user constraint is working
- [x] Add `last_login` timestamp
- [x] Add `status` column ('active', 'suspended', 'pending')

### Admin Activity Log Table

- [x] Create `admin_activity` table for audit logging
- [x] Track admin actions (create, update, delete operations)
- [x] Store affected resources and timestamps

---

## Security & Validation

### API Security

- [x] Verify admin role on all admin endpoints
- [x] Add rate limiting for admin operations
- [x] Add request validation and sanitization
- [x] Add CSRF protection

### Data Validation

- [ ] Validate organization names and slugs (unique, format)
- [ ] Validate user emails (unique, format)
- [ ] Validate password strength requirements
- [ ] Validate user limits and constraints

### Error Handling

- [ ] Add comprehensive error messages
- [ ] Add user-friendly error pages
- [ ] Add logging for admin operations
- [ ] Add rollback mechanisms for failed operations

---

## Testing & Documentation

### Testing

- [ ] Add unit tests for admin APIs
- [ ] Add integration tests for admin workflows
- [ ] Add end-to-end tests for critical admin functions
- [ ] Test role-based access controls

### Documentation

- [ ] Update API documentation for admin endpoints
- [ ] Create admin user guide
- [ ] Document admin workflows and procedures
- [ ] Create troubleshooting guide

---

## Priority Order

1. **Phase 1** - Core APIs (foundation)
2. **Phase 2** - Organization Management (core admin function)
3. **Phase 3** - User Management (essential for operations)
4. **Phase 4** - Dashboard & Switching (admin experience)
5. **Phase 5** - Environment/Sensor Management (operational tools)
6. **Phase 6** - Advanced Features (nice-to-have)

**Estimated Timeline: 2-3 weeks for Phases 1-4, additional 1-2 weeks for Phases 5-6**
