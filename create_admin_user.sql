-- Create admin user directly in Supabase
-- Run this in the Supabase SQL editor

-- First, create the auth user (if not already created)
-- Note: This needs to be done in the Supabase dashboard Auth section

-- Then create the profile
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
    'c1a3ce67-e583-4b0f-949b-00dd8371fe61', -- Use the ID from the auth user you created
    NULL, -- Admins don't belong to any specific tenant
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

-- Verify the user was created
SELECT id, email, role, full_name FROM profiles WHERE email = 'admin1@cueron.com';