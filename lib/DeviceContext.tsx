/**
 * Device Context
 * 
 * Shared state management for devices across the entire app.
 * Ensures all pages (Map, Zones, Lookup, Faults) use the same device data.
 * 
 * AI Note: 
 * - Store-aware: Data is namespaced by store ID in localStorage
 * - Automatically reloads when active store changes
 * - In production, this would sync with tRPC/API and persist to database
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Device, mockDevices as initialMockDevices } from './mockData'
import { seedDevices } from './seedDevices'
import { useStore } from './StoreContext'
import { generateStoreData } from './storeData'

interface DeviceContextType {
  devices: Device[]
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
  const { activeStoreId } = useStore()
  const [devices, setDevices] = useState<Device[]>([])
  const [history, setHistory] = useState<Device[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Helper to get store-scoped localStorage keys
  const getStorageKey = (key: string) => {
    return activeStoreId ? `fusion_${key}_${activeStoreId}` : `fusion_${key}`
  }

  // Load devices when store changes or on mount
  useEffect(() => {
    if (!activeStoreId) return // Wait for store to be initialized
    
    // In production, this would load from tRPC/API
    const DATA_VERSION = 'v4-store-aware'
    const storageKey = getStorageKey('devices')
    const versionKey = getStorageKey('devices_version')
    const savedKey = getStorageKey('devices_saved')
    
    const savedVersion = typeof window !== 'undefined' ? localStorage.getItem(versionKey) : null
    const devicesSaved = typeof window !== 'undefined' ? localStorage.getItem(savedKey) === 'true' : false
    
    // Generate store-specific initial data
    const storeData = generateStoreData(activeStoreId)
    const initialDevices = storeData.devices
    
    // PRIORITY 0: Check for seed data (committed to repo) - use this for fresh deployments
    // Note: Seed data is store-agnostic, so we'll use it as fallback only
    if (seedDevices && seedDevices.length > 0 && !devicesSaved) {
      const restored = seedDevices.map((device: Device) => {
        if (device.components) {
          return {
            ...device,
            components: device.components.map((comp: any) => ({
              ...comp,
              warrantyExpiry: comp.warrantyExpiry ? new Date(comp.warrantyExpiry) : undefined,
              buildDate: comp.buildDate ? new Date(comp.buildDate) : undefined,
            })),
            warrantyExpiry: device.warrantyExpiry ? new Date(device.warrantyExpiry as any) : undefined,
          }
        }
        return device
      })
      setDevices(restored)
      setHistory([restored])
      setHistoryIndex(0)
      // Also save to localStorage so it persists in this session
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(restored))
        localStorage.setItem(versionKey, DATA_VERSION)
      }
      console.log(`✅ Loaded ${restored.length} devices from seed data for ${activeStoreId}`)
      return
    }
    
    // PRIORITY 1: If devices are marked as saved, always load them (regardless of version)
    if (devicesSaved && typeof window !== 'undefined') {
      const savedDevices = localStorage.getItem(storageKey)
      if (savedDevices) {
        try {
          const parsed = JSON.parse(savedDevices)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const restored = parsed.map((device: Device) => {
              if (device.components) {
                return {
                  ...device,
                  components: device.components.map((comp: any) => ({
                    ...comp,
                    warrantyExpiry: comp.warrantyExpiry ? new Date(comp.warrantyExpiry) : undefined,
                    buildDate: comp.buildDate ? new Date(comp.buildDate) : undefined,
                  })),
                  warrantyExpiry: device.warrantyExpiry ? new Date(device.warrantyExpiry as any) : undefined,
                }
              }
              return device
            })
            setDevices(restored)
            setHistory([restored])
            setHistoryIndex(0)
            console.log(`✅ Loaded ${restored.length} saved devices from localStorage for ${activeStoreId} (protected from reset)`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved devices:', e)
        }
      }
    }
    
    // PRIORITY 2: Check localStorage for any manually added devices (if version matches)
    if (typeof window !== 'undefined' && savedVersion === DATA_VERSION) {
      const savedDevices = localStorage.getItem(storageKey)
      if (savedDevices) {
        try {
          const parsed = JSON.parse(savedDevices)
          // Restore Date objects for components (they get serialized as strings)
          const restored = parsed.map((device: Device) => {
            if (device.components) {
              return {
                ...device,
                components: device.components.map((comp: any) => ({
                  ...comp,
                  warrantyExpiry: comp.warrantyExpiry ? new Date(comp.warrantyExpiry) : undefined,
                  buildDate: comp.buildDate ? new Date(comp.buildDate) : undefined,
                })),
                warrantyExpiry: device.warrantyExpiry ? new Date(device.warrantyExpiry as any) : undefined,
              }
            }
            return device
          })
          // Merge with fresh mock data to ensure all devices have components
          const merged = restored.map((saved: Device) => {
            const fresh = initialDevices.find(d => d.id === saved.id || d.deviceId === saved.deviceId)
            if (fresh && fresh.components && (!saved.components || saved.components.length === 0)) {
              return { ...saved, components: fresh.components, warrantyStatus: fresh.warrantyStatus, warrantyExpiry: fresh.warrantyExpiry }
            }
            return saved
          })
          setDevices(merged)
          setHistory([merged])
          setHistoryIndex(0)
          console.log(`✅ Loaded ${merged.length} devices from localStorage for ${activeStoreId}`)
          return
        } catch (e) {
          console.error('Failed to parse saved devices:', e)
        }
      }
    }
    
    // PRIORITY 3: If version doesn't match or no saved data, use fresh store-specific data
    if (typeof window !== 'undefined') {
      localStorage.setItem(versionKey, DATA_VERSION)
    }
    
    setDevices(initialDevices)
    setHistory([initialDevices])
    setHistoryIndex(0)
    console.log(`✅ Loaded ${initialDevices.length} devices for ${activeStoreId} (fresh data)`)
  }, [activeStoreId])

  // Save to localStorage whenever devices change (store-scoped)
  useEffect(() => {
    if (typeof window !== 'undefined' && devices.length > 0 && activeStoreId) {
      const storageKey = getStorageKey('devices')
      localStorage.setItem(storageKey, JSON.stringify(devices))
    }
  }, [devices, activeStoreId])

  const addDevice = (device: Device) => {
    setDevices(prev => {
      // Check if device already exists (by ID or serial number)
      const exists = prev.some(d => d.id === device.id || d.serialNumber === device.serialNumber)
      if (exists) {
        return prev // Don't add duplicates
      }
      return [...prev, device]
    })
  }

  const updateDevice = (deviceId: string, updates: Partial<Device>) => {
    setDevices(prev => {
      const updated = prev.map(device => 
        device.id === deviceId ? { ...device, ...updates } : device
      )
      // Save to history for undo/redo
      saveToHistory(updated)
      return updated
    })
  }

  const updateDevicePosition = (deviceId: string, x: number, y: number) => {
    setDevices(prev => {
      const updated = prev.map(device => 
        device.id === deviceId ? { ...device, x, y } : device
      )
      // Don't save every position update to history (too many), only on drag end
      return updated
    })
  }

  const updateMultipleDevices = (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => {
    setDevices(prev => {
      const updated = prev.map(device => {
        const update = updates.find(u => u.deviceId === device.id)
        return update ? { ...device, ...update.updates } : device
      })
      // Save to history for undo/redo
      saveToHistory(updated)
      return updated
    })
  }

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

  const removeDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(device => device.id !== deviceId))
  }

  const refreshDevices = () => {
    // In production, this would fetch from tRPC/API
    setDevices(initialMockDevices)
  }

  const saveDevices = () => {
    // Mark devices as saved - this prevents them from being reset
    if (typeof window !== 'undefined' && devices.length > 0 && activeStoreId) {
      const storageKey = getStorageKey('devices')
      const savedKey = getStorageKey('devices_saved')
      const versionKey = getStorageKey('devices_version')
      localStorage.setItem(storageKey, JSON.stringify(devices))
      localStorage.setItem(savedKey, 'true')
      localStorage.setItem(versionKey, 'v4-store-aware')
      console.log(`✅ Saved ${devices.length} devices to system for ${activeStoreId} (protected from reset)`)
    } else {
      console.warn('Cannot save: No devices to save or no active store')
    }
  }

  return (
    <DeviceContext.Provider
      value={{
        devices,
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

