/**
 * Device Utilities
 * 
 * Helper functions for device creation and management.
 * 
 * AI Note: These utilities are used when creating new devices to ensure
 * they have proper components, warranty info, etc.
 */

import { Component, DeviceStatus } from './mockData'

let componentCounter = 10000 // Start high to avoid conflicts with mock data

/**
 * Generate components for a fixture device.
 * Creates LED Module, Driver, Lens, and Mounting Bracket components
 * with realistic warranty and build date information.
 */
export function generateComponentsForFixture(
  fixtureId: string, 
  fixtureSerial: string, 
  parentWarrantyExpiry?: Date
): Component[] {
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
  
  const now = new Date()
  
  for (let i = 0; i < componentTypes.length; i++) {
    const componentType = componentTypes[i]
    const buildDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const warrantyExpiry = new Date()
    
    // Create variety: some expired, some near end, some active
    const rand = Math.random()
    if (rand < 0.15) {
      // 15% expired (expired 1-6 months ago)
      warrantyExpiry.setTime(now.getTime() - (1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 180) + 30))) // 30-210 days ago
    } else if (rand < 0.35) {
      // 20% near end (expires within 30 days from now)
      warrantyExpiry.setTime(now.getTime() + (1000 * 60 * 60 * 24 * Math.floor(Math.random() * 30))) // 0-30 days from now
    } else {
      // 65% active (expires in future, 1-5 years from now)
      warrantyExpiry.setTime(now.getTime() + (1000 * 60 * 60 * 24 * (365 + Math.floor(Math.random() * 1460)))) // 1-5 years from now
    }
    
    const warrantyStatus = warrantyExpiry > now ? 'Active' : 'Expired'
    const status: DeviceStatus = Math.random() > 0.1 ? 'online' : 'offline'
    const notes = Math.random() > 0.6 ? sampleNotes[Math.floor(Math.random() * sampleNotes.length)] : undefined
    
    // Generate component serial based on fixture serial and component type
    const typeCode = componentType.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    const componentSerial = `${fixtureSerial}-${typeCode}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
    
    components.push({
      id: `component-${componentCounter++}`,
      componentType,
      componentSerialNumber: componentSerial,
      warrantyStatus,
      warrantyExpiry,
      buildDate,
      status,
      notes,
    })
  }
  
  return components
}

/**
 * Generate a warranty expiry date for a new device.
 * Defaults to 5 years from now.
 */
export function generateWarrantyExpiry(): Date {
  const now = new Date()
  const expiry = new Date()
  expiry.setFullYear(now.getFullYear() + 5)
  return expiry
}

