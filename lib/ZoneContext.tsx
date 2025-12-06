/**
 * Zone Context
 * 
 * Shared state management for zones across the app.
 * Handles zone creation, editing, deletion, and device assignment.
 * 
 * AI Note: In production, this would sync with tRPC/API and persist to database.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Device, mockDevices } from './mockData'
import { initialZones } from './initialZones'

export interface Zone {
  id: string
  name: string
  color: string // Hex color
  description?: string
  polygon: Array<{ x: number; y: number }> // Normalized coordinates (0-1)
  deviceIds: string[]
  createdAt: Date
  updatedAt: Date
}

interface ZoneContextType {
  zones: Zone[]
  addZone: (zone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>) => Zone
  updateZone: (zoneId: string, updates: Partial<Zone>) => void
  deleteZone: (zoneId: string) => void
  getDevicesInZone: (zoneId: string, allDevices: Device[]) => Device[]
  getZoneForDevice: (deviceId: string) => Zone | null
}

const ZoneContext = createContext<ZoneContextType | undefined>(undefined)

// Helper function to check if a point is inside a polygon
function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function ZoneProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([])

  // Load zones from localStorage on mount
  // Don't auto-initialize - let discovery create zones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZones = localStorage.getItem('fusion_zones')
      if (savedZones) {
        try {
          const parsed = JSON.parse(savedZones)
          // Convert date strings back to Date objects
          const zonesWithDates = parsed.map((z: any) => ({
            ...z,
            createdAt: new Date(z.createdAt),
            updatedAt: new Date(z.updatedAt),
          }))
          setZones(zonesWithDates)
        } catch (e) {
          console.error('Failed to parse saved zones:', e)
          // Don't initialize defaults - wait for discovery
        }
      }
      // Don't auto-initialize - zones will be created during discovery
    }
  }, [])

  const initializeDefaultZones = () => {
    const now = new Date()
    const defaultZones: Zone[] = initialZones.map(zoneData => {
      // Find devices in this zone based on their zone property
      const devicesInZone = mockDevices.filter(d => d.zone === zoneData.name)
      
      return {
        ...zoneData,
        id: `zone-${zoneData.name.toLowerCase().replace(/\s+/g, '-')}`,
        deviceIds: devicesInZone.map(d => d.id),
        createdAt: now,
        updatedAt: now,
      }
    })
    setZones(defaultZones)
  }

  // Save to localStorage whenever zones change
  useEffect(() => {
    if (typeof window !== 'undefined' && zones.length >= 0) {
      localStorage.setItem('fusion_zones', JSON.stringify(zones))
    }
  }, [zones])

  const addZone = (zoneData: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>): Zone => {
    const newZone: Zone = {
      ...zoneData,
      id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setZones(prev => [...prev, newZone])
    return newZone
  }

  const updateZone = (zoneId: string, updates: Partial<Zone>) => {
    setZones(prev => 
      prev.map(zone => 
        zone.id === zoneId 
          ? { ...zone, ...updates, updatedAt: new Date() }
          : zone
      )
    )
  }

  const deleteZone = (zoneId: string) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId))
  }

  const getDevicesInZone = (zoneId: string, allDevices: Device[]): Device[] => {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return []
    
    return allDevices.filter(device => {
      if (device.x === undefined || device.y === undefined) return false
      return pointInPolygon({ x: device.x, y: device.y }, zone.polygon)
    })
  }

  const getZoneForDevice = (deviceId: string): Zone | null => {
    // Find the first zone that contains this device
    for (const zone of zones) {
      const devices = getDevicesInZone(zone.id, [{ id: deviceId, x: 0, y: 0 } as Device])
      if (devices.length > 0) {
        return zone
      }
    }
    return null
  }

  return (
    <ZoneContext.Provider
      value={{
        zones,
        addZone,
        updateZone,
        deleteZone,
        getDevicesInZone,
        getZoneForDevice,
      }}
    >
      {children}
    </ZoneContext.Provider>
  )
}

export function useZones() {
  const context = useContext(ZoneContext)
  if (context === undefined) {
    throw new Error('useZones must be used within a ZoneProvider')
  }
  return context
}

