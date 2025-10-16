-- =============================================
-- ADD ORGANIZATION PLANS AND STATUS
-- Migration: 20251014160000_add_organization_plans
-- =============================================

-- Add plan and status columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Add last_login and status to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending'));

-- Add index for profile status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);

-- Create admin activity log table for audit logging
CREATE TABLE IF NOT EXISTS admin_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'reset_password', etc.
    resource_type TEXT NOT NULL, -- 'organization', 'user', 'site', 'sensor', etc.
    resource_id UUID, -- ID of the affected resource
    resource_name TEXT, -- Name/identifier of the affected resource
    details JSONB DEFAULT '{}', -- Additional action details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for admin activity log
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_resource_type ON admin_activity(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity(created_at);

-- Add comments
COMMENT ON COLUMN tenants.plan IS 'Organization plan: basic, pro, or enterprise';
COMMENT ON COLUMN tenants.plan_limits IS 'Plan-specific limits and features (JSON)';
COMMENT ON COLUMN tenants.status IS 'Organization status: active, suspended, or trial';
COMMENT ON COLUMN profiles.last_login IS 'Timestamp of user last login';
COMMENT ON COLUMN profiles.status IS 'User status: active, suspended, or pending';
COMMENT ON TABLE admin_activity IS 'Audit log for admin actions';

-- Migration complete
SELECT 'Organization plans and admin activity logging added successfully' AS status;