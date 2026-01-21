/**
 * Device Context
 * 
 * Shared state management for devices across the entire app.
 * Ensures all pages (Map, Zones, Lookup, Faults) use the same device data.
 * 
 * Refactored: Now uses extracted hooks for mutations and undo/redo.
 * 
 * AI Note: 
 * - Store-aware: Data is scoped by site ID
 * - Automatically reloads when active store changes
 * - Uses tRPC to sync with database
 * - Undo/redo managed by useUndoable hook
 * - Mutations managed by useDeviceMutations hook
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { Device } from './mockData'
import { useSite } from './SiteContext'
import { trpc } from './trpc/client'
import { useUndoable } from './hooks/useUndoable'
import { useDeviceMutations } from './hooks/useDeviceMutations'
import { useErrorHandler } from './hooks/useErrorHandler'

interface DeviceContextType {
  devices: Device[]
  isLoading: boolean
  error: unknown
  addDevice: (device: Device) => void
  updateDevice: (deviceId: string, updates: Partial<Device>) => void
  updateDevicePosition: (deviceId: string, x: number, y: number) => void
  updateMultipleDevices: (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => void
  removeDevice: (deviceId: string) => void
  removeMultipleDevices: (deviceIds: string[]) => void
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
  const { handleError } = useErrorHandler()

  // Undo/redo state management via extracted hook
  const undoableDevices = useUndoable<Device[]>([])

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      retryDelay: 1000,
    }
  )

  // Show error toast but don't block UI
  useEffect(() => {
    if (error) {
      handleError(error, { title: 'Failed to load devices' })
    }
  }, [error, handleError])

  // Mutations via extracted hook with optimistic update callback
  const mutations = useDeviceMutations((updater) => {
    undoableDevices.set(updater(undoableDevices.current))
  })

  // Ensure site exists when store changes (only once per store)
  useEffect(() => {
    if (!activeSiteId) return
    if (ensuredSiteIdRef.current === activeSiteId) return

    ensuredSiteIdRef.current = activeSiteId

    const siteName = activeSite?.name || `Site ${activeSiteId}`
    const siteNumber = activeSite?.siteNumber || activeSiteId.replace('site-', '')

    ensureSiteMutation.mutate({
      id: activeSiteId,
      name: siteName,
      storeNumber: siteNumber,
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

  // Track site changes for clearing devices
  const previousSiteIdRef = useRef<string | null>(null)



  // Clear devices when site changes
  useEffect(() => {
    if (activeSiteId !== previousSiteIdRef.current && previousSiteIdRef.current !== null) {
      undoableDevices.reset([])
    }
    previousSiteIdRef.current = activeSiteId
  }, [activeSiteId])

  // Sync from database when data changes
  useEffect(() => {
    if (devicesData !== undefined) {
      undoableDevices.reset(devicesData)
    }
  }, [devicesData])

  // Wrapper functions to maintain API compatibility
  const addDevice = useCallback((device: Device) => {
    // Functional update to avoid stale closure
    mutations.addDevice(device)
    undoableDevices.set(currentDevices => {
      // Check if already exists
      const devices = currentDevices || []
      const existingIndex = devices.findIndex(
        d => d.id === device.id || d.serialNumber === device.serialNumber
      )

      if (existingIndex >= 0) {
        // Update existing device with new data (this moves it to palette if x/y become undefined)
        const updatedDevices = [...devices]
        updatedDevices[existingIndex] = { ...devices[existingIndex], ...device }
        return updatedDevices
      }

      return [...devices, device]
    })
  }, [mutations, undoableDevices])

  const updateDevice = useCallback((deviceId: string, updates: Partial<Device>) => {
    undoableDevices.set(currentDevices =>
      currentDevices.map(device =>
        device.id === deviceId ? { ...device, ...updates } : device
      )
    )
    mutations.updateDevice(deviceId, updates)
  }, [mutations, undoableDevices])

  const updateDevicePosition = useCallback((deviceId: string, x: number, y: number) => {
    // Use setWithoutHistory for position during drag, commit on dragEnd
    undoableDevices.setWithoutHistory(currentDevices =>
      currentDevices.map(device =>
        device.id === deviceId ? { ...device, x, y } : device
      )
    )
    mutations.updateDevicePosition(deviceId, x, y)
  }, [mutations, undoableDevices])

  const updateMultipleDevices = useCallback((updates: Array<{ deviceId: string; updates: Partial<Device> }>) => {
    undoableDevices.set(currentDevices =>
      currentDevices.map(device => {
        const update = updates.find(u => u.deviceId === device.id)
        return update ? { ...device, ...update.updates } : device
      })
    )
    mutations.updateMultipleDevices(updates)
  }, [mutations, undoableDevices])

  const removeDevice = useCallback((deviceId: string) => {
    mutations.removeDevice(deviceId)
  }, [mutations])

  const removeMultipleDevices = useCallback((deviceIds: string[]) => {
    mutations.removeMultipleDevices(deviceIds)
  }, [mutations])

  const setDevices = useCallback((devices: Device[]) => {
    undoableDevices.set(devices)
  }, [undoableDevices])

  const refreshDevices = useCallback(() => {
    refetchDevices()
  }, [refetchDevices])

  const saveDevices = useCallback(() => {
    // Devices are automatically saved to database via mutations
  }, [])

  return (
    <DeviceContext.Provider
      value={{
        devices: undoableDevices.current ?? [],
        isLoading,
        error: error ?? null,
        addDevice,
        updateDevice,
        updateDevicePosition,
        updateMultipleDevices,
        removeDevice,
        removeMultipleDevices,
        setDevices,
        refreshDevices,
        saveDevices,
        undo: undoableDevices.undo,
        redo: undoableDevices.redo,
        canUndo: undoableDevices.canUndo,
        canRedo: undoableDevices.canRedo,
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
