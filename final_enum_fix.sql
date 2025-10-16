-- =============================================
-- FINAL ENUM FIX - HANDLE ALL EDGE CASES
-- Run this to complete the enum conversion
-- =============================================

-- First, let's see what we're working with
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('environments', 'sensors', 'alerts')
AND column_name IN ('status', 'type')
ORDER BY table_name, column_name;

-- =============================================
-- FIX ENVIRONMENTS TABLE
-- =============================================

-- Handle environments.type column
DO $$
DECLARE
    col_type text;
BEGIN
    -- Get the current data type of the type column
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'environments' AND column_name = 'type';
    
    IF col_type = 'text' OR col_type = 'character varying' THEN
        -- Update invalid values first
        UPDATE environments 
        SET type = CASE 
            WHEN type ILIKE '%indoor%' THEN 'indoor'
            WHEN type ILIKE '%outdoor%' THEN 'outdoor'
            WHEN type ILIKE '%warehouse%' THEN 'warehouse'
            WHEN type ILIKE '%office%' THEN 'office'
            WHEN type ILIKE '%production%' OR type ILIKE '%manufacturing%' THEN 'production'
            WHEN type ILIKE '%cold%' OR type ILIKE '%storage%' THEN 'warehouse'
            WHEN type ILIKE '%lab%' THEN 'office'
            ELSE 'indoor'
        END
        WHERE type IS NOT NULL;
        
        -- Convert the column
        ALTER TABLE environments ALTER COLUMN type DROP DEFAULT;
        ALTER TABLE environments ALTER COLUMN type TYPE environment_type USING type::environment_type;
        ALTER TABLE environments ALTER COLUMN type SET DEFAULT 'indoor'::environment_type;
    ELSIF col_type IS NULL THEN
        -- Column doesn't exist, add it
        ALTER TABLE environments ADD COLUMN type environment_type DEFAULT 'indoor'::environment_type;
    END IF;
    
    -- Ensure NOT NULL
    ALTER TABLE environments ALTER COLUMN type SET NOT NULL;
END $$;

-- Handle environments.status column
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'environments' AND column_name = 'status';
    
    IF col_type = 'text' OR col_type = 'character varying' THEN
        UPDATE environments 
        SET status = CASE 
            WHEN status ILIKE '%active%' THEN 'active'
            WHEN status ILIKE '%suspend%' THEN 'suspended'
            WHEN status ILIKE '%cancel%' THEN 'cancelled'
            ELSE 'active'
        END
        WHERE status IS NOT NULL;
        
        ALTER TABLE environments ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE environments ALTER COLUMN status TYPE organization_status USING status::organization_status;
        ALTER TABLE environments ALTER COLUMN status SET DEFAULT 'active'::organization_status;
    ELSIF col_type IS NULL THEN
        ALTER TABLE environments ADD COLUMN status organization_status DEFAULT 'active'::organization_status;
    END IF;
    
    ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
END $$;

-- =============================================
-- FIX SENSORS TABLE
-- =============================================

DO $$
DECLARE
    col_type text;
    col_exists boolean := false;
BEGIN
    -- Check if status column exists
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'sensors' AND column_name = 'status';
    
    IF FOUND THEN
        col_exists := true;
    END IF;
    
    IF col_exists AND (col_type = 'text' OR col_type = 'character varying') THEN
        -- Update invalid values first
        UPDATE sensors 
        SET status = CASE 
            WHEN status ILIKE '%active%' THEN 'active'
            WHEN status ILIKE '%maintenance%' OR status ILIKE '%repair%' THEN 'maintenance'
            WHEN status ILIKE '%decommission%' OR status ILIKE '%inactive%' OR status ILIKE '%disabled%' THEN 'decommissioned'
            ELSE 'active'
        END
        WHERE status IS NOT NULL;
        
        -- Convert the column
        ALTER TABLE sensors ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE sensors ALTER COLUMN status TYPE sensor_status USING status::sensor_status;
        ALTER TABLE sensors ALTER COLUMN status SET DEFAULT 'active'::sensor_status;
        ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;
        
    ELSIF col_exists AND col_type = 'boolean' THEN
        -- If it's a boolean (like is_active), rename and add new status
        ALTER TABLE sensors RENAME COLUMN status TO is_active_old;
        ALTER TABLE sensors ADD COLUMN status sensor_status DEFAULT 'active'::sensor_status NOT NULL;
        
        -- Update based on old boolean value
        UPDATE sensors SET status = CASE WHEN is_active_old THEN 'active'::sensor_status ELSE 'decommissioned'::sensor_status END;
        
    ELSIF NOT col_exists THEN
        -- Column doesn't exist, add it
        ALTER TABLE sensors ADD COLUMN status sensor_status DEFAULT 'active'::sensor_status NOT NULL;
    END IF;
END $$;

-- =============================================
-- FIX ALERTS TABLE (if exists)
-- =============================================

DO $$
DECLARE
    table_exists boolean := false;
    col_type text;
    col_exists boolean := false;
BEGIN
    -- Check if alerts table exists
    SELECT true INTO table_exists
    FROM information_schema.tables 
    WHERE table_name = 'alerts';
    
    IF table_exists THEN
        -- Check if status column exists
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_name = 'alerts' AND column_name = 'status';
        
        IF FOUND THEN
            col_exists := true;
        END IF;
        
        IF col_exists AND (col_type = 'text' OR col_type = 'character varying') THEN
            UPDATE alerts 
            SET status = CASE 
                WHEN status ILIKE '%active%' OR status ILIKE '%open%' THEN 'active'
                WHEN status ILIKE '%acknowledge%' THEN 'acknowledged'
                WHEN status ILIKE '%resolve%' OR status ILIKE '%close%' THEN 'resolved'
                ELSE 'active'
            END
            WHERE status IS NOT NULL;
            
            ALTER TABLE alerts ALTER COLUMN status DROP DEFAULT;
            ALTER TABLE alerts ALTER COLUMN status TYPE alert_status USING status::alert_status;
            ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active'::alert_status;
            ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
            
        ELSIF NOT col_exists THEN
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
SELECT 'ENUM TYPES:' as info, typname, typtype 
FROM pg_type 
WHERE typtype = 'e' 
AND typname IN ('user_role', 'user_status', 'organization_plan', 'organization_status', 'sensor_status', 'environment_type', 'alert_status')
ORDER BY typname;

-- Show final column types
SELECT 'COLUMN TYPES:' as info, 
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

SELECT 'Enum conversion completed successfully! All tables updated.' AS result;