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
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
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
    updateDevicePosition(deviceId, x, y)
  }

  const handleDeviceMoveEnd = (deviceId: string, x: number, y: number) => {
    // Save to history when drag ends
    updateMultipleDevices([{
      deviceId,
      updates: { x, y }
    }])
  }

  const handleToolAction = (action: MapToolMode) => {
    if (!selectedDevice) {
      alert('Please select a device first')
      return
    }

    const device = devices.find(d => d.id === selectedDevice)
    if (!device) return

    switch (action) {
      case 'align-grid': {
        // Snap to 10x10 grid
        const gridSize = 0.1 // 10% increments
        const snappedX = Math.round((device.x || 0) / gridSize) * gridSize
        const snappedY = Math.round((device.y || 0) / gridSize) * gridSize
        updateMultipleDevices([{
          deviceId: device.id,
          updates: { x: snappedX, y: snappedY }
        }])
        break
      }
      case 'align-aisle': {
        // Align to nearest horizontal aisle (assuming aisles are horizontal)
        const snappedY = Math.round((device.y || 0) / 0.1) * 0.1
        updateMultipleDevices([{
          deviceId: device.id,
          updates: { y: snappedY }
        }])
        break
      }
      case 'auto-arrange': {
        // Arrange all devices of the same type in a grid
        const sameTypeDevices = devices.filter(d => d.type === device.type)
        const cols = Math.ceil(Math.sqrt(sameTypeDevices.length))
        const spacing = 0.1
        const updates = sameTypeDevices.map((d, idx) => ({
          deviceId: d.id,
          updates: {
            x: (idx % cols) * spacing + 0.1,
            y: Math.floor(idx / cols) * spacing + 0.1
          }
        }))
        updateMultipleDevices(updates)
        break
      }
      case 'snap-nearest': {
        // Snap to nearest device position (within threshold)
        const threshold = 0.05
        const deviceX = device.x || 0
        const deviceY = device.y || 0
        const nearest = devices
          .filter(d => d.id !== device.id && d.x !== undefined && d.y !== undefined)
          .map(d => ({
            id: d.id,
            dist: Math.sqrt(Math.pow((d.x || 0) - deviceX, 2) + Math.pow((d.y || 0) - deviceY, 2))
          }))
          .sort((a, b) => a.dist - b.dist)[0]
        
        if (nearest && nearest.dist < threshold) {
          const target = devices.find(d => d.id === nearest.id)
          if (target && target.x !== undefined && target.y !== undefined) {
            updateMultipleDevices([{
              deviceId: device.id,
              updates: { x: target.x, y: target.y }
            }])
          }
        }
        break
      }
      case 'copy-position': {
        // Copy position to all selected devices (for now, just show message)
        alert('Copy position: Select multiple devices to copy position to them')
        break
      }
      case 'reset': {
        // Reset to original positions from mockData
        import('@/lib/mockData').then(({ mockDevices }) => {
          const updates = devices.map(d => {
            const original = mockDevices.find(m => m.id === d.id)
            return {
              deviceId: d.id,
              updates: {
                x: original?.x || 0,
                y: original?.y || 0
              }
            }
          })
          updateMultipleDevices(updates)
        })
        break
      }
    }
  }

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

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Main Content: Map + Table Panel */}
      <div className="flex-1 flex min-h-0 gap-4 px-[20px] pt-4 pb-4 overflow-visible">
        {/* Map Canvas - Left Side */}
        <div className="flex-1 relative min-w-0" style={{ overflow: 'visible' }}>
          {/* Map Toolbar - Top center */}
          {mapUploaded && (
            <MapToolbar
              mode={toolMode}
              onModeChange={setToolMode}
              onAction={handleToolAction}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
          )}
          
          {/* Clear button - Top right */}
          {mapUploaded && (
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
            <MapUpload onMapUpload={handleMapUpload} />
          ) : (
            <div className="w-full h-full rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <MapCanvas 
                  onDeviceSelect={setSelectedDevice}
                  selectedDeviceId={selectedDevice}
                  mapImageUrl={filters.showMap ? mapImageUrl : null}
                  highlightDeviceId={selectedDevice}
                  mode={toolMode === 'move' ? 'move' : 'select'}
                  onDeviceMove={handleDeviceMove}
                  onDeviceMoveEnd={handleDeviceMoveEnd}
                  devices={filteredDevices.map(d => ({
                    id: d.id,
                    x: d.x || 0,
                    y: d.y || 0,
                    type: d.type,
                    deviceId: d.deviceId,
                    status: d.status,
                    signal: d.signal,
                    location: d.location,
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Device Table Panel - Right Side (only show when map is uploaded) */}
        {mapUploaded && (
          <div className="w-[28rem] min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0">
            <DeviceTable
              devices={filteredDevices}
              selectedDeviceId={selectedDevice}
              onDeviceSelect={setSelectedDevice}
            />
          </div>
        )}
      </div>

      {/* Bottom Search Island - Always visible, same position as other pages */}
      <div className="fixed bottom-8 left-[80px] right-4 z-50">
        <div className="relative">
          <SearchIsland 
            position="bottom" 
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
            <div className="absolute bottom-full right-0 mb-2">
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
      </div>
    </div>
  )
}



