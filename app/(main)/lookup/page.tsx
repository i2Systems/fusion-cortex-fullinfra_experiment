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

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { DeviceList } from '@/components/lookup/DeviceList'
import { DeviceProfilePanel } from '@/components/lookup/DeviceProfilePanel'
import { ViewToggle, type ViewMode } from '@/components/lookup/ViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { ComponentModal } from '@/components/shared/ComponentModal'
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
  const { devices } = useDevices()
  const { zones } = useZones()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [componentParentDevice, setComponentParentDevice] = useState<Device | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)

  // Load saved map image on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedImageUrl = localStorage.getItem('map-image-url')
      if (savedImageUrl) {
        setMapImageUrl(savedImageUrl)
        setMapUploaded(true)
      }
    }
  }, [])

  const handleMapUpload = (imageUrl: string) => {
    setMapImageUrl(imageUrl)
    setMapUploaded(true)
  }

  const selectedDevice = useMemo(() => {
    return devices.find(d => d.id === selectedDeviceId) || null
  }, [devices, selectedDeviceId])

  // Filter devices based on search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    
    const query = searchQuery.toLowerCase().trim()
    return devices.filter(device => 
      device.deviceId.toLowerCase().includes(query) ||
      device.serialNumber.toLowerCase().includes(query) ||
      (device.location && device.location.toLowerCase().includes(query)) ||
      (device.zone && device.zone.toLowerCase().includes(query))
    )
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
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" style={{ overflow: 'visible' }}>
        {/* Main View - Left Side */}
        <div className="flex-1 min-w-0 flex flex-col">
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
        <DeviceProfilePanel 
          device={selectedDevice} 
          onComponentClick={handleComponentClick}
        />
      </div>

      {/* Component Modal */}
      <ComponentModal
        component={selectedComponent}
        parentDevice={componentParentDevice}
        isOpen={selectedComponent !== null}
        onClose={handleCloseComponentModal}
      />
    </div>
  )
}
