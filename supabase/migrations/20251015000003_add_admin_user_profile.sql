-- =============================================
-- ADD ADMIN USER PROFILE
-- Migration: 20251015000003_add_admin_user_profile
-- =============================================

-- Insert the admin user profile for the newly created auth user
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

-- Migration complete
SELECT 'Admin user profile created for admin1@cueron.com' AS status;