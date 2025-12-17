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

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapUpload } from '@/components/map/MapUpload'
import { ZonesPanel } from '@/components/zones/ZonesPanel'
import { ZonesListView } from '@/components/zones/ZonesListView'
import { ZoneToolbar, ZoneToolMode } from '@/components/zones/ZoneToolbar'
import { MapFiltersPanel, type MapFilters } from '@/components/map/MapFiltersPanel'
import { MapViewToggle, MapViewMode } from '@/components/shared/MapViewToggle'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useStore } from '@/lib/StoreContext'
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

import { ZONE_COLORS } from '@/lib/zoneColors'

export default function ZonesPage() {
  const { devices, updateMultipleDevices, saveDevices } = useDevices()
  const { zones, addZone, updateZone, deleteZone, getDevicesInZone, syncZoneDeviceIds, saveZones, isZonesSaved } = useZones()
  const { activeStoreId } = useStore()
  const { role } = useRole()

  // Helper to get store-scoped localStorage key
  const getMapImageKey = () => {
    return activeStoreId ? `fusion_map-image-url_${activeStoreId}` : 'map-image-url'
  }
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<ZoneToolMode>('select')
  const [viewMode, setViewMode] = useState<MapViewMode>('map')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MapFilters>({
    showMap: true,
    showFixtures: true,
    showMotion: true,
    showLightSensors: true,
    selectedZones: [],
  })
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  const handleClearMap = () => {
    setMapImageUrl(null)
    setMapUploaded(false)
    setSelectedZone(null)
    if (typeof window !== 'undefined' && activeStoreId) {
      const imageKey = getMapImageKey()
      localStorage.removeItem(imageKey)
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
      
      // Sync zone deviceIds after updating devices
      setTimeout(() => {
        syncZoneDeviceIds(devices)
      }, 0)
    }

    setSelectedZone(newZone.id)
    setToolMode('select')
  }

  // Reset tool mode when zone is selected from list
  useEffect(() => {
    if (selectedZone && toolMode !== 'select' && toolMode !== 'edit') {
      // Keep current mode if it's select or edit, otherwise reset to select
      // This allows drawing/editing to continue if user clicks on map
    }
  }, [selectedZone, toolMode])

  const handleDeleteZone = () => {
    if (selectedZone) {
      const zoneToDelete = zones.find(z => z.id === selectedZone)
      if (zoneToDelete) {
        // Clear zone property from devices in this zone
        const devicesInZone = getDevicesInZone(selectedZone, devices)
        if (devicesInZone.length > 0) {
          updateMultipleDevices(
            devicesInZone.map(device => ({
              deviceId: device.id,
              updates: { zone: undefined }
            }))
          )
        }
      }
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
    const selectedZoneObj = zones.find(z => z.id === selectedZone)
    let filteredDevices = selectedZoneObj
      ? devices.filter(d => {
          // Check if device is in the selected zone by position
          if (d.x === undefined || d.y === undefined) return false
          return getDevicesInZone(selectedZoneObj.id, devices).some(zoneDevice => zoneDevice.id === d.id)
        })
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

  // Handle clicking outside the map and panel to deselect
  const handleMainContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Deselect if clicking outside both the map container and panel
    if (
      mapContainerRef.current &&
      panelRef.current &&
      !mapContainerRef.current.contains(target) &&
      !panelRef.current.contains(target)
    ) {
      setSelectedZone(null)
    }
  }

  // Helper function to calculate a position within a zone polygon
  const calculatePositionInZone = (polygon: Array<{ x: number; y: number }>): { x: number; y: number } => {
    // Get zone bounds
    const minX = Math.min(...polygon.map(p => p.x))
    const maxX = Math.max(...polygon.map(p => p.x))
    const minY = Math.min(...polygon.map(p => p.y))
    const maxY = Math.max(...polygon.map(p => p.y))
    
    // Calculate center
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    // Add some padding from edges
    const padding = 0.02
    const paddedMinX = minX + padding
    const paddedMaxX = maxX - padding
    const paddedMinY = minY + padding
    const paddedMaxY = maxY - padding
    
    // Use center if it's within padded bounds, otherwise use a random point within bounds
    let x = centerX
    let y = centerY
    
    // Clamp to padded bounds
    x = Math.max(paddedMinX, Math.min(paddedMaxX, x))
    y = Math.max(paddedMinY, Math.min(paddedMaxY, y))
    
    return { x, y }
  }

  // Handle device move between zones
  const handleDeviceMove = (deviceId: string, fromZoneId: string | null, toZoneId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    // Find the zone objects
    const fromZone = fromZoneId ? zones.find(z => z.id === fromZoneId) : null
    const toZone = zones.find(z => z.id === toZoneId)
    
    // Calculate new position if moving to a zone
    let newPosition: { x: number; y: number } | undefined
    if (toZone) {
      newPosition = calculatePositionInZone(toZone.polygon)
    }
    
    // Create updated device object for syncing
    const updatedDevice = { ...device }
    if (toZone) {
      updatedDevice.zone = toZone.name
      updatedDevice.x = newPosition!.x
      updatedDevice.y = newPosition!.y
    } else {
      updatedDevice.zone = undefined
      // Keep current position when moving to unassigned
    }
    
    // Update device in state
    if (toZone) {
      updateMultipleDevices([{
        deviceId,
        updates: { 
          zone: toZone.name,
          x: newPosition!.x,
          y: newPosition!.y
        }
      }])
    } else {
      updateMultipleDevices([{
        deviceId,
        updates: { zone: undefined }
      }])
    }
    
    // Immediately sync zones with the updated device
    // This ensures deviceIds arrays are updated right away
    const updatedDevices = devices.map(d => d.id === deviceId ? updatedDevice : d)
    syncZoneDeviceIds(updatedDevices)
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3 relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <MapViewToggle currentView={viewMode} onViewChange={setViewMode} />
        </div>
        <SearchIsland 
          position="top" 
          fullWidth={true}
          showActions={mapUploaded}
          title="Zones"
          subtitle="Create and manage control zones for your lighting system"
          placeholder={mapUploaded ? "Search zones, devices, or type 'create zone'..." : "Upload a map to manage zones..."}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
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

      {/* Main Content: Map/List + Zones Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" 
        style={{ overflow: 'visible' }}
        onClick={handleMainContentClick}
      >
        {/* Map/List View - Left Side */}
        <div 
          ref={mapContainerRef}
          className="flex-1 relative min-w-0 rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)]" 
          style={{ overflow: 'visible', minHeight: 0 }}
        >
          {viewMode === 'list' ? (
            /* List View */
            <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--color-surface)]">
              <ZonesListView
                zones={zones.map(z => ({
                  id: z.id,
                  name: z.name,
                  color: z.color,
                  deviceIds: z.deviceIds,
                }))}
                devices={devices}
                selectedZoneId={selectedZone}
                onZoneSelect={setSelectedZone}
                onDeviceMove={handleDeviceMove}
                searchQuery={searchQuery}
              />
            </div>
          ) : (
            /* Map View */
            <>
          {/* Zone Toolbar - Top center (hidden for Manager and Technician) */}
          {mapUploaded && role !== 'Manager' && role !== 'Technician' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{ transform: 'translateX(-50%) translateY(-50%)' }}>
              <ZoneToolbar
                mode={toolMode}
                onModeChange={setToolMode}
                onDeleteZone={handleDeleteZone}
                canDelete={!!selectedZone}
                onSave={() => {
                  // Save zones
                  saveZones()
                  // Also save devices to ensure their positions and zone assignments are preserved
                  saveDevices()
                  // Mark BACnet mappings as saved too (they're already in localStorage)
                  if (typeof window !== 'undefined' && activeStoreId) {
                    const bacnetKey = activeStoreId ? `fusion_bacnet_mappings_${activeStoreId}` : 'fusion_bacnet_mappings'
                    const bacnetSavedKey = activeStoreId ? `fusion_bacnet_mappings_saved_${activeStoreId}` : 'fusion_bacnet_mappings_saved'
                    const bacnetMappings = localStorage.getItem(bacnetKey)
                    if (bacnetMappings) {
                      localStorage.setItem(bacnetSavedKey, 'true')
                    }
                  }
                  // Show confirmation
                  const notification = document.createElement('div')
                  notification.textContent = `✅ Saved ${zones.length} zones and ${devices.length} devices! Layout preserved for demo.`
                  notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--color-primary);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    font-size: 14px;
                    font-weight: 500;
                    max-width: 350px;
                  `
                  document.body.appendChild(notification)
                  setTimeout(() => {
                    notification.style.opacity = '0'
                    notification.style.transition = 'opacity 0.3s'
                    setTimeout(() => notification.remove(), 300)
                  }, 4000)
                }}
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
                onModeChange={setToolMode}
                mode={toolMode}
                onZoneCreated={handleZoneCreated}
                onZoneUpdated={(zoneId, polygon) => {
                  updateZone(zoneId, { polygon })
                }}
              />
            </div>
          )}
            </>
          )}
        </div>

        {/* Zones Panel - Right Side (always show, even without map) */}
        <div 
          ref={panelRef}
          className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0" 
          style={{ minHeight: 0 }}
        >
          <ZonesPanel
            zones={zonesForPanel}
            selectedZoneId={selectedZone}
            onZoneSelect={setSelectedZone}
            onCreateZone={() => {
              if (!mapUploaded && viewMode === 'map') {
                // Prompt to upload map first
                alert('Please upload a map first to create zones by drawing on it.')
                return
              }
              setSelectedZone(null)
              if (viewMode === 'map') {
                setToolMode('draw-polygon')
              }
            }}
            onDeleteZone={handleDeleteZone}
            onEditZone={(zoneId, updates) => {
              const zone = zones.find(z => z.id === zoneId)
              if (zone) {
                updateZone(zoneId, updates)
              }
            }}
            selectionMode={viewMode === 'list'}
          />
        </div>
      </div>
    </div>
  )
}

