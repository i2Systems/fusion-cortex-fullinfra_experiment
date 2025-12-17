/**
 * Device Lookup Section
 * 
 * Main area: Device list (left side) with toggle for Table/Devices Map/Zones Map views
 * Right panel: Device profile with image placeholder and detailed information
 * 
 * AI Note: I2QR details include build date, CCT, warranty status, parts list.
 * Global search from TopBar should integrate with this.
 */

'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { DeviceList } from '@/components/lookup/DeviceList'
import { DeviceProfilePanel } from '@/components/lookup/DeviceProfilePanel'
import { ViewToggle, type ViewMode } from '@/components/lookup/ViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useStore } from '@/lib/StoreContext'
import { ComponentModal } from '@/components/shared/ComponentModal'
import { ManualDeviceEntry } from '@/components/discovery/ManualDeviceEntry'
import { Component, Device } from '@/lib/mockData'

// Dynamically import MapCanvas and ZoneCanvas to avoid SSR issues with Konva
const MapCanvas = dynamic(() => import('@/components/map/MapCanvas').then(mod => ({ default: mod.MapCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

const ZoneCanvas = dynamic(() => import('@/components/map/ZoneCanvas').then(mod => ({ default: mod.ZoneCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

export default function LookupPage() {
  const { devices, addDevice } = useDevices()
  const { zones } = useZones()
  const { activeStoreId } = useStore()

  // Helper to get store-scoped localStorage key
  const getMapImageKey = () => {
    return activeStoreId ? `fusion_map-image-url_${activeStoreId}` : 'map-image-url'
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [componentParentDevice, setComponentParentDevice] = useState<Device | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Action handlers
  const handleManualEntry = useCallback(() => setShowManualEntry(true), [])
  
  const handleQRScan = useCallback(() => {
    // Mock QR code scanning - simulate finding a device
    const mockDeviceId = `FLX-${Math.floor(Math.random() * 9000) + 1000}`
    const mockSerial = `SN-2024-${Math.floor(Math.random() * 9000) + 1000}-A${Math.floor(Math.random() * 9) + 1}`
    
    // Show a mock "scanning" message
    const confirmed = confirm(`QR Code scanned!\n\nDevice ID: ${mockDeviceId}\nSerial: ${mockSerial}\n\nWould you like to add this device?`)
    
    if (confirmed) {
      const newDevice: Device = {
        id: `device-${Date.now()}`,
        deviceId: mockDeviceId,
        serialNumber: mockSerial,
        type: 'fixture',
        signal: Math.floor(Math.random() * 40) + 50,
        status: 'online',
        location: 'Scanned via QR',
        x: Math.random(),
        y: Math.random(),
      }
      addDevice(newDevice)
    }
  }, [addDevice])
  
  const handleImport = useCallback(() => {
    // Create a hidden file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          let importedDevices: Device[] = []
          
          if (file.name.endsWith('.json')) {
            importedDevices = JSON.parse(text)
          } else if (file.name.endsWith('.csv')) {
            // Simple CSV parsing (mock)
            const lines = text.split('\n').filter(line => line.trim())
            importedDevices = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim())
              return {
                id: `device-${Date.now()}-${Math.random()}`,
                deviceId: values[0] || `FLX-${Math.floor(Math.random() * 9000) + 1000}`,
                serialNumber: values[1] || `SN-${Date.now()}`,
                type: (values[2] || 'fixture') as 'fixture' | 'motion' | 'light-sensor',
                signal: parseInt(values[3]) || Math.floor(Math.random() * 40) + 50,
                status: (values[4] || 'online') as 'online' | 'offline' | 'missing',
                location: values[5] || 'Imported',
                x: Math.random(),
                y: Math.random(),
              } as Device
            })
          }
          
          // Add imported devices
          importedDevices.forEach(device => {
            addDevice({
              ...device,
              id: `device-${Date.now()}-${Math.random()}`,
            })
          })
          
          alert(`Successfully imported ${importedDevices.length} device(s)`)
        } catch (error) {
          alert('Error importing file. Please check the format.')
          console.error('Import error:', error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [addDevice])
  
  const handleExport = useCallback(() => {
    if (devices.length === 0) {
      alert('No devices to export')
      return
    }
    
    // Export as JSON
    const dataStr = JSON.stringify(devices, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `devices-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [devices])

  // Handle action events from DeviceList empty state (for backward compatibility)
  useEffect(() => {
    window.addEventListener('manualEntry', handleManualEntry)
    window.addEventListener('qrScan', handleQRScan)
    window.addEventListener('importList', handleImport)
    window.addEventListener('exportList', handleExport)

    return () => {
      window.removeEventListener('manualEntry', handleManualEntry)
      window.removeEventListener('qrScan', handleQRScan)
      window.removeEventListener('importList', handleImport)
      window.removeEventListener('exportList', handleExport)
    }
  }, [handleManualEntry, handleQRScan, handleImport, handleExport])

  const handleAddDevice = (deviceData: { deviceId: string; serialNumber: string; type: 'fixture' | 'motion' | 'light-sensor' }) => {
    const newDevice: Device = {
      id: `device-${Date.now()}`,
      ...deviceData,
      signal: Math.floor(Math.random() * 40) + 50,
      battery: deviceData.type !== 'fixture' ? Math.floor(Math.random() * 40) + 60 : undefined,
      status: 'online',
      location: 'Manually Added',
      x: Math.random(),
      y: Math.random(),
    }
    addDevice(newDevice)
    setShowManualEntry(false)
  }

  // Load saved map image on mount or when store changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeStoreId) {
      const imageKey = getMapImageKey()
      const savedImageUrl = localStorage.getItem(imageKey)
      if (savedImageUrl) {
        setMapImageUrl(savedImageUrl)
        setMapUploaded(true)
      }
    }
  }, [activeStoreId])

  const handleMapUpload = (imageUrl: string) => {
    setMapImageUrl(imageUrl)
    setMapUploaded(true)
  }

  // Check if we should select a device from sessionStorage (e.g., from faults page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDeviceId = sessionStorage.getItem('selectedDeviceId')
      if (savedDeviceId) {
        const device = devices.find(d => d.id === savedDeviceId)
        if (device) {
          setSelectedDeviceId(savedDeviceId)
        }
        sessionStorage.removeItem('selectedDeviceId')
      }
    }
  }, [devices])

  const selectedDevice = useMemo(() => {
    return devices.find(d => d.id === selectedDeviceId) || null
  }, [devices, selectedDeviceId])

  // Filter devices based on search query - partial match on all fields
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    
    const query = searchQuery.toLowerCase().trim()
    return devices.filter(device => {
      // Search all text fields
      const searchableText = [
        device.deviceId,
        device.serialNumber,
        device.location,
        device.zone,
        device.type,
        device.status,
        String(device.signal), // Convert numbers to strings for partial matching
        device.battery !== undefined ? String(device.battery) : '',
      ].filter(Boolean).join(' ').toLowerCase()
      
      return searchableText.includes(query)
    })
  }, [devices, searchQuery])

  // Prepare devices for map views
  const mapDevices = useMemo(() => {
    return filteredDevices.map(d => ({
      id: d.id,
      x: d.x || 0,
      y: d.y || 0,
      type: d.type,
      deviceId: d.deviceId,
      status: d.status,
      signal: d.signal,
      location: d.location,
      locked: d.locked || false,
      orientation: d.orientation,
      components: d.components,
    }))
  }, [filteredDevices])

  // Prepare zones for zones map view
  const mapZones = useMemo(() => {
    return zones.map(z => ({
      id: z.id,
      name: z.name,
      color: z.color,
      polygon: z.polygon,
    }))
  }, [zones])

  const handleComponentClick = (component: Component, parentDevice: Device) => {
    setSelectedComponent(component)
    setComponentParentDevice(parentDevice)
  }

  const handleCloseComponentModal = () => {
    setSelectedComponent(null)
    setComponentParentDevice(null)
  }

  const renderMainContent = () => {
    if (viewMode === 'table') {
      return (
        <div className="fusion-card overflow-hidden h-full flex flex-col">
          <DeviceList
            devices={filteredDevices}
            selectedDeviceId={selectedDeviceId}
            onDeviceSelect={setSelectedDeviceId}
            searchQuery={searchQuery}
          />
        </div>
      )
    }

    if (viewMode === 'devices-map') {
      if (!mapUploaded) {
        return (
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <MapUpload onMapUpload={handleMapUpload} />
          </div>
        )
      }

      return (
        <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
          <div className="w-full h-full rounded-2xl overflow-hidden">
            <MapCanvas 
              onDeviceSelect={setSelectedDeviceId}
              selectedDeviceId={selectedDeviceId}
              mapImageUrl={mapImageUrl}
              highlightDeviceId={selectedDeviceId}
              mode="select"
              devices={mapDevices}
              devicesData={filteredDevices}
            />
          </div>
        </div>
      )
    }

    if (viewMode === 'zones-map') {
      if (!mapUploaded) {
        return (
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <MapUpload onMapUpload={handleMapUpload} />
          </div>
        )
      }

      return (
        <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
          <div className="w-full h-full rounded-2xl overflow-hidden">
            <ZoneCanvas 
              onDeviceSelect={setSelectedDeviceId}
              selectedDeviceId={selectedDeviceId}
              mapImageUrl={mapImageUrl}
              devices={mapDevices}
              zones={mapZones}
              selectedZoneId={null}
              onZoneSelect={() => {}}
              mode="select"
              devicesData={filteredDevices}
            />
          </div>
        </div>
      )
    }

    return null
  }

  // Handle clicking outside the list and panel to deselect
  const handleMainContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Deselect if clicking outside both the list container and panel
    if (
      listContainerRef.current &&
      panelRef.current &&
      !listContainerRef.current.contains(target) &&
      !panelRef.current.contains(target)
    ) {
      setSelectedDeviceId(null)
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Device Lookup"
          subtitle="Search for devices by ID or serial number"
          placeholder="Enter device ID or serial number..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main Content: Device List/Map + Profile Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" 
        style={{ overflow: 'visible' }}
        onClick={handleMainContentClick}
      >
        {/* Main View - Left Side */}
        <div 
          ref={listContainerRef}
          className="flex-1 min-w-0 flex flex-col"
        >
          {/* View Toggle - Top of main content */}
          <div className="mb-3 flex items-center justify-between">
            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
          </div>
          
          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {renderMainContent()}
          </div>
        </div>

        {/* Device Profile Panel - Right Side */}
        <div ref={panelRef}>
        <DeviceProfilePanel 
          device={selectedDevice} 
          onComponentClick={handleComponentClick}
          onManualEntry={handleManualEntry}
          onQRScan={handleQRScan}
          onImport={handleImport}
          onExport={handleExport}
        />
        </div>
      </div>

      {/* Component Modal */}
      <ComponentModal
        component={selectedComponent}
        parentDevice={componentParentDevice}
        isOpen={selectedComponent !== null}
        onClose={handleCloseComponentModal}
      />

      {/* Manual Entry Modal */}
      <ManualDeviceEntry
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onAdd={handleAddDevice}
      />
    </div>
  )
}
