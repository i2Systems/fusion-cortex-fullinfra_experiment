/**
 * Device Utilities
 * 
 * Helper functions for device creation and management.
 * 
 * AI Note: These utilities are used when creating new devices to ensure
 * they have proper components, warranty info, etc.
 */

import { Component, DeviceStatus, DeviceType, isFixtureType } from './mockData'

// Re-export isFixtureType for backward compatibility
export { isFixtureType }

let componentCounter = 10000 // Start high to avoid conflicts with mock data

/**
 * Generate components for a fixture device.
 * Creates real fixture components with correct quantities:
 * - LCM (1)
 * - Driver Board (1)
 * - Power Supply (2)
 * - LED Board (4)
 * - Metal Bracket (2)
 * - Cable Harnesses (2)
 * - Lower LED Housing with Optic (4)
 * - Sensor (2)
 * 
 * with realistic warranty and build date information.
 */
export function generateComponentsForFixture(
  fixtureId: string,
  fixtureSerial: string,
  parentWarrantyExpiry?: Date
): Component[] {
  // Real component types with quantities
  const componentSpecs: Array<{ type: string; quantity: number }> = [
    { type: 'LCM', quantity: 1 },
    { type: 'Driver Board', quantity: 1 },
    { type: 'Power Supply', quantity: 2 },
    { type: 'LED Board', quantity: 4 },
    { type: 'Metal Bracket', quantity: 2 },
    { type: 'Cable Harness', quantity: 2 },
    { type: 'Lower LED Housing with Optic', quantity: 4 },
    { type: 'Sensor', quantity: 2 },
  ]

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

  // Generate components based on specs (with quantities)
  for (const spec of componentSpecs) {
    for (let instance = 1; instance <= spec.quantity; instance++) {
      const componentType = spec.quantity > 1
        ? `${spec.type} ${instance}`
        : spec.type

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
      const typeCode = spec.type.replace(/\s+/g, '').substring(0, 3).toUpperCase()
      const instanceCode = spec.quantity > 1 ? String(instance).padStart(2, '0') : ''
      const componentSerial = `${fixtureSerial}-${typeCode}${instanceCode}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

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

