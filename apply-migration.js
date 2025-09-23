import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vhgddpxytbxqqmyicxgb.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZ2RkcHh5dGJ4cXFteWljeGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ3Nzc2MywiZXhwIjoyMDc0MDUzNzYzfQ.n3b7qfanodVVksx5iGf3BczE8o-LQzpl4TQ8-B35Veg'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQL(sql) {
  try {
    console.log('Executing:', sql.substring(0, 100) + '...')
    // Use direct SQL execution with service role
    const { data, error } = await supabase.from('_supabase_exec_sql').select('*').eq('query', sql)
    if (error) {
      console.error('Error:', error)
      return false
    }
    console.log('Success')
    return true
  } catch (err) {
    console.error('Exception:', err)
    return false
  }
}

async function applyMigrations() {
  console.log('Starting database migration...')

  // Check current schema
  console.log('\n=== Checking current environments table schema ===')
  await executeSQL(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'environments'
    ORDER BY ordinal_position
  `)

  console.log('\n=== Checking current sensors table schema ===')
  await executeSQL(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'sensors'
    ORDER BY ordinal_position
  `)

  // Apply migrations
  console.log('\n=== Applying schema updates ===')

  // 1. Add tenant_id to environments
  console.log('\n1. Adding tenant_id to environments...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'environments' AND column_name = 'tenant_id') THEN
            ALTER TABLE environments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `)

  // 2. Add environment_type to environments
  console.log('\n2. Adding environment_type to environments...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'environments' AND column_name = 'environment_type') THEN
            ALTER TABLE environments ADD COLUMN environment_type TEXT NOT NULL DEFAULT 'other'
                CHECK (environment_type IN ('cold_storage', 'blast_freezer', 'chiller', 'other'));
        END IF;
    END $$;
  `)

  // 3. Add description to environments
  console.log('\n3. Adding description to environments...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'environments' AND column_name = 'description') THEN
            ALTER TABLE environments ADD COLUMN description TEXT;
        END IF;
    END $$;
  `)

  // 4. Add updated_at to environments
  console.log('\n4. Adding updated_at to environments...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'environments' AND column_name = 'updated_at') THEN
            ALTER TABLE environments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END $$;
  `)

  // 5. Add tenant_id to sensors
  console.log('\n5. Adding tenant_id to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'tenant_id') THEN
            ALTER TABLE sensors ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `)

  // 6. Add site_id to sensors
  console.log('\n6. Adding site_id to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'site_id') THEN
            ALTER TABLE sensors ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `)

  // 7. Add sensor_id_local to sensors
  console.log('\n7. Adding sensor_id_local to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'sensor_id_local') THEN
            ALTER TABLE sensors ADD COLUMN sensor_id_local TEXT;
        END IF;
    END $$;
  `)

  // 8. Add property_measured to sensors
  console.log('\n8. Adding property_measured to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'property_measured') THEN
            ALTER TABLE sensors ADD COLUMN property_measured TEXT NOT NULL DEFAULT 'temperature_c';
        END IF;
    END $$;
  `)

  // 9. Add installation_date to sensors
  console.log('\n9. Adding installation_date to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'installation_date') THEN
            ALTER TABLE sensors ADD COLUMN installation_date DATE;
        END IF;
    END $$;
  `)

  // 10. Add location_details to sensors
  console.log('\n10. Adding location_details to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'location_details') THEN
            ALTER TABLE sensors ADD COLUMN location_details TEXT;
        END IF;
    END $$;
  `)

  // 11. Add status to sensors
  console.log('\n11. Adding status to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'status') THEN
            ALTER TABLE sensors ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'maintenance', 'decommissioned'));
        END IF;
    END $$;
  `)

  // 12. Add updated_at to sensors
  console.log('\n12. Adding updated_at to sensors...')
  await executeSQL(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'sensors' AND column_name = 'updated_at') THEN
            ALTER TABLE sensors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END $$;
  `)

  // 13. Populate data
  console.log('\n13. Populating tenant_id and site_id for existing records...')
  await executeSQL(`
    UPDATE sensors
    SET
        tenant_id = environments.tenant_id,
        site_id = environments.site_id
    FROM environments
    WHERE sensors.environment_id = environments.id
    AND (sensors.tenant_id IS NULL OR sensors.site_id IS NULL);
  `)

  await executeSQL(`
    UPDATE environments
    SET tenant_id = sites.tenant_id
    FROM sites
    WHERE environments.site_id = sites.id
    AND environments.tenant_id IS NULL;
  `)

  // 14. Make columns NOT NULL
  console.log('\n14. Making columns NOT NULL...')
  await executeSQL(`ALTER TABLE environments ALTER COLUMN tenant_id SET NOT NULL;`)
  await executeSQL(`ALTER TABLE sensors ALTER COLUMN tenant_id SET NOT NULL;`)
  await executeSQL(`ALTER TABLE sensors ALTER COLUMN site_id SET NOT NULL;`)

  // 15. Add indexes
  console.log('\n15. Adding performance indexes...')
  await executeSQL(`
    CREATE INDEX IF NOT EXISTS idx_environments_site_id ON environments(site_id);
    CREATE INDEX IF NOT EXISTS idx_environments_tenant_id ON environments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(environment_type);
  `)

  await executeSQL(`
    CREATE INDEX IF NOT EXISTS idx_sensors_environment_id ON sensors(environment_id);
    CREATE INDEX IF NOT EXISTS idx_sensors_site_id ON sensors(site_id);
    CREATE INDEX IF NOT EXISTS idx_sensors_tenant_id ON sensors(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
    CREATE INDEX IF NOT EXISTS idx_sensors_local_id ON sensors(sensor_id_local);
  `)

  // 16. Enable RLS
  console.log('\n16. Enabling Row Level Security...')
  await executeSQL(`ALTER TABLE environments ENABLE ROW LEVEL SECURITY;`)
  await executeSQL(`ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;`)

  // 17. Add RLS policies
  console.log('\n17. Adding RLS policies...')
  await executeSQL(`
    CREATE POLICY IF NOT EXISTS "Environments: Users can view environments in accessible sites"
        ON environments FOR SELECT
        USING (can_access_site(site_id));
  `)

  await executeSQL(`
    CREATE POLICY IF NOT EXISTS "Environments: Masters and admins can manage environments"
        ON environments FOR ALL
        USING (
            is_admin() OR
            (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
        )
        WITH CHECK (
            is_admin() OR
            (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
        );
  `)

  await executeSQL(`
    CREATE POLICY IF NOT EXISTS "Sensors: Users can view sensors in accessible sites"
        ON sensors FOR SELECT
        USING (can_access_site(site_id));
  `)

  await executeSQL(`
    CREATE POLICY IF NOT EXISTS "Sensors: Masters and admins can manage sensors"
        ON sensors FOR ALL
        USING (
            is_admin() OR
            (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
        )
        WITH CHECK (
            is_admin() OR
            (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
        );
  `)

  // 18. Add triggers
  console.log('\n18. Adding update triggers...')
  await executeSQL(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `)

  await executeSQL(`
    DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
    CREATE TRIGGER update_environments_updated_at
        BEFORE UPDATE ON environments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `)

  await executeSQL(`
    DROP TRIGGER IF EXISTS update_sensors_updated_at ON sensors;
    CREATE TRIGGER update_sensors_updated_at
        BEFORE UPDATE ON sensors
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `)

  console.log('\n=== Migration completed! ===')
  console.log('Checking final schema...')

  // Final verification
  console.log('\n=== Final environments table schema ===')
  await executeSQL(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'environments'
    ORDER BY ordinal_position
  `)

  console.log('\n=== Final sensors table schema ===')
  await executeSQL(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'sensors'
    ORDER BY ordinal_position
  `)

  console.log('\n🎉 Migration completed successfully!')
}

applyMigrations().catch(console.error)