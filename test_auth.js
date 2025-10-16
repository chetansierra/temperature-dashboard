// Simple test script to check authentication
// Run with: node test_auth.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('Testing authentication for admin1@cueron.com...')
  
  try {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin1@cueron.com',
      password: 'admin1'
    })
    
    if (error) {
      console.error('Authentication failed:', error.message)
      
      // Check if it's an email confirmation issue
      if (error.message.includes('email') && error.message.includes('confirm')) {
        console.log('\n🔍 This looks like an email confirmation issue.')
        console.log('Solutions:')
        console.log('1. Check your email for a confirmation link')
        console.log('2. Or manually confirm the user in Supabase Dashboard > Authentication > Users')
        console.log('3. Or disable email confirmation in Supabase Dashboard > Authentication > Settings')
      }
      
      return
    }
    
    console.log('✅ Authentication successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile not found:', profileError.message)
      console.log('\n🔧 You need to create a profile for this user.')
      console.log('Run the create_admin_user.sql script in Supabase SQL editor.')
    } else {
      console.log('✅ Profile found!')
      console.log('Role:', profile.role)
      console.log('Full Name:', profile.full_name)
    }
    
    // Sign out
    await supabase.auth.signOut()
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

testAuth()