/**
 * Migration Script: Update DeviceType enum values
 * 
 * Migrates existing devices from old 'FIXTURE' enum value to new specific types.
 * This script should be run after updating the Prisma schema to the new enum values.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateDeviceTypes() {
  console.log('Starting device type migration...')
  
  try {
    // First, check if there are any devices with the old FIXTURE type
    // Since we can't query for a value that doesn't exist in the enum anymore,
    // we need to use raw SQL
    
    const oldDevices = await prisma.$queryRaw<Array<{ id: string; type: string }>>`
      SELECT id, type::text as type 
      FROM "Device" 
      WHERE type::text = 'FIXTURE'
    `
    
    console.log(`Found ${oldDevices.length} devices with old FIXTURE type`)
    
    if (oldDevices.length === 0) {
      console.log('No devices to migrate. Migration complete.')
      return
    }
    
    // Update all FIXTURE devices to FIXTURE_16FT_POWER_ENTRY (default)
    // You can customize this logic based on your needs
    const result = await prisma.$executeRaw`
      UPDATE "Device"
      SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType"
      WHERE type::text = 'FIXTURE'
    `
    
    console.log(`✅ Migrated ${result} devices from FIXTURE to FIXTURE_16FT_POWER_ENTRY`)
    console.log('Migration complete!')
    
  } catch (error: any) {
    console.error('Migration error:', error)
    
    // If the enum doesn't exist yet, we need to update it first
    if (error.message?.includes('enum') || error.code === '42704') {
      console.log('\n⚠️  The DeviceType enum may need to be updated first.')
      console.log('Please run: npx prisma db push')
      console.log('Then run this migration script again.')
    }
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateDeviceTypes()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })

