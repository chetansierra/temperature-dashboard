-- =============================================
-- ADD CRUD FUNCTIONALITY FOR ENVIRONMENTS & SENSORS
-- Migration: 20250123000001_add_crud_functionality
-- =============================================

-- Ensure environments table has all required columns
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'environments' AND column_name = 'tenant_id') THEN
        ALTER TABLE environments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'environments' AND column_name = 'environment_type') THEN
        ALTER TABLE environments ADD COLUMN environment_type TEXT NOT NULL DEFAULT 'other'
            CHECK (environment_type IN ('cold_storage', 'blast_freezer', 'chiller', 'other'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'environments' AND column_name = 'description') THEN
        ALTER TABLE environments ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'environments' AND column_name = 'updated_at') THEN
        ALTER TABLE environments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Ensure sensors table has all required columns
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'tenant_id') THEN
        ALTER TABLE sensors ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'site_id') THEN
        ALTER TABLE sensors ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'sensor_id_local') THEN
        ALTER TABLE sensors ADD COLUMN sensor_id_local TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'property_measured') THEN
        ALTER TABLE sensors ADD COLUMN property_measured TEXT NOT NULL DEFAULT 'temperature_c';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'installation_date') THEN
        ALTER TABLE sensors ADD COLUMN installation_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'location_details') THEN
        ALTER TABLE sensors ADD COLUMN location_details TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'status') THEN
        ALTER TABLE sensors ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'maintenance', 'decommissioned'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sensors' AND column_name = 'updated_at') THEN
        ALTER TABLE sensors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update existing sensors to populate tenant_id and site_id from their environments
UPDATE sensors
SET
    tenant_id = environments.tenant_id,
    site_id = environments.site_id
FROM environments
WHERE sensors.environment_id = environments.id
AND (sensors.tenant_id IS NULL OR sensors.site_id IS NULL);

-- Update existing environments to populate tenant_id from their sites
UPDATE environments
SET tenant_id = sites.tenant_id
FROM sites
WHERE environments.site_id = sites.id
AND environments.tenant_id IS NULL;

-- Make tenant_id NOT NULL after populating data
ALTER TABLE environments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sensors ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sensors ALTER COLUMN site_id SET NOT NULL;

-- Add/update indexes for performance
CREATE INDEX IF NOT EXISTS idx_environments_site_id ON environments(site_id);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_id ON environments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(environment_type);

CREATE INDEX IF NOT EXISTS idx_sensors_environment_id ON sensors(environment_id);
CREATE INDEX IF NOT EXISTS idx_sensors_site_id ON sensors(site_id);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant_id ON sensors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
CREATE INDEX IF NOT EXISTS idx_sensors_local_id ON sensors(sensor_id_local);

-- Ensure RLS is enabled
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for environments (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'environments' AND policyname = 'Environments: Users can view environments in accessible sites') THEN
        CREATE POLICY "Environments: Users can view environments in accessible sites"
            ON environments FOR SELECT
            USING (can_access_site(site_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'environments' AND policyname = 'Environments: Masters and admins can manage environments') THEN
        CREATE POLICY "Environments: Masters and admins can manage environments"
            ON environments FOR ALL
            USING (
                is_admin() OR
                (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
            )
            WITH CHECK (
                is_admin() OR
                (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
            );
    END IF;
END $$;

-- Update RLS policies for sensors (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'Sensors: Users can view sensors in accessible sites') THEN
        CREATE POLICY "Sensors: Users can view sensors in accessible sites"
            ON sensors FOR SELECT
            USING (can_access_site(site_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'Sensors: Masters and admins can manage sensors') THEN
        CREATE POLICY "Sensors: Masters and admins can manage sensors"
            ON sensors FOR ALL
            USING (
                is_admin() OR
                (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
            )
            WITH CHECK (
                is_admin() OR
                (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
            );
    END IF;
END $$;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
CREATE TRIGGER update_environments_updated_at
    BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sensors_updated_at ON sensors;
CREATE TRIGGER update_sensors_updated_at
    BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE environments IS 'Specific environments within sites (cold storage, chillers, etc.)';
COMMENT ON TABLE sensors IS 'Individual temperature sensors within environments';

-- Migration complete
SELECT 'CRUD functionality migration completed successfully' AS status;