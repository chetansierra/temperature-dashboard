-- =============================================
-- ADD CREATED_BY FOREIGN KEY CONSTRAINT
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Add foreign key constraint for created_by field
ALTER TABLE tenants 
ADD CONSTRAINT tenants_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Make created_by NOT NULL for future inserts
ALTER TABLE tenants 
ALTER COLUMN created_by SET NOT NULL;

-- Add index for performance on created_by lookups
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

-- Add comment for documentation
COMMENT ON CONSTRAINT tenants_created_by_fkey ON tenants IS 'Foreign key to profiles table - tracks which admin created this organization';