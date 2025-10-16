-- =============================================
-- ADD CREATED_BY FOREIGN KEY CONSTRAINT
-- Migration: 20251015000012_add_created_by_constraint
-- =============================================

-- First, ensure any existing organizations without created_by get assigned to an admin
UPDATE tenants 
SET created_by = (
    SELECT id 
    FROM profiles 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE created_by IS NULL;

-- Add foreign key constraint for created_by field
ALTER TABLE tenants 
ADD CONSTRAINT tenants_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Make created_by NOT NULL for future inserts
ALTER TABLE tenants 
ALTER COLUMN created_by SET NOT NULL;

-- Add check constraint to ensure created_by references an admin
ALTER TABLE tenants 
ADD CONSTRAINT check_created_by_is_admin 
CHECK (
    created_by IN (
        SELECT id FROM profiles WHERE role = 'admin'
    )
);

-- Add index for performance on created_by lookups
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

-- Add comment for documentation
COMMENT ON CONSTRAINT tenants_created_by_fkey ON tenants IS 'Foreign key to profiles table - tracks which admin created this organization';
COMMENT ON CONSTRAINT check_created_by_is_admin ON tenants IS 'Ensures created_by always references an admin user';

-- Migration complete
SELECT 'Added foreign key constraint and NOT NULL requirement for tenants.created_by' AS status;