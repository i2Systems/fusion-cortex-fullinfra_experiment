/**
 * Library Page
 * 
 * Displays cards for all device types and component types.
 * Each card opens a modal showing detailed information and images.
 * 
 * AI Note: This is the reference library for understanding the base inventory.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LibraryObjectModal } from '@/components/library/LibraryObjectModal'
import { LibraryCard } from '@/components/library/LibraryCard'

// Device types (6 fixtures + 2 sensors)
const DEVICE_TYPES = [
  {
    id: 'fixture-16ft-power-entry',
    name: '16ft Power Entry Fixture',
    category: 'Fixture',
    description: '16-foot LED fixture with power entry capability',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'fixture-12ft-power-entry',
    name: '12ft Power Entry Fixture',
    category: 'Fixture',
    description: '12-foot LED fixture with power entry capability',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'fixture-8ft-power-entry',
    name: '8ft Power Entry Fixture',
    category: 'Fixture',
    description: '8-foot LED fixture with power entry capability',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'fixture-16ft-follower',
    name: '16ft Follower Fixture',
    category: 'Fixture',
    description: '16-foot LED fixture that follows power entry fixtures',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'fixture-12ft-follower',
    name: '12ft Follower Fixture',
    category: 'Fixture',
    description: '12-foot LED fixture that follows power entry fixtures',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'fixture-8ft-follower',
    name: '8ft Follower Fixture',
    category: 'Fixture',
    description: '8-foot LED fixture that follows power entry fixtures',
    defaultImage: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop',
  },
  {
    id: 'motion-sensor',
    name: 'Motion Sensor',
    category: 'Sensor',
    description: 'Motion detection sensor for occupancy-based lighting control',
    defaultImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
  {
    id: 'light-sensor',
    name: 'Light Sensor',
    category: 'Sensor',
    description: 'Ambient light sensor for daylight harvesting',
    defaultImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
] as const

// Component types (8 types)
const COMPONENT_TYPES = [
  {
    id: 'lcm',
    name: 'LCM',
    category: 'Component',
    description: 'Light Control Module - Main control unit for fixture operation',
    quantity: 1,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'driver-board',
    name: 'Driver Board',
    category: 'Component',
    description: 'LED driver board that regulates power to LED arrays',
    quantity: 1,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'power-supply',
    name: 'Power Supply',
    category: 'Component',
    description: 'AC to DC power supply unit for fixture operation',
    quantity: 2,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'led-board',
    name: 'LED Board',
    category: 'Component',
    description: 'LED array board providing illumination',
    quantity: 4,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'metal-bracket',
    name: 'Metal Bracket',
    category: 'Component',
    description: 'Mounting bracket for fixture installation',
    quantity: 2,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'cable-harness',
    name: 'Cable Harness',
    category: 'Component',
    description: 'Wiring harness for power and data connections',
    quantity: 2,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'lower-led-housing-optic',
    name: 'Lower LED Housing with Optic',
    category: 'Component',
    description: 'Housing assembly with optical lens for LED light distribution',
    quantity: 4,
    defaultImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  },
  {
    id: 'sensor',
    name: 'Sensor',
    category: 'Component',
    description: 'Integrated sensor for motion or light detection',
    quantity: 2,
    defaultImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  },
] as const

export type LibraryObject = typeof DEVICE_TYPES[number] | typeof COMPONENT_TYPES[number]

export default function LibraryPage() {
  const [selectedObject, setSelectedObject] = useState<LibraryObject | null>(null)
  const router = useRouter()

  // Handle hash-based navigation (e.g., /library#fixture-16ft-power-entry)
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove the #
    if (hash) {
      // Find the object by ID
      const allObjects: LibraryObject[] = [...DEVICE_TYPES, ...COMPONENT_TYPES]
      const object = allObjects.find(obj => obj.id === hash)
      if (object) {
        setSelectedObject(object)
      }
    }
  }, [])

  const handleCloseModal = () => {
    setSelectedObject(null)
    // Remove hash from URL
    if (window.location.hash) {
      router.replace('/library', { scroll: false })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-6 pb-20">
        {/* Device Types Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Device Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEVICE_TYPES.map((device) => (
              <LibraryCard
                key={device.id}
                object={device}
                onClick={() => setSelectedObject(device)}
              />
            ))}
          </div>
        </div>

        {/* Component Types Section */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Component Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {COMPONENT_TYPES.map((component) => (
              <LibraryCard
                key={component.id}
                object={component}
                onClick={() => setSelectedObject(component)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedObject && (
        <LibraryObjectModal
          object={selectedObject}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

