-- =============================================
-- CREATE ENUMS AND UPDATE CONSTRAINTS
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Create all necessary enums
CREATE TYPE user_role AS ENUM ('admin', 'master_user', 'user');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE organization_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE sensor_status AS ENUM ('active', 'maintenance', 'decommissioned');
CREATE TYPE environment_type AS ENUM ('indoor', 'outdoor', 'warehouse', 'office', 'production');

-- =============================================
-- UPDATE PROFILES TABLE
-- =============================================

-- Add status column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';

-- Drop existing constraints and update columns to use enums
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE profiles ALTER COLUMN status TYPE user_status USING status::user_status;

-- Add NOT NULL constraints
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE TENANTS TABLE
-- =============================================

-- Drop existing constraints and update columns to use enums
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ALTER COLUMN plan TYPE organization_plan USING plan::organization_plan;
ALTER TABLE tenants ALTER COLUMN status TYPE organization_status USING status::organization_status;

-- Add NOT NULL constraints
ALTER TABLE tenants ALTER COLUMN plan SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE SITES TABLE
-- =============================================

-- Add status column if it doesn't exist
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active';
ALTER TABLE sites ALTER COLUMN status TYPE organization_status USING status::organization_status;
ALTER TABLE sites ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE ENVIRONMENTS TABLE
-- =============================================

-- Add status and type columns if they don't exist
ALTER TABLE environments ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'active';
ALTER TABLE environments ADD COLUMN IF NOT EXISTS type environment_type DEFAULT 'indoor';

-- Update columns to use enums
ALTER TABLE environments ALTER COLUMN status TYPE organization_status USING status::organization_status;
ALTER TABLE environments ALTER COLUMN type TYPE environment_type USING type::environment_type;

-- Add NOT NULL constraints
ALTER TABLE environments ALTER COLUMN status SET NOT NULL;
ALTER TABLE environments ALTER COLUMN type SET NOT NULL;

-- =============================================
-- UPDATE SENSORS TABLE
-- =============================================

-- Add status column if it doesn't exist
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS status sensor_status DEFAULT 'active';

-- Update column to use enum
ALTER TABLE sensors ALTER COLUMN status TYPE sensor_status USING status::sensor_status;
ALTER TABLE sensors ALTER COLUMN status SET NOT NULL;

-- =============================================
-- UPDATE ALERTS TABLE (if exists)
-- =============================================

-- Create alert_status enum for alerts
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- Update alerts table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts') THEN
        ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status alert_status DEFAULT 'active';
        ALTER TABLE alerts ALTER COLUMN status TYPE alert_status USING status::alert_status;
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
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'tenants', 'sites', 'environments', 'sensors')
AND column_name IN ('role', 'status', 'plan', 'type')
ORDER BY table_name, column_name;

SELECT 'Enums created and constraints updated successfully!' AS result;