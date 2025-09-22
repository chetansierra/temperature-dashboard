-- Simple seed data that matches the current schema structure from schema_info.sql

-- Insert demo tenants
INSERT INTO tenants (id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Acme Foods Ltd.'),
    ('550e8400-e29b-41d4-a716-446655440002', 'FreshCorp Industries');

-- Insert demo users (matching the auth users we created earlier)
INSERT INTO users (id, tenant_id, email, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'master@acme.com', 'master'),
    ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'manager@acme.com', 'site_manager'),
    ('550e8400-e29b-41d4-a716-446655440103', NULL, 'auditor@temp-audit.com', 'auditor'),
    ('550e8400-e29b-41d4-a716-446655440104', NULL, 'admin@dashboard.com', 'admin');

-- Insert demo sites
INSERT INTO sites (id, tenant_id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Mumbai Warehouse'),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Delhi Distribution Center'),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'Bangalore Facility');

-- Insert demo environments
INSERT INTO environments (id, site_id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'Cold Store A'),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011', 'Blast Freezer 1'),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', 'Chiller Room B'),
    ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440012', 'Main Cold Storage'),
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440013', 'Produce Chiller');

-- Insert demo sensors (matching the sensor IDs from our sample CSV)
INSERT INTO sensors (id, environment_id, property, location) VALUES 
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', 'temperature', 'Aisle 3, middle rack'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440021', 'temperature', 'Aisle 3, top rack'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440022', 'temperature', 'Center position'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440023', 'temperature', 'Near entrance'),
    ('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440024', 'temperature', 'Zone A'),
    ('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440025', 'temperature', 'Section 1');

-- Insert demo thresholds
INSERT INTO thresholds (id, tenant_id, target_type, target_id, min_value, max_value) VALUES 
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', 'org', '550e8400-e29b-41d4-a716-446655440001', -25.0, -15.0),
    ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440002', 'org', '550e8400-e29b-41d4-a716-446655440002', -20.0, -10.0);

-- Insert some sample alerts
INSERT INTO alerts (id, sensor_id, message) VALUES 
    ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440031', 'Temperature above threshold in Cold Store A'),
    ('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440033', 'Critical temperature breach in Blast Freezer 1');