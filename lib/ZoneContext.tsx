/**
 * Zone Context
 * 
 * Shared state management for zones across the app.
 * Handles zone creation, editing, deletion, and device assignment.
 * 
 * AI Note: Uses tRPC to sync with database.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { Device } from './mockData'
import { useSite } from './SiteContext'
import { trpc } from './trpc/client'

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
  addZone: (zone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Zone>
  updateZone: (zoneId: string, updates: Partial<Zone>) => Promise<void>
  deleteZone: (zoneId: string) => Promise<void>
  getDevicesInZone: (zoneId: string, allDevices: Device[]) => Device[]
  getZoneForDevice: (deviceId: string) => Zone | null
  syncZoneDeviceIds: (allDevices: Device[]) => Promise<void>
  saveZones: () => Promise<void>
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
  const { activeSiteId, activeSite } = useSite()
  const [zones, setZones] = useState<Zone[]>([])

  // Ensure site exists in database
  const ensureSiteMutation = trpc.site.ensureExists.useMutation()
  const ensuredSiteIdRef = useRef<string | null>(null)

  // Fetch zones from database
  const { data: zonesData, refetch: refetchZones } = trpc.zone.list.useQuery(
    { siteId: activeSiteId || '' },
    {
      enabled: !!activeSiteId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Mutations - use optimistic updates and direct invalidation
  const utils = trpc.useContext()

  const createZoneMutation = trpc.zone.create.useMutation({
    onSuccess: () => {
      utils.zone.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  const updateZoneMutation = trpc.zone.update.useMutation({
    onSuccess: () => {
      utils.zone.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  const deleteZoneMutation = trpc.zone.delete.useMutation({
    onSuccess: () => {
      utils.zone.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  // Ensure site exists when site changes (only once per site)
  useEffect(() => {
    if (!activeSiteId) return
    if (ensuredSiteIdRef.current === activeSiteId) return // Already ensured

    // Mark as being ensured
    ensuredSiteIdRef.current = activeSiteId

    // Use site name from context if available, otherwise generate
    const siteName = activeSite?.name || `Site ${activeSiteId}`
    const siteNumber = activeSite?.siteNumber || activeSiteId.replace('site-', '')

    ensureSiteMutation.mutate({
      id: activeSiteId,
      name: siteName,
      storeNumber: siteNumber, // Database field is still storeNumber
      address: activeSite?.address,
      city: activeSite?.city,
      state: activeSite?.state,
      zipCode: activeSite?.zipCode,
      phone: activeSite?.phone,
      manager: activeSite?.manager,
      squareFootage: activeSite?.squareFootage,
      openedDate: activeSite?.openedDate,
    })
  }, [activeSiteId, activeSite])

  // Update local state when data from database changes
  // Only update if we have valid data - don't clear zones on error
  useEffect(() => {
    if (zonesData && Array.isArray(zonesData)) {
      const transformedZones: Zone[] = zonesData.map(zone => ({
        id: zone.id,
        name: zone.name,
        color: zone.color,
        description: zone.description || undefined,
        polygon: zone.polygon || [],
        deviceIds: zone.deviceIds || [],
        createdAt: new Date(zone.createdAt),
        updatedAt: new Date(zone.updatedAt),
      }))
      setZones(transformedZones)
    }
    // Don't clear zones if zonesData is null/undefined - might be a loading state
    // Only clear if we explicitly get an empty array (no zones for this site)
    // This prevents zones from disappearing when there's a temporary error
  }, [zonesData])


  const addZone = useCallback(async (zoneData: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Zone> => {
    if (!activeSiteId) {
      throw new Error('No active site')
    }

    // Optimistically create zone
    const tempZone: Zone = {
      ...zoneData,
      id: `temp-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setZones(prev => [...prev, tempZone])

    try {
      const result = await createZoneMutation.mutateAsync({
        siteId: activeSiteId,
        name: zoneData.name,
        color: zoneData.color,
        description: zoneData.description,
        polygon: zoneData.polygon,
        deviceIds: zoneData.deviceIds || [],
      })

      const newZone: Zone = {
        id: result.id,
        name: result.name,
        color: result.color,
        description: result.description || undefined,
        polygon: result.polygon || [],
        deviceIds: zoneData.deviceIds || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Replace temp zone with real one
      setZones(prev => prev.map(z => z.id === tempZone.id ? newZone : z))
      return newZone
    } catch (error) {
      console.error('Failed to create zone:', error)
      // Remove temp zone on error
      setZones(prev => prev.filter(z => z.id !== tempZone.id))
      throw error
    }
  }, [activeSiteId, createZoneMutation])

  const updateZone = useCallback(async (zoneId: string, updates: Partial<Zone>) => {
    // Optimistically update UI
    setZones(prev =>
      prev.map(zone =>
        zone.id === zoneId
          ? { ...zone, ...updates, updatedAt: new Date() }
          : zone
      )
    )

    try {
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.color !== undefined) dbUpdates.color = updates.color
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.polygon !== undefined) dbUpdates.polygon = updates.polygon
      if (updates.deviceIds !== undefined) dbUpdates.deviceIds = updates.deviceIds

      await updateZoneMutation.mutateAsync({
        id: zoneId,
        ...dbUpdates,
      })
    } catch (error) {
      console.error('Failed to update zone:', error)
      // Revert by invalidating
      utils.zone.list.invalidate({ siteId: activeSiteId || '' })
    }
  }, [updateZoneMutation, utils, activeSiteId])

  const deleteZone = useCallback(async (zoneId: string) => {
    // Optimistically update UI
    setZones(prev => prev.filter(zone => zone.id !== zoneId))

    // Delete from database
    try {
      await deleteZoneMutation.mutateAsync({ id: zoneId })
    } catch (error) {
      console.error('Failed to delete zone:', error)
      // Revert by invalidating
      utils.zone.list.invalidate({ siteId: activeSiteId || '' })
    }
  }, [deleteZoneMutation, utils, activeSiteId])

  const getDevicesInZone = useCallback((zoneId: string, allDevices: Device[]): Device[] => {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return []

    return allDevices.filter(device => {
      if (device.x === undefined || device.y === undefined) return false
      return pointInPolygon({ x: device.x, y: device.y }, zone.polygon)
    })
  }, [zones])

  // Sync zone deviceIds with actual device positions
  // This should be called after devices are moved or updated
  const syncZoneDeviceIds = useCallback(async (allDevices: Device[]) => {
    // Calculate device IDs for each zone based on positions
    const zonesToUpdate = zones.map(zone => {
      const devicesInZone = allDevices.filter(device => {
        if (device.x === undefined || device.y === undefined) return false
        return pointInPolygon({ x: device.x, y: device.y }, zone.polygon)
      })
      return {
        zoneId: zone.id,
        deviceIds: devicesInZone.map(d => d.id),
      }
    })

    // Update each zone in database
    try {
      await Promise.all(
        zonesToUpdate.map(({ zoneId, deviceIds }) =>
          updateZoneMutation.mutateAsync({
            id: zoneId,
            deviceIds,
          })
        )
      )
    } catch (error) {
      console.error('Failed to sync zone device IDs:', error)
    }
  }, [zones, updateZoneMutation])

  const getZoneForDevice = useCallback((deviceId: string): Zone | null => {
    // Find the first zone that contains this device
    for (const zone of zones) {
      const devices = getDevicesInZone(zone.id, [{ id: deviceId, x: 0, y: 0 } as Device])
      if (devices.length > 0) {
        return zone
      }
    }
    return null
  }, [zones, getDevicesInZone])

  const saveZones = useCallback(async () => {
    // Zones are automatically saved to database on each mutation
    // This function is kept for backward compatibility
    console.log(`✅ Zones are automatically saved to database for ${activeSiteId}`)
  }, [activeSiteId])

  const isZonesSaved = useCallback((): boolean => {
    // Zones are always saved to database, so always return true
    return true
  }, [])

  return (
    <ZoneContext.Provider
      value={{
        zones,
        addZone,
        updateZone,
        deleteZone,
        getDevicesInZone,
        getZoneForDevice,
        syncZoneDeviceIds,
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

