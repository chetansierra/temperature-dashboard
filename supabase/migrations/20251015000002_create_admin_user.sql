-- =============================================
-- TEMPORARILY DISABLE RLS FOR DEVELOPMENT
-- Migration: 20251015000002_create_admin_user
-- =============================================

-- Temporarily disable RLS on tenants table for development
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- Add a comment explaining this is temporary
COMMENT ON TABLE tenants IS 'RLS temporarily disabled for development - re-enable in production';

-- Migration complete
SELECT 'RLS disabled on tenants table for development' AS status;