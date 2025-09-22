-- =============================================
-- SEED DATA FOR TEMPERATURE DASHBOARD
-- Updated to match the complete schema
-- =============================================

-- =============================================
-- DEMO TENANTS
-- =============================================

INSERT INTO tenants (id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Acme Foods Ltd.'),
    ('550e8400-e29b-41d4-a716-446655440002', 'FreshCorp Industries')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO USER PROFILES
-- =============================================
-- Note: These user IDs should match auth.users entries created via Supabase Auth
-- Demo User Credentials (create these manually in Supabase Auth dashboard):
-- 1. master@acme.com / password123 (Master user for Acme Foods)
-- 2. manager.mumbai@acme.com / password123 (Site Manager for Mumbai)
-- 3. auditor@temp-audit.com / password123 (Auditor with time-bound access)
-- 4. admin@dashboard.com / password123 (Platform Admin)

INSERT INTO profiles (id, tenant_id, role, email, full_name, site_access, auditor_expires_at) VALUES 
    ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'master', 'master@acme.com', 'John Smith', NULL, NULL),
    ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'site_manager', 'manager.mumbai@acme.com', 'Priya Sharma', ARRAY['550e8400-e29b-41d4-a716-446655440011'], NULL),
    ('550e8400-e29b-41d4-a716-446655440103', NULL, 'auditor', 'auditor@temp-audit.com', 'Mike Johnson', NULL, NOW() + INTERVAL '30 days'),
    ('550e8400-e29b-41d4-a716-446655440104', NULL, 'admin', 'admin@dashboard.com', 'System Admin', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO SITES
-- =============================================

INSERT INTO sites (id, tenant_id, site_name, site_code, location, timezone) VALUES 
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Mumbai Warehouse', 'ACME-MUM-01', '{"address": "Mumbai, India", "lat": 19.0760, "lng": 72.8777}', 'Asia/Kolkata'),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Delhi Distribution Center', 'ACME-DEL-01', '{"address": "Delhi, India", "lat": 28.7041, "lng": 77.1025}', 'Asia/Kolkata'),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'Bangalore Facility', 'FRESH-BLR-01', '{"address": "Bangalore, India", "lat": 12.9716, "lng": 77.5946}', 'Asia/Kolkata')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO ENVIRONMENTS
-- =============================================

INSERT INTO environments (id, site_id, tenant_id, environment_type, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'cold_storage', 'Cold Store A', 'Large cold storage unit for frozen foods'),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'blast_freezer', 'Blast Freezer 1', 'Rapid freezing unit for fresh produce'),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'chiller', 'Chiller Room B', 'Temperature controlled storage for dairy products'),
    ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'cold_storage', 'Main Cold Storage', 'Primary cold storage facility'),
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'chiller', 'Produce Chiller', 'Fresh produce temperature control')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO SENSORS
-- =============================================

INSERT INTO sensors (id, tenant_id, site_id, environment_id, sensor_id_local, property_measured, installation_date, location_details, status) VALUES 
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'MUM-A-001', 'temperature_c', '2024-01-01', 'Aisle 3, middle rack', 'active'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'MUM-A-002', 'temperature_c', '2024-01-01', 'Aisle 3, top rack', 'active'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'MUM-BF-001', 'temperature_c', '2024-01-01', 'Center position', 'active'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440023', 'MUM-CH-001', 'temperature_c', '2024-01-01', 'Near entrance', 'active'),
    ('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440024', 'DEL-CS-001', 'temperature_c', '2024-01-15', 'Zone A', 'active'),
    ('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440025', 'BLR-PC-001', 'temperature_c', '2024-02-01', 'Section 1', 'active')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO THRESHOLDS
-- =============================================

-- Organization level thresholds
INSERT INTO thresholds (id, tenant_id, level, level_ref_id, min_c, max_c, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', 'org', '550e8400-e29b-41d4-a716-446655440001', -25.0, -15.0, '550e8400-e29b-41d4-a716-446655440101'),
    ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440002', 'org', '550e8400-e29b-41d4-a716-446655440002', -20.0, -10.0, '550e8400-e29b-41d4-a716-446655440104')
ON CONFLICT (id) DO NOTHING;

-- Environment-specific thresholds (override org defaults)
INSERT INTO thresholds (id, tenant_id, level, level_ref_id, min_c, max_c, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440001', 'environment', '550e8400-e29b-41d4-a716-446655440022', -35.0, -25.0, '550e8400-e29b-41d4-a716-446655440101'),
    ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440001', 'environment', '550e8400-e29b-41d4-a716-446655440023', 2.0, 8.0, '550e8400-e29b-41d4-a716-446655440101')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEMO ALERT RULES
-- =============================================

INSERT INTO alert_rules (id, tenant_id, name, scope_level, scope_ids, min_c, max_c, breach_window_minutes, escalation_minutes, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 'Cold Storage Critical Alert', 'environment', ARRAY['550e8400-e29b-41d4-a716-446655440021'], -25.0, -15.0, 10, 15, '550e8400-e29b-41d4-a716-446655440101'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', 'Blast Freezer Alert', 'environment', ARRAY['550e8400-e29b-41d4-a716-446655440022'], -35.0, -25.0, 5, 10, '550e8400-e29b-41d4-a716-446655440101'),
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440001', 'Chiller Temperature Warning', 'environment', ARRAY['550e8400-e29b-41d4-a716-446655440023'], 2.0, 8.0, 5, 10, '550e8400-e29b-41d4-a716-446655440101')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE READINGS (LAST 24 HOURS)
-- =============================================

-- Cold Storage sensors (normal operation around -18°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440031',
    -18.0 + (random() - 0.5) * 2.0  -- Random variation ±1°C
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440032',
    -17.5 + (random() - 0.5) * 2.0
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

-- Blast Freezer sensor (normal operation around -30°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440033',
    -30.0 + (random() - 0.5) * 3.0  -- Random variation ±1.5°C
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

-- Chiller sensor (normal operation around 4°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440034',
    4.0 + (random() - 0.5) * 2.0  -- Random variation ±1°C
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

-- Delhi cold storage sensor
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440035',
    -19.0 + (random() - 0.5) * 2.0
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

-- Bangalore produce chiller sensor
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440036',
    5.0 + (random() - 0.5) * 2.0
FROM generate_series(0, 23)
ON CONFLICT (sensor_id, ts) DO NOTHING;

-- =============================================
-- SAMPLE ALERTS
-- =============================================

-- Insert some sample alerts (one open, one acknowledged, one resolved)
INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at) VALUES 
    ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440031', 'warning', 'open', 'Temperature above threshold in Cold Store A', -14.5, -25.0, -15.0, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at, acknowledged_at, acknowledged_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440033', 'critical', 'acknowledged', 'Critical temperature breach in Blast Freezer 1', -22.0, -35.0, -25.0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes', '550e8400-e29b-41d4-a716-446655440101')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at, acknowledged_at, resolved_at, acknowledged_by, resolved_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440032', 'warning', 'resolved', 'Temperature spike resolved in Cold Store A', -13.0, -25.0, -15.0, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes', NOW() - INTERVAL '3 hours', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440101')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- REFRESH CONTINUOUS AGGREGATES
-- =============================================

-- Refresh the continuous aggregates to include seed data
CALL refresh_continuous_aggregate('readings_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('readings_daily', NULL, NULL);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify data was inserted correctly
DO $$
DECLARE
    tenant_count INTEGER;
    profile_count INTEGER;
    site_count INTEGER;
    sensor_count INTEGER;
    reading_count INTEGER;
    alert_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO site_count FROM sites;
    SELECT COUNT(*) INTO sensor_count FROM sensors;
    SELECT COUNT(*) INTO reading_count FROM readings;
    SELECT COUNT(*) INTO alert_count FROM alerts;
    
    RAISE NOTICE 'Seed data verification:';
    RAISE NOTICE '- Tenants: %', tenant_count;
    RAISE NOTICE '- Profiles: %', profile_count;
    RAISE NOTICE '- Sites: %', site_count;
    RAISE NOTICE '- Sensors: %', sensor_count;
    RAISE NOTICE '- Readings: %', reading_count;
    RAISE NOTICE '- Alerts: %', alert_count;
    
    IF tenant_count >= 2 AND profile_count >= 4 AND site_count >= 3 AND sensor_count >= 6 THEN
        RAISE NOTICE '✓ Seed data loaded successfully';
    ELSE
        RAISE WARNING '⚠ Some seed data may not have been loaded properly';
    END IF;
END $$;

COMMENT ON SCHEMA public IS 'Temperature Dashboard with TimescaleDB - Seed data includes demo organizations, sites, environments, sensors, and sample readings. Ready for production use.';

SELECT 'Seed data loading completed' AS status;