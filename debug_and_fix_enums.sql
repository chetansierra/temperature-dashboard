-- =============================================
-- DEBUG AND FIX ENUMS - Step by Step Approach
-- Run this to see what's in your database and fix it
-- =============================================

-- STEP 1: Let's see what we're working with
SELECT 'CURRENT COLUMN TYPES:' as info;
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

-- STEP 2: Check what values exist in environments.type
SELECT 'ENVIRONMENTS TYPE VALUES:' as info;
SELECT DISTINCT type, COUNT(*) as count 
FROM environments 
GROUP BY type 
ORDER BY count DESC;

-- STEP 3: Check what values exist in environments.status  
SELECT 'ENVIRONMENTS STATUS VALUES:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM environments 
GROUP BY status 
ORDER BY count DESC;

-- STEP 4: Check what values exist in sensors.status
SELECT 'SENSORS STATUS VALUES:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM sensors 
GROUP BY status 
ORDER BY count DESC;

-- STEP 5: Now let's fix environments.type step by step
-- First, let's see if any values are NULL or empty
UPDATE environments SET type = 'indoor' WHERE type IS NULL OR type = '';

-- Map all possible values to valid enum values
UPDATE environments 
SET type = 'indoor' 
WHERE type NOT IN ('indoor', 'outdoor', 'warehouse', 'office', 'production');

-- Now try the conversion with explicit casting
ALTER TABLE environments ALTER COLUMN type DROP DEFAULT;

-- Use a more explicit conversion approach
ALTER TABLE environments 
ALTER COLUMN type TYPE environment_type 
USING CASE 
    WHEN type = 'indoor' THEN 'indoor'::environment_type
    WHEN type = 'outdoor' THEN 'outdoor'::environment_type  
    WHEN type = 'warehouse' THEN 'warehouse'::environment_type
    WHEN type = 'office' THEN 'office'::environment_type
    WHEN type = 'production' THEN 'production'::environment_type
    ELSE 'indoor'::environment_type
END;

ALTER TABLE environments ALTER COLUMN type SET DEFAULT 'indoor'::environment_type;
ALTER TABLE environments ALTER COLUMN type SET NOT NULL;

-- STEP 6: Fix environments.status
UPDATE environments SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE environments 
SET status = 'active' 
WHERE status NOT IN ('active', 'suspended', 'cancelled');

ALTER TABLE environments ALTER COLUMN status DROP DEFAULT;

ALTER TABLE environments 
ALTER COLUMN status TYPE organization_status 
USING CASE 
    WHEN status = 'active' THEN 'active'::organization_status
    WHEN status = 'suspended' THEN 'suspended'::organization_status
    WHEN status = 'cancelled' THEN 'cancelled'::organization_status
    ELSE 'active'::organization_status
END;

ALTER TABLE environments ALTER COLUMN status SET DEFAULT 'active'::organization_status;
ALTER TABLE environments ALTER COLUMN status SET NOT NULL;

-- STEP 7: Fix sensors.status
-- First check if the column exists and what type it is
DO $$
DECLARE
    col_type text;
    col_exists boolean := false;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'sensors' AND column_name = 'status';
    
    IF FOUND THEN
        col_exists := true;
        
        IF col_type IN ('text', 'character varying') THEN
            -- Clean up the data first
            UPDATE sensors SET status = 'active' WHERE status IS NULL OR status = '';
            UPDATE sensors 
            SET status = 'active' 
            WHERE status NOT IN ('active', 'maintenance', 'decommissioned');
            
            -- Convert with explicit CASE
            ALTER TABLE sensors ALTER COLUMN status DROP DEFAULT;
            
            ALTER TABLE sensors 
            ALTER COLUMN status TYPE sensor_status 
            USING CASE 
                WHEN status = 'active' THEN 'active'::sensor_status
                WHEN status = 'maintenance' THEN 'maintenance'::sensor_status
                WHEN status = 'decommissioned' THEN 'decommissioned'::sensor_status
                ELSE 'active'::sensor_status
            END;
            
            ALTER TABLE sensors ALTER COLUMN status SET DEFAULT 'active'::sensor_status;
            
        ELSIF col_type = 'boolean' THEN
            -- Rename boolean column and create new enum column
            ALTER TABLE sensors RENAME COLUMN status TO is_active_old;
            ALTER TABLE sensors ADD COLUMN status sensor_status DEFAULT 'active'::sensor_status;
            UPDATE sensors SET status = CASE WHEN is_active_old THEN 'active'::sensor_status ELSE 'decommissioned'::sensor_status END;
        END IF;
        
        ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE sensors ADD COLUMN status sensor_status DEFAULT 'active'::sensor_status NOT NULL;
    END IF;
END $$;

-- STEP 8: Add indexes
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);
CREATE INDEX IF NOT EXISTS idx_environments_status ON environments(status);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

-- STEP 9: Final verification
SELECT 'FINAL VERIFICATION:' as info;

SELECT 'ENUM TYPES CREATED:' as info, typname 
FROM pg_type 
WHERE typtype = 'e' 
AND typname IN ('user_role', 'user_status', 'organization_plan', 'organization_status', 'sensor_status', 'environment_type', 'alert_status')
ORDER BY typname;

SELECT 'FINAL COLUMN TYPES:' as info, 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('environments', 'sensors')
AND column_name IN ('status', 'type')
ORDER BY table_name, column_name;

SELECT 'FINAL DATA CHECK:' as info;
SELECT 'environments.type' as column_name, type::text as value, COUNT(*) as count FROM environments GROUP BY type
UNION ALL
SELECT 'environments.status' as column_name, status::text as value, COUNT(*) as count FROM environments GROUP BY status  
UNION ALL
SELECT 'sensors.status' as column_name, status::text as value, COUNT(*) as count FROM sensors GROUP BY status
ORDER BY column_name, value;

SELECT 'Enum conversion completed successfully!' AS result;