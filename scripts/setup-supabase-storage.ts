/**
 * Supabase Storage Setup Script
 * 
 * Automatically creates the required storage buckets for image hosting.
 * Run this after setting up your Supabase project and environment variables.
 * 
 * Usage:
 *   npx tsx scripts/setup-supabase-storage.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env file
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('')
  console.error('Please set these environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('You can find these in your Supabase dashboard:')
  console.error('  Settings → API → Project URL')
  console.error('  Settings → API → service_role key (secret)')
  console.error('')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const BUCKETS = [
  {
    name: 'site-images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    fileSizeLimit: 2097152, // 2MB
  },
  {
    name: 'library-images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    fileSizeLimit: 2097152, // 2MB
  },
  {
    name: 'map-data',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    fileSizeLimit: 52428800, // 50MB (for large floor plans)
  },
]

async function setupBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n')

  for (const bucket of BUCKETS) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.error(`❌ Error listing buckets: ${listError.message}`)
        continue
      }

      const bucketExists = existingBuckets?.some(b => b.name === bucket.name)

      if (bucketExists) {
        console.log(`✅ Bucket "${bucket.name}" already exists`)
        
        // Check if it's public
        const bucketInfo = existingBuckets.find(b => b.name === bucket.name)
        if (!bucketInfo?.public) {
          console.log(`   ⚠️  Bucket is not public. Making it public...`)
          // Note: Supabase doesn't have a direct API to change bucket visibility
          // User needs to do this manually in the dashboard
          console.log(`   📝 Please make "${bucket.name}" public in the Supabase dashboard:`)
          console.log(`      Storage → ${bucket.name} → Settings → Make public`)
        } else {
          console.log(`   ✅ Bucket is already public`)
        }
      } else {
        // Create bucket
        console.log(`📦 Creating bucket "${bucket.name}"...`)
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: bucket.allowedMimeTypes,
          fileSizeLimit: bucket.fileSizeLimit,
        })

        if (error) {
          console.error(`❌ Error creating bucket "${bucket.name}": ${error.message}`)
          if (error.message.includes('already exists')) {
            console.log(`   ℹ️  Bucket may have been created by another process`)
          }
        } else {
          console.log(`✅ Successfully created bucket "${bucket.name}"`)
          if (bucket.public) {
            console.log(`   ✅ Bucket is set to public`)
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Unexpected error with bucket "${bucket.name}": ${error.message}`)
    }
    console.log('')
  }

  // Verify setup
  console.log('🔍 Verifying setup...\n')
  const { data: buckets, error: verifyError } = await supabase.storage.listBuckets()
  
  if (verifyError) {
    console.error(`❌ Error verifying buckets: ${verifyError.message}`)
    process.exit(1)
  }

  const createdBuckets = buckets?.filter(b => BUCKETS.some(bucket => bucket.name === b.name)) || []
  
  if (createdBuckets.length === BUCKETS.length) {
    console.log('✅ All buckets are set up!')
    console.log('')
    console.log('📋 Bucket Summary:')
    createdBuckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
    console.log('')
    console.log('🎉 Setup complete! You can now upload images.')
  } else {
    console.log('⚠️  Some buckets may be missing. Please check the Supabase dashboard.')
    console.log('')
    console.log('Expected buckets:')
    BUCKETS.forEach(bucket => {
      const exists = createdBuckets.some(b => b.name === bucket.name)
      console.log(`   ${exists ? '✅' : '❌'} ${bucket.name}`)
    })
  }
}

// Run setup
setupBuckets()
  .then(() => {
    console.log('')
    console.log('💡 Next steps:')
    console.log('   1. Verify buckets are public in Supabase dashboard')
    console.log('   2. Test image upload in your application')
    console.log('   3. Check that images are accessible via public URLs')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })

