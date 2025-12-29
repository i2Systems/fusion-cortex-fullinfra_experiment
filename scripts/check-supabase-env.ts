/**
 * Check Supabase Environment Variables
 * 
 * Quick script to verify Supabase credentials are set up correctly.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Checking Supabase environment variables...\n')

let allSet = true

if (supabaseUrl) {
  console.log('✅ SUPABASE_URL:', supabaseUrl.substring(0, 30) + '...')
} else {
  console.log('❌ SUPABASE_URL: Not set')
  allSet = false
}

if (supabaseAnonKey) {
  console.log('✅ SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 20) + '...')
} else {
  console.log('❌ SUPABASE_ANON_KEY: Not set')
  allSet = false
}

if (supabaseServiceKey) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey.substring(0, 20) + '...')
} else {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY: Not set')
  allSet = false
}

console.log('')

if (allSet) {
  console.log('✅ All Supabase credentials are set!')
  console.log('')
  console.log('Next step: Run "npm run setup:supabase" to create storage buckets')
} else {
  console.log('❌ Missing some credentials')
  console.log('')
  console.log('To get your Supabase credentials:')
  console.log('1. Go to https://supabase.com and sign in')
  console.log('2. Select your project (or create a new one)')
  console.log('3. Go to Settings → API')
  console.log('4. Copy:')
  console.log('   - Project URL → SUPABASE_URL')
  console.log('   - anon/public key → SUPABASE_ANON_KEY')
  console.log('   - service_role key → SUPABASE_SERVICE_ROLE_KEY (keep secret!)')
  console.log('')
  console.log('Add them to your .env file:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJ...')
}

