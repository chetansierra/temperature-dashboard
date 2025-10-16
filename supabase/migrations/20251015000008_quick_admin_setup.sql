-- =============================================
-- QUICK ADMIN SETUP - BYPASS MIGRATION ISSUES
-- Migration: 20251015000008_quick_admin_setup
-- =============================================

-- Create admin user profile directly
-- First, make sure the profiles table exists with the right structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    role TEXT NOT NULL CHECK (role IN ('admin', 'master_user', 'user')),
    email TEXT NOT NULL,
    full_name TEXT,
    site_access TEXT[],
    auditor_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the admin user profile
INSERT INTO profiles (
    id,
    tenant_id,
    role,
    email,
    full_name,
    site_access,
    auditor_expires_at,
    created_at,
    updated_at
) VALUES (
    'c1a3ce67-e583-4b0f-949b-00dd8371fe61',
    NULL,
    'admin',
    'admin1@cueron.com',
    'System Administrator',
    NULL,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Create tenants table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    max_users INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'basic',
    status TEXT DEFAULT 'active',
    plan_limits JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS temporarily for admin operations
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;

-- Migration complete
SELECT 'Quick admin setup complete' AS status;