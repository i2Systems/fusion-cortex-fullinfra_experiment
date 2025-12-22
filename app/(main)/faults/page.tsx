/**
 * Faults / Health Section
 * 
 * Main area: Fault list (left side)
 * Right panel: Fault details with troubleshooting steps
 * 
 * AI Note: Shows device health issues, missing devices, offline devices, low battery warnings.
 */

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapViewToggle, type MapViewMode } from '@/components/shared/MapViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { FaultList } from '@/components/faults/FaultList'
import { FaultDetailsPanel } from '@/components/faults/FaultDetailsPanel'
import { ResizablePanel } from '@/components/layout/ResizablePanel'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useStore } from '@/lib/StoreContext'
import { Device } from '@/lib/mockData'
import { FaultCategory, assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'
import { trpc } from '@/lib/trpc/client'
import { loadLocations } from '@/lib/locationStorage'
import { Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Clock, ArrowUp, ArrowDown, Minus } from 'lucide-react'

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
  id?: string // Database fault ID (if from database)
  device: Device
  faultType: FaultCategory
  detectedAt: Date
  description: string
}

export default function FaultsPage() {
  const { devices } = useDevices()
  const { zones } = useZones()
  const { activeStoreId } = useStore()

  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<MapViewMode>('list')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [vectorData, setVectorData] = useState<any>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  
  // Fetch faults from database
  const { data: dbFaults, refetch: refetchFaults } = trpc.fault.list.useQuery(
    { siteId: activeStoreId || '', includeResolved: false },
    { enabled: !!activeStoreId, refetchOnWindowFocus: false }
  )
  
  // Create fault mutation
  const createFaultMutation = trpc.fault.create.useMutation({
    onSuccess: () => {
      refetchFaults()
    },
  })
  
  // Generate faults from devices (auto-generated from device status)
  const deviceGeneratedFaults = useMemo<Fault[]>(() => {
    const faultList: Fault[] = []
    const categoryMap: Record<string, FaultCategory> = {
      'device-fault-grocery-001': 'environmental-ingress',
      'device-fault-electronics-001': 'electrical-driver',
      'device-fault-apparel-001': 'thermal-overheat',
      'device-fault-home-001': 'installation-wiring',
      'device-fault-electronics-002': 'control-integration',
      'device-fault-toys-001': 'manufacturing-defect',
      'device-fault-apparel-002': 'mechanical-structural',
      'device-fault-grocery-002': 'optical-output',
    }
    
    const detectedTimes: Record<string, number> = {
      'device-fault-grocery-001': 45, // 45 minutes ago
      'device-fault-electronics-001': 2 * 60, // 2 hours ago
      'device-fault-apparel-001': 4 * 60, // 4 hours ago
      'device-fault-home-001': 6 * 60, // 6 hours ago
      'device-fault-electronics-002': 8 * 60, // 8 hours ago
      'device-fault-toys-001': 12 * 60, // 12 hours ago
      'device-fault-apparel-002': 18 * 60, // 18 hours ago
      'device-fault-grocery-002': 24 * 60, // 24 hours ago
    }

    devices.forEach(device => {
      // Check if this is a specific fault device with assigned category
      const assignedCategory = categoryMap[device.id]
      
      if (assignedCategory) {
        // Use specific fault descriptions for these devices
        const descriptions: Record<string, string> = {
          'device-fault-grocery-001': 'Water intrusion detected in fixture housing. Device FLX-3158 shows signs of moisture damage. Inspect seals and gaskets. This is a repeat failure pattern in this location.',
          'device-fault-electronics-001': 'Legacy 6043 driver burnout - no power output. Device FLX-2041 requires driver replacement. Check warranty status. Driver not responding to power-on sequence.',
          'device-fault-apparel-001': 'Input cable melting detected due to excessive current. Device FLX-2125 shows thermal stress. Review power distribution. Thermal protection activated.',
          'device-fault-home-001': 'Power landed on dim line instead of power line. Device FLX-2063 miswired during installation. Verify wiring diagram. Installation error causing device malfunction.',
          'device-fault-electronics-002': 'GRX-TVI trim level issues causing incorrect dimming. Device FLX-2088 not responding to control signals. Check control module. Control signal not recognized by device.',
          'device-fault-toys-001': 'Loose internal parts causing intermittent connection. Device FLX-2078 shows manufacturing defect. Document and contact manufacturer. Defect present from initial installation.',
          'device-fault-apparel-002': 'Bezel detaching from fixture housing. Device FLX-2092 has structural mounting issue. Inspect bracket geometry. Hardware issue preventing proper operation.',
          'device-fault-grocery-002': 'Single LED out in fixture array. Device FLX-2105 shows optical output abnormality. Check LED module connections. Visible output abnormality detected.',
        }
        
        faultList.push({
          device,
          faultType: assignedCategory,
          detectedAt: new Date(Date.now() - 1000 * 60 * (detectedTimes[device.id] || 60)),
          description: descriptions[device.id] || generateFaultDescription(assignedCategory, device.deviceId),
        })
      }
      // Missing devices - assign realistic fault category
      else if (device.status === 'missing') {
        const faultCategory = assignFaultCategory(device)
        faultList.push({
          device,
          faultType: faultCategory,
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 24) + 1)),
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
      if (device.battery !== undefined && device.battery < 20 && !assignedCategory) {
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
  
  // Combine database faults with device-generated faults
  const faults = useMemo<Fault[]>(() => {
    const allFaults: Fault[] = []
    
    // Add database faults (manually created)
    if (dbFaults) {
      dbFaults.forEach(dbFault => {
        // Find the device
        const device = devices.find(d => d.id === dbFault.deviceId)
        if (device) {
          allFaults.push({
            id: dbFault.id, // Include database fault ID
            device,
            faultType: dbFault.faultType as FaultCategory,
            detectedAt: dbFault.detectedAt,
            description: dbFault.description,
          })
        }
      })
    }
    
    // Add device-generated faults (only if not already in database)
    const dbFaultDeviceIds = new Set(dbFaults?.map(f => f.deviceId) || [])
    deviceGeneratedFaults.forEach(deviceFault => {
      // Only add if this device doesn't already have a database fault
      // (to avoid duplicates)
      if (!dbFaultDeviceIds.has(deviceFault.device.id)) {
        allFaults.push(deviceFault)
      }
    })
    
    // Sort by detected time (most recent first)
    return allFaults.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }, [dbFaults, deviceGeneratedFaults, devices])

  // Initialize category filters - will be updated based on actual faults
  const [showCategories, setShowCategories] = useState<Record<FaultCategory, boolean>>({
    'environmental-ingress': false,
    'electrical-driver': false,
    'thermal-overheat': false,
    'installation-wiring': false,
    'control-integration': false,
    'manufacturing-defect': false,
    'mechanical-structural': false,
    'optical-output': false,
  })

  // Update category filters when faults change - enable only categories that have faults
  useEffect(() => {
    const categoriesWithFaults = new Set(faults.map(f => f.faultType))
    setShowCategories(prev => {
      const updated: Record<FaultCategory, boolean> = {
        'environmental-ingress': categoriesWithFaults.has('environmental-ingress'),
        'electrical-driver': categoriesWithFaults.has('electrical-driver'),
        'thermal-overheat': categoriesWithFaults.has('thermal-overheat'),
        'installation-wiring': categoriesWithFaults.has('installation-wiring'),
        'control-integration': categoriesWithFaults.has('control-integration'),
        'manufacturing-defect': categoriesWithFaults.has('manufacturing-defect'),
        'mechanical-structural': categoriesWithFaults.has('mechanical-structural'),
        'optical-output': categoriesWithFaults.has('optical-output'),
      }
      return updated
    })
  }, [faults])
  const listContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load map from shared location storage (same as map page)
  useEffect(() => {
    const loadMapData = async () => {
      if (typeof window === 'undefined') return
      
      // Load locations from shared storage
      const locations = await loadLocations(activeStoreId)
      if (locations.length === 0) {
        setMapUploaded(false)
        setMapImageUrl(null)
        setVectorData(null)
        return
      }
      
      // Use first location
      const location = locations[0]
      
      // Load data from IndexedDB if storageKey exists
      if (location.storageKey && activeStoreId) {
        try {
          const { getVectorData } = await import('@/lib/indexedDB')
          const stored = await getVectorData(activeStoreId, location.storageKey)
          if (stored) {
            if (stored.paths || stored.texts) {
              setVectorData(stored)
              setMapImageUrl(null)
            } else if (stored.data) {
              setMapImageUrl(stored.data)
              setVectorData(null)
            }
            setMapUploaded(true)
            return
          }
        } catch (e) {
          console.warn('Failed to load location data from IndexedDB:', e)
        }
      }
      
      // Fallback to direct data
      if (location.imageUrl) {
        // Check if it's an IndexedDB reference
        if (location.imageUrl.startsWith('indexeddb:') && activeStoreId) {
          try {
            const { getImageDataUrl } = await import('@/lib/indexedDB')
            const imageId = location.imageUrl.replace('indexeddb:', '')
            const dataUrl = await getImageDataUrl(imageId)
            if (dataUrl) {
              setMapImageUrl(dataUrl)
              setMapUploaded(true)
              return
            }
          } catch (e) {
            console.warn('Failed to load image from IndexedDB:', e)
          }
        }
        setMapImageUrl(location.imageUrl)
        setMapUploaded(true)
      } else if (location.vectorData) {
        setVectorData(location.vectorData)
        setMapUploaded(true)
      }
      
      // Also check for old localStorage format (backward compatibility)
      if (!mapImageUrl && !vectorData && activeStoreId) {
        const imageKey = `fusion_map-image-url_${activeStoreId}`
        try {
          const { loadMapImage } = await import('@/lib/indexedDB')
          const imageUrl = await loadMapImage(imageKey)
          if (imageUrl) {
            setMapImageUrl(imageUrl)
            setMapUploaded(true)
          }
        } catch (e) {
          console.warn('Failed to load map from old storage:', e)
        }
      }
    }
    
    loadMapData()
  }, [activeStoreId])

  const handleMapUpload = (imageUrl: string) => {
    setMapImageUrl(imageUrl)
    setMapUploaded(true)
  }
  
  const handleVectorDataUpload = (data: any) => {
    setVectorData(data)
    setMapUploaded(true)
  }

  const handleAddNewFault = async (faultData: { device: Device; faultType: FaultCategory; description: string }) => {
    try {
      // Save to database
      const newFault = await createFaultMutation.mutateAsync({
        deviceId: faultData.device.id,
        faultType: faultData.faultType,
        description: faultData.description,
        detectedAt: new Date(),
      })
      
      // Select the newly created fault by its ID
      setSelectedFaultId(newFault.id)
      setSelectedDeviceId(faultData.device.id)
    } catch (error) {
      console.error('Failed to create fault:', error)
      alert('Failed to create fault. Please try again.')
    }
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


  const selectedFault = useMemo(() => {
    if (!selectedFaultId) return null
    
    // First, try to find by database fault ID
    const dbFault = dbFaults?.find(f => f.id === selectedFaultId)
    if (dbFault) {
      const device = devices.find(d => d.id === dbFault.deviceId)
      if (device) {
        return {
          device,
          faultType: dbFault.faultType as FaultCategory,
          detectedAt: dbFault.detectedAt,
          description: dbFault.description,
        }
      }
    }
    
    // Otherwise, try to find by device ID (for device-generated faults)
    return faults.find(f => f.device.id === selectedFaultId) || null
  }, [faults, selectedFaultId, dbFaults, devices])

  // Filter faults based on selected device, search, and category filters
  const filteredFaults = useMemo(() => {
    let filtered = faults
    
    // Apply category filters
    filtered = filtered.filter(fault => {
      return showCategories[fault.faultType] !== false
    })
    
    // Apply search filter - partial match on all fields including numeric values
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(fault => {
        const categoryInfo = faultCategories[fault.faultType]
        
        // Build searchable text from all fields including numeric values
        const searchableText = [
          fault.device.deviceId,
          fault.device.serialNumber,
          fault.device.location,
          fault.device.zone,
          fault.device.type,
          fault.device.status,
          String(fault.device.signal), // Convert numbers to strings
          fault.device.battery !== undefined ? String(fault.device.battery) : '',
          fault.faultType,
          fault.description,
          categoryInfo?.label,
          categoryInfo?.shortLabel,
          categoryInfo?.description,
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(query)
      })
    }
    
    // Apply device filter (only if device is selected)
    if (selectedDeviceId) {
      filtered = filtered.filter(fault => fault.device.id === selectedDeviceId)
    }
    
    // Also filter by selected fault ID if it's a database fault
    if (selectedFaultId && dbFaults) {
      const dbFault = dbFaults.find(f => f.id === selectedFaultId)
      if (dbFault) {
        // If a database fault is selected, show only that fault
        filtered = filtered.filter(fault => fault.id === selectedFaultId)
      }
    }
    
    return filtered
  }, [faults, searchQuery, selectedDeviceId, showCategories])

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

  // Calculate fault insights with deltas and trends
  const insights = useMemo(() => {
    const now = Date.now()
    const last24h = now - (24 * 60 * 60 * 1000)
    const last48h = now - (48 * 60 * 60 * 1000)
    
    // Insight 1: New Faults (Last 24h)
    const newFaults24h = faults.filter(f => f.detectedAt.getTime() >= last24h)
    const newFaultsPrevious24h = faults.filter(f => {
      const time = f.detectedAt.getTime()
      return time >= last48h && time < last24h
    })
    const newFaultsDelta = newFaults24h.length - newFaultsPrevious24h.length
    const newFaultsTrend = newFaultsDelta > 0 ? 'up' : newFaultsDelta < 0 ? 'down' : 'stable'
    
    // Insight 2: Trending Category (category with most new faults in last 24h)
    const categoryNewCounts: Record<FaultCategory, number> = {
      'environmental-ingress': 0,
      'electrical-driver': 0,
      'thermal-overheat': 0,
      'installation-wiring': 0,
      'control-integration': 0,
      'manufacturing-defect': 0,
      'mechanical-structural': 0,
      'optical-output': 0,
    }
    
    newFaults24h.forEach(fault => {
      categoryNewCounts[fault.faultType] = (categoryNewCounts[fault.faultType] || 0) + 1
    })
    
    const trendingCategory = Object.entries(categoryNewCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)[0]
    
    const trendingCategoryInfo = trendingCategory 
      ? {
          category: trendingCategory[0] as FaultCategory,
          newCount: trendingCategory[1],
          totalCount: faults.filter(f => f.faultType === trendingCategory[0]).length,
        }
      : null
    
    // Insight 3: Critical Faults (faults older than 6 hours that are still active)
    const criticalThreshold = now - (6 * 60 * 60 * 1000) // 6 hours
    const criticalFaults = faults.filter(f => f.detectedAt.getTime() < criticalThreshold)
    const criticalCount = criticalFaults.length
    
    // Calculate critical delta (compare to 12 hours ago)
    const criticalThreshold12h = now - (12 * 60 * 60 * 1000)
    const criticalFaultsPrevious = faults.filter(f => {
      const time = f.detectedAt.getTime()
      return time >= criticalThreshold12h && time < criticalThreshold
    })
    const criticalDelta = criticalCount - criticalFaultsPrevious.length
    
    // Insight 4: Average Resolution Time (mock - simulate based on fault age distribution)
    const recentFaults = faults.filter(f => f.detectedAt.getTime() >= last24h)
    const olderFaults = faults.filter(f => f.detectedAt.getTime() < last24h)
    const avgAge = olderFaults.length > 0
      ? olderFaults.reduce((sum, f) => sum + (now - f.detectedAt.getTime()), 0) / olderFaults.length
      : 0
    const avgAgeHours = Math.floor(avgAge / (1000 * 60 * 60))
    
    return {
      newFaults24h: {
        count: newFaults24h.length,
        delta: newFaultsDelta,
        trend: newFaultsTrend,
        label: 'New Faults (24h)',
        description: `${newFaults24h.length} detected in last 24 hours`,
      },
      trendingCategory: trendingCategoryInfo ? {
        category: trendingCategoryInfo.category,
        newCount: trendingCategoryInfo.newCount,
        totalCount: trendingCategoryInfo.totalCount,
        label: 'Trending Up',
        description: `${faultCategories[trendingCategoryInfo.category].shortLabel} with ${trendingCategoryInfo.newCount} new`,
      } : null,
      criticalFaults: {
        count: criticalCount,
        delta: criticalDelta,
        trend: criticalDelta > 0 ? 'up' : criticalDelta < 0 ? 'down' : 'stable',
        label: 'Critical Priority',
        description: `${criticalCount} faults older than 6 hours`,
      },
      avgResolutionTime: {
        hours: avgAgeHours,
        label: 'Avg. Age',
        description: olderFaults.length > 0 ? `${avgAgeHours}h average age` : 'All faults recent',
      },
    }
  }, [faults])

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
      setSelectedFaultId(null)
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
          title="Faults / Health"
          subtitle="Monitor device health and system status"
          placeholder="Search faults or devices..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main Content: Fault List/Map + Details Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-2 pb-14 overflow-hidden"
        onClick={handleMainContentClick}
      >
        {/* Fault List/Map - Left Side */}
        <div 
          ref={listContainerRef}
          className="flex-1 min-w-0 flex flex-col overflow-auto"
        >
          {/* View Toggle and Category Filters */}
          <div className="mb-3 flex items-center justify-between gap-3">
            {/* Left side: View Toggle */}
            <MapViewToggle currentView={viewMode} onViewChange={setViewMode} />
            
            {/* Right side: Category Filter Toggles */}
            <div className="flex items-center gap-3">
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
              
              {/* Category Filter Toggles - only show in list view */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-1 p-0.5 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                  {(Object.keys(faultCategories) as FaultCategory[]).map((category) => {
                    const categoryInfo = faultCategories[category]
                    const isActive = showCategories[category]
                    const hasFaults = faults.some(f => f.faultType === category)
                    const isDisabled = !hasFaults
                    
                    // Get icon component
                    const getIcon = () => {
                      switch (category) {
                        case 'environmental-ingress': return <Droplets size={14} />
                        case 'electrical-driver': return <Zap size={14} />
                        case 'thermal-overheat': return <Thermometer size={14} />
                        case 'installation-wiring': return <Plug size={14} />
                        case 'control-integration': return <Settings size={14} />
                        case 'manufacturing-defect': return <Package size={14} />
                        case 'mechanical-structural': return <Wrench size={14} />
                        case 'optical-output': return <Lightbulb size={14} />
                        default: return null
                      }
                    }
                    
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          if (!isDisabled) {
                            setShowCategories(prev => ({ ...prev, [category]: !prev[category] }))
                          }
                        }}
                        disabled={isDisabled}
                        className={`
                          p-1.5 rounded-md transition-all duration-200
                          ${
                            isDisabled
                              ? 'opacity-40 cursor-not-allowed text-[var(--color-text-soft)]'
                              : isActive
                              ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[var(--shadow-soft)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                          }
                        `}
                        title={isDisabled ? `${categoryInfo.shortLabel} (no faults)` : categoryInfo.shortLabel}
                      >
                        {getIcon()}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {viewMode === 'list' ? (
              <div className="fusion-card overflow-hidden h-full flex flex-col">
                <FaultList
                  faults={filteredFaults}
                  selectedFaultId={selectedFaultId}
                  onFaultSelect={(faultId) => {
                    setSelectedFaultId(faultId)
                    // Also set device ID for map filtering
                    if (faultId) {
                      const fault = faults.find(f => {
                        // Check if it's a database fault ID
                        const dbFault = dbFaults?.find(df => df.id === faultId)
                        if (dbFault) {
                          return f.device.id === dbFault.deviceId
                        }
                        return f.device.id === faultId
                      })
                      if (fault) {
                        setSelectedDeviceId(fault.device.id)
                      }
                    } else {
                      setSelectedDeviceId(null)
                    }
                  }}
                  searchQuery={searchQuery}
                />
              </div>
            ) : (
              <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
                {!mapUploaded ? (
                  <div className="w-full h-full">
                    <MapUpload onMapUpload={handleMapUpload} onVectorDataUpload={handleVectorDataUpload} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden">
                    <FaultsMapCanvas
                      zones={mapZones}
                      devices={mapDevices}
                      faults={faults}
                      mapImageUrl={mapImageUrl}
                      vectorData={vectorData}
                      selectedDeviceId={selectedDeviceId}
                      onDeviceSelect={handleDeviceSelect}
                      devicesData={devices}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Insight Cards - Pushed to Bottom */}
          {faults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-auto pt-6 flex-shrink-0">
              {/* Insight 1: New Faults (24h) */}
              <div className="fusion-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      {insights.newFaults24h.label}
                    </span>
                  </div>
                  {insights.newFaults24h.delta !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      insights.newFaults24h.trend === 'up' 
                        ? 'text-[var(--color-danger)]' 
                        : 'text-[var(--color-success)]'
                    }`}>
                      {insights.newFaults24h.trend === 'up' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                      {Math.abs(insights.newFaults24h.delta)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-[var(--color-text)] mb-1">
                  {insights.newFaults24h.count}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {insights.newFaults24h.description}
                </div>
              </div>

              {/* Insight 2: Trending Category */}
              {insights.trendingCategory ? (
                <div className="fusion-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-[var(--color-warning)]" />
                      <span className="text-sm font-medium text-[var(--color-text-muted)]">
                        {insights.trendingCategory.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[var(--color-warning)]">
                      <ArrowUp size={12} />
                      {insights.trendingCategory.newCount}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-warning)] mb-1">
                    {faultCategories[insights.trendingCategory.category].shortLabel}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {insights.trendingCategory.description} • {insights.trendingCategory.totalCount} total
                  </div>
                </div>
              ) : (
                <div className="fusion-card opacity-50">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      Trending Up
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-text-muted)] mb-1">
                    —
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    No trending category
                  </div>
                </div>
              )}

              {/* Insight 3: Critical Faults */}
              <div className="fusion-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[var(--color-danger)]" />
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      {insights.criticalFaults.label}
                    </span>
                  </div>
                  {insights.criticalFaults.delta !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      insights.criticalFaults.trend === 'up' 
                        ? 'text-[var(--color-danger)]' 
                        : 'text-[var(--color-success)]'
                    }`}>
                      {insights.criticalFaults.trend === 'up' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                      {Math.abs(insights.criticalFaults.delta)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-[var(--color-danger)] mb-1">
                  {insights.criticalFaults.count}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {insights.criticalFaults.description}
                </div>
              </div>

              {/* Insight 4: Average Age */}
              <div className="fusion-card">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={16} className="text-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">
                    {insights.avgResolutionTime.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--color-text)] mb-1">
                  {insights.avgResolutionTime.hours}h
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {insights.avgResolutionTime.description}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-auto pt-6 flex-shrink-0">
              <div className="fusion-card md:col-span-3">
                <div className="text-center py-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No faults detected. All devices are healthy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fault Details Panel - Right Side */}
        <div ref={panelRef}>
          <ResizablePanel
            defaultWidth={384}
            minWidth={320}
            maxWidth={512}
            collapseThreshold={200}
            storageKey="faults_panel"
          >
            <FaultDetailsPanel fault={selectedFault} devices={devices} onAddNewFault={handleAddNewFault} />
          </ResizablePanel>
        </div>
      </div>
    </div>
  )
}
