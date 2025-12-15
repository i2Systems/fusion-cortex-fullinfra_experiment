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
  orientation?: number // Rotation angle in degrees (0 = horizontal, 90 = vertical)
  locked?: boolean // Whether device position is locked
  components?: Component[] // Child components (for fixtures)
  warrantyStatus?: string
  warrantyExpiry?: Date
}

// Generate 120 devices with realistic data and organized positioning
function generateDevices(): Device[] {
  const devices: Device[] = []
  const MAX_DEVICES = 120
  
  // Define comprehensive room structure based on Walmart Supercenter floor plan
  // Rooms positioned to match the zone layout from the image
  // Orange Zone: Apparel & Clothing
  // Green Zone: Home & Garden  
  // Blue Zone: Electronics & Sporting Goods
  // Purple Zone: Toys & Electronics
  // Yellow Zone: Grocery & Food
  const rooms = [
    // Orange Zone - Apparel sections (left side, mid-section)
    { x: [0.1, 0.28], y: [0.2, 0.45], name: 'Apparel Top', zone: 'Apparel & Clothing', doorways: [{ x: 0.19, y: 0.325 }, { x: 0.1, y: 0.325 }] },
    { x: [0.1, 0.28], y: [0.45, 0.65], name: 'Apparel Center', zone: 'Apparel & Clothing', doorways: [{ x: 0.19, y: 0.55 }, { x: 0.1, y: 0.55 }] },
    { x: [0.15, 0.28], y: [0.65, 0.9], name: 'Apparel Bottom', zone: 'Apparel & Clothing', doorways: [{ x: 0.225, y: 0.775 }, { x: 0.15, y: 0.775 }] },
    { x: [0.05, 0.15], y: [0.65, 0.85], name: 'Auto Care Center', zone: 'Apparel & Clothing', doorways: [{ x: 0.1, y: 0.75 }, { x: 0.15, y: 0.75 }] },
    
    // Green Zone - Home (top center, small section)
    { x: [0.25, 0.42], y: [0.05, 0.2], name: 'Home Top', zone: 'Home & Garden', doorways: [{ x: 0.33, y: 0.125 }] },
    { x: [0.28, 0.42], y: [0.2, 0.35], name: 'Home Center', zone: 'Home & Garden', doorways: [{ x: 0.35, y: 0.275 }] },
    
    // Blue Zone - Electronics & Sporting Goods (top center-right)
    { x: [0.42, 0.58], y: [0.05, 0.2], name: 'Electronics Top', zone: 'Electronics & Sporting Goods', doorways: [{ x: 0.5, y: 0.125 }] },
    { x: [0.42, 0.58], y: [0.2, 0.35], name: 'Electronics Center', zone: 'Electronics & Sporting Goods', doorways: [{ x: 0.5, y: 0.275 }, { x: 0.42, y: 0.275 }] },
    { x: [0.58, 0.65], y: [0.2, 0.35], name: 'Sporting Goods', zone: 'Electronics & Sporting Goods', doorways: [{ x: 0.615, y: 0.275 }] },
    
    // Purple Zone - Toys & Electronics (center, right of orange)
    { x: [0.28, 0.42], y: [0.35, 0.5], name: 'Toys Top', zone: 'Toys & Electronics', doorways: [{ x: 0.35, y: 0.425 }] },
    { x: [0.45, 0.6], y: [0.35, 0.5], name: 'Toys Center', zone: 'Toys & Electronics', doorways: [{ x: 0.525, y: 0.425 }] },
    { x: [0.3, 0.45], y: [0.65, 0.85], name: 'Electronics Bottom', zone: 'Toys & Electronics', doorways: [{ x: 0.375, y: 0.75 }] },
    { x: [0.45, 0.6], y: [0.65, 0.85], name: 'Toys Bottom', zone: 'Toys & Electronics', doorways: [{ x: 0.525, y: 0.75 }] },
    { x: [0.32, 0.45], y: [0.02, 0.12], name: 'Pickup & Delivery', zone: 'Toys & Electronics', doorways: [{ x: 0.38, y: 0.07 }, { x: 0.32, y: 0.07 }] },
    
    // Yellow Zone - Grocery & Food (right side)
    { x: [0.6, 0.72], y: [0.05, 0.2], name: 'Produce', zone: 'Grocery & Food', doorways: [{ x: 0.66, y: 0.125 }, { x: 0.72, y: 0.125 }] },
    { x: [0.72, 0.88], y: [0.05, 0.2], name: 'Meat & Seafood', zone: 'Grocery & Food', doorways: [{ x: 0.8, y: 0.125 }, { x: 0.72, y: 0.125 }] },
    { x: [0.6, 0.75], y: [0.2, 0.35], name: 'Deli', zone: 'Grocery & Food', doorways: [{ x: 0.675, y: 0.275 }, { x: 0.75, y: 0.275 }] },
    { x: [0.75, 0.88], y: [0.2, 0.35], name: 'Bakery', zone: 'Grocery & Food', doorways: [{ x: 0.815, y: 0.275 }, { x: 0.75, y: 0.275 }] },
    { x: [0.6, 0.88], y: [0.35, 0.55], name: 'Grocery Aisles', zone: 'Grocery & Food', doorways: [{ x: 0.74, y: 0.45 }, { x: 0.6, y: 0.45 }] },
    { x: [0.88, 0.98], y: [0.35, 0.55], name: 'Main Lobby', zone: 'Grocery & Food', doorways: [{ x: 0.93, y: 0.45 }, { x: 0.88, y: 0.45 }, { x: 0.93, y: 0.35 }, { x: 0.93, y: 0.55 }] },
    { x: [0.88, 0.98], y: [0.55, 0.7], name: 'Stockroom Right', zone: 'Grocery & Food', doorways: [{ x: 0.93, y: 0.625 }] },
  ]
  
  // Collect all doorways for motion sensor placement
  const allDoorways: Array<{ x: number; y: number; room: string }> = []
  rooms.forEach(room => {
    if (room.doorways) {
      room.doorways.forEach(doorway => {
        allDoorways.push({ ...doorway, room: room.name })
      })
    }
  })
  
  // Zone regions for backward compatibility (matching the new zone layout)
  const zoneRegions = {
    'Apparel & Clothing': { x: [0.05, 0.28], y: [0.2, 0.9] },
    'Home & Garden': { x: [0.25, 0.42], y: [0.05, 0.35] },
    'Electronics & Sporting Goods': { x: [0.42, 0.65], y: [0.05, 0.35] },
    'Toys & Electronics': { x: [0.28, 0.6], y: [0.35, 0.85] },
    'Grocery & Food': { x: [0.6, 0.98], y: [0.05, 0.7] },
  }
  
  const zones = Object.keys(zoneRegions)

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

  // Generate fixtures with grid placement in every room
  // Each room gets at least 4 lights in a grid pattern
  for (const room of rooms) {
    const roomWidth = room.x[1] - room.x[0]
    const roomHeight = room.y[1] - room.y[0]
    
    // Calculate grid dimensions - optimized for 120 total devices
    // Distribute devices more evenly based on room size and importance
    const minLights = 2
    const roomArea = roomWidth * roomHeight
    
    // Adjust density based on room type - larger/more important rooms get more lights
    let densityMultiplier = 120
    if (room.name.includes('Grocery Aisles') || room.name.includes('Apparel')) {
      densityMultiplier = 180 // Higher density for large retail areas
    } else if (room.name.includes('Main Lobby') || room.name.includes('Electronics')) {
      densityMultiplier = 150 // Medium-high for important areas
    } else if (room.name.includes('Stockroom') || room.name.includes('Loading')) {
      densityMultiplier = 80 // Lower for storage areas
    }
    
    const targetLights = Math.max(minLights, Math.ceil(roomArea * densityMultiplier))
    
    // Calculate grid dimensions maintaining aspect ratio
    const aspectRatio = roomWidth / roomHeight
    let cols = Math.max(2, Math.ceil(Math.sqrt(targetLights * aspectRatio)))
    let rows = Math.max(2, Math.ceil(targetLights / cols))
    
    // Ensure we have at least minLights
    while (cols * rows < minLights) {
      if (cols <= rows) cols++
      else rows++
    }
    
    // Calculate spacing for even distribution with padding
    const padding = 0.02 // Slightly more padding for better visual spacing
    const usableWidth = roomWidth - (padding * 2)
    const usableHeight = roomHeight - (padding * 2)
    
    // Calculate spacing between grid points
    const spacingX = cols > 1 ? usableWidth / (cols - 1) : 0
    const spacingY = rows > 1 ? usableHeight / (rows - 1) : 0
    
    // Determine orientation based on room shape
    const isWide = roomWidth > roomHeight
    const baseOrientation = isWide ? 0 : 90 // Horizontal for wide rooms, vertical for tall rooms
    
    // Place lights in grid (stop if we've reached max devices)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (devices.length >= MAX_DEVICES - 30) break // Reserve space for sensors
        
        // Calculate position with padding from edges
        const x = room.x[0] + padding + (spacingX * col)
        const y = room.y[0] + padding + (spacingY * row)
        
        // Ensure within room bounds
        const finalX = Math.max(room.x[0] + 0.005, Math.min(room.x[1] - 0.005, x))
        const finalY = Math.max(room.y[0] + 0.005, Math.min(room.y[1] - 0.005, y))
        
        // Slight orientation variation for visual interest (but mostly aligned)
        const orientation = baseOrientation + (Math.random() - 0.5) * 8 // ±4 degrees variation
        
        const location = room.name
        const signal = Math.floor(Math.random() * 40) + 50
        const status: DeviceStatus = Math.random() > 0.05 ? 'online' : 'offline'
        
        const fixtureSerial = `SN-2024-${String(serialCounter).padStart(4, '0')}-F${String(Math.floor(Math.random() * 9) + 1)}`
        const fixtureId = `device-${deviceCounter++}`
        const buildDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        const warrantyExpiry = new Date(buildDate)
        warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + 5)
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
          zone: room.zone,
          x: finalX,
          y: finalY,
          orientation,
          components: generateComponentsForFixture(fixtureId, fixtureSerial),
          warrantyStatus,
          warrantyExpiry,
        })
      }
      if (devices.length >= MAX_DEVICES - 30) break
    }
    if (devices.length >= MAX_DEVICES - 30) break
  }

  // Generate motion sensors - placed near key doorways (reduced count)
  // Select only important doorways to keep device count at 120
  const importantDoorways = allDoorways.filter((doorway, idx) => {
    // Keep every 2nd doorway to reduce count
    return idx % 2 === 0 || Math.random() > 0.5
  }).slice(0, 15) // Limit to 15 motion sensors max
  
  for (const doorway of importantDoorways) {
    if (devices.length >= MAX_DEVICES - 10) break // Reserve space for light sensors and fault device
    
    // Position very close to doorway - motion sensors should be right at entrances
    // Use smaller offset to keep them close to the doorway
    const offsetX = (Math.random() - 0.5) * 0.012 // Much smaller offset - 1.2% max
    const offsetY = (Math.random() - 0.5) * 0.012
    const x = Math.max(0, Math.min(1, doorway.x + offsetX))
    const y = Math.max(0, Math.min(1, doorway.y + offsetY))
    const location = `${doorway.room} - Doorway`
    const signal = Math.floor(Math.random() * 40) + 50
    const battery = Math.floor(Math.random() * 40) + 60
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
      zone: rooms.find(r => r.name === doorway.room)?.zone || 'Zone 1 - Electronics',
      x,
      y,
    })
  }

  // Generate light sensors - placed along exterior walls and in key rooms (reduced count)
  // Exterior walls: top (y ~ 0.02-0.15) and right (x ~ 0.88-0.98)
  const exteriorWallPositions: Array<{ x: number; y: number }> = []
  
  // Top wall (y = 0.02-0.15) - reduced spacing
  for (let x = 0.1; x < 0.9; x += 0.15) {
    exteriorWallPositions.push({ x, y: 0.05 + Math.random() * 0.1 })
  }
  
  // Right wall (x = 0.88-0.98) - reduced spacing
  for (let y = 0.15; y < 0.65; y += 0.15) {
    exteriorWallPositions.push({ x: 0.88 + Math.random() * 0.1, y })
  }
  
  // Place sensors along exterior walls (limit to 8 total)
  for (const pos of exteriorWallPositions.slice(0, 8)) {
    if (devices.length >= MAX_DEVICES - 2) break // Reserve space for fault device
    
    const location = 'Exterior Wall'
    const signal = Math.floor(Math.random() * 40) + 50
    const battery = Math.floor(Math.random() * 30) + 70
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
      zone: 'Zone 7 - Grocery',
      x: pos.x,
      y: pos.y,
    })
  }
  
  // Place a few sensors in key large rooms (Main Lobby, Grocery Aisles) - reduced count
  const keyRooms = rooms.filter(r => r.name === 'Main Lobby' || r.name === 'Grocery Aisles')
  for (const room of keyRooms.slice(0, 2)) {
    if (devices.length >= MAX_DEVICES - 2) break
    
    const centerX = (room.x[0] + room.x[1]) / 2
    const centerY = (room.y[0] + room.y[1]) / 2
    const location = room.name
    const signal = Math.floor(Math.random() * 40) + 50
    const battery = Math.floor(Math.random() * 30) + 70
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
      zone: room.zone,
      x: centerX,
      y: centerY,
    })
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

