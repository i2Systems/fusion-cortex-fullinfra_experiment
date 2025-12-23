/**
 * Script to update existing devices from FIXTURE to FIXTURE_16FT_POWER_ENTRY
 * Run this BEFORE running prisma db push
 * 
 * Usage: npx tsx scripts/updateExistingDevices.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateExistingDevices() {
  try {
    console.log('Updating existing devices...')
    
    // First, we need to add the new enum values to the database
    // This requires raw SQL since Prisma doesn't support adding enum values directly
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        -- Add new enum values if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_16FT_POWER_ENTRY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_POWER_ENTRY';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_12FT_POWER_ENTRY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_POWER_ENTRY';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_8FT_POWER_ENTRY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_POWER_ENTRY';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_16FT_FOLLOWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_FOLLOWER';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_12FT_FOLLOWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_FOLLOWER';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FIXTURE_8FT_FOLLOWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_FOLLOWER';
        END IF;
      END $$;
    `)
    
    console.log('Added new enum values')
    
    // Now update all existing FIXTURE records
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "Device" 
      SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType" 
      WHERE type::text = 'FIXTURE'
    `)
    
    console.log(`Updated ${result} devices from FIXTURE to FIXTURE_16FT_POWER_ENTRY`)
    
    // Also update any components that might have FIXTURE type
    const componentResult = await prisma.$executeRawUnsafe(`
      UPDATE "Device" 
      SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType" 
      WHERE type::text = 'FIXTURE' AND "parentId" IS NOT NULL
    `)
    
    console.log(`Updated ${componentResult} components from FIXTURE to FIXTURE_16FT_POWER_ENTRY`)
    
    console.log('✅ Successfully updated existing devices!')
    console.log('Now you can run: npx prisma db push --accept-data-loss')
    
  } catch (error) {
    console.error('Error updating devices:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateExistingDevices()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

