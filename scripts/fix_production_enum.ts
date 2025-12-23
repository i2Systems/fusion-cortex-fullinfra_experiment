/**
 * Production Database Enum Fix
 * 
 * This script fixes the DeviceType enum in the production database.
 * It adds the new enum values and migrates existing FIXTURE records.
 * 
 * Run this on production: npx tsx scripts/fix_production_enum.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixProductionEnum() {
  console.log('🔧 Fixing DeviceType enum in production database...')
  
  try {
    // Step 1: Add new enum values (PostgreSQL allows adding values to enums)
    console.log('Step 1: Adding new enum values...')
    
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        -- Add new enum values if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_16FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_POWER_ENTRY';
          RAISE NOTICE 'Added FIXTURE_16FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_12FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_POWER_ENTRY';
          RAISE NOTICE 'Added FIXTURE_12FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_8FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_POWER_ENTRY';
          RAISE NOTICE 'Added FIXTURE_8FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_16FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_FOLLOWER';
          RAISE NOTICE 'Added FIXTURE_16FT_FOLLOWER';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_12FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_FOLLOWER';
          RAISE NOTICE 'Added FIXTURE_12FT_FOLLOWER';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_8FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_FOLLOWER';
          RAISE NOTICE 'Added FIXTURE_8FT_FOLLOWER';
        END IF;
      END $$;
    `)
    
    console.log('✅ New enum values added')
    
    // Step 2: Check if there are any devices with old FIXTURE type
    const oldDevices = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "Device" 
      WHERE type::text = 'FIXTURE'
    `
    
    const count = Number(oldDevices[0]?.count || 0)
    console.log(`Found ${count} devices with old FIXTURE type`)
    
    if (count > 0) {
      // Step 3: Update all FIXTURE records to FIXTURE_16FT_POWER_ENTRY
      console.log('Step 3: Migrating FIXTURE records to FIXTURE_16FT_POWER_ENTRY...')
      
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "Device" 
        SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType" 
        WHERE type::text = 'FIXTURE'
      `)
      
      console.log(`✅ Migrated ${result} devices from FIXTURE to FIXTURE_16FT_POWER_ENTRY`)
    }
    
    // Step 4: Verify the enum has all required values
    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
      ORDER BY enumlabel
    `
    
    console.log('\n📋 Current DeviceType enum values:')
    enumValues.forEach(v => console.log(`  - ${v.enumlabel}`))
    
    console.log('\n✅ Database enum fix complete!')
    console.log('The production database is now ready for the new schema.')
    
  } catch (error: any) {
    console.error('❌ Error fixing enum:', error)
    console.error('Error details:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  fixProductionEnum()
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { fixProductionEnum }

