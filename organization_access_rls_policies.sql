-- Organization-based Row Level Security (RLS) Policies
-- These policies enforce organization-based access control for sites and environments

-- Enable RLS on sites table if not already enabled
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sites from their organization" ON sites;
DROP POLICY IF EXISTS "Admins can view all sites" ON sites;
DROP POLICY IF EXISTS "Organization users can view organization sites" ON sites;

-- Create comprehensive RLS policy for sites table
CREATE POLICY "Organization users can view organization sites" ON sites
  FOR SELECT USING (
    -- Admins can see all sites
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Master users and regular users can see sites from their organization
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('master_user', 'user')
      AND
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Enable RLS on environments table if not already enabled  
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view environments from their organization sites" ON environments;
DROP POLICY IF EXISTS "Admins can view all environments" ON environments;
DROP POLICY IF EXISTS "Organization users can view organization environments" ON environments;

-- Create comprehensive RLS policy for environments table
CREATE POLICY "Organization users can view organization environments" ON environments
  FOR SELECT USING (
    -- Admins can see all environments
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Master users and regular users can see environments from their organization
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('master_user', 'user')
      AND
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Enable RLS on sensors table for consistency
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

-- Drop existing sensor policies if they exist
DROP POLICY IF EXISTS "Organization users can view organization sensors" ON sensors;

-- Create RLS policy for sensors table
CREATE POLICY "Organization users can view organization sensors" ON sensors
  FOR SELECT USING (
    -- Admins can see all sensors
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Master users and regular users can see sensors from their organization
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('master_user', 'user')
      AND
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Enable RLS on readings table for consistency
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Drop existing reading policies if they exist
DROP POLICY IF EXISTS "Organization users can view organization readings" ON readings;

-- Create RLS policy for readings table (through sensor relationship)
CREATE POLICY "Organization users can view organization readings" ON readings
  FOR SELECT USING (
    -- Admins can see all readings
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Master users and regular users can see readings from sensors in their organization
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('master_user', 'user')
      AND
      EXISTS (
        SELECT 1 FROM sensors 
        WHERE sensors.id = readings.sensor_id 
        AND sensors.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Enable RLS on alerts table for consistency
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing alert policies if they exist
DROP POLICY IF EXISTS "Organization users can view organization alerts" ON alerts;

-- Create RLS policy for alerts table
CREATE POLICY "Organization users can view organization alerts" ON alerts
  FOR SELECT USING (
    -- Admins can see all alerts
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Master users and regular users can see alerts from their organization
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('master_user', 'user')
      AND
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Create indexes to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_id ON environments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant_id ON sensors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sites_tenant_status ON sites(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_site ON environments(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant_environment ON sensors(tenant_id, environment_id);

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('sites', 'environments', 'sensors', 'readings', 'alerts', 'profiles')
AND schemaname = 'public';

-- Show all RLS policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('sites', 'environments', 'sensors', 'readings', 'alerts')
AND schemaname = 'public'
ORDER BY tablename, policyname;