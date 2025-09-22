-- =============================================
-- SEED DATA FOR TEMPERATURE DASHBOARD
-- =============================================

-- Insert demo users (these will be created in Supabase Auth)
-- Note: These users need to be created via Supabase Auth, but we'll create profiles for them

-- Demo User Credentials (for manual creation in Supabase Auth):
-- 1. master@acme.com / password123 (Master user for Acme Foods)
-- 2. manager.mumbai@acme.com / password123 (Site Manager for Mumbai)
-- 3. auditor@temp-audit.com / password123 (Auditor with time-bound access)
-- 4. admin@dashboard.com / password123 (Platform Admin)

-- Insert demo tenants
INSERT INTO tenants (id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Acme Foods Ltd.'),
    ('550e8400-e29b-41d4-a716-446655440002', 'FreshCorp Industries');

-- Insert demo user profiles (assuming these user IDs exist in auth.users)
INSERT INTO profiles (id, tenant_id, role, email, full_name, site_access, auditor_expires_at) VALUES 
    ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'master', 'master@acme.com', 'John Smith', NULL, NULL),
    ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'site_manager', 'manager.mumbai@acme.com', 'Priya Sharma', ARRAY['550e8400-e29b-41d4-a716-446655440011'], NULL),
    ('550e8400-e29b-41d4-a716-446655440103', NULL, 'auditor', 'auditor@temp-audit.com', 'Mike Johnson', NULL, NOW() + INTERVAL '30 days'),
    ('550e8400-e29b-41d4-a716-446655440104', NULL, 'admin', 'admin@dashboard.com', 'System Admin', NULL, NULL);

-- Insert demo sites
INSERT INTO sites (id, tenant_id, site_name, site_code, location, timezone) VALUES 
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Mumbai Warehouse', 'ACME-MUM-01', '{"address": "Mumbai, India", "lat": 19.0760, "lng": 72.8777}', 'Asia/Kolkata'),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Delhi Distribution Center', 'ACME-DEL-01', '{"address": "Delhi, India", "lat": 28.7041, "lng": 77.1025}', 'Asia/Kolkata'),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'Bangalore Facility', 'FRESH-BLR-01', '{"address": "Bangalore, India", "lat": 12.9716, "lng": 77.5946}', 'Asia/Kolkata');

-- Insert demo environments
INSERT INTO environments (id, site_id, tenant_id, environment_type, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'cold_storage', 'Cold Store A', 'Large cold storage unit for frozen foods'),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'blast_freezer', 'Blast Freezer 1', 'Rapid freezing unit for fresh produce'),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'chiller', 'Chiller Room B', 'Temperature controlled storage for dairy products'),
    ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'cold_storage', 'Main Cold Storage', 'Primary cold storage facility'),
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'chiller', 'Produce Chiller', 'Fresh produce temperature control');

-- Insert demo sensors
INSERT INTO sensors (id, tenant_id, site_id, environment_id, sensor_id_local, property_measured, installation_date, location_details, status) VALUES 
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'MUM-A-001', 'temperature_c', '2024-01-01', 'Aisle 3, middle rack', 'active'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'MUM-A-002', 'temperature_c', '2024-01-01', 'Aisle 3, top rack', 'active'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'MUM-BF-001', 'temperature_c', '2024-01-01', 'Center position', 'active'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440023', 'MUM-CH-001', 'temperature_c', '2024-01-01', 'Near entrance', 'active'),
    ('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440024', 'DEL-CS-001', 'temperature_c', '2024-01-15', 'Zone A', 'active'),
    ('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440025', 'BLR-PC-001', 'temperature_c', '2024-02-01', 'Section 1', 'active');

-- Insert demo thresholds (organization level)
INSERT INTO thresholds (id, tenant_id, level, level_ref_id, min_c, max_c, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', 'org', '550e8400-e29b-41d4-a716-446655440001', -25.0, -15.0, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440002', 'org', '550e8400-e29b-41d4-a716-446655440002', -20.0, -10.0, '550e8400-e29b-41d4-a716-446655440002');

-- Insert environment-specific thresholds
INSERT INTO thresholds (id, tenant_id, level, level_ref_id, min_c, max_c, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440001', 'environment', '550e8400-e29b-41d4-a716-446655440022', -35.0, -25.0, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440001', 'environment', '550e8400-e29b-41d4-a716-446655440023', 2.0, 8.0, '550e8400-e29b-41d4-a716-446655440001');

-- Insert demo alert rules
INSERT INTO alert_rules (id, tenant_id, name, scope_level, scope_ids, min_c, max_c, breach_window_minutes, escalation_minutes, created_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 'Cold Storage Critical Alert', 'environment', ARRAY['550e8400-e29b-41d4-a716-446655440021'], -25.0, -15.0, 10, 15, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', 'Blast Freezer Alert', 'environment', ARRAY['550e8400-e29b-41d4-a716-446655440022'], -35.0, -25.0, 5, 10, '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample readings (last 24 hours)
-- Note: Replace this section with your Kaggle temperature dataset
-- Expected CSV format: timestamp,sensor_id,temperature_c

-- Cold Storage sensors (normal operation around -18°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440031',
    -18.0 + (random() - 0.5) * 2.0  -- Random variation ±1°C
FROM generate_series(0, 23);

INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440032',
    -17.5 + (random() - 0.5) * 2.0
FROM generate_series(0, 23);

-- Blast Freezer sensor (normal operation around -30°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440033',
    -30.0 + (random() - 0.5) * 3.0  -- Random variation ±1.5°C
FROM generate_series(0, 23);

-- Chiller sensor (normal operation around 4°C)
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440034',
    4.0 + (random() - 0.5) * 2.0  -- Random variation ±1°C
FROM generate_series(0, 23);

-- Delhi cold storage sensor
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440035',
    -19.0 + (random() - 0.5) * 2.0
FROM generate_series(0, 23);

-- Bangalore produce chiller sensor
INSERT INTO readings (ts, sensor_id, value) 
SELECT 
    NOW() - INTERVAL '1 hour' * generate_series(0, 23),
    '550e8400-e29b-41d4-a716-446655440036',
    5.0 + (random() - 0.5) * 2.0
FROM generate_series(0, 23);

-- Insert some sample alerts (one open, one acknowledged, one resolved)
INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at) VALUES 
    ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440031', 'warning', 'open', 'Temperature above threshold in Cold Store A', -14.5, -25.0, -15.0, NOW() - INTERVAL '30 minutes');

INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at, acknowledged_at, acknowledged_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440033', 'critical', 'acknowledged', 'Critical temperature breach in Blast Freezer 1', -22.0, -35.0, -25.0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes', '550e8400-e29b-41d4-a716-446655440001');

INSERT INTO alerts (id, rule_id, tenant_id, site_id, environment_id, sensor_id, level, status, message, value, threshold_min, threshold_max, opened_at, acknowledged_at, resolved_at, acknowledged_by, resolved_by) VALUES 
    ('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440032', 'warning', 'resolved', 'Temperature spike resolved in Cold Store A', -13.0, -25.0, -15.0, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes', NOW() - INTERVAL '3 hours', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001');

-- =============================================
-- COMMENTS FOR KAGGLE DATA INTEGRATION
-- =============================================

/*
TO INTEGRATE YOUR KAGGLE TEMPERATURE DATASET:

1. Replace the sample readings INSERT statements above with your actual data
2. Your CSV should have columns: timestamp, sensor_id, temperature_c
3. Use the sensor IDs from the sensors table above
4. Convert your CSV to SQL INSERT statements like:

INSERT INTO readings (ts, sensor_id, value) VALUES 
    ('2024-01-01T00:00:00Z', '550e8400-e29b-41d4-a716-446655440031', -18.5),
    ('2024-01-01T00:01:00Z', '550e8400-e29b-41d4-a716-446655440031', -18.3),
    -- ... more readings

Or use the Python simulator to ingest your CSV data via the API endpoint.

SAMPLE CSV FORMAT:
timestamp,sensor_id,temperature_c
2024-01-01T00:00:00Z,550e8400-e29b-41d4-a716-446655440031,-18.5
2024-01-01T00:01:00Z,550e8400-e29b-41d4-a716-446655440031,-18.3
2024-01-01T00:02:00Z,550e8400-e29b-41d4-a716-446655440032,-17.8
*/

-- =============================================
-- REFRESH CONTINUOUS AGGREGATES
-- =============================================

-- Refresh the continuous aggregates to include seed data
CALL refresh_continuous_aggregate('readings_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('readings_daily', NULL, NULL);

COMMENT ON SCHEMA public IS 'Temperature Dashboard seed data with sample organizations, sites, environments, sensors, and readings. Replace sample readings with your Kaggle dataset.';
