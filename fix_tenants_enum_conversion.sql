-- =============================================
-- FIX TENANTS ENUM CONVERSION
-- Run this to continue from where the error occurred
-- =============================================

-- First, drop the existing default value
ALTER TABLE tenants ALTER COLUMN plan DROP DEFAULT;

-- Now convert the column type to enum
ALTER TABLE tenants ALTER COLUMN plan TYPE organization_plan USING plan::organization_plan;

-- Add the default back with the enum value
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'basic'::organization_plan;

-- Do the same for status column
ALTER TABLE tenants ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tenants ALTER COLUMN status TYPE organization_status USING status::organization_status;
ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'active'::organization_status;

-- Add NOT NULL constraints
ALTER TABLE tenants ALTER COLUMN plan SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN status SET NOT NULL;

-- =============================================
-- CONTINUE WITH SITES TABLE
-- =============================================

-- Add status column if it doesn't exist
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status;
ALTER TABLE sites ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE ENVIRONMENTS TABLE
-- =============================================

-- Add status and type columns if they don't exist
ALTER TABLE environments ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active'::organization_status;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS type environment_type DEFAULT 'indoor'::environment_type;

-- Update existing columns to use enums (if they exist)
DO $$
BEGIN
    -- Check if status column exists and update it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'status' AND data_type = 'text') THEN
        ALTER TABLE environments ALTER COLUMN status TYPE organization_status USING status::organization_status;
    END IF;
    
    -- Check if type column exists and update it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'type' AND data_type = 'text') THEN
        ALTER TABLE environments ALTER COLUMN type TYPE environment_type USING type::environment_type;
    END IF;
END $$;

-- Add NOT NULL constraints
ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
ALTER TABLE environments ALTER COLUMN type SET NOT NULL;

-- =============================================
-- UPDATE SENSORS TABLE
-- =============================================

-- Add status column if it doesn't exist
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS status sensor_status DEFAULT 'active'::sensor_status;

-- Update existing status column if it exists as text
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sensors' AND column_name = 'status' AND data_type = 'text') THEN
        ALTER TABLE sensors ALTER COLUMN status TYPE sensor_status USING status::sensor_status;
    END IF;
END $$;

ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE ALERTS TABLE (if exists)
-- =============================================

-- Create alert_status enum for alerts
CREATE TYPE IF NOT EXISTS alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- Update alerts table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts') THEN
        ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status alert_status DEFAULT 'active'::alert_status;
        
        -- Update existing status column if it's text
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'status' AND data_type = 'text') THEN
            ALTER TABLE alerts ALTER COLUMN status TYPE alert_status USING status::alert_status;
        END IF;
        
        ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
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
-- VERIFICATION QUERIES
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
WHERE table_name IN ('profiles', 'tenants', 'sites', 'environments', 'sensors')
AND column_name IN ('role', 'status', 'plan', 'type')
ORDER BY table_name, column_name;

SELECT 'Enums conversion completed successfully!' AS result;