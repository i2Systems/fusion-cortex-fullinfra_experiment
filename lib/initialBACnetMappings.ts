/**
 * Initial BACnet Mappings Data
 * 
 * Pre-defined BACnet mappings for initial zones.
 * These mappings are initialized when the app loads.
 * 
 * AI Note: These mappings correspond to the zones defined in initialZones.ts
 */

export type ControlCapability = 'on-off' | 'dimming' | 'scheduled' | 'motion' | 'daylight' | 'override'

export interface InitialBACnetMapping {
  zoneName: string
  bacnetObjectId: string
  status: 'connected' | 'error' | 'not-assigned'
  controlCapabilities: ControlCapability[]
  description: string
  networkAddress: string
  priority: number
}

export const initialBACnetMappings: InitialBACnetMapping[] = [
  {
    zoneName: 'Zone 1 - Electronics',
    bacnetObjectId: '4001',
    status: 'connected',
    controlCapabilities: ['on-off', 'dimming', 'scheduled'],
    description: 'Connected to main lighting panel. Can be turned on/off, dimmed, and follows store hours schedule. BMS has full control during business hours.',
    networkAddress: '192.168.1.101',
    priority: 3,
  },
  {
    zoneName: 'Zone 2 - Clothing',
    bacnetObjectId: '4002',
    status: 'connected',
    controlCapabilities: ['on-off', 'motion', 'daylight'],
    description: 'Motion-activated zone with daylight harvesting. BMS can override for maintenance. Zone automatically adjusts based on occupancy and natural light levels.',
    networkAddress: '192.168.1.102',
    priority: 2,
  },
  {
    zoneName: 'Zone 3 - Retail',
    bacnetObjectId: '4003',
    status: 'connected',
    controlCapabilities: ['on-off', 'scheduled', 'override'],
    description: 'Scheduled zone with BMS override capability. Follows store schedule but can be manually controlled by building management when needed.',
    networkAddress: '192.168.1.103',
    priority: 4,
  },
  {
    zoneName: 'Zone 7 - Grocery',
    bacnetObjectId: '4007',
    status: 'error',
    controlCapabilities: ['on-off'],
    description: 'Connection error detected. BMS can control on/off but communication is intermittent. Check network connection and BACnet device status.',
    networkAddress: '192.168.1.107',
    priority: 1,
  },
]

