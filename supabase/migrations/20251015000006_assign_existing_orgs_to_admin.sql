-- =============================================
-- ASSIGN EXISTING ORGANIZATIONS TO ADMIN
-- Migration: 20251015000006_assign_existing_orgs_to_admin
-- =============================================

-- Update existing organizations without created_by to assign them to the first admin
-- This is a one-time migration for existing data
UPDATE tenants 
SET created_by = (
    SELECT id 
    FROM profiles 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE created_by IS NULL;

-- Migration complete
SELECT 'Assigned existing organizations to admin user' AS status;