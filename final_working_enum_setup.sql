-- =============================================
-- FINAL WORKING ENUM SETUP
-- =============================================

-- Create alert_status enum (use DO block to handle if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
        CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
    END IF;
END $$;

-- =============================================
-- HANDLE SITES TABLE
-- =============================================
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status NOT NULL;

-- =============================================
-- HANDLE ENVIRONMENTS TABLE
-- =============================================
ALTER TABLE environments ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS type environment_type DEFAULT 'indoor'::environment_type;

-- Set NOT NULL for environments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'status') THEN
        UPDATE environments SET status = 'active'::organization_status WHERE status IS NULL;
        ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'type') THEN
        UPDATE environments SET type = 'indoor'::environment_type WHERE type IS NULL;
        ALTER TABLE environments ALTER COLUMN type SET NOT NULL;
    END IF;
END $$;

-- =============================================
-- HANDLE SENSORS TABLE
-- =============================================
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS status sensor_status DEFAULT 'active'::sensor_status;

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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'status') THEN
            ALTER TABLE alerts ADD COLUMN status alert_status DEFAULT 'active'::alert_status NOT NULL;
        ELSE
            UPDATE alerts SET status = 'active'::alert_status WHERE status IS NULL;
            ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
        END IF;
    END IF;
END $$;

-- =============================================
-- ADD INDEXES
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
-- VERIFICATION
-- =============================================
SELECT 'ENUM SETUP COMPLETE!' AS result;

SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'tenants', 'sites', 'environments', 'sensors', 'alerts')
AND column_name IN ('role', 'status', 'plan', 'type')
ORDER BY table_name, column_name;