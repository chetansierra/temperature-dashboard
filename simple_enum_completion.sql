-- =============================================
-- SIMPLE ENUM COMPLETION - NO MORE MISTAKES
-- This handles the case where columns already exist as enums
-- =============================================

-- First, let's see what we actually have
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('environments', 'sensors', 'sites')
AND column_name IN ('status', 'type')
ORDER BY table_name, column_name;

-- =============================================
-- HANDLE SITES TABLE (if status column missing)
-- =============================================
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status NOT NULL;

-- =============================================
-- HANDLE ENVIRONMENTS TABLE
-- =============================================
-- Only add columns if they don't exist, don't try to convert existing ones
ALTER TABLE environments ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS type environment_type DEFAULT 'indoor'::environment_type;

-- Set NOT NULL only if columns exist
DO $$
BEGIN
    -- Make status NOT NULL if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'status') THEN
        UPDATE environments SET status = 'active'::organization_status WHERE status IS NULL;
        ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
    END IF;
    
    -- Make type NOT NULL if it exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'type') THEN
        UPDATE environments SET type = 'indoor'::environment_type WHERE type IS NULL;
        ALTER TABLE environments ALTER COLUMN type SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- HANDLE SENSORS TABLE
-- =============================================
-- Only add status column if it doesn't exist
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS status sensor_status DEFAULT 'active'::sensor_status;

-- Set NOT NULL if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sensors' AND column_name = 'status') THEN
        UPDATE sensors SET status = 'active'::sensor_status WHERE status IS NULL;
        ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- HANDLE ALERTS TABLE (if it exists)
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts') THEN
        -- Add status column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'status') THEN
            ALTER TABLE alerts ADD COLUMN status alert_status DEFAULT 'active'::alert_status NOT NULL;
        ELSE
            -- Update NULL values and set NOT NULL
            UPDATE alerts SET status = 'active'::alert_status WHERE status IS NULL;
            ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
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
SELECT 'FINAL COLUMN VERIFICATION:' as info;
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

SELECT 'Enum setup completed successfully!' AS result;