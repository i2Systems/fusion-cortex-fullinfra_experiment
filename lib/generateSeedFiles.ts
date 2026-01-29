/**
 * Generate Seed Files Script
 * 
 * This script generates the seed files from exported JSON data.
 * 
 * Usage:
 * 1. Export your data using exportFusionData() in browser console
 * 2. Save the downloaded JSON file
 * 3. Run: npx tsx lib/generateSeedFiles.ts <path-to-exported-json>
 * 
 * Or use the browser console version (see EXPORT_DATA.md)
 */

import * as fs from 'fs'
import * as path from 'path'

function generateSeedFiles(jsonPath: string) {
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  const tsHeader = (title: string) =>
    `/**
 * Seed ${title}
 * Auto-generated from exported data. Last updated: ${new Date().toISOString()}
 */\n\n`

  const zonesContent =
    tsHeader('Zones Data') +
    `import { Zone } from './ZoneContext'\n\nexport const seedZones: Zone[] | null = ${JSON.stringify(jsonData.zones, null, 2)}\n`

  const devicesContent =
    tsHeader('Devices Data') +
    `import { Device } from './mockData'\n\nexport const seedDevices: Device[] | null = ${JSON.stringify(jsonData.devices, null, 2)}\n`

  const zonesPath = path.join(__dirname, 'seedZones.ts')
  const devicesPath = path.join(__dirname, 'seedDevices.ts')
  fs.writeFileSync(zonesPath, zonesContent)
  fs.writeFileSync(devicesPath, devicesContent)
  console.log('✅ Generated seedZones.ts')
  console.log('✅ Generated seedDevices.ts')

  if (jsonData.people != null && Array.isArray(jsonData.people)) {
    const peopleContent =
      tsHeader('People Data') + `export const seedPeople: unknown[] | null = ${JSON.stringify(jsonData.people, null, 2)}\n`
    const peoplePath = path.join(__dirname, 'seedPeople.ts')
    fs.writeFileSync(peoplePath, peopleContent)
    console.log('✅ Generated seedPeople.ts')
  }
  if (jsonData.groups != null && Array.isArray(jsonData.groups)) {
    const groupsContent =
      tsHeader('Groups Data') + `export const seedGroups: unknown[] | null = ${JSON.stringify(jsonData.groups, null, 2)}\n`
    const groupsPath = path.join(__dirname, 'seedGroups.ts')
    fs.writeFileSync(groupsPath, groupsContent)
    console.log('✅ Generated seedGroups.ts')
  }

  console.log(`\n📦 Zones: ${jsonData.zones?.length ?? 0}`)
  console.log(`📦 Devices: ${jsonData.devices?.length ?? 0}`)
  console.log(`📦 People: ${jsonData.people?.length ?? 0}`)
  console.log(`📦 Groups: ${jsonData.groups?.length ?? 0}`)
  console.log('\n💡 Next steps:')
  console.log('   git add lib/seedZones.ts lib/seedDevices.ts lib/seedPeople.ts lib/seedGroups.ts')
  console.log('   git commit -m "Update seed data (zones, devices, people, groups)"')
  console.log('   git push origin main')
}

// Run if called directly
if (require.main === module) {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Usage: npx tsx lib/generateSeedFiles.ts <path-to-exported-json>')
    process.exit(1)
  }
  generateSeedFiles(jsonPath)
}

export { generateSeedFiles }

