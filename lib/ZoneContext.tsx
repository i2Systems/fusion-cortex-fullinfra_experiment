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
import { Device } from './mockData'
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

  // Initialize default zones function - defined before useEffect
  const initializeDefaultZones = () => {
    const now = new Date()
    const defaultZones: Zone[] = initialZones.map((zoneData, index) => {
      return {
        ...zoneData,
        id: `zone-default-${index}-${zoneData.name.toLowerCase().replace(/\s+/g, '-')}`,
        deviceIds: [], // Will be populated when devices are loaded/discovered
        createdAt: now,
        updatedAt: now,
      }
    })
    console.log(`Initializing ${defaultZones.length} default zones:`, defaultZones.map(z => z.name))
    setZones(defaultZones)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_zones', JSON.stringify(defaultZones))
      localStorage.setItem('fusion_zones_version', 'v2-base-zones')
    }
  }

  // Load zones from localStorage on mount, or initialize defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZones = localStorage.getItem('fusion_zones')
      const zonesVersion = localStorage.getItem('fusion_zones_version')
      const CURRENT_VERSION = 'v2-base-zones'
      
      // If we have saved zones with correct version, use them
      if (savedZones && zonesVersion === CURRENT_VERSION) {
        try {
          const parsed = JSON.parse(savedZones)
          // Only use saved zones if they exist and are valid
          if (Array.isArray(parsed) && parsed.length > 0) {
            const zonesWithDates = parsed.map((z: any) => ({
              ...z,
              createdAt: new Date(z.createdAt),
              updatedAt: new Date(z.updatedAt),
            }))
            setZones(zonesWithDates)
            console.log(`Loaded ${zonesWithDates.length} zones from localStorage`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved zones:', e)
        }
      }
      
      // Always initialize default zones if we get here (no saved zones or version mismatch)
      console.log('Initializing default zones...')
      initializeDefaultZones()
    }
  }, [])

  // Save to localStorage whenever zones change
  useEffect(() => {
    if (typeof window !== 'undefined' && zones.length >= 0) {
      localStorage.setItem('fusion_zones', JSON.stringify(zones))
    }
  }, [zones])
  
  // Safety check: If zones are empty after mount, force initialize
  useEffect(() => {
    if (zones.length === 0 && typeof window !== 'undefined') {
      console.warn('Zones array is empty, forcing initialization...')
      const savedZones = localStorage.getItem('fusion_zones')
      if (!savedZones) {
        initializeDefaultZones()
      }
    }
  }, [zones.length])

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

