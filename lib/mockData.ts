/**
 * Mock Device Data
 * 
 * Shared mock data for devices across all pages.
 * In production, this would come from tRPC/API.
 * 
 * AI Note: This file contains ~500 devices with realistic data
 * for testing and development.
 */

export type DeviceType = 'fixture' | 'motion' | 'light-sensor'
export type DeviceStatus = 'online' | 'offline' | 'missing'

export interface Component {
  id: string
  componentType: string // e.g., "LED Module", "Driver", "Lens", "Mounting Bracket"
  componentSerialNumber: string
  warrantyStatus?: string
  warrantyExpiry?: Date
  buildDate?: Date
  status?: DeviceStatus
  notes?: string // Instance-specific notes for this component within this specific device
}

export interface Device {
  id: string
  deviceId: string
  serialNumber: string
  type: DeviceType
  signal: number
  battery?: number
  status: DeviceStatus
  location: string
  zone?: string
  x?: number // Map position (0-1 normalized)
  y?: number // Map position (0-1 normalized)
  locked?: boolean // Whether device position is locked
  components?: Component[] // Child components (for fixtures)
  warrantyStatus?: string
  warrantyExpiry?: Date
}

// Generate 250 devices with realistic data and organized positioning
function generateDevices(): Device[] {
  const devices: Device[] = []
  
  // Define zones with their approximate map regions (normalized 0-1)
  const zoneRegions = {
    'Zone 1 - Electronics': { x: [0.1, 0.3], y: [0.1, 0.4] },
    'Zone 2 - Clothing': { x: [0.1, 0.5], y: [0.5, 0.9] },
    'Zone 3 - Retail': { x: [0.3, 0.6], y: [0.1, 0.5] },
    'Zone 7 - Grocery': { x: [0.6, 0.95], y: [0.1, 0.6] },
  }
  
  const zones = Object.keys(zoneRegions)
  
  // Define aisle patterns for each zone
  const aislePatterns: Record<string, { count: number; spacing: number; startX: number; startY: number; direction: 'horizontal' | 'vertical' }> = {
    'Zone 1 - Electronics': { count: 8, spacing: 0.025, startX: 0.12, startY: 0.15, direction: 'vertical' },
    'Zone 2 - Clothing': { count: 20, spacing: 0.02, startX: 0.12, startY: 0.52, direction: 'vertical' },
    'Zone 3 - Retail': { count: 7, spacing: 0.03, startX: 0.32, startY: 0.15, direction: 'vertical' },
    'Zone 7 - Grocery': { count: 10, spacing: 0.03, startX: 0.62, startY: 0.15, direction: 'vertical' },
  }

  let deviceCounter = 1
  let serialCounter = 2024
  let componentCounter = 1

  // Helper function to generate components for a fixture
  function generateComponentsForFixture(fixtureId: string, fixtureSerial: string): Component[] {
    const componentTypes = ['LED Module', 'Driver', 'Lens', 'Mounting Bracket']
    const components: Component[] = []
    
    // Sample notes that might apply to specific component instances
    const sampleNotes = [
      'Replaced during maintenance on 3/15/2024',
      'Minor wear observed, monitor for replacement',
      'Warranty claim submitted - awaiting response',
      'Inspected and verified during last service',
      undefined, // Some components may not have notes
      undefined,
    ]
    
    for (const componentType of componentTypes) {
      const buildDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      const warrantyExpiry = new Date(buildDate)
      warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + (Math.random() > 0.7 ? 3 : 5)) // 3 or 5 year warranty
      const warrantyStatus = warrantyExpiry > new Date() ? 'Active' : 'Expired'
      const status: DeviceStatus = Math.random() > 0.1 ? 'online' : 'offline'
      const notes = Math.random() > 0.6 ? sampleNotes[Math.floor(Math.random() * sampleNotes.length)] : undefined
      
      components.push({
        id: `component-${componentCounter++}`,
        componentType,
        componentSerialNumber: `${fixtureSerial}-${componentType.replace(/\s+/g, '').substring(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        warrantyStatus,
        warrantyExpiry,
        buildDate,
        status,
        notes,
      })
    }
    
    return components
  }

  // Generate fixtures (150 devices, ~60%)
  for (const zone of zones) {
    if (devices.length >= 150) break
    
    const pattern = aislePatterns[zone]
    const region = zoneRegions[zone as keyof typeof zoneRegions]
    
    for (let aisle = 0; aisle < pattern.count; aisle++) {
      if (devices.length >= 150) break
      
      // Position along aisle
      const aisleX = pattern.direction === 'vertical' 
        ? pattern.startX + (aisle * pattern.spacing)
        : pattern.startX
      const aisleY = pattern.direction === 'vertical'
        ? pattern.startY
        : pattern.startY + (aisle * pattern.spacing)
      
      // Generate 2-3 fixtures per aisle
      const fixturesPerAisle = Math.floor(Math.random() * 2) + 2
      for (let i = 0; i < fixturesPerAisle; i++) {
        if (devices.length >= 150) break
        
        const offsetX = pattern.direction === 'vertical' 
          ? (Math.random() - 0.5) * 0.015 // Small horizontal variation
          : (Math.random() - 0.5) * 0.02
        const offsetY = pattern.direction === 'vertical'
          ? (i / fixturesPerAisle) * (region.y[1] - region.y[0]) * 0.8 + (Math.random() - 0.5) * 0.02
          : (Math.random() - 0.5) * 0.015
        
        const x = Math.max(region.x[0], Math.min(region.x[1], aisleX + offsetX))
        const y = Math.max(region.y[0], Math.min(region.y[1], aisleY + offsetY))
        
        const location = `${zone.split(' - ')[1]} - Aisle ${aisle + 1}`
        const signal = Math.floor(Math.random() * 40) + 50 // 50-90%
        const status: DeviceStatus = Math.random() > 0.05 ? 'online' : 'offline'
        
        const fixtureSerial = `SN-2024-${String(serialCounter).padStart(4, '0')}-F${String(Math.floor(Math.random() * 9) + 1)}`
        const fixtureId = `device-${deviceCounter++}`
        const buildDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        const warrantyExpiry = new Date(buildDate)
        warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + 5) // 5 year warranty for fixtures
        const warrantyStatus = warrantyExpiry > new Date() ? 'Active' : 'Expired'
        
        devices.push({
          id: fixtureId,
          deviceId: `FLX-${String(serialCounter++).padStart(4, '0')}`,
          serialNumber: fixtureSerial,
          type: 'fixture',
          signal: status === 'offline' ? Math.floor(Math.random() * 30) : signal,
          battery: undefined,
          status,
          location,
          zone,
          x,
          y,
          components: generateComponentsForFixture(fixtureId, fixtureSerial),
          warrantyStatus,
          warrantyExpiry,
        })
      }
    }
  }

  // Generate motion sensors (62 devices, ~25%)
  for (const zone of zones) {
    if (devices.length >= 212) break
    
    const region = zoneRegions[zone as keyof typeof zoneRegions]
    const sensorsPerZone = 15
    
    for (let i = 0; i < sensorsPerZone; i++) {
      if (devices.length >= 212) break
      
      const x = region.x[0] + Math.random() * (region.x[1] - region.x[0])
      const y = region.y[0] + Math.random() * (region.y[1] - region.y[0])
      const location = `${zone.split(' - ')[1]} - Area ${i + 1}`
      const signal = Math.floor(Math.random() * 40) + 50 // 50-90%
      const battery = Math.floor(Math.random() * 40) + 60 // 60-100%
      const status: DeviceStatus = battery < 20 ? 'offline' : (Math.random() > 0.03 ? 'online' : 'missing')
      
      devices.push({
        id: `device-${deviceCounter++}`,
        deviceId: `MSN-${String(serialCounter++).padStart(4, '0')}`,
        serialNumber: `SN-2024-${String(serialCounter - 1).padStart(4, '0')}-M${String(Math.floor(Math.random() * 9) + 1)}`,
        type: 'motion',
        signal: status === 'offline' || status === 'missing' ? Math.floor(Math.random() * 20) : signal,
        battery,
        status,
        location,
        zone,
        x,
        y,
      })
    }
  }

  // Generate light sensors (38 devices, ~15%)
  for (const zone of zones) {
    if (devices.length >= 250) break
    
    const region = zoneRegions[zone as keyof typeof zoneRegions]
    const sensorsPerZone = 9
    
    for (let i = 0; i < sensorsPerZone; i++) {
      if (devices.length >= 250) break
      
      const x = region.x[0] + Math.random() * (region.x[1] - region.x[0])
      const y = region.y[0] + Math.random() * (region.y[1] - region.y[0])
      const location = `${zone.split(' - ')[1]} - Sensor ${i + 1}`
      const signal = Math.floor(Math.random() * 40) + 50 // 50-90%
      const battery = Math.floor(Math.random() * 30) + 70 // 70-100%
      const status: DeviceStatus = battery < 20 ? 'offline' : (Math.random() > 0.02 ? 'online' : 'missing')
      
      devices.push({
        id: `device-${deviceCounter++}`,
        deviceId: `LS-${String(serialCounter++).padStart(4, '0')}`,
        serialNumber: `SN-2024-${String(serialCounter - 1).padStart(4, '0')}-L${String(Math.floor(Math.random() * 9) + 1)}`,
        type: 'light-sensor',
        signal: status === 'offline' || status === 'missing' ? Math.floor(Math.random() * 20) : signal,
        battery,
        status,
        location,
        zone,
        x,
        y,
      })
    }
  }

  // Add a specific device with environmental ingress fault for story consistency
  // This device appears across dashboard, map, zones, and faults pages
  const faultDeviceSerial = 'SN-2024-3158-F3'
  const faultDeviceId = 'device-fault-grocery-001'
  const faultBuildDate = new Date(2023, 5, 15)
  const faultWarrantyExpiry = new Date(faultBuildDate)
  faultWarrantyExpiry.setFullYear(faultWarrantyExpiry.getFullYear() + 5)
  
  const faultDevice: Device = {
    id: faultDeviceId,
    deviceId: 'FLX-3158',
    serialNumber: faultDeviceSerial,
    type: 'fixture',
    signal: 12, // Low signal due to water damage
    status: 'missing', // Missing due to environmental ingress failure
    location: 'Grocery - Aisle 5',
    zone: 'Zone 7 - Grocery',
    x: 0.72, // Position in Zone 7 - Grocery area
    y: 0.35,
    components: generateComponentsForFixture(faultDeviceId, faultDeviceSerial),
    warrantyStatus: faultWarrantyExpiry > new Date() ? 'Active' : 'Expired',
    warrantyExpiry: faultWarrantyExpiry,
  }
  devices.push(faultDevice)

  return devices
}

export const mockDevices = generateDevices()

