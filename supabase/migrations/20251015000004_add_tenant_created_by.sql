-- =============================================
-- ADD CREATED_BY FIELD TO TENANTS
-- Migration: 20251015000004_add_tenant_created_by
-- =============================================

-- Add created_by field to track which admin created each organization
ALTER TABLE tenants 
ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Add index for performance
CREATE INDEX idx_tenants_created_by ON tenants(created_by);

-- Add comment
COMMENT ON COLUMN tenants.created_by IS 'ID of the admin (RM) who created/onboarded this organization';

-- Migration complete
SELECT 'Added created_by field to tenants table' AS status;