-- =============================================
-- FIX TENANTS RLS POLICIES FOR ADMIN ACCESS
-- Migration: 20251015000000_fix_tenants_rls_policies
-- =============================================

-- Drop existing tenants policies to recreate them
DROP POLICY IF EXISTS "Tenants: Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Tenants: Admins can manage all tenants" ON tenants;

-- Recreate tenants policies with proper admin access
CREATE POLICY "Tenants: Admins can manage all tenants"
    ON tenants FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Tenants: Users can view their own tenant"
    ON tenants FOR SELECT
    USING (
        -- Users can view their own tenant
        id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        -- Master users can view their own tenant
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'master_user' 
                AND tenant_id = tenants.id
            )
        )
    );

-- Ensure RLS is enabled on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON POLICY "Tenants: Admins can manage all tenants" ON tenants IS 'Allows admins to create, read, update, and delete all organizations';
COMMENT ON POLICY "Tenants: Users can view their own tenant" ON tenants IS 'Allows users and master users to view their own organization details';

-- Migration complete
SELECT 'Tenants RLS policies fixed for admin access' AS status;