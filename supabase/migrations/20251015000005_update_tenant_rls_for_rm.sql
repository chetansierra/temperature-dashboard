-- =============================================
-- UPDATE TENANT RLS FOR RM ACCESS CONTROL
-- Migration: 20251015000005_update_tenant_rls_for_rm
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Tenants: Admins have full access" ON tenants;
DROP POLICY IF EXISTS "Tenants: Users can view their own tenant" ON tenants;

-- Create new policy for admins (RMs) - they can only access organizations they created
CREATE POLICY "Tenants: Admins can access their created organizations"
    ON tenants FOR ALL
    TO authenticated
    USING (
        -- Check if the current user is an admin and created this organization
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND (
                -- Admin can access organizations they created
                tenants.created_by = auth.uid()
                OR
                -- Allow access during creation (when created_by is null and being set)
                tenants.created_by IS NULL
            )
        )
    )
    WITH CHECK (
        -- Check if the current user is an admin for insert/update operations
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for regular users to view their own tenant (unchanged)
CREATE POLICY "Tenants: Users can view their own tenant"
    ON tenants FOR SELECT
    TO authenticated
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

-- Re-enable RLS (it was disabled earlier for development)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON POLICY "Tenants: Admins can access their created organizations" ON tenants IS 'Allows admins (RMs) to access only organizations they created/onboarded';
COMMENT ON POLICY "Tenants: Users can view their own tenant" ON tenants IS 'Allows users and master users to view their own organization details';

-- Migration complete
SELECT 'Updated tenant RLS policies for RM access control' AS status;