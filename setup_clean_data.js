import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vhgddpxytbxqqmyicxgb.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZ2RkcHh5dGJ4cXFteWljeGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ3Nzc2MywiZXhwIjoyMDc0MDUzNzYzfQ.n3b7qfanodVVksx5iGf3BczE8o-LQzpl4TQ8-B35Veg'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupCleanData() {
  try {
    console.log('🧹 Setting up clean data with new role system...')
    
    // 1. Create single tenant organization
    console.log('Creating organization...')
    const { error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Acme Foods Ltd.',
        slug: 'acme-foods',
        max_users: 10,
        settings: {}
      })
    
    if (tenantError) console.error('Tenant error:', tenantError)
    else console.log('✅ Organization created')

    // 2. Create admin user (global access)
    console.log('Creating admin user...')
    
    // Create auth user for admin
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@dashboard.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (adminAuthError && !adminAuthError.message.includes('already been registered')) {
      console.error('Admin auth error:', adminAuthError)
    } else {
      const adminUserId = adminAuth?.user?.id || '91e04dab-d5b9-48a5-bd97-eac1b39de234'
      
      const { error: adminProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: adminUserId,
          tenant_id: null,
          role: 'admin',
          email: 'admin@dashboard.com',
          full_name: 'System Administrator'
        })
      
      if (adminProfileError) console.error('Admin profile error:', adminProfileError)
      else console.log('✅ Admin user created')
    }

    // 3. Create master user (organization admin)
    console.log('Creating master user...')
    
    // Create auth user for master
    const { data: masterAuth, error: masterAuthError } = await supabase.auth.admin.createUser({
      email: 'master@acme.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (masterAuthError && !masterAuthError.message.includes('already been registered')) {
      console.error('Master auth error:', masterAuthError)
    } else {
      const masterUserId = masterAuth?.user?.id || '569405dd-589e-4f0b-b633-08c3e2b636ed'
      
      const { error: masterProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: masterUserId,
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          role: 'master_user',
          email: 'master@acme.com',
          full_name: 'John Smith'
        })
      
      if (masterProfileError) console.error('Master profile error:', masterProfileError)
      else console.log('✅ Master user created')
    }

    // 4. Create sample sites
    console.log('Creating sample sites...')
    const sites = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Mumbai Warehouse',
        location: 'Mumbai, India',
        timezone: 'Asia/Kolkata'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Delhi Distribution Center',
        location: 'Delhi, India',
        timezone: 'Asia/Kolkata'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bangalore Cold Storage',
        location: 'Bangalore, India',
        timezone: 'Asia/Kolkata'
      }
    ]
    
    const { error: sitesError } = await supabase.from('sites').upsert(sites)
    if (sitesError) console.error('Sites error:', sitesError)
    else console.log('✅ Sample sites created')

    // 5. Create sample environments
    console.log('Creating sample environments...')
    const environments = [
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        site_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        environment_type: 'cold_storage',
        name: 'Cold Store A',
        description: 'Main cold storage unit'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        site_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        environment_type: 'blast_freezer',
        name: 'Blast Freezer 1',
        description: 'Ultra-low temperature freezer'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440013',
        site_id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        environment_type: 'chiller',
        name: 'Chiller Room',
        description: 'Temperature controlled storage'
      }
    ]
    
    const { error: envError } = await supabase.from('environments').upsert(environments)
    if (envError) console.error('Environments error:', envError)
    else console.log('✅ Sample environments created')

    // 6. Create sample sensors
    console.log('Creating sample sensors...')
    const sensors = [
      {
        id: 'f948f520-5a4a-4c11-8c8f-94188874de82',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        site_id: '550e8400-e29b-41d4-a716-446655440001',
        environment_id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'Ultra-Freezer-Sensor-02',
        sensor_type: 'temperature',
        unit: 'celsius',
        location_details: 'Center position',
        is_active: true,
        sensor_id_local: 'MUM-UF-002',
        property_measured: 'temperature_c',
        status: 'active'
      },
      {
        id: '4bedcab9-daad-4a31-adea-be29de68631e',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        site_id: '550e8400-e29b-41d4-a716-446655440001',
        environment_id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Freezer-A-Sensor-02',
        sensor_type: 'temperature',
        unit: 'celsius',
        location_details: 'Aisle 2, top rack',
        is_active: true,
        sensor_id_local: 'MUM-FA-002',
        property_measured: 'temperature_c',
        status: 'active'
      },
      {
        id: 'a27c5568-ac94-47f5-8af7-636a7e5efcf8',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        site_id: '550e8400-e29b-41d4-a716-446655440001',
        environment_id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Freezer-A-Sensor-03',
        sensor_type: 'temperature',
        unit: 'celsius',
        location_details: 'Aisle 3, middle rack',
        is_active: true,
        sensor_id_local: 'MUM-FA-003',
        property_measured: 'temperature_c',
        status: 'active'
      }
    ]
    
    const { error: sensorsError } = await supabase.from('sensors').upsert(sensors)
    if (sensorsError) console.error('Sensors error:', sensorsError)
    else console.log('✅ Sample sensors created')

    // 7. Create sample readings
    console.log('Creating sample readings...')
    const readings = []
    
    // Generate 24 hours of readings for each sensor
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date()
      timestamp.setHours(timestamp.getHours() - hour)
      
      readings.push(
        {
          sensor_id: 'f948f520-5a4a-4c11-8c8f-94188874de82',
          ts: timestamp.toISOString(),
          temperature_c: -30.0 + (Math.random() - 0.5) * 3.0
        },
        {
          sensor_id: '4bedcab9-daad-4a31-adea-be29de68631e',
          ts: timestamp.toISOString(),
          temperature_c: -18.0 + (Math.random() - 0.5) * 2.0
        },
        {
          sensor_id: 'a27c5568-ac94-47f5-8af7-636a7e5efcf8',
          ts: timestamp.toISOString(),
          temperature_c: -17.5 + (Math.random() - 0.5) * 2.0
        }
      )
    }
    
    const { error: readingsError } = await supabase.from('readings').upsert(readings)
    if (readingsError) console.error('Readings error:', readingsError)
    else console.log('✅ Sample readings created')

    console.log('\n🎉 Clean data setup completed!')
    console.log('\n📋 Login Credentials:')
    console.log('👤 Admin: admin@dashboard.com / password123')
    console.log('👤 Master User: master@acme.com / password123')
    console.log('\n🔗 Access Points:')
    console.log('🔧 Admin Portal: http://localhost:3000/admin/dashboard')
    console.log('📊 User Dashboard: http://localhost:3000/overview')
    console.log('\n💡 Use the role switcher (bottom-right) to test different roles!')

  } catch (error) {
    console.error('Setup error:', error)
  }
}

setupCleanData()