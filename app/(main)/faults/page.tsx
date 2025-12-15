/**
 * Faults / Health Section
 * 
 * Main area: Fault list (left side)
 * Right panel: Fault details with troubleshooting steps
 * 
 * AI Note: Shows device health issues, missing devices, offline devices, low battery warnings.
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapViewToggle, type MapViewMode } from '@/components/shared/MapViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { FaultList } from '@/components/faults/FaultList'
import { FaultDetailsPanel } from '@/components/faults/FaultDetailsPanel'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { Device } from '@/lib/mockData'
import { FaultCategory, assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'

// Dynamically import FaultsMapCanvas to avoid SSR issues with Konva
const FaultsMapCanvas = dynamic(() => import('@/components/faults/FaultsMapCanvas').then(mod => ({ default: mod.FaultsMapCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

interface Fault {
  device: Device
  faultType: FaultCategory
  detectedAt: Date
  description: string
}

export default function FaultsPage() {
  const { devices } = useDevices()
  const { zones } = useZones()
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<MapViewMode>('list')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

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

  // Check if we should highlight a specific device (from dashboard navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const highlightDevice = sessionStorage.getItem('highlightDevice')
      if (highlightDevice) {
        // Find the device by deviceId
        const device = devices.find(d => d.deviceId === highlightDevice)
        if (device) {
          setSelectedFaultId(device.id)
          setSelectedDeviceId(device.id)
          // Clear the highlight after selecting
          sessionStorage.removeItem('highlightDevice')
        }
      }
    }
  }, [devices])

  // Handle device selection from map
  const handleDeviceSelect = (deviceId: string | null) => {
    setSelectedDeviceId(deviceId)
    if (deviceId) {
      setSelectedFaultId(deviceId)
    }
  }

  // Generate faults from devices
  const faults = useMemo<Fault[]>(() => {
    const faultList: Fault[] = []

    devices.forEach(device => {
      // Missing devices - assign realistic fault category
      if (device.status === 'missing') {
        // Ensure the story device (FLX-3158) always gets environmental-ingress for consistency
        const faultCategory = device.id === 'device-fault-grocery-001' 
          ? 'environmental-ingress' 
          : assignFaultCategory(device)
        faultList.push({
          device,
          faultType: faultCategory,
          detectedAt: device.id === 'device-fault-grocery-001'
            ? new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago for story consistency
            : new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 24) + 1)),
          description: generateFaultDescription(faultCategory, device.deviceId),
        })
      }
      // Offline devices - assign realistic fault category
      else if (device.status === 'offline') {
        const faultCategory = assignFaultCategory(device)
        faultList.push({
          device,
          faultType: faultCategory,
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 48) + 1)),
          description: generateFaultDescription(faultCategory, device.deviceId),
        })
      }
      // Low battery devices - still track separately but can also have other issues
      if (device.battery !== undefined && device.battery < 20) {
        // Low battery can be a symptom, but also create a separate entry
        const faultCategory = device.status === 'offline' || device.status === 'missing' 
          ? assignFaultCategory(device)
          : 'electrical-driver' // Low battery often indicates power issues
        faultList.push({
          device,
          faultType: faultCategory,
          detectedAt: new Date(Date.now() - 1000 * 60 * (Math.floor(Math.random() * 120) + 30)),
          description: device.battery < 10 
            ? `Critical battery level (${device.battery}%). Device may shut down. Power supply or charging system issue suspected.`
            : `Battery level is below 20% (${device.battery}%). Replacement recommended. May indicate charging system or power supply problem.`,
        })
      }
    })

    // Sort by detected time (most recent first)
    return faultList.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }, [devices])

  const selectedFault = useMemo(() => {
    return faults.find(f => f.device.id === selectedFaultId) || null
  }, [faults, selectedFaultId])

  // Filter faults based on selected device
  const filteredFaults = useMemo(() => {
    let filtered = faults
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(fault => {
        const categoryInfo = faultCategories[fault.faultType]
        return (
          fault.device.deviceId.toLowerCase().includes(query) ||
          fault.device.serialNumber.toLowerCase().includes(query) ||
          (fault.device.location && fault.device.location.toLowerCase().includes(query)) ||
          (fault.device.zone && fault.device.zone.toLowerCase().includes(query)) ||
          fault.faultType.toLowerCase().includes(query) ||
          (categoryInfo && (
            categoryInfo.label.toLowerCase().includes(query) ||
            categoryInfo.shortLabel.toLowerCase().includes(query) ||
            categoryInfo.description.toLowerCase().includes(query)
          )) ||
          fault.description.toLowerCase().includes(query)
        )
      })
    }
    
    // Apply device filter (only if device is selected)
    if (selectedDeviceId) {
      filtered = filtered.filter(fault => fault.device.id === selectedDeviceId)
    }
    
    return filtered
  }, [faults, searchQuery, selectedDeviceId])

  // Prepare zones for map
  const mapZones = useMemo(() => {
    return zones.map(z => ({
      id: z.id,
      name: z.name,
      color: z.color,
      polygon: z.polygon,
    }))
  }, [zones])

  // Prepare devices for map with fault indicators
  const mapDevices = useMemo(() => {
    return devices.map(d => {
      const deviceFaults = faults.filter(f => f.device.id === d.id)
      return {
        id: d.id,
        x: d.x || 0,
        y: d.y || 0,
        type: d.type,
        deviceId: d.deviceId,
        status: d.status,
        signal: d.signal,
        location: d.location,
        hasFault: deviceFaults.length > 0,
        faultCount: deviceFaults.length,
        faultType: deviceFaults[0]?.faultType,
      }
    })
  }, [devices, faults])

  // Calculate summary counts by category
  const summary = useMemo(() => {
    const categoryMap: Record<string, FaultCategory> = {
      environmental: 'environmental-ingress',
      electrical: 'electrical-driver',
      installation: 'installation-wiring',
      control: 'control-integration',
      thermal: 'thermal-overheat',
      optical: 'optical-output',
      mechanical: 'mechanical-structural',
      manufacturing: 'manufacturing-defect',
    }
    
    const counts: Record<string, { category: FaultCategory; count: number }> = {}
    
    Object.entries(categoryMap).forEach(([key, category]) => {
      counts[key] = {
        category,
        count: faults.filter(f => f.faultType === category).length,
      }
    })
    
    // Top 3 most common for summary cards
    const topCategories = Object.entries(counts)
      .filter(([, data]) => data.count > 0)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([, data]) => data)
    
    return {
      topCategories,
      total: faults.length,
    }
  }, [faults])

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Faults / Health"
          subtitle="Monitor device health and system status"
          placeholder="Search faults or devices..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Summary Cards */}
      <div className="flex-shrink-0 px-[20px] pb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.topCategories.map((item, index) => {
            const categoryInfo = faultCategories[item.category]
            const colorClass = index === 0 
              ? 'text-[var(--color-danger)]' 
              : index === 1 
              ? 'text-[var(--color-warning)]' 
              : 'text-[var(--color-warning)]'
            
            return (
              <div key={item.category} className="fusion-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {categoryInfo.shortLabel}
                  </span>
                  <span className={`text-2xl font-bold ${colorClass}`}>
                    {item.count}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {categoryInfo.description.split('.')[0]}
                </div>
              </div>
            )
          })}
          {summary.topCategories.length === 0 && (
            <div className="fusion-card md:col-span-3">
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No faults detected. All devices are healthy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Fault List/Map + Details Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-2 pb-14 overflow-hidden">
        {/* Fault List/Map - Left Side */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* View Toggle */}
          <div className="mb-3 flex items-center justify-between">
            <MapViewToggle currentView={viewMode} onViewChange={setViewMode} />
            {selectedDeviceId && viewMode === 'map' && (
              <button
                onClick={() => {
                  setSelectedDeviceId(null)
                  setSelectedFaultId(null)
                }}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {viewMode === 'list' ? (
              <div className="fusion-card overflow-hidden h-full flex flex-col">
                <FaultList
                  faults={filteredFaults}
                  selectedFaultId={selectedFaultId}
                  onFaultSelect={setSelectedFaultId}
                  searchQuery={searchQuery}
                />
              </div>
            ) : (
              <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
                {!mapUploaded ? (
                  <div className="w-full h-full">
                    <MapUpload onMapUpload={handleMapUpload} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden">
                    <FaultsMapCanvas
                      zones={mapZones}
                      devices={mapDevices}
                      faults={faults}
                      mapImageUrl={mapImageUrl}
                      selectedDeviceId={selectedDeviceId}
                      onDeviceSelect={handleDeviceSelect}
                      devicesData={devices}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fault Details Panel - Right Side */}
        <FaultDetailsPanel fault={selectedFault} />
      </div>
    </div>
  )
}
