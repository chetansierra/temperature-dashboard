-- =============================================
-- COMPLETE DATABASE RESTORATION
-- Run this in Supabase SQL Editor to restore everything
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Tenants (Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    max_users INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    plan_limits JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'master_user', 'user')),
    email TEXT NOT NULL,
    full_name TEXT,
    site_access TEXT[],
    auditor_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environments
CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('freezer', 'refrigerator', 'room', 'warehouse', 'other')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensors
CREATE TABLE IF NOT EXISTS sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    local_id TEXT,
    model TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    last_reading_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Readings (Time-series data)
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL,
    sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thresholds
CREATE TABLE IF NOT EXISTS thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    min_humidity DECIMAL(5,2),
    max_humidity DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    resource_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Site Access (for granular permissions)
CREATE TABLE IF NOT EXISTS user_site_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, site_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Sites indexes
CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);

-- Environments indexes
CREATE INDEX IF NOT EXISTS idx_environments_site_id ON environments(site_id);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_id ON environments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);

-- Sensors indexes
CREATE INDEX IF NOT EXISTS idx_sensors_environment_id ON sensors(environment_id);
CREATE INDEX IF NOT EXISTS idx_sensors_site_id ON sensors(site_id);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant_id ON sensors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
CREATE INDEX IF NOT EXISTS idx_sensors_local_id ON sensors(local_id);

-- Readings indexes
CREATE INDEX IF NOT EXISTS idx_readings_sensor_id ON readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts DESC);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_ts ON readings(sensor_id, ts DESC);

-- Thresholds indexes
CREATE INDEX IF NOT EXISTS idx_thresholds_environment_id ON thresholds(environment_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_tenant_id ON thresholds(tenant_id);

-- Alert Rules indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant_id ON alert_rules(tenant_id);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);

-- Admin Activity indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_resource_type ON admin_activity(resource_type);

-- User Site Access indexes
CREATE INDEX IF NOT EXISTS idx_user_site_access_user_id ON user_site_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_site_id ON user_site_access(site_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_granted_by ON user_site_access(granted_by);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample tenant
INSERT INTO tenants (id, name, slug, max_users, plan, status, created_by, created_at, updated_at) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Acme Foods Ltd.',
    'acme-foods',
    25,
    'pro',
    'active',
    'c1a3ce67-e583-4b0f-949b-00dd8371fe61',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert admin user profile
INSERT INTO profiles (id, tenant_id, role, email, full_name, created_at, updated_at) 
VALUES (
    'c1a3ce67-e583-4b0f-949b-00dd8371fe61',
    NULL,
    'admin',
    'admin1@cueron.com',
    'System Administrator',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = 'admin1@cueron.com',
    full_name = 'System Administrator',
    updated_at = NOW();

-- Insert sample master user
INSERT INTO profiles (id, tenant_id, role, email, full_name, created_at, updated_at) 
VALUES (
    '91e04dab-d5b9-48a5-bd97-eac1b39de235',
    '550e8400-e29b-41d4-a716-446655440000',
    'master_user',
    'master@acme.com',
    'John Smith',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample regular user
INSERT INTO profiles (id, tenant_id, role, email, full_name, created_at, updated_at) 
VALUES (
    '91e04dab-d5b9-48a5-bd97-eac1b39de236',
    '550e8400-e29b-41d4-a716-446655440000',
    'user',
    'user@acme.com',
    'Jane Doe',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample sites
INSERT INTO sites (id, tenant_id, name, location, description, created_at, updated_at) 
VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Mumbai Warehouse', 'Mumbai, India', 'Main distribution center', NOW(), NOW()),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Delhi Cold Storage', 'Delhi, India', 'Cold storage facility', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample environments
INSERT INTO environments (id, site_id, tenant_id, name, type, description, created_at, updated_at) 
VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Freezer A1', 'freezer', 'Main freezer unit', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Refrigerator B1', 'refrigerator', 'Vegetable storage', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Cold Room C1', 'room', 'General cold storage', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample sensors
INSERT INTO sensors (id, environment_id, site_id, tenant_id, name, local_id, model, status, battery_level, created_at, updated_at) 
VALUES 
    ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Freezer A1 Sensor 1', 'FA1-S1', 'TempSense Pro', 'active', 85, NOW(), NOW()),
    ('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Freezer A1 Sensor 2', 'FA1-S2', 'TempSense Pro', 'active', 92, NOW(), NOW()),
    ('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Refrigerator B1 Sensor', 'RB1-S1', 'TempSense Lite', 'active', 78, NOW(), NOW()),
    ('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Cold Room C1 Sensor', 'CC1-S1', 'TempSense Standard', 'active', 65, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample thresholds
INSERT INTO thresholds (environment_id, tenant_id, min_temperature, max_temperature, min_humidity, max_humidity, created_at, updated_at) 
VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', -20.0, -15.0, 40.0, 60.0, NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 2.0, 8.0, 80.0, 95.0, NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 0.0, 5.0, 70.0, 90.0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert sample readings (recent data)
INSERT INTO readings (sensor_id, ts, temperature, humidity) 
VALUES 
    ('880e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 hour', -18.5, 45.2),
    ('880e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '30 minutes', -18.2, 46.1),
    ('880e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '15 minutes', -18.8, 44.8),
    ('880e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 hour', -17.9, 47.3),
    ('880e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '30 minutes', -18.1, 46.9),
    ('880e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '1 hour', 4.2, 85.1),
    ('880e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '30 minutes', 4.5, 84.8),
    ('880e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 hour', 2.8, 78.5),
    ('880e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '30 minutes', 3.1, 79.2)
ON CONFLICT DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY (DISABLED FOR NOW)
-- =============================================

-- Disable RLS for easier development
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE environments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sensors DISABLE ROW LEVEL SECURITY;
ALTER TABLE readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE thresholds DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_access DISABLE ROW LEVEL SECURITY;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Database restoration complete!' as status;
SELECT 'Tables created:' as info, count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Admin user:' as info, email, role FROM profiles WHERE role = 'admin';
SELECT 'Sample data:' as info, count(*) as tenant_count FROM tenants;
SELECT 'Sites:' as info, count(*) as site_count FROM sites;
SELECT 'Sensors:' as info, count(*) as sensor_count FROM sensors;