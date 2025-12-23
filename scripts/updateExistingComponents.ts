/**
 * Script to update existing fixture components to use the new component types
 * 
 * This script:
 * 1. Finds all fixture devices
 * 2. Deletes their old components
 * 3. Generates new components with correct types and quantities
 * 
 * Usage: npx tsx scripts/updateExistingComponents.ts
 */

import { PrismaClient, DeviceType } from '@prisma/client'

const prisma = new PrismaClient()

// Real component types with quantities (matching deviceUtils.ts)
const componentSpecs: Array<{ type: string; quantity: number; code: string }> = [
  { type: 'LCM', quantity: 1, code: 'LCM' },
  { type: 'Driver Board', quantity: 1, code: 'DRB' },
  { type: 'Power Supply', quantity: 2, code: 'PWR' },
  { type: 'LED Board', quantity: 4, code: 'LED' },
  { type: 'Metal Bracket', quantity: 2, code: 'MTB' },
  { type: 'Cable Harness', quantity: 2, code: 'CAB' },
  { type: 'Lower LED Housing with Optic', quantity: 4, code: 'HOU' },
  { type: 'Sensor', quantity: 2, code: 'SEN' },
]

async function updateExistingComponents() {
  try {
    console.log('Finding all fixture devices...')
    
    // Find all fixture devices (any of the 6 fixture types)
    const fixtureTypes = [
      DeviceType.FIXTURE_16FT_POWER_ENTRY,
      DeviceType.FIXTURE_12FT_POWER_ENTRY,
      DeviceType.FIXTURE_8FT_POWER_ENTRY,
      DeviceType.FIXTURE_16FT_FOLLOWER,
      DeviceType.FIXTURE_12FT_FOLLOWER,
      DeviceType.FIXTURE_8FT_FOLLOWER,
    ]
    
    const fixtures = await prisma.device.findMany({
      where: {
        type: { in: fixtureTypes },
        parentId: null, // Only top-level devices, not components
      },
      include: {
        components: true,
      },
    })
    
    console.log(`Found ${fixtures.length} fixture devices to update`)
    
    let updatedCount = 0
    
    for (const fixture of fixtures) {
      // Delete old components
      if (fixture.components.length > 0) {
        await prisma.device.deleteMany({
          where: {
            parentId: fixture.id,
          },
        })
        console.log(`Deleted ${fixture.components.length} old components for fixture ${fixture.deviceId}`)
      }
      
      // Generate new components
      const now = new Date()
      const buildDate = fixture.buildDate || new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      const warrantyExpiry = fixture.warrantyExpiry || new Date(buildDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000)
      
      const newComponents = []
      
      for (const spec of componentSpecs) {
        for (let instance = 1; instance <= spec.quantity; instance++) {
          const componentType = spec.quantity > 1 
            ? `${spec.type} ${instance}` 
            : spec.type
          
          const instanceCode = spec.quantity > 1 ? String(instance).padStart(2, '0') : '01'
          const componentSerial = `${fixture.serialNumber}-${spec.code}${instanceCode}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
          
          // Use parent's warranty expiry or generate one
          const componentWarrantyExpiry = new Date(warrantyExpiry)
          const warrantyStatus = componentWarrantyExpiry > now ? 'Active' : 'Expired'
          
          newComponents.push({
            siteId: fixture.siteId,
            deviceId: `${fixture.deviceId}-${spec.code.toLowerCase()}-${instanceCode}`,
            serialNumber: componentSerial,
            type: DeviceType.FIXTURE_16FT_POWER_ENTRY, // Components use fixture type
            status: fixture.status, // Inherit parent status
            componentType: componentType,
            componentSerialNumber: componentSerial,
            buildDate: buildDate,
            warrantyStatus: warrantyStatus,
            warrantyExpiry: componentWarrantyExpiry,
            parentId: fixture.id,
          })
        }
      }
      
      // Create new components
      if (newComponents.length > 0) {
        await prisma.device.createMany({
          data: newComponents,
        })
        console.log(`Created ${newComponents.length} new components for fixture ${fixture.deviceId}`)
        updatedCount++
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} fixtures with new component types!`)
    console.log(`Total components created: ${updatedCount * 18}`)
    
  } catch (error) {
    console.error('Error updating components:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateExistingComponents()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

