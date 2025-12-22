/**
 * Database Seeding Script
 * 
 * Creates realistic, cohesive demo data for each site:
 * - Sites (stores)
 * - Devices with components
 * - Zones that group devices logically
 * - BACnet mappings for zones
 * - Rules/schedules for automation
 * - Faults related to devices
 * 
 * Usage:
 *   npx tsx scripts/seedDatabase.ts
 * 
 * Or import and call seedDatabase() from another script
 */

import { PrismaClient, DeviceType, DeviceStatus, BACnetStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Store configurations with unique characteristics
const STORE_CONFIGS = [
  {
    id: 'store-1234',
    name: 'Store #1234 - Main St',
    storeNumber: '1234',
    address: '1250 Main Street, Springfield, IL 62701',
    theme: 'grocery-focused', // Large grocery section, smaller general merchandise
    characteristics: {
      grocerySize: 'large',
      hasBakery: true,
      hasDeli: true,
      hasPharmacy: false,
    },
  },
  {
    id: 'store-2156',
    name: 'Store #2156 - Oak Avenue',
    storeNumber: '2156',
    address: '3420 Oak Avenue, Riverside, CA 92501',
    theme: 'outdoor-focused', // Garden center emphasis, outdoor lighting
    characteristics: {
      grocerySize: 'medium',
      hasBakery: true,
      hasDeli: false,
      hasPharmacy: true,
      hasGardenCenter: true,
    },
  },
  {
    id: 'store-3089',
    name: 'Store #3089 - Commerce Blvd',
    storeNumber: '3089',
    address: '789 Commerce Boulevard, Austin, TX 78701',
    theme: 'high-tech', // Electronics section, modern fixtures
    characteristics: {
      grocerySize: 'medium',
      hasBakery: false,
      hasDeli: true,
      hasPharmacy: true,
      hasElectronics: true,
    },
  },
  {
    id: 'store-4421',
    name: 'Store #4421 - River Road',
    storeNumber: '4421',
    address: '456 River Road, Portland, OR 97201',
    theme: 'eco-friendly', // Energy-efficient zones, daylight harvesting
    characteristics: {
      grocerySize: 'large',
      hasBakery: true,
      hasDeli: true,
      hasPharmacy: false,
      hasDaylightHarvesting: true,
    },
  },
  {
    id: 'store-5567',
    name: 'Store #5567 - Park Plaza',
    storeNumber: '5567',
    address: '2100 Park Plaza Drive, Denver, CO 80202',
    theme: 'mountain-store', // High-altitude considerations, robust fixtures
    characteristics: {
      grocerySize: 'large',
      hasBakery: true,
      hasDeli: true,
      hasPharmacy: true,
      hasOutdoorStorage: true,
    },
  },
]

// Zone templates that make sense for retail stores
const ZONE_TEMPLATES = {
  grocery: {
    name: 'Grocery Aisles',
    color: '#4c7dff',
    description: 'Main grocery shopping area',
    polygon: [
      { x: 0.6, y: 0.35 },
      { x: 0.88, y: 0.35 },
      { x: 0.88, y: 0.55 },
      { x: 0.6, y: 0.55 },
    ],
  },
  produce: {
    name: 'Produce Section',
    color: '#10b981',
    description: 'Fresh fruits and vegetables',
    polygon: [
      { x: 0.6, y: 0.05 },
      { x: 0.72, y: 0.05 },
      { x: 0.72, y: 0.2 },
      { x: 0.6, y: 0.2 },
    ],
  },
  meat: {
    name: 'Meat & Seafood',
    color: '#ef4444',
    description: 'Fresh meat and seafood counter',
    polygon: [
      { x: 0.72, y: 0.05 },
      { x: 0.88, y: 0.05 },
      { x: 0.88, y: 0.2 },
      { x: 0.72, y: 0.2 },
    ],
  },
  deli: {
    name: 'Deli Counter',
    color: '#f59e0b',
    description: 'Deli and prepared foods',
    polygon: [
      { x: 0.6, y: 0.2 },
      { x: 0.75, y: 0.2 },
      { x: 0.75, y: 0.35 },
      { x: 0.6, y: 0.35 },
    ],
  },
  bakery: {
    name: 'Bakery',
    color: '#f97316',
    description: 'Fresh baked goods',
    polygon: [
      { x: 0.75, y: 0.2 },
      { x: 0.88, y: 0.2 },
      { x: 0.88, y: 0.35 },
      { x: 0.75, y: 0.35 },
    ],
  },
  apparel: {
    name: 'Apparel & Clothing',
    color: '#ec4899',
    description: 'Clothing and accessories',
    polygon: [
      { x: 0.1, y: 0.2 },
      { x: 0.28, y: 0.2 },
      { x: 0.28, y: 0.65 },
      { x: 0.1, y: 0.65 },
    ],
  },
  home: {
    name: 'Home & Garden',
    color: '#22c55e',
    description: 'Home goods and garden supplies',
    polygon: [
      { x: 0.25, y: 0.05 },
      { x: 0.42, y: 0.05 },
      { x: 0.42, y: 0.35 },
      { x: 0.25, y: 0.35 },
    ],
  },
  electronics: {
    name: 'Electronics & Sporting Goods',
    color: '#3b82f6',
    description: 'Electronics, TVs, and sporting equipment',
    polygon: [
      { x: 0.42, y: 0.05 },
      { x: 0.65, y: 0.05 },
      { x: 0.65, y: 0.35 },
      { x: 0.42, y: 0.35 },
    ],
  },
  toys: {
    name: 'Toys & Electronics',
    color: '#8b5cf6',
    description: 'Toys, games, and small electronics',
    polygon: [
      { x: 0.28, y: 0.35 },
      { x: 0.6, y: 0.35 },
      { x: 0.6, y: 0.85 },
      { x: 0.28, y: 0.85 },
    ],
  },
  lobby: {
    name: 'Main Lobby',
    color: '#6366f1',
    description: 'Store entrance and checkout area',
    polygon: [
      { x: 0.88, y: 0.35 },
      { x: 0.98, y: 0.35 },
      { x: 0.98, y: 0.55 },
      { x: 0.88, y: 0.55 },
    ],
  },
}

// Generate device components for a fixture
function generateComponents(deviceId: string, serialNumber: string, buildDate: Date) {
  const components = [
    {
      deviceId: `${deviceId}-led-module`,
      serialNumber: `${serialNumber}-LED-01`,
      type: DeviceType.FIXTURE,
      status: DeviceStatus.ONLINE,
      componentType: 'LED Module',
      componentSerialNumber: `${serialNumber}-LED-01`,
      buildDate,
      warrantyStatus: 'Active',
      warrantyExpiry: new Date(buildDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
    },
    {
      deviceId: `${deviceId}-driver`,
      serialNumber: `${serialNumber}-DRV-01`,
      type: DeviceType.FIXTURE,
      status: DeviceStatus.ONLINE,
      componentType: 'Driver',
      componentSerialNumber: `${serialNumber}-DRV-01`,
      buildDate,
      warrantyStatus: 'Active',
      warrantyExpiry: new Date(buildDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000),
    },
    {
      deviceId: `${deviceId}-lens`,
      serialNumber: `${serialNumber}-LNS-01`,
      type: DeviceType.FIXTURE,
      status: DeviceStatus.ONLINE,
      componentType: 'Lens',
      componentSerialNumber: `${serialNumber}-LNS-01`,
      buildDate,
      warrantyStatus: 'Active',
      warrantyExpiry: new Date(buildDate.getTime() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
    },
  ]
  return components
}

// Generate devices for a zone
function generateDevicesForZone(
  siteId: string,
  zoneName: string,
  zonePolygon: Array<{ x: number; y: number }>,
  deviceCount: number,
  deviceType: DeviceType,
  baseDeviceId: number
): Array<{
  device: any
  components: any[]
}> {
  const devices: Array<{ device: any; components: any[] }> = []
  
  // Calculate zone bounds
  const minX = Math.min(...zonePolygon.map(p => p.x))
  const maxX = Math.max(...zonePolygon.map(p => p.x))
  const minY = Math.min(...zonePolygon.map(p => p.y))
  const maxY = Math.max(...zonePolygon.map(p => p.y))
  
  for (let i = 0; i < deviceCount; i++) {
    const deviceNum = baseDeviceId + i
    const deviceId = `FLX-${deviceNum}`
    const serialNumber = `SN-${siteId}-${deviceNum}`
    const buildDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    
    // Random position within zone
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    
    // Status distribution: 85% online, 10% offline, 5% missing
    const statusRand = Math.random()
    let status = DeviceStatus.ONLINE
    if (statusRand > 0.95) status = DeviceStatus.MISSING
    else if (statusRand > 0.85) status = DeviceStatus.OFFLINE
    
    const device = {
      deviceId,
      serialNumber,
      type: deviceType,
      status,
      x,
      y,
      signal: deviceType === DeviceType.FIXTURE ? undefined : Math.floor(Math.random() * 40) + 50,
      battery: deviceType !== DeviceType.FIXTURE ? Math.floor(Math.random() * 40) + 60 : undefined,
      buildDate,
      cct: deviceType === DeviceType.FIXTURE ? 4000 : undefined,
      warrantyStatus: 'Active',
      warrantyExpiry: new Date(buildDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000),
      siteId,
    }
    
    const components = deviceType === DeviceType.FIXTURE 
      ? generateComponents(deviceId, serialNumber, buildDate)
      : []
    
    devices.push({ device, components })
  }
  
  return devices
}

// Generate zones based on store characteristics
function generateZonesForStore(storeConfig: typeof STORE_CONFIGS[0]): Array<{
  zone: any
  devices: Array<{ device: any; components: any[] }>
}> {
  const zones: Array<{ zone: any; devices: Array<{ device: any; components: any[] }> }> = []
  let deviceCounter = 1
  
  // Always include grocery
  const groceryZone = { ...ZONE_TEMPLATES.grocery }
  const groceryDevices = generateDevicesForZone(
    storeConfig.id,
    groceryZone.name,
    groceryZone.polygon,
    storeConfig.characteristics.grocerySize === 'large' ? 45 : 30,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += groceryDevices.length
  zones.push({ zone: groceryZone, devices: groceryDevices })
  
  // Produce section
  const produceZone = { ...ZONE_TEMPLATES.produce }
  const produceDevices = generateDevicesForZone(
    storeConfig.id,
    produceZone.name,
    produceZone.polygon,
    12,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += produceDevices.length
  zones.push({ zone: produceZone, devices: produceDevices })
  
  // Meat section
  const meatZone = { ...ZONE_TEMPLATES.meat }
  const meatDevices = generateDevicesForZone(
    storeConfig.id,
    meatZone.name,
    meatZone.polygon,
    8,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += meatDevices.length
  zones.push({ zone: meatZone, devices: meatDevices })
  
  // Deli (if store has it)
  if (storeConfig.characteristics.hasDeli) {
    const deliZone = { ...ZONE_TEMPLATES.deli }
    const deliDevices = generateDevicesForZone(
      storeConfig.id,
      deliZone.name,
      deliZone.polygon,
      6,
      DeviceType.FIXTURE,
      deviceCounter
    )
    deviceCounter += deliDevices.length
    zones.push({ zone: deliZone, devices: deliDevices })
  }
  
  // Bakery (if store has it)
  if (storeConfig.characteristics.hasBakery) {
    const bakeryZone = { ...ZONE_TEMPLATES.bakery }
    const bakeryDevices = generateDevicesForZone(
      storeConfig.id,
      bakeryZone.name,
      bakeryZone.polygon,
      6,
      DeviceType.FIXTURE,
      deviceCounter
    )
    deviceCounter += bakeryDevices.length
    zones.push({ zone: bakeryZone, devices: bakeryDevices })
  }
  
  // Apparel
  const apparelZone = { ...ZONE_TEMPLATES.apparel }
  const apparelDevices = generateDevicesForZone(
    storeConfig.id,
    apparelZone.name,
    apparelZone.polygon,
    25,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += apparelDevices.length
  zones.push({ zone: apparelZone, devices: apparelDevices })
  
  // Home & Garden
  const homeZone = { ...ZONE_TEMPLATES.home }
  const homeDevices = generateDevicesForZone(
    storeConfig.id,
    homeZone.name,
    homeZone.polygon,
    20,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += homeDevices.length
  zones.push({ zone: homeZone, devices: homeDevices })
  
  // Electronics
  const electronicsZone = { ...ZONE_TEMPLATES.electronics }
  const electronicsDevices = generateDevicesForZone(
    storeConfig.id,
    electronicsZone.name,
    electronicsZone.polygon,
    18,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += electronicsDevices.length
  zones.push({ zone: electronicsZone, devices: electronicsDevices })
  
  // Toys
  const toysZone = { ...ZONE_TEMPLATES.toys }
  const toysDevices = generateDevicesForZone(
    storeConfig.id,
    toysZone.name,
    toysZone.polygon,
    22,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += toysDevices.length
  zones.push({ zone: toysZone, devices: toysDevices })
  
  // Lobby
  const lobbyZone = { ...ZONE_TEMPLATES.lobby }
  const lobbyDevices = generateDevicesForZone(
    storeConfig.id,
    lobbyZone.name,
    lobbyZone.polygon,
    8,
    DeviceType.FIXTURE,
    deviceCounter
  )
  deviceCounter += lobbyDevices.length
  zones.push({ zone: lobbyZone, devices: lobbyDevices })
  
  // Add motion sensors to key areas (entrances, high-traffic zones)
  const motionSensorZones = [lobbyZone, groceryZone, produceZone]
  for (const motionZone of motionSensorZones) {
    const motionDevices = generateDevicesForZone(
      storeConfig.id,
      motionZone.name,
      motionZone.polygon,
      3,
      DeviceType.MOTION_SENSOR,
      deviceCounter
    )
    deviceCounter += motionDevices.length
    // Add motion sensors to the zone's device list
    const zoneData = zones.find(z => z.zone.name === motionZone.name)
    if (zoneData) {
      zoneData.devices.push(...motionDevices)
    }
  }
  
  return zones
}

// Generate BACnet mappings for zones
function generateBACnetMappings(zoneIds: string[]): Array<{
  zoneId: string
  bacnetObjectId: string
  status: BACnetStatus
}> {
  const mappings = []
  let objectIdCounter = 1000
  
  for (const zoneId of zoneIds) {
    // 80% of zones have BACnet mappings
    if (Math.random() > 0.2) {
      const statusRand = Math.random()
      let status = BACnetStatus.CONNECTED
      if (statusRand > 0.9) status = BACnetStatus.ERROR
      else if (statusRand > 0.7) status = BACnetStatus.NOT_ASSIGNED
      
      mappings.push({
        zoneId,
        bacnetObjectId: `AI${objectIdCounter++}`,
        status,
        lastConnected: status === BACnetStatus.CONNECTED 
          ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last week
          : null,
      })
    }
  }
  
  return mappings
}

// Generate rules for zones
function generateRules(siteId: string, zones: Array<{ zone: any; devices: any[] }>): any[] {
  const rules = []
  
  // Motion-activated lighting for high-traffic zones
  const highTrafficZones = zones.filter(z => 
    ['Main Lobby', 'Grocery Aisles', 'Produce Section'].includes(z.zone.name)
  )
  
  for (const zoneData of highTrafficZones) {
    rules.push({
      name: `Motion-activated lighting: ${zoneData.zone.name}`,
      description: `Turn on lights when motion detected in ${zoneData.zone.name}`,
      trigger: 'motion',
      condition: {
        zone: zoneData.zone.name,
        duration: 5, // 5 minutes of no motion before turning off
      },
      action: {
        zones: [zoneData.zone.name],
        brightness: 100,
        duration: 30, // Stay on for 30 minutes
      },
      overrideBMS: false,
      enabled: true,
      zoneId: zoneData.zone.name, // Will be converted to ID later
      targetZones: [zoneData.zone.name],
    })
  }
  
  // Daylight harvesting for stores that have it
  const daylightZones = zones.filter(z => 
    ['Produce Section', 'Grocery Aisles'].includes(z.zone.name)
  )
  
  for (const zoneData of daylightZones) {
    rules.push({
      name: `Daylight harvesting: ${zoneData.zone.name}`,
      description: `Adjust lighting based on natural light in ${zoneData.zone.name}`,
      trigger: 'daylight',
      condition: {
        zone: zoneData.zone.name,
        level: 50, // 50 fc threshold
        operator: '>',
      },
      action: {
        zones: [zoneData.zone.name],
        brightness: 50, // Reduce to 50% when enough daylight
      },
      overrideBMS: false,
      enabled: true,
      zoneId: zoneData.zone.name,
      targetZones: [zoneData.zone.name],
    })
  }
  
  // Scheduled opening/closing
  rules.push({
    name: 'Store Opening - Full Brightness',
    description: 'Set all zones to full brightness at store opening',
    trigger: 'schedule',
    condition: {
      scheduleTime: '06:00',
      scheduleDays: [1, 2, 3, 4, 5, 6], // Monday-Saturday
      scheduleFrequency: 'weekly',
    },
    action: {
      zones: zones.map(z => z.zone.name),
      brightness: 100,
    },
    overrideBMS: false,
    enabled: true,
    zoneId: null, // Global rule
    targetZones: zones.map(z => z.zone.name),
  })
  
  rules.push({
    name: 'Store Closing - Dimmed Lighting',
    description: 'Reduce lighting after store closes',
    trigger: 'schedule',
    condition: {
      scheduleTime: '22:00',
      scheduleDays: [1, 2, 3, 4, 5, 6],
      scheduleFrequency: 'weekly',
    },
    action: {
      zones: zones.map(z => z.zone.name),
      brightness: 30, // Security lighting level
    },
    overrideBMS: false,
    enabled: true,
    zoneId: null, // Global rule
    targetZones: zones.map(z => z.zone.name),
  })
  
  return rules
}

// Generate faults for devices
function generateFaults(devices: Array<{ device: any }>): any[] {
  const faults = []
  const faultTypes = [
    'environmental-ingress',
    'electrical-driver',
    'thermal-overheat',
    'installation-wiring',
    'control-integration',
  ]
  
  // Generate faults for 5-10% of devices
  const faultCount = Math.floor(devices.length * (0.05 + Math.random() * 0.05))
  const devicesWithFaults = devices
    .filter(() => Math.random() < 0.1)
    .slice(0, faultCount)
  
  for (const deviceData of devicesWithFaults) {
    const faultType = faultTypes[Math.floor(Math.random() * faultTypes.length)]
    const severity = Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'warning' : 'info'
    
    faults.push({
      deviceId: deviceData.device.id,
      deviceSerialNumber: deviceData.device.serialNumber,
      deviceType: deviceData.device.type,
      faultType,
      severity,
      description: `Device ${deviceData.device.deviceId} experiencing ${faultType.replace('-', ' ')} issues`,
      detectedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
      resolved: Math.random() > 0.6, // 40% resolved
      resolvedAt: Math.random() > 0.6 
        ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
        : null,
    })
  }
  
  return faults
}

// Main seeding function
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')
  
  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...')
    await prisma.rule.deleteMany()
    await prisma.bACnetMapping.deleteMany()
    await prisma.zoneDevice.deleteMany()
    await prisma.device.deleteMany()
    await prisma.zone.deleteMany()
    await prisma.site.deleteMany()
    console.log('✅ Cleared existing data\n')
    
    // Create sites and their data
    for (const storeConfig of STORE_CONFIGS) {
      console.log(`📦 Creating site: ${storeConfig.name}`)
      
      // Create site
      const site = await prisma.site.create({
        data: {
          id: storeConfig.id,
          name: storeConfig.name,
          storeNumber: storeConfig.storeNumber,
          address: storeConfig.address,
        },
      })
      
      // Generate zones and devices
      const zonesData = generateZonesForStore(storeConfig)
      console.log(`  📍 Creating ${zonesData.length} zones...`)
      
      const allDevices: Array<{ device: any; components: any[] }> = []
      const createdZones = []
      
      for (const zoneData of zonesData) {
        // Create zone
        const zone = await prisma.zone.create({
          data: {
            name: zoneData.zone.name,
            color: zoneData.zone.color,
            description: zoneData.zone.description,
            polygon: zoneData.zone.polygon as any,
            siteId: site.id,
            daylightEnabled: storeConfig.characteristics.hasDaylightHarvesting || false,
            minDaylight: storeConfig.characteristics.hasDaylightHarvesting ? 50 : null,
          },
        })
        
        createdZones.push(zone)
        
        // Create devices for this zone
        for (const deviceData of zoneData.devices) {
          const device = await prisma.device.create({
            data: {
              ...deviceData.device,
              siteId: site.id,
            },
          })
          
          // Create components
          for (const component of deviceData.components) {
            await prisma.device.create({
              data: {
                ...component,
                parentId: device.id,
                siteId: site.id,
              },
            })
          }
          
          // Link device to zone
          await prisma.zoneDevice.create({
            data: {
              zoneId: zone.id,
              deviceId: device.id,
            },
          })
          
          allDevices.push({ device, components: deviceData.components })
        }
      }
      
      console.log(`  ✅ Created ${allDevices.length} devices`)
      
      // Create BACnet mappings
      const bacnetMappings = generateBACnetMappings(createdZones.map(z => z.id))
      console.log(`  🔌 Creating ${bacnetMappings.length} BACnet mappings...`)
      
      for (const mapping of bacnetMappings) {
        await prisma.bACnetMapping.create({
          data: {
            zoneId: mapping.zoneId,
            bacnetObjectId: mapping.bacnetObjectId,
            status: mapping.status,
            lastConnected: mapping.lastConnected,
          },
        })
      }
      
      console.log(`  ✅ Created ${bacnetMappings.length} BACnet mappings`)
      
      // Create rules
      const rules = generateRules(site.id, zonesData.map(z => ({ 
        zone: { ...z.zone, id: createdZones.find(cz => cz.name === z.zone.name)?.id || '' }, 
        devices: z.devices 
      })))
      console.log(`  📋 Creating ${rules.length} rules...`)
      
      for (const rule of rules) {
        // Find zone ID for the rule by matching zone name
        const zone = createdZones.find(z => {
          if (rule.zoneId && typeof rule.zoneId === 'string') {
            return z.name === rule.zoneId || z.name.includes(rule.zoneId)
          }
          return false
        })
        
        // Update targetZones to use zone IDs instead of names
        const targetZoneIds = rule.targetZones
          .map(zoneName => createdZones.find(z => z.name === zoneName)?.id)
          .filter((id): id is string => !!id)
        
        await prisma.rule.create({
          data: {
            name: rule.name,
            description: rule.description,
            trigger: rule.trigger,
            condition: rule.condition as any,
            action: rule.action as any,
            overrideBMS: rule.overrideBMS,
            enabled: rule.enabled,
            zoneId: zone?.id,
            targetZones: targetZoneIds,
          },
        })
      }
      
      console.log(`  ✅ Created ${rules.length} rules`)
      
      // Note: Faults are calculated on-the-fly from device status
      // Devices with OFFLINE or MISSING status will show up in the faults page
      const offlineDevices = allDevices.filter(d => 
        d.device.status === DeviceStatus.OFFLINE || d.device.status === DeviceStatus.MISSING
      )
      console.log(`  ⚠️  ${offlineDevices.length} devices with faults (offline/missing status)`)
      
      console.log(`✅ Completed site: ${storeConfig.name}\n`)
    }
    
    console.log('🎉 Database seeding completed successfully!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Sites: ${STORE_CONFIGS.length}`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error)
      process.exit(1)
    })
}

