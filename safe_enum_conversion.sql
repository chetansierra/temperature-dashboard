-- =============================================
-- SAFE ENUM CONVERSION - HANDLE DATA ISSUES
-- Run this to safely convert existing data
-- =============================================

-- First, let's check what values exist in the environments.type column
SELECT DISTINCT type, COUNT(*) as count 
FROM environments 
WHERE type IS NOT NULL 
GROUP BY type;

-- Update any invalid values to valid enum values before conversion
UPDATE environments 
SET type = CASE 
    WHEN type ILIKE '%indoor%' THEN 'indoor'
    WHEN type ILIKE '%outdoor%' THEN 'outdoor'
    WHEN type ILIKE '%warehouse%' THEN 'warehouse'
    WHEN type ILIKE '%office%' THEN 'office'
    WHEN type ILIKE '%production%' OR type ILIKE '%manufacturing%' THEN 'production'
    WHEN type ILIKE '%cold%' OR type ILIKE '%storage%' THEN 'warehouse'
    WHEN type ILIKE '%lab%' THEN 'office'
    ELSE 'indoor'  -- Default fallback
END
WHERE type IS NOT NULL;

-- Now safely convert the type column
ALTER TABLE environments ALTER COLUMN type DROP DEFAULT;
ALTER TABLE environments ALTER COLUMN type TYPE environment_type USING type::environment_type;
ALTER TABLE environments ALTER COLUMN type SET DEFAULT 'indoor'::environment_type;

-- Do the same for status if it exists as text
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'status' AND data_type = 'text') THEN
        -- Update any invalid status values
        UPDATE environments 
        SET status = CASE 
            WHEN status ILIKE '%active%' THEN 'active'
            WHEN status ILIKE '%suspend%' THEN 'suspended'
            WHEN status ILIKE '%cancel%' THEN 'cancelled'
            ELSE 'active'  -- Default fallback
        END
        WHERE status IS NOT NULL;
        
        ALTER TABLE environments ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE environments ALTER COLUMN status TYPE organization_status USING status::organization_status;
        ALTER TABLE environments ALTER COLUMN status SET DEFAULT 'active'::organization_status;
    END IF;
END $$;

-- Add NOT NULL constraints
ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
ALTER TABLE environments ALTER COLUMN type SET NOT NULL;

-- =============================================
-- SAFE SENSORS CONVERSION
-- =============================================

-- Check existing sensor status values
SELECT DISTINCT status, COUNT(*) as count 
FROM sensors 
WHERE status IS NOT NULL 
GROUP BY status;

-- Update any invalid sensor status values
UPDATE sensors 
SET status = CASE 
    WHEN status ILIKE '%active%' THEN 'active'
    WHEN status ILIKE '%maintenance%' OR status ILIKE '%repair%' THEN 'maintenance'
    WHEN status ILIKE '%decommission%' OR status ILIKE '%inactive%' OR status ILIKE '%disabled%' THEN 'decommissioned'
    ELSE 'active'  -- Default fallback
END
WHERE status IS NOT NULL;

-- Convert sensors status column if it exists as text
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sensors' AND column_name = 'status' AND data_type = 'text') THEN
        ALTER TABLE sensors ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE sensors ALTER COLUMN status TYPE sensor_status USING status::sensor_status;
        ALTER TABLE sensors ALTER COLUMN status SET DEFAULT 'active'::sensor_status;
    END IF;
END $$;

ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;

-- =============================================
-- SAFE ALERTS CONVERSION (if table exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts') THEN
        -- Check if status column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'status') THEN
            -- Update any invalid alert status values
            UPDATE alerts 
            SET status = CASE 
                WHEN status ILIKE '%active%' OR status ILIKE '%open%' THEN 'active'
                WHEN status ILIKE '%acknowledge%' THEN 'acknowledged'
                WHEN status ILIKE '%resolve%' OR status ILIKE '%close%' THEN 'resolved'
                ELSE 'active'  -- Default fallback
            END
            WHERE status IS NOT NULL;
            
            -- Convert if it's text type
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'status' AND data_type = 'text') THEN
                ALTER TABLE alerts ALTER COLUMN status DROP DEFAULT;
                ALTER TABLE alerts ALTER COLUMN status TYPE alert_status USING status::alert_status;
                ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active'::alert_status;
            END IF;
            
            ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
        ELSE
            -- Add status column if it doesn't exist
            ALTER TABLE alerts ADD COLUMN status alert_status DEFAULT 'active'::alert_status NOT NULL;
        END IF;
    END IF;
END $$;

-- =============================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);
CREATE INDEX IF NOT EXISTS idx_environments_status ON environments(status);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

-- =============================================
-- FINAL VERIFICATION
-- =============================================

-- Show all enum types created
SELECT typname, typtype 
FROM pg_type 
WHERE typtype = 'e' 
AND typname IN ('user_role', 'user_status', 'organization_plan', 'organization_status', 'sensor_status', 'environment_type', 'alert_status')
ORDER BY typname;

-- Show column types for verification
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'tenants', 'sites', 'environments', 'sensors', 'alerts')
AND column_name IN ('role', 'status', 'plan', 'type')
ORDER BY table_name, column_name;

-- Show sample data to verify conversion worked
SELECT 'environments' as table_name, type, status, COUNT(*) as count FROM environments GROUP BY type, status
UNION ALL
SELECT 'sensors' as table_name, status::text as type, status::text, COUNT(*) as count FROM sensors GROUP BY status
UNION ALL  
SELECT 'tenants' as table_name, plan::text as type, status::text, COUNT(*) as count FROM tenants GROUP BY plan, status
ORDER BY table_name, type;

SELECT 'Safe enum conversion completed successfully!' AS result;