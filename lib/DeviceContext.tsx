/**
 * Device Context
 * 
 * Shared state management for devices across the entire app.
 * Ensures all pages (Discovery, Map, Zones, Lookup) use the same device data.
 * 
 * AI Note: In production, this would sync with tRPC/API and persist to database.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Device, mockDevices as initialMockDevices } from './mockData'

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
  const [devices, setDevices] = useState<Device[]>([])
  const [history, setHistory] = useState<Device[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Load initial devices from mockData on mount
  useEffect(() => {
    // In production, this would load from tRPC/API
    const initialDevices = initialMockDevices
    
    // Check for data version to force regeneration when positioning logic changes
    const DATA_VERSION = 'v2-grid-placement'
    const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('fusion_devices_version') : null
    const devicesSaved = typeof window !== 'undefined' ? localStorage.getItem('fusion_devices_saved') === 'true' : false
    
    // PRIORITY: If devices are marked as saved, always load them (regardless of version)
    if (devicesSaved && typeof window !== 'undefined') {
      const savedDevices = localStorage.getItem('fusion_devices')
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
            console.log(`✅ Loaded ${restored.length} saved devices from localStorage (protected from reset)`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved devices:', e)
        }
      }
    }
    
    // Also check localStorage for any manually added devices (if version matches)
    if (typeof window !== 'undefined' && savedVersion === DATA_VERSION) {
      const savedDevices = localStorage.getItem('fusion_devices')
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
          // Ensure the fault story device (FLX-3158) is always present
          const faultDeviceId = 'device-fault-grocery-001'
          const faultDeviceExists = restored.some((d: Device) => d.id === faultDeviceId || d.deviceId === 'FLX-3158')
          if (!faultDeviceExists) {
            // Add the fault device if it doesn't exist
            const faultDevice = initialDevices.find(d => d.id === faultDeviceId)
            if (faultDevice) {
              restored.push(faultDevice)
            }
          }
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
          return
        } catch (e) {
          console.error('Failed to parse saved devices:', e)
        }
      }
    }
    
    // If version doesn't match or no saved data, use fresh data and set version
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_devices_version', DATA_VERSION)
    }
    
    setDevices(initialDevices)
    setHistory([initialDevices])
    setHistoryIndex(0)
  }, [])

  // Save to localStorage whenever devices change
  useEffect(() => {
    if (typeof window !== 'undefined' && devices.length > 0) {
      localStorage.setItem('fusion_devices', JSON.stringify(devices))
    }
  }, [devices])

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
    if (typeof window !== 'undefined' && devices.length > 0) {
      localStorage.setItem('fusion_devices', JSON.stringify(devices))
      localStorage.setItem('fusion_devices_saved', 'true')
      localStorage.setItem('fusion_devices_version', 'v2-grid-placement')
      console.log(`✅ Saved ${devices.length} devices to system (protected from reset)`)
    } else {
      console.warn('Cannot save: No devices to save')
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

