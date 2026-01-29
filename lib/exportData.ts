/**
 * Data Export Utility
 *
 * Use this in the browser console to export your current zones, devices,
 * people, and groups for committing to the repository.
 *
 * People and groups are read from the app stores (set by StateHydration).
 * Zones and devices are read from localStorage.
 *
 * Usage:
 * 1. Open the app with a site selected so people/groups are loaded
 * 2. Open browser console and run: exportFusionData()
 * 3. Save the downloaded files to lib/
 */

declare global {
  interface Window {
    __FUSION_EXPORT_PEOPLE__?: unknown
    __FUSION_EXPORT_GROUPS__?: unknown
  }
}

export function exportFusionData() {
  if (typeof window === 'undefined') {
    console.error('This function must be run in the browser')
    return
  }

  const zones = localStorage.getItem('fusion_zones')
  const devices = localStorage.getItem('fusion_devices')
  const bacnetMappings = localStorage.getItem('fusion_bacnet_mappings')
  const people = Array.isArray(window.__FUSION_EXPORT_PEOPLE__) ? window.__FUSION_EXPORT_PEOPLE__ : null
  const groups = Array.isArray(window.__FUSION_EXPORT_GROUPS__) ? window.__FUSION_EXPORT_GROUPS__ : null

  const exportData = {
    zones: zones ? JSON.parse(zones) : null,
    devices: devices ? JSON.parse(devices) : null,
    bacnetMappings: bacnetMappings ? JSON.parse(bacnetMappings) : null,
    people,
    groups,
    exportedAt: new Date().toISOString(),
  }

  const tsHeader = (title: string) =>
    `/**
 * Seed ${title}
 * Auto-generated from exported data. Last updated: ${new Date().toISOString()}
 */\n\n`

  const zonesCode =
    tsHeader('Zones Data') +
    `import { Zone } from './ZoneContext'\n\nexport const seedZones: Zone[] | null = ${JSON.stringify(exportData.zones, null, 2)}\n`

  const devicesCode =
    tsHeader('Devices Data') +
    `import { Device } from './mockData'\n\nexport const seedDevices: Device[] | null = ${JSON.stringify(exportData.devices, null, 2)}\n`

  const peopleCode =
    tsHeader('People Data') +
    `export const seedPeople: unknown[] | null = ${JSON.stringify(exportData.people, null, 2)}\n`

  const groupsCode =
    tsHeader('Groups Data') +
    `export const seedGroups: unknown[] | null = ${JSON.stringify(exportData.groups, null, 2)}\n`

  console.log('%c=== COPY THIS TO lib/seedZones.ts ===', 'color: #4c7dff; font-weight: bold; font-size: 14px;')
  console.log(zonesCode)
  console.log('\n%c=== COPY THIS TO lib/seedDevices.ts ===', 'color: #4c7dff; font-weight: bold; font-size: 14px;')
  console.log(devicesCode)
  if (exportData.people != null) {
    console.log('\n%c=== COPY THIS TO lib/seedPeople.ts ===', 'color: #4c7dff; font-weight: bold; font-size: 14px;')
    console.log(peopleCode)
  }
  if (exportData.groups != null) {
    console.log('\n%c=== COPY THIS TO lib/seedGroups.ts ===', 'color: #4c7dff; font-weight: bold; font-size: 14px;')
    console.log(groupsCode)
  }

  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const jsonUrl = URL.createObjectURL(jsonBlob)
  const jsonLink = document.createElement('a')
  jsonLink.href = jsonUrl
  jsonLink.download = `fusion-data-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(jsonLink)
  jsonLink.click()
  document.body.removeChild(jsonLink)
  URL.revokeObjectURL(jsonUrl)

  const downloadTs = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  downloadTs(zonesCode, 'seedZones.ts')
  downloadTs(devicesCode, 'seedDevices.ts')
  if (exportData.people != null) downloadTs(peopleCode, 'seedPeople.ts')
  if (exportData.groups != null) downloadTs(groupsCode, 'seedGroups.ts')

  console.log('\n%c✅ Files downloaded! Next steps:', 'color: #22c55e; font-weight: bold;')
  console.log('1. Move seed*.ts files to lib/')
  console.log('2. git add lib/seedZones.ts lib/seedDevices.ts lib/seedPeople.ts lib/seedGroups.ts')
  console.log('3. git commit -m "Update seed data (zones, devices, people, groups)"')
  console.log('4. git push origin main')

  return exportData
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).exportFusionData = exportFusionData
}

