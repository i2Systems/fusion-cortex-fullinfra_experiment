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
import { isFixtureType } from '@/lib/deviceUtils'
import { MapUpload } from '@/components/map/MapUpload'
import { MapToolbar } from '@/components/map/MapToolbar'
import type { MapToolMode } from '@/components/map/MapToolbar'
import { MapFiltersPanel, type MapFilters } from '@/components/map/MapFiltersPanel'
import { ComponentModal } from '@/components/shared/ComponentModal'
import type { Component, Device } from '@/lib/mockData'
import { fuzzySearch } from '@/lib/fuzzySearch'
import { EditDeviceModal } from '@/components/lookup/EditDeviceModal'

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
import { useSite } from '@/lib/SiteContext'
import { useMap } from '@/lib/MapContext'
import { useRole } from '@/lib/role'
import { detectAllLights, createDevicesFromLights } from '@/lib/lightDetection'
import { trpc } from '@/lib/trpc/client'
import { supabaseAdmin, STORAGE_BUCKETS } from '@/lib/supabase'

// Define Location interface matching the DB schema (plus optional local props if needed)
export interface Location {
  id: string
  name: string
  type: 'base' | 'zoom'
  parentId?: string | null
  imageUrl?: string | null
  vectorDataUrl?: string | null
  zoomBounds?: any
  siteId: string
  createdAt: string | Date
  updatedAt: string | Date
}

import {
  convertZoomToParent,
  convertParentToZoom,
} from '@/lib/locationStorage'
import { LocationsMenu } from '@/components/map/LocationsMenu'
import { ZoomViewCreator } from '@/components/map/ZoomViewCreator'
import { ResizablePanel } from '@/components/layout/ResizablePanel'

// Helper function to check if a point is inside a polygon
// logic moved to @/lib/map/geometry
import {
  pointInPolygon,
  findZoneForDevice,
  type PolygonZone
} from '@/lib/map/geometry'
import {
  arrangeDevicesInZone,
  calculateAlignmentUpdates
} from '@/lib/map/arrangement'

// Helper to find which zone contains a device
// logic moved to @/lib/map/geometry

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
  const { refreshMapData } = useMap()
  const { role } = useRole()
  const { activeSiteId } = useSite()
  const { zones, syncZoneDeviceIds, getDevicesInZone } = useZones()

  // TRPC Hooks
  const utils = trpc.useContext()
  const { data: locations = [], isLoading: locationsLoading } = trpc.location.list.useQuery(
    { siteId: activeSiteId || '' },
    { enabled: !!activeSiteId }
  )

  const createLocationMutation = trpc.location.create.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate({ siteId: activeSiteId || '' })
    }
  })

  const updateLocationMutation = trpc.location.update.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate({ siteId: activeSiteId || '' })
    }
  })

  const deleteLocationMutation = trpc.location.delete.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate({ siteId: activeSiteId || '' })
    }
  })

  // Local state for UI
  // locations is now from TRPC, so we don't need `const [locations, setLocations] = useState<Location[]>([])`
  // We just need to manage null/loading states if needed.
  // Actually, keeping local locations state might be redundant if we use the query data directly.
  // But existing code uses `locations` variable. 
  // I replaced `const [locations, setLocations]` with the query result.

  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null)
  const [showZoomCreator, setShowZoomCreator] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploadingMap, setIsUploadingMap] = useState(false)
  const [imageBounds, setImageBounds] = useState<{ x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number } | null>(null)

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null) // Zone to arrange devices into
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [componentParentDevice, setComponentParentDevice] = useState<Device | null>(null)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

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

      const selectedDevices = devices.filter(d => selectedDeviceIds.includes(d.id))
      const updates = arrangeDevicesInZone(selectedDevices, zone)

      if (updates.length > 0) {
        updateMultipleDevices(updates)

        // Sync zones after arranging
        // Calculate projected state locally to sync immediately without waiting for React state update
        const projectedDevices = devices.map(d => {
          const update = updates.find(u => u.deviceId === d.id)
          return update ? { ...d, ...update.updates } : d
        })

        syncZoneDeviceIds(projectedDevices)
      }
    }
  }
  // Current location data (derived from currentLocationId)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [vectorData, setVectorData] = useState<any>(null)

  const currentLocation = useMemo(() => {
    // If we have locations but no current ID, set it to the first one
    if (locations.length > 0 && !currentLocationId) {
      // Side effect in render is bad, but we can't easily sync state otherwise without useEffect.
      // Better to check inside the component or use useEffect.
      return locations[0]
    }
    return locations.find((loc: any) => loc.id === currentLocationId) || null
  }, [locations, currentLocationId])

  // Sync ID if not set
  useEffect(() => {
    if (locations.length > 0 && !currentLocationId) {
      setCurrentLocationId(locations[0].id)
    }
  }, [locations, currentLocationId])

  const mapUploaded = !!currentLocation

  // Load location data (image/vector) from storage when location changes
  // Load location data (image/vector) from URL
  useEffect(() => {
    const loadLocationData = async () => {
      if (!currentLocation) {
        setMapImageUrl(null)
        setVectorData(null)
        return
      }

      // 1. Handle Vector Data
      if (currentLocation.vectorDataUrl) {
        try {
          const res = await fetch(currentLocation.vectorDataUrl)
          if (res.ok) {
            const data = await res.json()
            setVectorData(data)
          }
        } catch (e) {
          console.error('Failed to load vector data:', e)
        }
      } else {
        setVectorData(null)
      }

      // 2. Handle Image URL
      if (currentLocation.imageUrl) {
        // Direct URL (Supabase or otherwise)
        setMapImageUrl(currentLocation.imageUrl)
      } else {
        setMapImageUrl(null)
      }

      // 3. Handle Zoom View Inheritance
      // If it's a zoom view and missing data, try to get from parent
      if (currentLocation.type === 'zoom' && currentLocation.parentId) {
        // Check if we need to inherit
        if (!currentLocation.vectorDataUrl && !currentLocation.imageUrl) {
          const parent = locations.find((l: any) => l.id === currentLocation.parentId)
          if (parent) {
            if (parent.vectorDataUrl) {
              try {
                const res = await fetch(parent.vectorDataUrl)
                if (res.ok) setVectorData(await res.json())
              } catch (e) { }
            }
            if (parent.imageUrl) {
              setMapImageUrl(parent.imageUrl)
            }
          }
        }
      }
    }

    loadLocationData()
  }, [currentLocation, locations])
  const [toolMode, setToolMode] = useState<MapToolMode>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Filters panel - user controls via Layers button
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

  // Legacy migration effect removed.
  // We rely on TRPC 'locations' query now.

  const handleMapUpload = async (imageUrl: string) => {
    if (!activeSiteId) return
    const locationName = prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!locationName) return

    setIsUploadingMap(true)
    let finalImageUrl = imageUrl

    try {
      // If it's a base64 string, upload it to Supabase
      if (imageUrl.startsWith('data:')) {
        try {
          // Show upload progress
          console.log('📤 Uploading map image to Supabase...')

          // Convert base64 to Blob
          const fetchRes = await fetch(imageUrl)
          const blob = await fetchRes.blob()
          const file = new File([blob], `map-${Date.now()}.jpg`, { type: 'image/jpeg' })

          // Upload
          const formData = new FormData()
          formData.append('file', file)
          formData.append('bucket', 'map-data') // Use map-data bucket
          formData.append('fileName', `${activeSiteId}/${Date.now()}-map.jpg`)

          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          })

          if (!uploadRes.ok) throw new Error('Upload failed')

          const { url } = await uploadRes.json()
          finalImageUrl = url
          console.log('✅ Map image uploaded to Supabase:', url)
        } catch (e) {
          console.error('Failed to upload map image:', e)
          alert('Failed to upload map image. Using unstable local copy.')
          // Fallback to base64 if upload fails (not ideal for db, but keeps it working)
        }
      }

      console.log('💾 Creating location in database...')
      // Use mutateAsync to wait for completion
      const newLocation = await createLocationMutation.mutateAsync({
        siteId: activeSiteId,
        name: locationName,
        type: 'base',
        imageUrl: finalImageUrl,
      })

      console.log('✅ Location created:', newLocation.id)

      // Immediately set the current location ID so UI updates
      setCurrentLocationId(newLocation.id)

      // Close upload modal
      setShowUploadModal(false)

      // Refetch locations to ensure everything is in sync
      await utils.location.list.refetch({ siteId: activeSiteId })
    } catch (error) {
      console.error('Failed to create location:', error)
      alert('Failed to save location. Please try again.')
    } finally {
      setIsUploadingMap(false)
    }
  }

  const handleVectorDataUpload = async (data: any) => {
    if (!activeSiteId) {
      alert('No store selected. Please select a store first.')
      return
    }
    const locationName = prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!locationName) return

    let vectorUrl: string | undefined = undefined

    // Upload JSON data to Supabase
    try {
      const jsonString = JSON.stringify(data)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const file = new File([blob], `vector-${Date.now()}.json`, { type: 'application/json' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'map-data')
      formData.append('fileName', `${activeSiteId}/${Date.now()}-vector.json`)

      const uploadRes = await fetch('/api/upload-image', { // It handles any file if we don't enforce image mime in backend strictly, let's hope. 
        // Backend says `contentType: file.type || 'image/jpeg'` so it might force jpeg?
        // Wait, `app/api/upload-image/route.ts` line 54: `contentType: file.type || 'image/jpeg'`. 
        // If I pass application/json as file type, it should use it.
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) throw new Error('Upload failed')

      const { url } = await uploadRes.json()
      vectorUrl = url
    } catch (e) {
      console.error('Failed to upload vector data:', e)
      alert('Failed to upload vector data.')
      return
    }

    createLocationMutation.mutate({
      siteId: activeSiteId,
      name: locationName,
      type: 'base',
      vectorDataUrl: vectorUrl,
    })

    setShowUploadModal(false)
  }

  const handleLocationSelect = (locationId: string) => {
    setCurrentLocationId(locationId)
  }

  const handleCreateZoomView = async (name: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    if (!currentLocationId || !activeSiteId) return

    createLocationMutation.mutate({
      siteId: activeSiteId,
      name,
      type: 'zoom',
      parentId: currentLocationId,
      zoomBounds: bounds,
      // URL inheritence is handled by backend or frontend resolve logic
      // But we can implicitly store them? No, we shouldn't duplicate data.
      // Frontend resolve logic already looks at parent.
    })
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return
    deleteLocationMutation.mutate({ id: locationId })

    if (locationId === currentLocationId) {
      setCurrentLocationId(null)
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
    if (!confirm('Are you sure you want to clear all locations? This cannot be undone.')) {
      return
    }

    // Delete all locations
    // Note: iterating mutations might spam, but for now it's fine for a clear action
    for (const loc of locations) {
      deleteLocationMutation.mutate({ id: loc.id })
    }

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
      // Create compatible Location object for convertZoomToParent
      const zoomBounds = typeof currentLocation.zoomBounds === 'object' &&
        currentLocation.zoomBounds !== null &&
        'minX' in currentLocation.zoomBounds &&
        'minY' in currentLocation.zoomBounds &&
        'maxX' in currentLocation.zoomBounds &&
        'maxY' in currentLocation.zoomBounds
        ? currentLocation.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
        : undefined

      if (zoomBounds) {
        const zoomLocation = {
          id: currentLocation.id,
          name: currentLocation.name,
          type: currentLocation.type as 'base' | 'zoom',
          zoomBounds,
          createdAt: typeof currentLocation.createdAt === 'string'
            ? new Date(currentLocation.createdAt).getTime()
            : currentLocation.createdAt instanceof Date
              ? currentLocation.createdAt.getTime()
              : Date.now(),
          updatedAt: typeof currentLocation.updatedAt === 'string'
            ? new Date(currentLocation.updatedAt).getTime()
            : currentLocation.updatedAt instanceof Date
              ? currentLocation.updatedAt.getTime()
              : Date.now(),
        }
        const parentCoords = convertZoomToParent(zoomLocation, x, y)
        finalX = parentCoords.x
        finalY = parentCoords.y
      }
    }

    // Save final position to history when drag ends
    updateMultipleDevices([{
      deviceId,
      updates: { x: finalX, y: finalY }
    }])

    // Sync device zone assignment after move
    const movedDevice = devices.find(d => d.id === deviceId)
    if (movedDevice) {
      // Find which zone contains this device now (using parent coordinates)
      // Refactored to use lib/map/geometry
      let newZoneName: string | undefined = undefined
      const projectedMovedDevice = { ...movedDevice, x: finalX, y: finalY }

      const foundZone = findZoneForDevice(projectedMovedDevice, zones)
      if (foundZone) {
        newZoneName = foundZone.name
      }

      // Update device zone property if it changed
      if (movedDevice.zone !== newZoneName) {
        updateMultipleDevices([{
          deviceId,
          updates: { zone: newZoneName }
        }])
      }

      // Sync all zone deviceIds arrays using projected state
      const projectedDevices = devices.map(d => d.id === deviceId ? projectedMovedDevice : d)
      syncZoneDeviceIds(projectedDevices)
    }
  }

  const handleDeviceRotate = (deviceId: string) => {
    // Only allow rotating in 'rotate' mode
    if (toolMode !== 'rotate') return

    const device = devices.find(d => d.id === deviceId)
    if (!device || !isFixtureType(device.type)) return // Only fixtures can be rotated

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
        // Use domain logic for alignment
        const updates = calculateAlignmentUpdates((devicesToProcess as any[]))
        if (updates.length > 0) {
          updateMultipleDevices(updates)
        }
        break
      }
      case 'auto-arrange': {
        const updates = arrangeDevicesInZone(devicesToProcess.map(d => ({ id: d.id })), zone)

        if (updates.length > 0) {
          updateMultipleDevices(updates)

          // Sync zones after arranging
          const projectedDevices = devices.map(d => {
            const update = updates.find(u => u.deviceId === d.id)
            return update ? { ...d, ...update.updates } : d
          })
          syncZoneDeviceIds(projectedDevices)
        }
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

    // Search filter - fuzzy match on all device fields
    if (searchQuery.trim()) {
      const query = searchQuery.trim()
      // Use fuzzy search for better matching with typo tolerance
      const results = fuzzySearch(
        query,
        filtered,
        ['deviceId', 'serialNumber', 'location', 'zone', 'type', 'status'],
        20 // min score threshold
      )
      filtered = results.map(r => r.item)
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
      if (isFixtureType(device.type) && !filters.showFixtures) return false
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
        // Create compatible Location object for convertParentToZoom
        const zoomBounds = typeof currentLocation.zoomBounds === 'object' &&
          currentLocation.zoomBounds !== null &&
          'minX' in currentLocation.zoomBounds &&
          'minY' in currentLocation.zoomBounds &&
          'maxX' in currentLocation.zoomBounds &&
          'maxY' in currentLocation.zoomBounds
          ? currentLocation.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
          : undefined

        if (zoomBounds) {
          const zoomLocation = {
            id: currentLocation.id,
            name: currentLocation.name,
            type: currentLocation.type as 'base' | 'zoom',
            zoomBounds,
            createdAt: typeof currentLocation.createdAt === 'string'
              ? new Date(currentLocation.createdAt).getTime()
              : currentLocation.createdAt instanceof Date
                ? currentLocation.createdAt.getTime()
                : Date.now(),
            updatedAt: typeof currentLocation.updatedAt === 'string'
              ? new Date(currentLocation.updatedAt).getTime()
              : currentLocation.updatedAt instanceof Date
                ? currentLocation.updatedAt.getTime()
                : Date.now(),
          }
          const zoomCoords = convertParentToZoom(zoomLocation, deviceX, deviceY)
          if (zoomCoords) {
            deviceX = zoomCoords.x
            deviceY = zoomCoords.y
          }
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
      <div className="flex-shrink-0 page-padding-x pt-3 md:pt-4 pb-2 md:pb-3 relative">
        <SearchIsland
          position="top"
          fullWidth={true}
          showActions={mapUploaded}
          title="Locations & Devices"
          subtitle="Visualize and manage device locations across multiple floor plans"
          placeholder={mapUploaded ? "Search devices, zones, or locations..." : "Upload a map to search devices..."}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onLayersClick={() => setShowFilters(prev => !prev)}
          filterCount={activeFilterCount}
        />
        {mapUploaded && showFilters && (
          <div className="absolute top-full right-[20px] mt-2 z-[var(--z-dropdown)]">
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
      <div className="main-content-area flex-1 flex min-h-0 gap-2 md:gap-4 page-padding-x pb-12 md:pb-14" style={{ overflow: 'visible' }}>
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
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[var(--shadow-soft)]"
                  title={isDetectingLights ? 'Detecting lights...' : detectedLightsCount !== null ? `Detect Lights (${detectedLightsCount} found)` : 'Auto-detect light fixtures from the map'}
                >
                  {isDetectingLights ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span className="hidden md:inline text-sm font-medium">Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Lightbulb size={18} />
                      <span className="hidden md:inline text-sm font-medium">
                        {detectedLightsCount !== null ? `Detect Lights (${detectedLightsCount} found)` : 'Detect Lights'}
                      </span>
                    </>
                  )}
                </button>
              </div>
              <div className="pointer-events-auto">
                <button
                  onClick={handleClearMap}
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-danger)] transition-all duration-200 shadow-[var(--shadow-soft)]"
                  title="Clear map and show upload"
                >
                  <X size={18} />
                  <span className="hidden md:inline text-sm font-medium">Clear</span>
                </button>
              </div>
            </div>
          )}
          {/* Upload modal or map view */}
          {isUploadingMap ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={48} className="text-[var(--color-primary)] animate-spin mx-auto mb-4" />
                <p className="text-[var(--color-text)] font-medium mb-2">Uploading map...</p>
                <p className="text-sm text-[var(--color-text-muted)]">This may take a moment for large files</p>
              </div>
            </div>
          ) : !mapUploaded ? (
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
                locations={locations.map(loc => ({
                  id: loc.id,
                  name: loc.name,
                  type: (loc.type === 'base' || loc.type === 'zoom' ? loc.type : 'base') as 'base' | 'zoom',
                  parentLocationId: loc.parentId || undefined,
                  imageUrl: loc.imageUrl || undefined,
                  vectorData: null,
                  zoomBounds: typeof loc.zoomBounds === 'object' &&
                    loc.zoomBounds !== null &&
                    'minX' in loc.zoomBounds &&
                    'minY' in loc.zoomBounds &&
                    'maxX' in loc.zoomBounds &&
                    'maxY' in loc.zoomBounds
                    ? loc.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
                    : undefined,
                  createdAt: typeof loc.createdAt === 'string'
                    ? new Date(loc.createdAt).getTime()
                    : loc.createdAt instanceof Date
                      ? loc.createdAt.getTime()
                      : Date.now(),
                  updatedAt: typeof loc.updatedAt === 'string'
                    ? new Date(loc.updatedAt).getTime()
                    : loc.updatedAt instanceof Date
                      ? loc.updatedAt.getTime()
                      : Date.now(),
                }))}
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
                  currentLocation={currentLocation ? {
                    id: currentLocation.id,
                    name: currentLocation.name,
                    type: (currentLocation.type === 'base' || currentLocation.type === 'zoom' ? currentLocation.type : 'base') as 'base' | 'zoom',
                    parentLocationId: currentLocation.parentId || undefined,
                    imageUrl: currentLocation.imageUrl || undefined,
                    vectorData: null,
                    zoomBounds: typeof currentLocation.zoomBounds === 'object' &&
                      currentLocation.zoomBounds !== null &&
                      'minX' in currentLocation.zoomBounds &&
                      'minY' in currentLocation.zoomBounds &&
                      'maxX' in currentLocation.zoomBounds &&
                      'maxY' in currentLocation.zoomBounds
                      ? currentLocation.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
                      : undefined,
                    createdAt: typeof currentLocation.createdAt === 'string'
                      ? new Date(currentLocation.createdAt).getTime()
                      : currentLocation.createdAt instanceof Date
                        ? currentLocation.createdAt.getTime()
                        : Date.now(),
                    updatedAt: typeof currentLocation.updatedAt === 'string'
                      ? new Date(currentLocation.updatedAt).getTime()
                      : currentLocation.updatedAt instanceof Date
                        ? currentLocation.updatedAt.getTime()
                        : Date.now(),
                  } : null}
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
              onEdit={setEditingDevice}
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

      <ComponentModal
        component={selectedComponent}
        parentDevice={componentParentDevice}
        isOpen={selectedComponent !== null}
        onClose={handleCloseComponentModal}
      />

      {/* Edit Device Modal */}
      <EditDeviceModal
        isOpen={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        device={editingDevice}
        onSave={(deviceId, updates) => {
          updateMultipleDevices([{
            deviceId,
            updates
          }])
          setEditingDevice(null)
        }}
      />
    </div>
  )
}



