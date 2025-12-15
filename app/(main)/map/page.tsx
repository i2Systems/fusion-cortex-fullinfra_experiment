/**
 * Map & Devices Section
 * 
 * Main area: Map (point cloud over blueprint) using react-konva
 * Right panel: Selected device details
 * Bottom drawer: Filters, layer toggles
 * 
 * AI Note: This section uses react-konva for canvas-based rendering.
 * Device points should be color-coded by type (fixtures, motion, light sensors).
 * Search island is positioned at the bottom.
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { DeviceTable } from '@/components/map/DeviceTable'
import { MapUpload } from '@/components/map/MapUpload'
import { MapToolbar } from '@/components/map/MapToolbar'
import type { MapToolMode } from '@/components/map/MapToolbar'
import { MapFiltersPanel, type MapFilters } from '@/components/map/MapFiltersPanel'
import { ComponentModal } from '@/components/shared/ComponentModal'
import type { Component, Device } from '@/lib/mockData'

// Dynamically import MapCanvas to avoid SSR issues with Konva
const MapCanvas = dynamic(() => import('@/components/map/MapCanvas').then(mod => ({ default: mod.MapCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useRole } from '@/lib/role'

// Helper function to check if a point is inside a polygon
function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Helper to find which zone contains a device
function findZoneForDevice(device: { x?: number; y?: number }, zones: Array<{ id: string; polygon: Array<{ x: number; y: number }> }>): { id: string; polygon: Array<{ x: number; y: number }> } | null {
  if (device.x === undefined || device.y === undefined) return null
  
  for (const zone of zones) {
    if (pointInPolygon({ x: device.x, y: device.y }, zone.polygon)) {
      return zone
    }
  }
  return null
}

export default function MapPage() {
  const { 
    devices, 
    updateDevicePosition, 
    updateMultipleDevices,
    undo,
    redo,
    canUndo,
    canRedo
  } = useDevices()
  const { role } = useRole()
  const { zones, syncZoneDeviceIds, getDevicesInZone } = useZones()
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null) // Zone to arrange devices into
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [componentParentDevice, setComponentParentDevice] = useState<Device | null>(null)
  
  // Handle device selection
  const handleDeviceSelect = (deviceId: string | null) => {
    setSelectedDevice(deviceId)
    if (deviceId) {
      setSelectedDeviceIds([deviceId])
    }
  }
  
  // Handle multi-device selection
  const handleDevicesSelect = (deviceIds: string[]) => {
    setSelectedDeviceIds(deviceIds)
    if (deviceIds.length === 1) {
      setSelectedDevice(deviceIds[0])
    } else {
      setSelectedDevice(null)
    }
  }
  
  // Handle zone click - set selected zone and auto-arrange selected devices into it
  const handleZoneClick = (zoneId: string) => {
    // Set the selected zone
    setSelectedZoneId(zoneId)
    
    // If devices are selected, auto-arrange them into this zone
    if (selectedDeviceIds.length > 0) {
      const zone = zones.find(z => z.id === zoneId)
      if (!zone) return
      
      // Get zone bounds from polygon (polygon is in normalized 0-1 coordinates)
      const zonePoints = zone.polygon
      const minX = Math.min(...zonePoints.map(p => p.x))
      const maxX = Math.max(...zonePoints.map(p => p.x))
      const minY = Math.min(...zonePoints.map(p => p.y))
      const maxY = Math.max(...zonePoints.map(p => p.y))
      
      // Calculate zone dimensions with padding to keep devices inside
      const padding = 0.02 // 2% padding from zone edges
      const zoneMinX = minX + padding
      const zoneMaxX = maxX - padding
      const zoneMinY = minY + padding
      const zoneMaxY = maxY - padding
      
      const zoneWidth = zoneMaxX - zoneMinX
      const zoneHeight = zoneMaxY - zoneMinY
      
      // Only proceed if zone has valid dimensions
      if (zoneWidth <= 0 || zoneHeight <= 0) {
        console.warn('Zone has invalid dimensions for auto-arrange')
        return
      }
      
      // Calculate grid layout for selected devices within zone bounds
      const selectedDevices = devices.filter(d => selectedDeviceIds.includes(d.id))
      const cols = Math.ceil(Math.sqrt(selectedDevices.length))
      const rows = Math.ceil(selectedDevices.length / cols)
      
      // Calculate spacing to fit devices within zone with margins
      const spacingX = zoneWidth / (cols + 1)
      const spacingY = zoneHeight / (rows + 1)
      
      const updates = selectedDevices.map((device, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        // Position devices within zone bounds, starting from zoneMinX/zoneMinY
        const x = Math.max(zoneMinX, Math.min(zoneMaxX, zoneMinX + spacingX * (col + 1)))
        const y = Math.max(zoneMinY, Math.min(zoneMaxY, zoneMinY + spacingY * (row + 1)))
        
        return {
          deviceId: device.id,
          updates: {
            x: x,
              y: y,
              zone: zone.name // Update device zone property
          }
        }
      })
      
      updateMultipleDevices(updates)
        
        // Sync zones after arranging
        setTimeout(() => {
          syncZoneDeviceIds(devices.map(d => {
            const update = updates.find(u => u.deviceId === d.id)
            return update ? { ...d, ...update.updates } : d
          }))
        }, 0)
    }
  }
  const [mapUploaded, setMapUploaded] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [toolMode, setToolMode] = useState<MapToolMode>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MapFilters>({
    showMap: true,
    showFixtures: true,
    showMotion: true,
    showLightSensors: true,
    selectedZones: [],
  })
  const uploadInputRef = useRef<HTMLInputElement>(null)

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
    setSelectedDevice(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('map-image-url')
    }
    // Reset file input if it exists
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  const handleDeviceMove = (deviceId: string, x: number, y: number) => {
    // Don't update during drag - only update on drag end to prevent feedback loops
    // The visual position is handled by Konva's drag system
  }

  const handleDeviceMoveEnd = (deviceId: string, x: number, y: number) => {
    // Only allow moving in 'move' mode
    if (toolMode !== 'move') return
    // Save final position to history when drag ends
    updateMultipleDevices([{
      deviceId,
      updates: { x, y }
    }])
    
    // Sync device zone assignment after move
    // Use setTimeout to ensure device state is updated first
    setTimeout(() => {
      const movedDevice = devices.find(d => d.id === deviceId)
      if (movedDevice) {
        // Find which zone contains this device now
        let newZoneName: string | undefined = undefined
        for (const zone of zones) {
          const devicesInZone = getDevicesInZone(zone.id, [{ ...movedDevice, x, y }])
          if (devicesInZone.length > 0) {
            newZoneName = zone.name
            break
          }
        }
        
        // Update device zone property if it changed
        if (movedDevice.zone !== newZoneName) {
          updateMultipleDevices([{
            deviceId,
            updates: { zone: newZoneName }
          }])
        }
        
        // Sync all zone deviceIds arrays
        syncZoneDeviceIds(devices.map(d => d.id === deviceId ? { ...d, x, y } : d))
      }
    }, 0)
  }

  const handleToolAction = (action: MapToolMode) => {
    // Actions require a selected zone
    if (!selectedZoneId) {
      alert('Please select a zone first. Click on a zone to select it, then use the toolbar actions to arrange devices within it.')
      return
    }
    
    const zone = zones.find(z => z.id === selectedZoneId)
    if (!zone) {
      alert('Selected zone not found. Please select a zone again.')
      return
    }

    // Actions that require selected devices
    const devicesToProcess = selectedDeviceIds.length > 0 
      ? devices.filter(d => selectedDeviceIds.includes(d.id))
      : selectedDevice 
        ? [devices.find(d => d.id === selectedDevice)].filter(Boolean) as Device[]
        : []
    
    if (devicesToProcess.length === 0) {
      alert('Please select one or more devices first. Click on devices on the map or use Shift+drag to select multiple.')
      return
    }

    // Get zone bounds with padding
    const zonePoints = zone.polygon
    const minX = Math.min(...zonePoints.map(p => p.x))
    const maxX = Math.max(...zonePoints.map(p => p.x))
    const minY = Math.min(...zonePoints.map(p => p.y))
    const maxY = Math.max(...zonePoints.map(p => p.y))
    
    const padding = 0.02 // 2% padding from zone edges
    const zoneMinX = minX + padding
    const zoneMaxX = maxX - padding
    const zoneMinY = minY + padding
    const zoneMaxY = maxY - padding
    
    const zoneWidth = zoneMaxX - zoneMinX
    const zoneHeight = zoneMaxY - zoneMinY

    switch (action) {
      case 'align-grid': {
        // Snap devices to grid within zone
        const gridSize = Math.min(zoneWidth / 10, zoneHeight / 10, 0.05) // Adaptive grid size
        const updates = devicesToProcess.map(d => {
          // Snap to grid within zone bounds
          const snappedX = Math.round((d.x || 0) / gridSize) * gridSize
          const snappedY = Math.round((d.y || 0) / gridSize) * gridSize
          // Clamp to zone bounds
          const x = Math.max(zoneMinX, Math.min(zoneMaxX, snappedX))
          const y = Math.max(zoneMinY, Math.min(zoneMaxY, snappedY))
          return {
            deviceId: d.id,
            updates: { x, y }
          }
        })
        updateMultipleDevices(updates)
        // Sync zones after arranging
        setTimeout(() => {
          syncZoneDeviceIds(devices.map(d => {
            const update = updates.find(u => u.deviceId === d.id)
            return update ? { ...d, ...update.updates } : d
          }))
        }, 0)
        break
      }
      case 'align-aisle': {
        // Align to nearest horizontal aisle line within zone
        const aisleSpacing = Math.min(zoneHeight / 10, 0.05) // Adaptive spacing
        const updates = devicesToProcess.map(d => {
          const snappedY = Math.round((d.y || 0) / aisleSpacing) * aisleSpacing
          // Clamp to zone bounds, keep X position
          const y = Math.max(zoneMinY, Math.min(zoneMaxY, snappedY))
          const x = Math.max(zoneMinX, Math.min(zoneMaxX, d.x || 0))
          return {
            deviceId: d.id,
            updates: { x, y }
          }
        })
        updateMultipleDevices(updates)
        // Sync zones after arranging
        setTimeout(() => {
          syncZoneDeviceIds(devices.map(d => {
            const update = updates.find(u => u.deviceId === d.id)
            return update ? { ...d, ...update.updates } : d
          }))
        }, 0)
        break
      }
      case 'auto-arrange': {
        // Arrange devices in a grid pattern within the zone
        if (devicesToProcess.length === 0) {
          alert('No devices to arrange.')
          return
        }
        const cols = Math.ceil(Math.sqrt(devicesToProcess.length))
        const rows = Math.ceil(devicesToProcess.length / cols)
        
        // Calculate spacing to fit devices within zone
        const spacingX = zoneWidth / (cols + 1)
        const spacingY = zoneHeight / (rows + 1)
        
        const updates = devicesToProcess.map((d, idx) => {
          const col = idx % cols
          const row = Math.floor(idx / cols)
          // Position devices within zone bounds
          const x = Math.max(zoneMinX, Math.min(zoneMaxX, zoneMinX + spacingX * (col + 1)))
          const y = Math.max(zoneMinY, Math.min(zoneMaxY, zoneMinY + spacingY * (row + 1)))
          return {
            deviceId: d.id,
            updates: { x, y }
          }
        })
        updateMultipleDevices(updates)
        // Sync zones after arranging
        setTimeout(() => {
          syncZoneDeviceIds(devices.map(d => {
            const update = updates.find(u => u.deviceId === d.id)
            return update ? { ...d, ...update.updates } : d
          }))
        }, 0)
        break
      }
    }
  }

  // Prepare zones for map view
  const mapZones = useMemo(() => {
    return zones.map(z => ({
      id: z.id,
      name: z.name,
      color: z.color,
      polygon: z.polygon,
    }))
  }, [zones])

  // Get unique zones from devices
  const availableZones = useMemo(() => {
    const zones = new Set<string>()
    devices.forEach(d => {
      if (d.zone) zones.add(d.zone)
    })
    return Array.from(zones).sort()
  }, [devices])

  // Filter devices based on search, filters, and layers
  const filteredDevices = useMemo(() => {
    let filtered = devices

    // Search filter - search across device ID, serial number, location, and zone
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(device => 
        device.deviceId.toLowerCase().includes(query) ||
        device.serialNumber.toLowerCase().includes(query) ||
        (device.location && device.location.toLowerCase().includes(query)) ||
        (device.zone && device.zone.toLowerCase().includes(query))
      )
    }

    // Zone filter
    if (filters.selectedZones.length > 0) {
      filtered = filtered.filter(device => 
        device.zone && filters.selectedZones.includes(device.zone)
      )
    }

    // Layer visibility filters (device types)
    filtered = filtered.filter(device => {
      if (device.type === 'fixture' && !filters.showFixtures) return false
      if (device.type === 'motion' && !filters.showMotion) return false
      if (device.type === 'light-sensor' && !filters.showLightSensors) return false
      return true
    })

    return filtered
  }, [devices, searchQuery, filters])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.selectedZones.length > 0) count++
    if (!filters.showFixtures || !filters.showMotion || !filters.showLightSensors) count++
    return count
  }, [filters])

  const handleComponentExpand = (deviceId: string, expanded: boolean) => {
    setExpandedComponents(prev => {
      const next = new Set(prev)
      if (expanded) {
        next.add(deviceId)
      } else {
        next.delete(deviceId)
      }
      return next
    })
  }

  const handleComponentClick = (component: Component, parentDevice: Device) => {
    setSelectedComponent(component)
    setComponentParentDevice(parentDevice)
  }

  const handleCloseComponentModal = () => {
    setSelectedComponent(null)
    setComponentParentDevice(null)
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3 relative">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          showActions={mapUploaded}
          title="Map & Devices"
          subtitle="Visualize and manage device locations"
          placeholder={mapUploaded ? "Search devices, zones, or locations..." : "Upload a map to search devices..."}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onLayersClick={() => setShowFilters(!showFilters)}
          filterCount={activeFilterCount}
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

      {/* Main Content: Map + Table Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" style={{ overflow: 'visible' }}>
        {/* Map Canvas - Left Side */}
        <div className="flex-1 relative min-w-0" style={{ overflow: 'visible', minHeight: 0 }}>
          {/* Map Toolbar - Top center (hidden for Manager and Technician) */}
          {mapUploaded && role !== 'Manager' && role !== 'Technician' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{ transform: 'translateX(-50%) translateY(-50%)' }}>
              <MapToolbar
                mode={toolMode}
                onModeChange={setToolMode}
                onAction={handleToolAction}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
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
          {/* Hidden file input for upload button in menu */}
          {!mapUploaded && (
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    const base64String = reader.result as string
                    localStorage.setItem('map-image-url', base64String)
                    handleMapUpload(base64String)
                    // Reset input after upload
                    if (uploadInputRef.current) {
                      uploadInputRef.current.value = ''
                    }
                  }
                  reader.onerror = () => {
                    alert('Error reading file. Please try again.')
                    if (uploadInputRef.current) {
                      uploadInputRef.current.value = ''
                    }
                  }
                  reader.readAsDataURL(file)
                }
              }}
              className="hidden"
            />
          )}
          {!mapUploaded ? (
            <div className="w-full h-full">
              <MapUpload onMapUpload={handleMapUpload} />
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative" style={{ minHeight: 0 }}>
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <MapCanvas 
                  onDeviceSelect={handleDeviceSelect}
                  onDevicesSelect={handleDevicesSelect}
                  selectedDeviceId={selectedDevice}
                  selectedDeviceIds={selectedDeviceIds}
                  mapImageUrl={filters.showMap ? mapImageUrl : null}
                  zones={mapZones}
                  highlightDeviceId={selectedDevice}
                  mode={toolMode === 'move' ? 'move' : 'select'}
                  onDeviceMove={handleDeviceMove}
                  onDeviceMoveEnd={handleDeviceMoveEnd}
                  onComponentExpand={handleComponentExpand}
                  expandedComponents={expandedComponents}
                  onComponentClick={handleComponentClick as any}
                  devicesData={filteredDevices}
                  onZoneClick={handleZoneClick}
                  devices={filteredDevices.map(d => ({
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
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Device Table Panel - Right Side (only show when map is uploaded) */}
        {mapUploaded && (
          <div className="w-[28rem] min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0" style={{ minHeight: 0 }}>
            <DeviceTable
              devices={filteredDevices}
              selectedDeviceId={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              onComponentClick={handleComponentClick}
            />
          </div>
        )}
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



