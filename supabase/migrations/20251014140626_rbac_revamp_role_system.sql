-- =============================================
-- RBAC REVAMP - NEW ROLE SYSTEM
-- Migration: 20251014140626_rbac_revamp_role_system
-- =============================================

-- =============================================
-- 1. UPDATE TENANTS TABLE - ADD MAX USERS
-- =============================================

-- Add max_users column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;

-- Add slug column if it doesn't exist (for organization identification)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add settings column if it doesn't exist (for organization configuration)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;

-- =============================================
-- 2. PREPARE FOR ROLE SYSTEM UPDATE
-- =============================================

-- Note: Role enum values are added in separate migration
-- Role updates will be done in subsequent migration

-- =============================================
-- 3. CREATE USER-SITE ACCESS MAPPING TABLE
-- =============================================

-- Create table for user-site access mapping
CREATE TABLE IF NOT EXISTS user_site_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES profiles(id), -- master user who granted access
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique user-site combinations
    UNIQUE(user_id, site_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_site_access_user_id ON user_site_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_site_id ON user_site_access(site_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_granted_by ON user_site_access(granted_by);

-- =============================================
-- 4. SITE ACCESS DATA MIGRATION
-- =============================================

-- Note: Site access data migration is done in subsequent migration

-- =============================================
-- 5. UPDATE RLS HELPER FUNCTIONS
-- =============================================

-- Update the get_user_profile function to work with new roles
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS profiles AS $$
DECLARE
    user_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Update is_admin function for new role system
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Create new function to check if user is master_user
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'master_user'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Update can_access_site function for new role system
CREATE OR REPLACE FUNCTION can_access_site(site_uuid UUID)
RETURNS boolean AS $$
DECLARE
    user_profile profiles%ROWTYPE;
    site_tenant_id UUID;
BEGIN
    SELECT * INTO user_profile FROM get_user_profile();
    
    -- Admin can access all sites
    IF user_profile.role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Get the tenant_id for the site
    SELECT tenant_id INTO site_tenant_id FROM sites WHERE id = site_uuid;
    
    -- Master user can access all sites in their tenant
    IF user_profile.role = 'master_user' THEN
        RETURN user_profile.tenant_id = site_tenant_id;
    END IF;
    
    -- Regular user can only access explicitly assigned sites
    IF user_profile.role = 'user' THEN
        RETURN EXISTS (
            SELECT 1 FROM user_site_access usa
            WHERE usa.user_id = user_profile.id 
              AND usa.site_id = site_uuid
        );
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =============================================
-- 6. UPDATE RLS POLICIES
-- =============================================

-- Drop ALL existing policies to recreate with new role system
DROP POLICY IF EXISTS "Profiles: Masters and admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles: Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: Users can view profiles in their tenant scope" ON profiles;

DROP POLICY IF EXISTS "Sites: Masters and admins can manage sites" ON sites;
DROP POLICY IF EXISTS "Sites: Users can view sites they have access to" ON sites;
DROP POLICY IF EXISTS "Sites: Admins can manage all sites" ON sites;

DROP POLICY IF EXISTS "Environments: Masters and admins can manage environments" ON environments;
DROP POLICY IF EXISTS "Environments: Users can view environments in accessible sites" ON environments;

DROP POLICY IF EXISTS "Sensors: Masters and admins can manage sensors" ON sensors;
DROP POLICY IF EXISTS "Sensors: Users can view sensors in accessible sites" ON sensors;

DROP POLICY IF EXISTS "Thresholds: Masters and site managers can manage thresholds" ON thresholds;
DROP POLICY IF EXISTS "Alert rules: Masters and site managers can manage rules" ON alert_rules;
DROP POLICY IF EXISTS "Alerts: Masters and site managers can manage alerts" ON alerts;

-- Create new policies for the updated role system

-- Profiles policies
CREATE POLICY "Profiles: Admins can manage all profiles"
    ON profiles FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Profiles: Master users can view profiles in their tenant"
    ON profiles FOR SELECT
    USING (
        is_master_user() AND 
        tenant_id = (SELECT tenant_id FROM get_user_profile())
    );

CREATE POLICY "Profiles: Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Profiles: Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Sites policies
CREATE POLICY "Sites: Admins can manage all sites"
    ON sites FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Sites: Master users can view sites in their tenant"
    ON sites FOR SELECT
    USING (
        is_master_user() AND 
        tenant_id = (SELECT tenant_id FROM get_user_profile())
    );

CREATE POLICY "Sites: Users can view accessible sites"
    ON sites FOR SELECT
    USING (can_access_site(id));

-- Environments policies
CREATE POLICY "Environments: Admins can manage all environments"
    ON environments FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Environments: Master users and regular users can view environments in accessible sites"
    ON environments FOR SELECT
    USING (can_access_site(site_id));

-- Sensors policies
CREATE POLICY "Sensors: Admins can manage all sensors"
    ON sensors FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Sensors: Master users and regular users can view sensors in accessible sites"
    ON sensors FOR SELECT
    USING (can_access_site(site_id));

-- User site access policies
CREATE POLICY "User site access: Admins can manage all access"
    ON user_site_access FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "User site access: Master users can manage access in their tenant"
    ON user_site_access FOR ALL
    USING (
        is_master_user() AND 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = user_site_access.user_id 
              AND p.tenant_id = (SELECT tenant_id FROM get_user_profile())
        )
    )
    WITH CHECK (
        is_master_user() AND 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = user_site_access.user_id 
              AND p.tenant_id = (SELECT tenant_id FROM get_user_profile())
        )
    );

CREATE POLICY "User site access: Users can view their own access"
    ON user_site_access FOR SELECT
    USING (user_id = auth.uid());

-- =============================================
-- 7. ADD UPDATED_AT TRIGGERS
-- =============================================

-- Add updated_at trigger for user_site_access
CREATE TRIGGER update_user_site_access_updated_at
    BEFORE UPDATE ON user_site_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. CREATE ORGANIZATION CONSTRAINT FUNCTION
-- =============================================

-- Function to check if organization has reached max users
CREATE OR REPLACE FUNCTION check_max_users_constraint()
RETURNS TRIGGER AS $$
DECLARE
    current_user_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Only check for INSERT operations and non-admin users
    IF TG_OP = 'INSERT' AND NEW.role != 'admin' THEN
        -- Get current user count for the tenant
        SELECT COUNT(*) INTO current_user_count
        FROM profiles 
        WHERE tenant_id = NEW.tenant_id AND role != 'admin';
        
        -- Get max allowed users for the tenant
        SELECT max_users INTO max_allowed
        FROM tenants 
        WHERE id = NEW.tenant_id;
        
        -- Check if adding this user would exceed the limit
        IF current_user_count >= max_allowed THEN
            RAISE EXCEPTION 'Maximum user limit (%) reached for organization', max_allowed;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce max users constraint
DROP TRIGGER IF EXISTS enforce_max_users ON profiles;
CREATE TRIGGER enforce_max_users
    BEFORE INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION check_max_users_constraint();

-- =============================================
-- 9. CREATE MASTER USER CONSTRAINT FUNCTION
-- =============================================

-- Function to ensure only one master user per organization
CREATE OR REPLACE FUNCTION check_single_master_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_master_count INTEGER;
BEGIN
    -- Only check for master_user role
    IF NEW.role = 'master_user' THEN
        -- Check if there's already a master user for this tenant
        SELECT COUNT(*) INTO existing_master_count
        FROM profiles 
        WHERE tenant_id = NEW.tenant_id AND role = 'master_user' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        
        IF existing_master_count > 0 THEN
            RAISE EXCEPTION 'Only one master user allowed per organization';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single master user constraint
DROP TRIGGER IF EXISTS enforce_single_master_user ON profiles;
CREATE TRIGGER enforce_single_master_user
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION check_single_master_user();

-- =============================================
-- 10. COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_site_access IS 'Maps which users have access to which sites, managed by master users';
COMMENT ON COLUMN tenants.max_users IS 'Maximum number of users (excluding admins) allowed for this organization';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for the organization';
COMMENT ON COLUMN tenants.settings IS 'Organization-specific configuration settings';

-- Migration complete
SELECT 'RBAC revamp migration completed successfully' AS status;