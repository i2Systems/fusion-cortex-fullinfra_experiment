/**
 * Device Context
 * 
 * Shared state management for devices across the entire app.
 * Ensures all pages (Map, Zones, Lookup, Faults) use the same device data.
 * 
 * AI Note: 
 * - Store-aware: Data is scoped by site ID
 * - Automatically reloads when active store changes
 * - Uses tRPC to sync with database
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { Device } from './mockData'
import { useSite } from './SiteContext'
import { trpc } from './trpc/client'

interface DeviceContextType {
  devices: Device[]
  isLoading: boolean
  addDevice: (device: Device) => void
  updateDevice: (deviceId: string, updates: Partial<Device>) => void
  updateDevicePosition: (deviceId: string, x: number, y: number) => void
  updateMultipleDevices: (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => void
  removeDevice: (deviceId: string) => void
  setDevices: (devices: Device[]) => void
  refreshDevices: () => void
  saveDevices: () => void
  // Undo/Redo for position changes
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { activeSiteId, activeSite } = useSite()
  const [devices, setDevices] = useState<Device[]>([])
  const [history, setHistory] = useState<Device[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Ensure site exists in database
  const ensureSiteMutation = trpc.site.ensureExists.useMutation()
  const ensuredSiteIdRef = useRef<string | null>(null)

  // Fetch devices from database
  const { data: devicesData, refetch: refetchDevices, isLoading, error } = trpc.device.list.useQuery(
    { siteId: activeSiteId || '', includeComponents: true },
    {
      enabled: !!activeSiteId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
      retry: 2, // Retry failed requests
      retryDelay: 1000, // Wait 1 second between retries
    }
  )

  // If there's an error, log it but don't block the UI
  useEffect(() => {
    if (error) {
      console.error('Error loading devices:', error)
    }
  }, [error])

  // Mutations - use optimistic updates instead of refetching immediately
  // Mutations - use optimistic updates and standard invalidation
  const utils = trpc.useContext() // Access to query client

  const createDeviceMutation = trpc.device.create.useMutation({
    onSuccess: () => {
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  const updateDeviceMutation = trpc.device.update.useMutation({
    onSuccess: (data) => {
      // We could use setData here to update the specific item in the list if we wanted to be super granular
      // but invalidation with the updated data flowing back is also fine and safer.
      // Since we already optimistically updated the UI, invalidation makes sure we are eventually consistent.
      // But to avoid "snap back" if the invalidation is slow, we rely on the local state until the query refreshes.

      // We can also silence the refetch if we are super confident, but invalidation is best practice.
      // The key is NOT to have a timeout.
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  const deleteDeviceMutation = trpc.device.delete.useMutation({
    onSuccess: () => {
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    },
  })

  // Debounced save for position updates is still useful to avoid spamming the server, 
  // but the UI update should be immediate. 
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ensure site exists when store changes (only once per store)
  useEffect(() => {
    if (!activeSiteId) return
    if (ensuredSiteIdRef.current === activeSiteId) return // Already ensured

    // Mark as being ensured
    ensuredSiteIdRef.current = activeSiteId

    // Use store name from context if available, otherwise generate
    const siteName = activeSite?.name || `Site ${activeSiteId}`
    const siteNumber = activeSite?.siteNumber || activeSiteId.replace('site-', '')

    // Ensure site exists in database (maps store ID to site ID)
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
  // Use a ref to prevent updates during user interactions
  const isUpdatingRef = useRef(false)
  const previousSiteIdRef = useRef<string | null>(null)

  // Clear devices when site changes (before new data loads)
  useEffect(() => {
    if (activeSiteId !== previousSiteIdRef.current && previousSiteIdRef.current !== null) {
      // Site changed - clear old devices immediately
      setDevices([])
      setHistory([[]])
      setHistoryIndex(0)
      isUpdatingRef.current = false
    }
    previousSiteIdRef.current = activeSiteId
  }, [activeSiteId])

  useEffect(() => {
    if (devicesData !== undefined && !isUpdatingRef.current) {
      // Allow empty arrays to clear devices, but only update if we have a defined value
      setDevices(devicesData)
      setHistory([devicesData])
      setHistoryIndex(0)
    }
  }, [devicesData])

  const addDevice = useCallback(async (device: Device) => {
    if (!activeSiteId) return

    // Check if device already exists locally
    const exists = devices.some(d => d.id === device.id || d.serialNumber === device.serialNumber)
    if (exists) {
      console.warn('Device already exists:', device.id)
      return
    }

    // Optimistically update UI
    setDevices(prev => [...prev, device])

    // Create in database
    try {
      // Validate device type is present
      if (!device.type) {
        console.error('Device type is missing:', device)
        throw new Error('Device type is required')
      }

      await createDeviceMutation.mutateAsync({
        siteId: activeSiteId,
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        type: device.type,
        status: device.status,
        signal: device.signal,
        battery: device.battery,
        x: device.x,
        y: device.y,
        orientation: device.orientation,
        warrantyStatus: device.warrantyStatus,
        warrantyExpiry: device.warrantyExpiry,
        components: device.components?.map(comp => ({
          componentType: comp.componentType,
          componentSerialNumber: comp.componentSerialNumber,
          warrantyStatus: comp.warrantyStatus,
          warrantyExpiry: comp.warrantyExpiry,
          buildDate: comp.buildDate,
        })),
      })
    } catch (error) {
      console.error('Failed to create device:', error)
      // Revert optimistic update
      setDevices(prev => prev.filter(d => d.id !== device.id))
    }
  }, [activeSiteId, devices, createDeviceMutation])

  const updateDevice = useCallback(async (deviceId: string, updates: Partial<Device>) => {
    // Mark as updating to prevent refetch from overwriting
    isUpdatingRef.current = true

    // Optimistically update UI
    setDevices(prev => {
      const updated = prev.map(device =>
        device.id === deviceId ? { ...device, ...updates } : device
      )
      saveToHistory(updated)
      return updated
    })

    // Update in database
    try {
      const dbUpdates: any = {}
      if (updates.deviceId !== undefined) dbUpdates.deviceId = updates.deviceId
      if (updates.serialNumber !== undefined) dbUpdates.serialNumber = updates.serialNumber
      if (updates.type !== undefined) dbUpdates.type = updates.type
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.signal !== undefined) dbUpdates.signal = updates.signal
      if (updates.battery !== undefined) dbUpdates.battery = updates.battery
      if (updates.x !== undefined) dbUpdates.x = updates.x
      if (updates.y !== undefined) dbUpdates.y = updates.y
      if (updates.orientation !== undefined) dbUpdates.orientation = updates.orientation
      if (updates.warrantyStatus !== undefined) dbUpdates.warrantyStatus = updates.warrantyStatus
      if (updates.warrantyExpiry !== undefined) dbUpdates.warrantyExpiry = updates.warrantyExpiry

      await updateDeviceMutation.mutateAsync({
        id: deviceId,
        ...dbUpdates,
      })
    } catch (error) {
      console.error('Failed to update device:', error)
      // Revert by refetching
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    } finally {
      // Remove the strict timeout
      isUpdatingRef.current = false
    }
  }, [updateDeviceMutation, utils, activeSiteId])

  const updateDevicePosition = useCallback(async (deviceId: string, x: number, y: number) => {
    // Optimistically update UI (don't save to history for every position update)
    setDevices(prev =>
      prev.map(device =>
        device.id === deviceId ? { ...device, x, y } : device
      )
    )

    // Debounce database updates for position changes
    if (positionUpdateTimeoutRef.current) {
      clearTimeout(positionUpdateTimeoutRef.current)
    }

    positionUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDeviceMutation.mutateAsync({
          id: deviceId,
          x,
          y,
        })
        // No explicit refetch needed, the mutation onSuccess handles invalidation
        // And we already updated local state optimistically.
      } catch (error) {
        console.error('Failed to update device position:', error)
        // Revert on error
        utils.device.list.invalidate({ siteId: activeSiteId || '' })
      }
    }, 1000) // Wait 1 second after last position update before saving
  }, [updateDeviceMutation, utils, activeSiteId])

  const updateMultipleDevices = useCallback(async (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => {
    // Optimistically update UI
    setDevices(prev => {
      const updated = prev.map(device => {
        const update = updates.find(u => u.deviceId === device.id)
        return update ? { ...device, ...update.updates } : device
      })
      saveToHistory(updated)
      return updated
    })

    // Update each device in database
    try {
      await Promise.all(
        updates.map(async ({ deviceId, updates: deviceUpdates }) => {
          const dbUpdates: any = {}
          if (deviceUpdates.x !== undefined) dbUpdates.x = deviceUpdates.x
          if (deviceUpdates.y !== undefined) dbUpdates.y = deviceUpdates.y
          if (deviceUpdates.orientation !== undefined) dbUpdates.orientation = deviceUpdates.orientation
          if (deviceUpdates.status !== undefined) dbUpdates.status = deviceUpdates.status
          if (deviceUpdates.signal !== undefined) dbUpdates.signal = deviceUpdates.signal
          if (deviceUpdates.battery !== undefined) dbUpdates.battery = deviceUpdates.battery
          if (deviceUpdates.zone !== undefined) {
            // We don't save 'zone' property to Device model directly anymore?
            // It seems 'zone' property on Device is for frontend only or legacy.
            // The actual relationship is via ZoneDevice table managed by ZoneContext.
            // But let's keep this safe.
          }

          return updateDeviceMutation.mutateAsync({
            id: deviceId,
            ...dbUpdates,
          })
        })
      )
    } catch (error) {
      console.error('Failed to update multiple devices:', error)
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    }
  }, [updateDeviceMutation, utils, activeSiteId])

  const saveToHistory = (newDevices: Device[]) => {
    setHistory(prev => {
      // Remove any history after current index (when undoing then making new changes)
      const newHistory = prev.slice(0, historyIndex + 1)
      // Add new state
      newHistory.push(JSON.parse(JSON.stringify(newDevices))) // Deep clone
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift()
        setHistoryIndex(49)
      } else {
        setHistoryIndex(newHistory.length - 1)
      }
      return newHistory
    })
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setDevices(JSON.parse(JSON.stringify(history[newIndex]))) // Deep clone
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setDevices(JSON.parse(JSON.stringify(history[newIndex]))) // Deep clone
    }
  }

  const removeDevice = useCallback(async (deviceId: string) => {
    // Optimistically update UI
    setDevices(prev => prev.filter(device => device.id !== deviceId))

    // Delete from database
    try {
      await deleteDeviceMutation.mutateAsync({ id: deviceId })
    } catch (error) {
      console.error('Failed to delete device:', error)
      // Revert by refetching
      utils.device.list.invalidate({ siteId: activeSiteId || '' })
    }
  }, [deleteDeviceMutation, utils, activeSiteId])

  const refreshDevices = useCallback(() => {
    refetchDevices()
  }, [refetchDevices])

  const saveDevices = useCallback(() => {
    // Devices are automatically saved to database on each mutation
    // This function is kept for backward compatibility
    console.log(`✅ Devices are automatically saved to database for ${activeSiteId}`)
  }, [activeSiteId])

  return (
    <DeviceContext.Provider
      value={{
        devices,
        isLoading,
        addDevice,
        updateDevice,
        updateDevicePosition,
        updateMultipleDevices,
        removeDevice,
        setDevices,
        refreshDevices,
        saveDevices,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
      }}
    >
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevices() {
  const context = useContext(DeviceContext)
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider')
  }
  return context
}

