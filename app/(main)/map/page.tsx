/**
 * Locations & Devices Section
 * 
 * Main area: Location view (point cloud over blueprint) using react-konva
 * Right panel: Selected device details
 * Bottom drawer: Filters, layer toggles
 * Lower left: Location menu for managing multiple locations and zoom views
 * 
 * AI Note: This section uses react-konva for canvas-based rendering.
 * Device points should be color-coded by type (fixtures, motion, light sensors).
 * Supports multiple locations per store and zoomed views for precise placement.
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { X, Lightbulb, Loader2 } from 'lucide-react'
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
import { useStore } from '@/lib/StoreContext'
import { useRole } from '@/lib/role'
import { detectAllLights, createDevicesFromLights } from '@/lib/lightDetection'
import { 
  loadLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation,
  saveLocations,
  convertZoomToParent,
  type Location 
} from '@/lib/locationStorage'
import { LocationsMenu } from '@/components/map/LocationsMenu'
import { ZoomViewCreator } from '@/components/map/ZoomViewCreator'
import { ResizablePanel } from '@/components/layout/ResizablePanel'

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
    isLoading: devicesLoading,
    updateDevicePosition, 
    updateMultipleDevices,
    addDevice,
    setDevices,
    removeDevice,
    undo,
    redo,
    canUndo,
    canRedo
  } = useDevices()
  const { role } = useRole()
  const { activeStoreId } = useStore()
  const { zones, syncZoneDeviceIds, getDevicesInZone } = useZones()

  // Location management
  const [locations, setLocations] = useState<Location[]>([])
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null)
  const [showZoomCreator, setShowZoomCreator] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [imageBounds, setImageBounds] = useState<{ x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number } | null>(null)
  
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

  const handleDevicesDelete = (deviceIds: string[]) => {
    deviceIds.forEach(id => {
      removeDevice(id)
    })
    // Clear selections
    setSelectedDeviceIds([])
    if (selectedDevice && deviceIds.includes(selectedDevice)) {
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
  // Current location data (derived from currentLocationId)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [vectorData, setVectorData] = useState<any>(null)
  
  const currentLocation = useMemo(() => {
    return locations.find(loc => loc.id === currentLocationId) || null
  }, [locations, currentLocationId])
  
  const mapUploaded = currentLocation !== null
  
  // Load location data (image/vector) from storage when location changes
  useEffect(() => {
    const loadLocationData = async () => {
      if (!currentLocation) {
        setMapImageUrl(null)
        setVectorData(null)
        return
      }
      
      // If location has storageKey, load from IndexedDB
      if (currentLocation.storageKey && activeStoreId) {
        try {
          const { getVectorData } = await import('@/lib/indexedDB')
          const stored = await getVectorData(activeStoreId, currentLocation.storageKey)
          if (stored) {
            // Check if it's vector data or image data
            if (stored.paths || stored.texts) {
              setVectorData(stored)
              setMapImageUrl(null)
            } else if (stored.data) {
              // Image data stored as { data: base64String }
              setMapImageUrl(stored.data)
              setVectorData(null)
            }
          }
        } catch (e) {
          console.warn('Failed to load location data from IndexedDB:', e)
        }
      } else {
        // Use direct imageUrl/vectorData from location
        setMapImageUrl(currentLocation.imageUrl || null)
        setVectorData(currentLocation.vectorData || null)
      }
      
      // For zoom views, inherit from parent if no data
      if (currentLocation.type === 'zoom' && currentLocation.parentLocationId) {
        const parentLocation = locations.find(loc => loc.id === currentLocation.parentLocationId)
        if (parentLocation) {
          // Use parent's data if zoom view doesn't have its own
          if (!currentLocation.storageKey && !currentLocation.imageUrl && !currentLocation.vectorData) {
            if (parentLocation.storageKey && activeStoreId) {
              try {
                const { getVectorData } = await import('@/lib/indexedDB')
                const stored = await getVectorData(activeStoreId, parentLocation.storageKey)
                if (stored) {
                  if (stored.paths || stored.texts) {
                    setVectorData(stored)
                    setMapImageUrl(null)
                  } else if (stored.data) {
                    setMapImageUrl(stored.data)
                    setVectorData(null)
                  }
                }
              } catch (e) {
                console.warn('Failed to load parent location data:', e)
              }
            } else {
              setMapImageUrl(parentLocation.imageUrl || null)
              setVectorData(parentLocation.vectorData || null)
            }
          }
        }
      }
    }
    
    loadLocationData()
  }, [currentLocation, locations, activeStoreId])
  const [toolMode, setToolMode] = useState<MapToolMode>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MapFilters>({
    showMap: true,
    showFixtures: true,
    showMotion: true,
    showLightSensors: true,
    showZones: true,
    showWalls: true,
    showAnnotations: true,
    showText: true,
    selectedZones: [],
  })
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Load locations on mount or when store changes
  useEffect(() => {
    const loadLocationsData = async () => {
      const loadedLocations = await loadLocations(activeStoreId)
      setLocations(loadedLocations)
      
      // Set current location to first one, or migrate old single map if exists
      if (loadedLocations.length > 0) {
        setCurrentLocationId(loadedLocations[0].id)
      } else {
        // Try to migrate old single map format
        const imageKey = activeStoreId ? `fusion_map-image-url_${activeStoreId}` : 'map-image-url'
        const vectorKey = `${imageKey}_vector`
        
        try {
          let imageUrl: string | null = null
          let vectorData: any = null
          
          // Try IndexedDB first
          try {
            if (activeStoreId) {
              const { getVectorData } = await import('@/lib/indexedDB')
              vectorData = await getVectorData(activeStoreId, vectorKey)
            }
          } catch (e) {
            // Fallback to localStorage
            const savedVectorData = localStorage.getItem(vectorKey)
            if (savedVectorData) {
              vectorData = JSON.parse(savedVectorData)
            }
          }
          
          // Try image
          const savedImageUrl = localStorage.getItem(imageKey)
          if (savedImageUrl) {
            imageUrl = savedImageUrl
          }
          
          // If we have old data, migrate it to location system
          if (imageUrl || vectorData) {
            const migratedLocation = await addLocation(activeStoreId, {
              name: 'Main Floor Plan',
              type: 'base',
              imageUrl,
              vectorData,
            })
            setLocations([migratedLocation])
            setCurrentLocationId(migratedLocation.id)
            
            // Clean up old storage
            localStorage.removeItem(imageKey)
            localStorage.removeItem(vectorKey)
          }
        } catch (e) {
          console.warn('Failed to migrate old map data:', e)
        }
      }
    }
    
    loadLocationsData()
  }, [activeStoreId])

  const handleMapUpload = async (imageUrl: string) => {
    const locationName = prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!locationName) return
    
    // Store large images in IndexedDB if they're too big for localStorage
    let storageKey: string | undefined = undefined
    if (imageUrl.length > 100000 && activeStoreId) {
      try {
        const { storeVectorData } = await import('@/lib/indexedDB')
        const vectorKey = `location_image_${Date.now()}`
        // Store as vector data (it's just a blob of data)
        await storeVectorData(activeStoreId, { data: imageUrl } as any, vectorKey)
        storageKey = vectorKey
        // Don't store large images in location object - use storageKey instead
      } catch (e) {
        console.warn('Failed to store large image in IndexedDB, using localStorage:', e)
      }
    }
    
    const newLocation = await addLocation(activeStoreId, {
      name: locationName,
      type: 'base',
      imageUrl: imageUrl && imageUrl.length <= 100000 ? imageUrl : undefined,
      storageKey,
    })
    
    setLocations(prev => [...prev, newLocation])
    setCurrentLocationId(newLocation.id)
    setShowUploadModal(false)
  }

  const handleVectorDataUpload = async (data: any) => {
    const locationName = prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!locationName) return
    
    // Always store vector data in IndexedDB (it's usually large)
    if (!activeStoreId) {
      alert('No store selected. Please select a store first.')
      return
    }
    let storageKey: string | undefined = undefined
    try {
      const { storeVectorData } = await import('@/lib/indexedDB')
      const vectorKey = `location_vector_${Date.now()}`
      await storeVectorData(activeStoreId, data, vectorKey)
      storageKey = vectorKey
    } catch (e) {
      console.error('Failed to store vector data in IndexedDB:', e)
      alert('Failed to save location. Storage may be full. Please try clearing browser storage.')
      return
    }
    
    const newLocation = await addLocation(activeStoreId, {
      name: locationName,
      type: 'base',
      storageKey, // Store reference only
    })
    
    setLocations(prev => [...prev, newLocation])
    setCurrentLocationId(newLocation.id)
    setShowUploadModal(false)
  }
  
  const handleLocationSelect = (locationId: string) => {
    setCurrentLocationId(locationId)
  }
  
  const handleCreateZoomView = async (name: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    if (!currentLocationId) return
    
    const newZoomView = await addLocation(activeStoreId, {
      name,
      type: 'zoom',
      parentLocationId: currentLocationId,
      imageUrl: currentLocation?.imageUrl,
      vectorData: currentLocation?.vectorData,
      zoomBounds: bounds,
    })
    
    setLocations(prev => [...prev, newZoomView])
    setCurrentLocationId(newZoomView.id)
  }
  
  const handleDeleteLocation = async (locationId: string) => {
    await deleteLocation(activeStoreId, locationId)
    const updatedLocations = await loadLocations(activeStoreId)
    setLocations(updatedLocations)
    
    // If we deleted the current location, switch to first available
    if (locationId === currentLocationId) {
      if (updatedLocations.length > 0) {
        setCurrentLocationId(updatedLocations[0].id)
      } else {
        setCurrentLocationId(null)
      }
    }
  }

  // Auto-detect lights from uploaded map
  const [isDetectingLights, setIsDetectingLights] = useState(false)
  const [detectedLightsCount, setDetectedLightsCount] = useState<number | null>(null)
  
  const handleDetectLights = async () => {
    if (!mapImageUrl && !vectorData) {
      alert('Please upload a map first')
      return
    }
    
    // First, analyze the PDF to see what we have
    const { analyzePDFForLights } = await import('@/lib/lightDetection')
    const analysis = analyzePDFForLights(vectorData)
    
    console.log('PDF Analysis Report:')
    console.log(analysis.report)
    
    // Show analysis to user
    if (!analysis.hasLights && vectorData && vectorData.paths.length === 0) {
      const proceed = confirm(
        `PDF Analysis:\n\n${analysis.report}\n\n` +
        `This PDF uses Form XObjects (nested content) which cannot be analyzed directly.\n` +
        `We'll use image-based detection instead, which may be less accurate.\n\n` +
        `Continue with detection?`
      )
      if (!proceed) {
        return
      }
    } else if (!analysis.hasLights) {
      const proceed = confirm(
        `PDF Analysis:\n\n${analysis.report}\n\n` +
        `No obvious light symbols found in vector data.\n` +
        `We'll try image-based detection, but results may vary.\n\n` +
        `Continue with detection?`
      )
      if (!proceed) {
        return
      }
    }
    
    setIsDetectingLights(true)
    setDetectedLightsCount(null)
    
    try {
      // Get canvas dimensions (use a standard size for detection)
      const detectionWidth = 2000
      const detectionHeight = 2000
      
      const lights = await detectAllLights(
        vectorData,
        mapImageUrl || null,
        detectionWidth,
        detectionHeight
      )
      
      if (lights.length === 0) {
        alert(
          `No lights detected.\n\n` +
          `Analysis: ${analysis.report}\n\n` +
          `Possible reasons:\n` +
          `- Lights are in Form XObjects (nested content)\n` +
          `- Light symbols use patterns we don't recognize\n` +
          `- Image quality may be insufficient\n\n` +
          `Check the console for detailed analysis.`
        )
        setIsDetectingLights(false)
        return
      }
      
      // Create devices from detected lights
      const maxDeviceId = devices.length > 0 
        ? Math.max(...devices.map(d => parseInt(d.deviceId) || 0))
        : 0
      
      const newDevices = createDevicesFromLights(lights, maxDeviceId + 1)
      
      // Add devices to the system
      newDevices.forEach(device => {
        addDevice(device)
      })
      
      setDetectedLightsCount(lights.length)
      alert(`✅ Detected and placed ${lights.length} light fixtures on the map!\n\nCheck the console for detailed analysis.`)
    } catch (error) {
      console.error('Error detecting lights:', error)
      alert('Failed to detect lights. Please check the console for details.')
    } finally {
      setIsDetectingLights(false)
    }
  }

  const handleClearMap = async () => {
    if (!confirm('Are you sure you want to clear all locations and zoom views? This cannot be undone.')) {
      return
    }
    
    // Clear all locations (this will also clear all zoom views since they're stored together)
    await saveLocations(activeStoreId, [])
    
    // Reset state
    setLocations([])
    setCurrentLocationId(null)
    setSelectedDevice(null)
    setSelectedDeviceIds([])
    
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
    
    // If we're in a zoom view, convert coordinates back to parent location
    let finalX = x
    let finalY = y
    if (currentLocation?.type === 'zoom' && currentLocation.zoomBounds) {
      const parentCoords = convertZoomToParent(currentLocation, x, y)
      finalX = parentCoords.x
      finalY = parentCoords.y
    }
    
    // Save final position to history when drag ends
    updateMultipleDevices([{
      deviceId,
      updates: { x: finalX, y: finalY }
    }])
    
    // Sync device zone assignment after move
    // Use setTimeout to ensure device state is updated first
    setTimeout(() => {
      const movedDevice = devices.find(d => d.id === deviceId)
      if (movedDevice) {
        // Find which zone contains this device now (using parent coordinates)
        let newZoneName: string | undefined = undefined
        for (const zone of zones) {
          const devicesInZone = getDevicesInZone(zone.id, [{ ...movedDevice, x: finalX, y: finalY }])
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
        syncZoneDeviceIds(devices.map(d => d.id === deviceId ? { ...d, x: finalX, y: finalY } : d))
      }
    }, 0)
  }

  const handleDeviceRotate = (deviceId: string) => {
    // Only allow rotating in 'rotate' mode
    if (toolMode !== 'rotate') return
    
    const device = devices.find(d => d.id === deviceId)
    if (!device || device.type !== 'fixture') return // Only fixtures can be rotated
    
    // Rotate by 90 degrees
    const currentOrientation = device.orientation || 0
    const newOrientation = (currentOrientation + 90) % 360
    
    updateMultipleDevices([{
      deviceId,
      updates: { orientation: newOrientation }
    }])
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
      case 'align-direction': {
        // Toggle all lights between horizontal (0°) and vertical (90°)
        // Determine target orientation: if most lights are horizontal (0° or close), make them vertical (90°), otherwise make them horizontal (0°)
        const currentOrientations = devicesToProcess
          .filter(d => d.type === 'fixture') // Only fixtures have orientation
          .map(d => {
            const orientation = d.orientation || 0
            // Normalize to 0-360 range
            const normalized = ((orientation % 360) + 360) % 360
            // Consider 0-45 and 315-360 as horizontal, 45-135 as vertical
            return normalized <= 45 || normalized >= 315 ? 0 : 90
          })
        
        // Count horizontal vs vertical
        const horizontalCount = currentOrientations.filter(o => o === 0).length
        const verticalCount = currentOrientations.filter(o => o === 90).length
        
        // If more horizontal, switch to vertical; otherwise switch to horizontal
        const targetOrientation = horizontalCount >= verticalCount ? 90 : 0
        
        const updates = devicesToProcess
          .filter(d => d.type === 'fixture') // Only fixtures
          .map(d => ({
            deviceId: d.id,
            updates: { orientation: targetOrientation }
          }))
        
        if (updates.length > 0) {
          updateMultipleDevices(updates)
        }
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

    // Search filter - partial match on all device fields including numeric values
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(device => {
        // Search all text and numeric fields
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
    }

    // Zone filter - check if device zone matches any selected zone name
    if (filters.selectedZones.length > 0) {
      filtered = filtered.filter(device => {
        if (!device.zone) return false
        // Direct match: device.zone is a string, filters.selectedZones is string[]
        return filters.selectedZones.includes(device.zone)
      })
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

  // Convert device coordinates for zoom views
  const { convertParentToZoom } = require('@/lib/locationStorage')
  const devicesForCanvas = useMemo(() => {
    return filteredDevices.map(d => {
      // Convert device coordinates for zoom views
      let deviceX = d.x || 0
      let deviceY = d.y || 0
      
      if (currentLocation?.type === 'zoom' && currentLocation.zoomBounds) {
        // Convert parent coordinates to zoom view coordinates
        const zoomCoords = convertParentToZoom(currentLocation, deviceX, deviceY)
        if (zoomCoords) {
          deviceX = zoomCoords.x
          deviceY = zoomCoords.y
        } else {
          // Device is outside zoom view bounds, hide it
          return null
        }
      }
      
      return {
        id: d.id,
        x: deviceX,
        y: deviceY,
        type: d.type,
        deviceId: d.deviceId,
        status: d.status,
        signal: d.signal,
        location: d.location,
        locked: d.locked || false,
        orientation: d.orientation,
        components: d.components,
      }
    }).filter((d): d is NonNullable<typeof d> => d !== null).filter(Boolean)
  }, [filteredDevices, currentLocation])

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
          title="Locations & Devices"
          subtitle="Visualize and manage device locations across multiple floor plans"
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
          
          {/* Action buttons - Top right (hidden for Manager and Technician) */}
          {mapUploaded && role !== 'Manager' && role !== 'Technician' && (
            <div className="absolute top-0 right-4 z-30 pointer-events-none flex gap-2" style={{ transform: 'translateY(-50%)' }}>
              <div className="pointer-events-auto">
                <button
                  onClick={handleDetectLights}
                  disabled={isDetectingLights}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[var(--shadow-soft)]"
                  title="Auto-detect light fixtures from the map"
                >
                  {isDetectingLights ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-sm font-medium">Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Lightbulb size={18} />
                      <span className="text-sm font-medium">
                        {detectedLightsCount !== null ? `Detect Lights (${detectedLightsCount} found)` : 'Detect Lights'}
                      </span>
                    </>
                  )}
                </button>
              </div>
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
          {/* Upload modal or map view */}
          {!mapUploaded ? (
            <div className="w-full h-full">
              {showUploadModal ? (
                <MapUpload 
                  onMapUpload={handleMapUpload} 
                  onVectorDataUpload={handleVectorDataUpload}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="fusion-button fusion-button-primary"
                  >
                    Upload First Location
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative" style={{ minHeight: 0 }}>
              {/* Locations Menu - Inside map region, lower left */}
              <LocationsMenu
                locations={locations}
                currentLocationId={currentLocationId}
                onLocationSelect={handleLocationSelect}
                onAddLocation={() => setShowUploadModal(true)}
                onCreateZoomView={() => setShowZoomCreator(true)}
                onDeleteLocation={handleDeleteLocation}
              />
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <MapCanvas 
                  onDeviceSelect={handleDeviceSelect}
                  onDevicesSelect={handleDevicesSelect}
                  selectedDeviceId={selectedDevice}
                  selectedDeviceIds={selectedDeviceIds}
                  mapImageUrl={filters.showMap ? mapImageUrl : null}
                  vectorData={filters.showMap ? vectorData : null}
                  zones={mapZones}
                  highlightDeviceId={selectedDevice}
                  mode={toolMode === 'move' ? 'move' : toolMode === 'rotate' ? 'rotate' : 'select'}
                  onDeviceMove={handleDeviceMove}
                  onDeviceMoveEnd={handleDeviceMoveEnd}
                  onDeviceRotate={handleDeviceRotate}
                  onComponentExpand={handleComponentExpand}
                  expandedComponents={expandedComponents}
                  onComponentClick={handleComponentClick as any}
                  devicesData={filteredDevices}
                  onZoneClick={handleZoneClick}
                  devices={devicesForCanvas}
                  currentLocation={currentLocation}
                  onImageBoundsChange={setImageBounds}
                  showWalls={filters.showWalls}
                  showAnnotations={filters.showAnnotations}
                  showText={filters.showText}
                  showZones={filters.showZones}
                />
              </div>
            </div>
          )}
        </div>

        {/* Device Table Panel - Right Side (only show when map is uploaded) */}
        {mapUploaded && (
          <ResizablePanel
            defaultWidth={448}
            minWidth={320}
            maxWidth={512}
            collapseThreshold={200}
            storageKey="map_device_panel"
          >
            <DeviceTable
              devices={filteredDevices}
              selectedDeviceId={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              onComponentClick={handleComponentClick}
              onDevicesDelete={handleDevicesDelete}
            />
          </ResizablePanel>
        )}
      </div>

      {/* Zoom View Creator Modal */}
      {showZoomCreator && mapUploaded && (
        <ZoomViewCreator
          isOpen={showZoomCreator}
          onClose={() => setShowZoomCreator(false)}
          onSave={handleCreateZoomView}
          mapWidth={imageBounds?.width || 800}
          mapHeight={imageBounds?.height || 600}
          imageBounds={imageBounds}
          mapImageUrl={mapImageUrl}
        />
      )}

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



