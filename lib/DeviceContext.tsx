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
    
    // Also check localStorage for any manually added devices
    if (typeof window !== 'undefined') {
      const savedDevices = localStorage.getItem('fusion_devices')
      if (savedDevices) {
        try {
          const parsed = JSON.parse(savedDevices)
          setDevices(parsed)
          setHistory([parsed])
          setHistoryIndex(0)
          return
        } catch (e) {
          console.error('Failed to parse saved devices:', e)
        }
      }
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

