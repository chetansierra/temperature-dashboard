-- =============================================
-- TEMPERATURE DASHBOARD - INITIAL SCHEMA
-- Migration: 20241201000001_initial_schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: TimescaleDB removed as it's not available in hosted Supabase

-- Ensure uuid functions are available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
        CREATE OR REPLACE FUNCTION uuid_generate_v4() RETURNS UUID AS 'SELECT gen_random_uuid()' LANGUAGE SQL;
    END IF;
END $$;

-- =============================================
-- CORE TABLES
-- =============================================

-- Tenants (Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users/Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('master', 'site_manager', 'auditor', 'admin')),
    email TEXT NOT NULL,
    full_name TEXT,
    site_access UUID[], -- Array of site IDs for site_managers
    auditor_expires_at TIMESTAMPTZ, -- Time-bound access for auditors
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    site_code TEXT NOT NULL UNIQUE,
    location JSONB, -- {"address": "...", "lat": ..., "lng": ...}
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environments within sites
CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    environment_type TEXT NOT NULL CHECK (environment_type IN ('cold_storage', 'blast_freezer', 'chiller', 'other')),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensors within environments
CREATE TABLE sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    sensor_id_local TEXT, -- Local identifier (e.g., "MUM-A-001")
    property_measured TEXT NOT NULL DEFAULT 'temperature_c',
    installation_date DATE,
    location_details TEXT, -- Physical location description
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'decommissioned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thresholds (can be applied at different levels)
CREATE TABLE thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('org', 'site', 'environment', 'sensor')),
    level_ref_id UUID NOT NULL, -- References the ID of the level (tenant, site, environment, or sensor)
    min_c NUMERIC,
    max_c NUMERIC,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope_level TEXT NOT NULL CHECK (scope_level IN ('environment', 'sensor')),
    scope_ids UUID[] NOT NULL, -- Array of environment or sensor IDs
    min_c NUMERIC,
    max_c NUMERIC,
    breach_window_minutes INTEGER DEFAULT 10,
    rate_of_change_c_per_5min NUMERIC, -- Optional rate-of-change threshold
    notification_channels JSONB DEFAULT '[]',
    escalation_minutes INTEGER DEFAULT 15,
    enabled BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Readings (Time-series data - will be converted to TimescaleDB hypertable)
CREATE TABLE readings (
    ts TIMESTAMPTZ NOT NULL,
    sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (sensor_id, ts)
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('warning', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    message TEXT NOT NULL,
    value NUMERIC,
    threshold_min NUMERIC,
    threshold_max NUMERIC,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES profiles(id),
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TIMESCALEDB SETUP
-- =============================================

-- Convert readings table to hypertable (time-series optimized)
SELECT create_hypertable('readings', 'ts', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Enable compression on readings table
ALTER TABLE readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'sensor_id',
    timescaledb.compress_orderby = 'ts DESC'
);

-- Create continuous aggregates for hourly data
CREATE MATERIALIZED VIEW readings_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', ts) AS bucket,
    sensor_id,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as reading_count
FROM readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Create continuous aggregates for daily data  
CREATE MATERIALIZED VIEW readings_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', ts) AS bucket,
    sensor_id,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as reading_count
FROM readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- Set up automatic refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

SELECT add_continuous_aggregate_policy('readings_daily',
    start_offset => INTERVAL '3 days', 
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Set up compression policy (compress data older than 7 days)
SELECT add_compression_policy('readings', INTERVAL '7 days', if_not_exists => TRUE);

-- Set up data retention policy (remove raw data older than 180 days)
SELECT add_retention_policy('readings', INTERVAL '180 days', if_not_exists => TRUE);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sites_code ON sites(site_code);

CREATE INDEX IF NOT EXISTS idx_environments_site_id ON environments(site_id);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_id ON environments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(environment_type);

CREATE INDEX IF NOT EXISTS idx_sensors_environment_id ON sensors(environment_id);
CREATE INDEX IF NOT EXISTS idx_sensors_site_id ON sensors(site_id);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant_id ON sensors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
CREATE INDEX IF NOT EXISTS idx_sensors_local_id ON sensors(sensor_id_local);

CREATE INDEX IF NOT EXISTS idx_thresholds_tenant_id ON thresholds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_level ON thresholds(level, level_ref_id);

CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant_id ON alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

-- Readings indexes (TimescaleDB will create additional optimized indexes)
CREATE INDEX IF NOT EXISTS idx_readings_sensor_ts ON readings(sensor_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_site_id ON alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_alerts_opened_at ON alerts(opened_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to get user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS profiles AS $$
DECLARE
    user_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Function to check if user can access tenant
CREATE OR REPLACE FUNCTION can_access_tenant(tenant_uuid UUID)
RETURNS boolean AS $$
DECLARE
    user_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO user_profile FROM get_user_profile();
    
    -- Admin can access all tenants
    IF user_profile.role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Auditor can only access their assigned tenant (if not expired)
    IF user_profile.role = 'auditor' THEN
        RETURN user_profile.tenant_id = tenant_uuid AND 
               (user_profile.auditor_expires_at IS NULL OR user_profile.auditor_expires_at > NOW());
    END IF;
    
    -- Master and site_manager can only access their tenant
    RETURN user_profile.tenant_id = tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Function to check if user can access site
CREATE OR REPLACE FUNCTION can_access_site(site_uuid UUID)
RETURNS boolean AS $$
DECLARE
    user_profile profiles%ROWTYPE;
    site_tenant_id UUID;
BEGIN
    SELECT * INTO user_profile FROM get_user_profile();
    
    -- Admin can access all sites
    IF user_profile.role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Get the tenant_id for the site
    SELECT tenant_id INTO site_tenant_id FROM sites WHERE id = site_uuid;
    
    -- Auditor can access sites in their assigned tenant (if not expired)
    IF user_profile.role = 'auditor' THEN
        RETURN user_profile.tenant_id = site_tenant_id AND 
               (user_profile.auditor_expires_at IS NULL OR user_profile.auditor_expires_at > NOW());
    END IF;
    
    -- Master can access all sites in their tenant
    IF user_profile.role = 'master' THEN
        RETURN user_profile.tenant_id = site_tenant_id;
    END IF;
    
    -- Site manager can only access explicitly assigned sites (NULL = no access)
    IF user_profile.role = 'site_manager' THEN
        RETURN user_profile.tenant_id = site_tenant_id AND 
               user_profile.site_access IS NOT NULL AND 
               site_uuid = ANY(user_profile.site_access);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Tenants policies
CREATE POLICY "Tenants: Users can view their own tenant"
    ON tenants FOR SELECT
    USING (can_access_tenant(id));

CREATE POLICY "Tenants: Admins can manage all tenants"
    ON tenants FOR ALL
    USING (is_admin());

-- Profiles policies
CREATE POLICY "Profiles: Users can view profiles in their tenant scope"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id OR 
        can_access_tenant(tenant_id) OR
        is_admin()
    );

CREATE POLICY "Profiles: Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: Masters and admins can manage profiles"
    ON profiles FOR ALL
    USING (
        is_admin() OR 
        (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_admin() OR 
        (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
    );

-- Sites policies  
CREATE POLICY "Sites: Users can view sites they have access to"
    ON sites FOR SELECT
    USING (can_access_site(id));

CREATE POLICY "Sites: Masters and admins can manage sites"
    ON sites FOR ALL
    USING (
        is_admin() OR 
        (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_admin() OR 
        (get_user_profile()).role = 'master' AND can_access_tenant(tenant_id)
    );

-- Environments policies
CREATE POLICY "Environments: Users can view environments in accessible sites"
    ON environments FOR SELECT
    USING (can_access_site(site_id));

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

-- Sensors policies
CREATE POLICY "Sensors: Users can view sensors in accessible sites"
    ON sensors FOR SELECT
    USING (can_access_site(site_id));

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

-- Thresholds policies
CREATE POLICY "Thresholds: Users can view thresholds in their scope"
    ON thresholds FOR SELECT
    USING (can_access_tenant(tenant_id));

CREATE POLICY "Thresholds: Masters and site managers can manage thresholds"
    ON thresholds FOR ALL
    USING (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    );

-- Alert rules policies
CREATE POLICY "Alert rules: Users can view rules in their scope"
    ON alert_rules FOR SELECT
    USING (can_access_tenant(tenant_id));

CREATE POLICY "Alert rules: Masters and site managers can manage rules"
    ON alert_rules FOR ALL
    USING (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    );

-- Readings policies
CREATE POLICY "Readings: Users can view readings from accessible sensors"
    ON readings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sensors s
            WHERE s.id = sensor_id AND can_access_site(s.site_id)
        )
    );

-- Restrict readings insertion to service_role only (HMAC auth in API layer)
CREATE POLICY "Readings: Service role only can insert readings"
    ON readings FOR INSERT
    WITH CHECK (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- Alerts policies
CREATE POLICY "Alerts: Users can view alerts in their scope"
    ON alerts FOR SELECT
    USING (can_access_tenant(tenant_id));

CREATE POLICY "Alerts: Masters and site managers can manage alerts"
    ON alerts FOR ALL
    USING (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_admin() OR
        (get_user_profile()).role IN ('master', 'site_manager') AND can_access_tenant(tenant_id)
    );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thresholds_updated_at BEFORE UPDATE ON thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE tenants IS 'Organizations using the temperature dashboard';
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE sites IS 'Physical locations containing temperature monitoring equipment';
COMMENT ON TABLE environments IS 'Specific environments within sites (cold storage, chillers, etc.)';
COMMENT ON TABLE sensors IS 'Individual temperature sensors within environments';
COMMENT ON TABLE thresholds IS 'Temperature thresholds at various organizational levels';
COMMENT ON TABLE alert_rules IS 'Rules for generating alerts based on sensor readings';
COMMENT ON TABLE readings IS 'Time-series temperature readings from sensors (TimescaleDB hypertable)';
COMMENT ON TABLE alerts IS 'Temperature alerts generated by alert rules';

COMMENT ON VIEW readings_hourly IS 'Hourly aggregated temperature readings (TimescaleDB continuous aggregate)';
COMMENT ON VIEW readings_daily IS 'Daily aggregated temperature readings (TimescaleDB continuous aggregate)';

-- Migration complete
SELECT 'Initial schema migration completed successfully' AS status;