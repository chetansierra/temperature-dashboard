import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing database connection...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabase() {
  try {
    // Test sensors count
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('*', { count: 'exact' })
      .limit(5)
    
    console.log('Sensors query result:')
    console.log('Error:', sensorsError)
    console.log('Count:', sensors?.length || 0)
    console.log('Data:', JSON.stringify(sensors, null, 2))

    // Test readings count
    const { data: readings, error: readingsError } = await supabase
      .from('readings')
      .select('*', { count: 'exact' })
      .limit(3)
    
    console.log('\nReadings query result:')
    console.log('Error:', readingsError)
    console.log('Count:', readings?.length || 0)
    console.log('Data:', JSON.stringify(readings, null, 2))

    // Test sites count
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*', { count: 'exact' })
      .limit(3)
    
    console.log('\nSites query result:')
    console.log('Error:', sitesError)
    console.log('Count:', sites?.length || 0)
    console.log('Data:', JSON.stringify(sites, null, 2))

  } catch (error) {
    console.error('Database test failed:', error)
  }
}

testDatabase()