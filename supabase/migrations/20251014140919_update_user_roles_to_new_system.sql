-- =============================================
-- UPDATE USER ROLES TO NEW SYSTEM
-- Migration: 20251014140919_update_user_roles_to_new_system
-- =============================================

-- Update existing roles to new system
-- Current roles: admin, master, site_manager, auditor
-- New roles: admin, master_user, user

UPDATE profiles SET role = 'admin' WHERE role = 'admin';
UPDATE profiles SET role = 'master_user' WHERE role = 'master';
UPDATE profiles SET role = 'user' WHERE role IN ('site_manager', 'auditor');

-- Migrate existing site_access array data to new user_site_access table
-- For users who had site_access array, create entries in user_site_access table
INSERT INTO user_site_access (user_id, site_id, granted_at)
SELECT 
    p.id as user_id,
    unnest(p.site_access) as site_id,
    p.created_at as granted_at
FROM profiles p
WHERE p.site_access IS NOT NULL 
  AND array_length(p.site_access, 1) > 0
ON CONFLICT (user_id, site_id) DO NOTHING;

-- If using check constraint instead of enum, update it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Drop old constraint and add new one
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('admin', 'master_user', 'user'));
    END IF;
END $$;

-- Migration complete
SELECT 'User roles updated to new system successfully' AS status;