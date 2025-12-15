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
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { Device } from '@/lib/mockData'
import { FaultCategory, assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'
import { Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb } from 'lucide-react'

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
  const [showCategories, setShowCategories] = useState<Record<FaultCategory, boolean>>({
    'environmental-ingress': true,
    'electrical-driver': true,
    'thermal-overheat': true,
    'installation-wiring': true,
    'control-integration': true,
    'manufacturing-defect': true,
    'mechanical-structural': true,
    'optical-output': true,
  })
  const listContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Generate faults from devices - ensure at least one of each category
  const faults = useMemo<Fault[]>(() => {
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

  const selectedFault = useMemo(() => {
    return faults.find(f => f.device.id === selectedFaultId) || null
  }, [faults, selectedFaultId])

  // Filter faults based on selected device, search, and category filters
  const filteredFaults = useMemo(() => {
    let filtered = faults
    
    // Apply category filters
    filtered = filtered.filter(fault => {
      return showCategories[fault.faultType] !== false
    })
    
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
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-2 pb-14 overflow-hidden"
        onClick={handleMainContentClick}
      >
        {/* Fault List/Map - Left Side */}
        <div 
          ref={listContainerRef}
          className="flex-1 min-w-0 flex flex-col"
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
                        onClick={() => setShowCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                        className={`
                          p-1.5 rounded-md transition-all duration-200
                          ${
                            isActive
                              ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[var(--shadow-soft)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                          }
                        `}
                        title={categoryInfo.shortLabel}
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
        <div ref={panelRef}>
        <FaultDetailsPanel fault={selectedFault} />
        </div>
      </div>
    </div>
  )
}
