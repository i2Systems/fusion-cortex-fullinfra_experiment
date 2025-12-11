/**
 * Zones Section
 * 
 * Map + multi-select in main area.
 * Right panel: Zone properties (name, color, daylight settings).
 * 
 * AI Note: Zones are the unit of control for BMS + rules.
 * Users can drag-select devices on map to create zones.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapUpload } from '@/components/map/MapUpload'
import { ZonesPanel } from '@/components/zones/ZonesPanel'
import { ZoneToolbar, ZoneToolMode } from '@/components/zones/ZoneToolbar'
import { MapFiltersPanel, type MapFilters } from '@/components/map/MapFiltersPanel'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useRole } from '@/lib/role'

// Dynamically import ZoneCanvas to avoid SSR issues with Konva
const ZoneCanvas = dynamic(() => import('@/components/map/ZoneCanvas').then(mod => ({ default: mod.ZoneCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

const ZONE_COLORS = [
  '#4c7dff', // primary blue
  '#f97316', // accent orange
  '#22c55e', // success green
  '#eab308', // warning yellow
  '#a855f7', // purple
  '#ec4899', // pink
]

export default function ZonesPage() {
  const { devices, updateMultipleDevices } = useDevices()
  const { zones, addZone, updateZone, deleteZone, getDevicesInZone } = useZones()
  const { role } = useRole()
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<ZoneToolMode>('select')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MapFilters>({
    showMap: true,
    showFixtures: true,
    showMotion: true,
    showLightSensors: true,
    selectedZones: [],
  })

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

  const handleClearMap = () => {
    setMapImageUrl(null)
    setMapUploaded(false)
    setSelectedZone(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('map-image-url')
    }
  }

  const handleZoneCreated = (polygon: Array<{ x: number; y: number }>) => {
    const zoneNumber = zones.length + 1
    const color = ZONE_COLORS[(zoneNumber - 1) % ZONE_COLORS.length]
    const devicesInZone = devices.filter(d => {
      if (d.x === undefined || d.y === undefined) return false
      // Simple point-in-polygon check
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x
        const yi = polygon[i].y
        const xj = polygon[j].x
        const yj = polygon[j].y
        const intersect = ((yi > d.y) !== (yj > d.y)) &&
          (d.x < (xj - xi) * (d.y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
      }
      return inside
    })

    const newZone = addZone({
      name: `Zone ${zoneNumber}`,
      color,
      description: `${devicesInZone.length} devices`,
      polygon,
      deviceIds: devicesInZone.map(d => d.id),
    })

    // Update devices to have this zone
    if (devicesInZone.length > 0) {
      updateMultipleDevices(
        devicesInZone.map(device => ({
          deviceId: device.id,
          updates: { zone: newZone.name }
        }))
      )
    }

    setSelectedZone(newZone.id)
    setToolMode('select')
  }

  const handleDeleteZone = () => {
    if (selectedZone) {
      deleteZone(selectedZone)
      setSelectedZone(null)
    }
  }

  // Convert zones to format for ZonesPanel
  const zonesForPanel = useMemo(() => {
    console.log('Zones for panel:', zones.length, 'zones')
    return zones.map(zone => {
      const devicesInZone = getDevicesInZone(zone.id, devices)
      return {
        id: zone.id,
        name: zone.name,
        deviceCount: devicesInZone.length,
        description: zone.description || `${devicesInZone.length} devices`,
        color: zone.color,
      }
    })
  }, [zones, devices, getDevicesInZone])
  
  // Debug: Log zones on mount
  useEffect(() => {
    console.log('Zones page - zones count:', zones.length)
    console.log('Zones:', zones.map(z => ({ id: z.id, name: z.name, deviceCount: z.deviceIds.length })))
  }, [zones])

  // Get unique zones from devices for filter panel
  const availableZones = useMemo(() => {
    const zoneSet = new Set<string>()
    devices.forEach(d => {
      if (d.zone) zoneSet.add(d.zone)
    })
    return Array.from(zoneSet).sort()
  }, [devices])

  // Get devices for the selected zone, or all devices if no zone selected
  // Make devices more subtle on zones page (smaller, more transparent)
  // Also apply layer filters
  const zoneDevices = useMemo(() => {
    let filteredDevices = selectedZone 
      ? devices.filter(d => d.zone === selectedZone)
      : devices

    // Apply layer visibility filters
    filteredDevices = filteredDevices.filter(device => {
      if (device.type === 'fixture' && !filters.showFixtures) return false
      if (device.type === 'motion' && !filters.showMotion) return false
      if (device.type === 'light-sensor' && !filters.showLightSensors) return false
      return true
    })
    
    return filteredDevices.map(d => ({
      id: d.id,
      x: d.x || 0,
      y: d.y || 0,
      type: d.type,
      deviceId: d.deviceId,
      status: d.status,
      signal: d.signal,
      location: d.location,
    }))
  }, [selectedZone, devices, filters])

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3 relative">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          showActions={mapUploaded}
          title="Zones"
          subtitle="Create and manage control zones for your lighting system"
          placeholder={mapUploaded ? "Search zones, devices, or type 'create zone'..." : "Upload a map to manage zones..."}
          onLayersClick={() => setShowFilters(!showFilters)}
          filterCount={filters.selectedZones.length > 0 || !filters.showFixtures || !filters.showMotion || !filters.showLightSensors ? 1 : 0}
          onActionDetected={(action) => {
            if (action.id === 'create-zone' && mapUploaded) {
              setToolMode('draw-polygon')
            } else if (action.id === 'upload-map' && !mapUploaded) {
              // Focus on map upload area
              document.querySelector('[data-map-upload]')?.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        />
        {mapUploaded && showFilters && (
          <div className="absolute top-full right-[20px] mt-2 z-50">
            <MapFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableZones={availableZones}
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}
      </div>

      {/* Main Content: Map + Zones Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" style={{ overflow: 'visible' }}>
        {/* Map Canvas - Left Side */}
        <div className="flex-1 relative min-w-0 rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)]" style={{ overflow: 'visible', minHeight: 0 }}>
          {/* Zone Toolbar - Top center (hidden for Manager and Technician) */}
          {mapUploaded && role !== 'Manager' && role !== 'Technician' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{ transform: 'translateX(-50%) translateY(-50%)' }}>
              <ZoneToolbar
                mode={toolMode}
                onModeChange={setToolMode}
                onDeleteZone={handleDeleteZone}
                canDelete={!!selectedZone}
              />
            </div>
          )}
          
          {/* Clear button - Top right (hidden for Manager and Technician) */}
          {mapUploaded && role !== 'Manager' && role !== 'Technician' && (
            <div className="absolute top-0 right-4 z-30 pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
              <div className="pointer-events-auto">
                <button
                  onClick={handleClearMap}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-danger)] transition-all duration-200 shadow-[var(--shadow-soft)]"
                  title="Clear map and show upload"
                >
                  <X size={18} />
                  <span className="text-sm font-medium">Clear</span>
                </button>
              </div>
            </div>
          )}
          {!mapUploaded ? (
            <div className="w-full h-full">
              <MapUpload onMapUpload={handleMapUpload} />
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: 0 }}>
              <ZoneCanvas 
                onDeviceSelect={setSelectedZone}
                selectedDeviceId={selectedZone}
                mapImageUrl={filters.showMap ? mapImageUrl : null}
                devices={zoneDevices}
                zones={zones.map(z => ({
                  id: z.id,
                  name: z.name,
                  color: z.color,
                  polygon: z.polygon,
                }))}
                selectedZoneId={selectedZone}
                onZoneSelect={setSelectedZone}
                mode={toolMode}
                onZoneCreated={handleZoneCreated}
              />
            </div>
          )}
        </div>

        {/* Zones Panel - Right Side (always show, even without map) */}
        <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0" style={{ minHeight: 0 }}>
          <ZonesPanel
            zones={zonesForPanel}
            selectedZoneId={selectedZone}
            onZoneSelect={setSelectedZone}
            onCreateZone={() => {
              if (!mapUploaded) {
                // Prompt to upload map first
                alert('Please upload a map first to create zones by drawing on it.')
                return
              }
              setSelectedZone(null)
              setToolMode('draw-polygon')
            }}
            onDeleteZone={handleDeleteZone}
            onEditZone={(zoneId) => {
              setSelectedZone(zoneId)
              // Could open edit modal here
            }}
          />
        </div>
      </div>
    </div>
  )
}

