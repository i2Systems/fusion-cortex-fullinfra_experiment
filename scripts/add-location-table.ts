/**
 * Add Location Table Script
 * 
 * Creates the Location table in the database if it doesn't exist.
 * This script can be run against production or local database.
 * 
 * Usage:
 *   npx tsx scripts/add-location-table.ts
 */

import { config } from 'dotenv'
import { prisma } from '../lib/prisma'

// Load environment variables
config()

async function addLocationTable() {
  console.log('🚀 Adding Location table to database...\n')

  try {
    // Check if table already exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Location'
      );
    `

    if (tableExists[0]?.exists) {
      console.log('✅ Location table already exists')
      return
    }

    console.log('📦 Creating Location table...')

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "Location" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "imageUrl" TEXT,
        "vectorDataUrl" TEXT,
        "zoomBounds" JSONB,
        "parentId" TEXT,
        "siteId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
      );
    `

    console.log('✅ Created Location table')

    // Create indexes
    console.log('📊 Creating indexes...')
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_siteId_idx" ON "Location"("siteId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_parentId_idx" ON "Location"("parentId");`
    console.log('✅ Created indexes')

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...')
    
    // Check if parentId constraint exists
    const parentConstraintExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_parentId_fkey'
      );
    `
    
    if (!parentConstraintExists[0]?.exists) {
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_parentId_fkey" 
        FOREIGN KEY ("parentId") 
        REFERENCES "Location"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `
      console.log('✅ Added parentId foreign key')
    } else {
      console.log('✅ parentId foreign key already exists')
    }

    // Check if siteId constraint exists
    const siteConstraintExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_siteId_fkey'
      );
    `
    
    if (!siteConstraintExists[0]?.exists) {
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_siteId_fkey" 
        FOREIGN KEY ("siteId") 
        REFERENCES "Site"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `
      console.log('✅ Added siteId foreign key')
    } else {
      console.log('✅ siteId foreign key already exists')
    }

    console.log('\n🎉 Location table setup complete!')
    console.log('\n📋 Table structure:')
    console.log('   - id (TEXT, PRIMARY KEY)')
    console.log('   - name (TEXT)')
    console.log('   - type (TEXT)')
    console.log('   - imageUrl (TEXT, nullable)')
    console.log('   - vectorDataUrl (TEXT, nullable)')
    console.log('   - zoomBounds (JSONB, nullable)')
    console.log('   - parentId (TEXT, nullable)')
    console.log('   - siteId (TEXT)')
    console.log('   - createdAt (TIMESTAMP)')
    console.log('   - updatedAt (TIMESTAMP)')
    console.log('\n   Indexes:')
    console.log('   - Location_siteId_idx')
    console.log('   - Location_parentId_idx')
    console.log('\n   Foreign Keys:')
    console.log('   - parentId → Location(id) [CASCADE]')
    console.log('   - siteId → Site(id) [CASCADE]')

  } catch (error: any) {
    console.error('❌ Error creating Location table:', error.message)
    if (error.message.includes('already exists')) {
      console.log('✅ Table already exists (this is okay)')
    } else {
      console.error('\nFull error:', error)
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addLocationTable()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

