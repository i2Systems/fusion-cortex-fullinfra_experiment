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
  saveZones: () => void
  isZonesSaved: () => boolean
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
  const [isInitialized, setIsInitialized] = useState(false)

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
    setIsInitialized(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_zones', JSON.stringify(defaultZones))
      localStorage.setItem('fusion_zones_version', 'v3-fitted-zones')
    }
  }

  // Load zones from localStorage on mount, or initialize defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZones = localStorage.getItem('fusion_zones')
      const zonesVersion = localStorage.getItem('fusion_zones_version')
      const zonesSaved = localStorage.getItem('fusion_zones_saved') === 'true'
      const CURRENT_VERSION = 'v3-fitted-zones'
      
      // PRIORITY 1: If zones are marked as saved, ALWAYS use them and never reset
      if (zonesSaved && savedZones) {
        try {
          const parsed = JSON.parse(savedZones)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const zonesWithDates = parsed.map((z: any) => ({
              ...z,
              createdAt: new Date(z.createdAt),
              updatedAt: new Date(z.updatedAt),
            }))
            setZones(zonesWithDates)
            setIsInitialized(true)
            console.log(`Loaded ${zonesWithDates.length} saved zones from localStorage (protected from reset)`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved zones:', e)
          // Even if parsing fails, don't reset if marked as saved
          console.warn('Zones are marked as saved but failed to parse. Keeping existing zones.')
          return
        }
      }
      
      // PRIORITY 2: If we have saved zones (but not marked as saved), use them
      if (savedZones) {
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
            setIsInitialized(true)
            // Update version to current if zones were loaded
            if (zonesVersion !== CURRENT_VERSION) {
              localStorage.setItem('fusion_zones_version', CURRENT_VERSION)
            }
            console.log(`Loaded ${zonesWithDates.length} zones from localStorage`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved zones:', e)
        }
      }
      
      // PRIORITY 3: Only initialize default zones if no saved zones exist
      // This preserves user edits and prevents constant resets
      console.log('No saved zones found, initializing default zones...')
      initializeDefaultZones()
    }
  }, [])

  // Save to localStorage whenever zones change
  // BUT: Only if zones are not marked as saved (to prevent overwriting saved state during initialization)
  useEffect(() => {
    if (typeof window !== 'undefined' && zones.length >= 0 && isInitialized) {
      const zonesSaved = localStorage.getItem('fusion_zones_saved') === 'true'
      // Always save zones, but if they're marked as saved, ensure the flag persists
      localStorage.setItem('fusion_zones', JSON.stringify(zones))
      if (zonesSaved) {
        // Ensure saved flag persists
        localStorage.setItem('fusion_zones_saved', 'true')
      }
    }
  }, [zones, isInitialized])
  
  // Safety check: If zones are empty after initialization, try to recover
  // Only run this check once after initial mount to avoid repeated warnings
  // BUT: Never reset if zones are marked as saved
  const [hasCheckedInitialization, setHasCheckedInitialization] = useState(false)
  useEffect(() => {
    if (!hasCheckedInitialization && isInitialized && typeof window !== 'undefined') {
      setHasCheckedInitialization(true)
      const zonesSaved = localStorage.getItem('fusion_zones_saved') === 'true'
      
      // NEVER reset if zones are marked as saved
      if (zonesSaved) {
        console.log('Zones are marked as saved, skipping safety check')
        return
      }
      
      // Small delay to allow initial useEffect to complete
      const timer = setTimeout(() => {
        if (zones.length === 0 && isInitialized) {
          const savedZones = localStorage.getItem('fusion_zones')
          if (!savedZones) {
            console.log('Zones array is empty after initialization, re-initializing default zones...')
            initializeDefaultZones()
            setIsInitialized(true)
          } else {
            // Try to load saved zones one more time
            try {
              const parsed = JSON.parse(savedZones)
              if (Array.isArray(parsed) && parsed.length > 0) {
                const zonesWithDates = parsed.map((z: any) => ({
                  ...z,
                  createdAt: new Date(z.createdAt),
                  updatedAt: new Date(z.updatedAt),
                }))
                setZones(zonesWithDates)
                setIsInitialized(true)
                console.log(`Loaded ${zonesWithDates.length} zones from localStorage (retry)`)
              } else {
                initializeDefaultZones()
                setIsInitialized(true)
              }
            } catch (e) {
              console.error('Failed to parse saved zones on retry:', e)
              initializeDefaultZones()
              setIsInitialized(true)
            }
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [hasCheckedInitialization, isInitialized, zones.length])

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
    setZones(prev => {
      const updated = prev.map(zone => 
        zone.id === zoneId 
          ? { ...zone, ...updates, updatedAt: new Date() }
          : zone
      )
      // Ensure localStorage is updated immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('fusion_zones', JSON.stringify(updated))
        // Preserve saved flag if zones were previously saved
        const zonesSaved = localStorage.getItem('fusion_zones_saved') === 'true'
        if (zonesSaved) {
          localStorage.setItem('fusion_zones_saved', 'true')
        }
      }
      return updated
    })
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

  const saveZones = () => {
    // Mark zones as saved - this prevents them from being reset
    if (typeof window !== 'undefined' && zones.length > 0) {
      // Save zones first
      localStorage.setItem('fusion_zones', JSON.stringify(zones))
      // Then mark as saved - this is the critical flag that prevents resets
      localStorage.setItem('fusion_zones_saved', 'true')
      localStorage.setItem('fusion_zones_version', 'v3-fitted-zones')
      console.log(`✅ Saved ${zones.length} zones to system (protected from reset)`)
      console.log('Saved zones:', zones.map(z => z.name))
    } else {
      console.warn('Cannot save: No zones to save')
    }
  }

  const isZonesSaved = (): boolean => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fusion_zones_saved') === 'true'
    }
    return false
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
        saveZones,
        isZonesSaved,
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

