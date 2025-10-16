-- QUICK SETUP - Run this in Supabase SQL Editor

-- Create profiles table
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

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    max_users INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    plan_limits JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin user profile
INSERT INTO profiles (
    id,
    tenant_id,
    role,
    email,
    full_name,
    created_at,
    updated_at
) VALUES (
    'c1a3ce67-e583-4b0f-949b-00dd8371fe61',
    NULL,
    'admin',
    'admin1@cueron.com',
    'System Administrator',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = 'admin1@cueron.com',
    full_name = 'System Administrator',
    updated_at = NOW();

-- Disable RLS for now
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify setup
SELECT 'Setup complete!' as status;
SELECT id, email, role, full_name FROM profiles WHERE email = 'admin1@cueron.com';