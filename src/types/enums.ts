// Database enum types - keep in sync with database enums

export type UserRole = 'admin' | 'master_user' | 'user'

export type UserStatus = 'active' | 'suspended' | 'pending'

export type OrganizationPlan = 'basic' | 'pro' | 'enterprise'

export type OrganizationStatus = 'active' | 'suspended' | 'cancelled'

export type SensorStatus = 'active' | 'maintenance' | 'decommissioned'

export type EnvironmentType = 'indoor' | 'outdoor' | 'warehouse' | 'office' | 'production'

export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

// Validation arrays for runtime checks
export const USER_ROLES: UserRole[] = ['admin', 'master_user', 'user']
export const USER_STATUSES: UserStatus[] = ['active', 'suspended', 'pending']
export const ORGANIZATION_PLANS: OrganizationPlan[] = ['basic', 'pro', 'enterprise']
export const ORGANIZATION_STATUSES: OrganizationStatus[] = ['active', 'suspended', 'cancelled']
export const SENSOR_STATUSES: SensorStatus[] = ['active', 'maintenance', 'decommissioned']
export const ENVIRONMENT_TYPES: EnvironmentType[] = ['indoor', 'outdoor', 'warehouse', 'office', 'production']
export const ALERT_STATUSES: AlertStatus[] = ['active', 'acknowledged', 'resolved']