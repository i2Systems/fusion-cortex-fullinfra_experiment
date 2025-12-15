/**
 * BACnet Mapping Section
 * 
 * Shows how zones connect to the Building Management System (BMS) via BACnet.
 * Displays control capabilities, connection status, and integration details.
 * 
 * AI Note: BACnet is a communication protocol for building automation.
 * This page shows how lighting zones integrate with the existing BMS.
 */

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapViewToggle, type MapViewMode } from '@/components/shared/MapViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { useZones } from '@/lib/ZoneContext'
import { useDevices } from '@/lib/DeviceContext'
import { BACnetDetailsPanel } from '@/components/bacnet/BACnetDetailsPanel'
import { initialBACnetMappings, type ControlCapability } from '@/lib/initialBACnetMappings'
import { Power, Sun, Clock, Radio, CheckCircle2, AlertCircle, XCircle, Plus } from 'lucide-react'

// Dynamically import BACnetZoneCanvas to avoid SSR issues with Konva
const BACnetZoneCanvas = dynamic(() => import('@/components/bacnet/BACnetZoneCanvas').then(mod => ({ default: mod.BACnetZoneCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

interface BACnetMapping {
  zoneId: string
  zoneName: string
  bacnetObjectId: string | null
  status: 'connected' | 'error' | 'not-assigned'
  controlCapabilities: ControlCapability[]
  description: string
  lastConnected?: Date
  deviceCount?: number
  networkAddress?: string
  priority?: number
}

// Generate realistic BACnet mappings based on zone names
// Only creates mappings for first 12 zones to match zone limit
function generateMappingForZone(zoneName: string, zoneId: string, deviceCount: number, zoneIndex: number): BACnetMapping {
  // Only auto-assign BACnet IDs for first 12 zones
  if (zoneIndex >= 12) {
    return {
      zoneId,
      zoneName,
      bacnetObjectId: null,
      status: 'not-assigned',
      controlCapabilities: ['on-off'],
      description: 'Zone not yet connected to BMS. Assign a BACnet Object ID to enable integration with building management system.',
      deviceCount,
    }
  }
  
  const zoneLower = zoneName.toLowerCase()
  
  // Determine capabilities based on zone type
  let capabilities: ControlCapability[] = ['on-off']
  let description = ''
  let status: 'connected' | 'error' | 'not-assigned' = 'not-assigned'
  let bacnetObjectId: string | null = null
  let lastConnected: Date | undefined = undefined
  
  if (zoneLower.includes('electronics') || zoneLower.includes('grocery')) {
    capabilities = ['on-off', 'dimming', 'scheduled']
    description = 'Connected to main lighting panel. Can be turned on/off, dimmed, and follows store hours schedule. BMS has full control during business hours.'
    status = 'connected'
    bacnetObjectId = `400${zoneIndex + 1}`
    lastConnected = new Date(Date.now() - 1000 * 60 * (5 + Math.floor(Math.random() * 10)))
  } else if (zoneLower.includes('clothing') || zoneLower.includes('apparel')) {
    capabilities = ['on-off', 'motion', 'daylight']
    description = 'Motion-activated zone with daylight harvesting. BMS can override for maintenance. Zone automatically adjusts based on occupancy and natural light levels.'
    status = 'connected'
    bacnetObjectId = `400${zoneIndex + 1}`
    lastConnected = new Date(Date.now() - 1000 * 60 * (2 + Math.floor(Math.random() * 5)))
  } else if (zoneLower.includes('retail') || zoneLower.includes('toys')) {
    capabilities = ['on-off', 'scheduled', 'override']
    description = 'Scheduled zone with BMS override capability. Follows store schedule but can be manually controlled by building management when needed.'
    status = Math.random() > 0.7 ? 'connected' : 'not-assigned'
    if (status === 'connected') {
      bacnetObjectId = `400${zoneIndex + 1}`
      lastConnected = new Date(Date.now() - 1000 * 60 * (10 + Math.floor(Math.random() * 20)))
    }
  } else {
    // Default for other zones - still assign BACnet ID for first 10
    capabilities = ['on-off', 'scheduled']
    description = 'Zone connected to BMS. Basic on/off control with scheduling capability.'
    status = 'connected'
    bacnetObjectId = `400${zoneIndex + 1}`
    lastConnected = new Date(Date.now() - 1000 * 60 * (5 + Math.floor(Math.random() * 15)))
  }
  
  // Randomly add some error states (but less frequently)
  if (status === 'connected' && Math.random() < 0.1) {
    status = 'error'
    description = 'Connection error detected. BMS can control on/off but communication is intermittent. Check network connection and BACnet device status.'
    lastConnected = new Date(Date.now() - 1000 * 60 * 60 * (1 + Math.floor(Math.random() * 3)))
  }
  
  return {
    zoneId,
    zoneName,
    bacnetObjectId,
    status,
    controlCapabilities: capabilities,
    description,
    lastConnected,
    deviceCount,
    networkAddress: bacnetObjectId ? `192.168.1.${100 + zoneIndex + 1}` : undefined,
    priority: status === 'connected' ? Math.floor(Math.random() * 5) + 1 : undefined,
  }
}

const capabilityLabels: Record<ControlCapability, { label: string; icon: any }> = {
  'on-off': { label: 'On/Off', icon: Power },
  'dimming': { label: 'Dimming', icon: Sun },
  'scheduled': { label: 'Scheduled', icon: Clock },
  'motion': { label: 'Motion', icon: Radio },
  'daylight': { label: 'Daylight', icon: Sun },
  'override': { label: 'Override', icon: Power },
}

export default function BACnetPage() {
  const { zones } = useZones()
  const { devices } = useDevices()
  const [mappings, setMappings] = useState<BACnetMapping[]>([])
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [viewMode, setViewMode] = useState<MapViewMode>('list')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Generate mappings for all zones (limit to 12)
  const zoneMappings = useMemo(() => {
    // Don't generate mappings if zones are empty (still initializing)
    if (zones.length === 0) {
      return []
    }
    return zones.slice(0, 12).map((zone, index) => {
      const deviceCount = devices.filter(d => d.zone === zone.name).length
      const existing = mappings.find(m => m.zoneId === zone.id)
      if (existing) {
        // Update device count if it changed
        return { ...existing, deviceCount }
      }
      return generateMappingForZone(zone.name, zone.id, deviceCount, index)
    })
  }, [zones, devices, mappings])

  // Auto-create BACnet mappings when new zones are detected
  useEffect(() => {
    if (typeof window !== 'undefined' && zones.length > 0) {
      // Check if mappings are saved - if so, always load them and don't auto-create
      const mappingsSaved = localStorage.getItem('fusion_bacnet_mappings_saved') === 'true'
      const saved = localStorage.getItem('fusion_bacnet_mappings')
      let existingMappings: BACnetMapping[] = []
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          existingMappings = parsed.map((m: any) => ({
            ...m,
            lastConnected: m.lastConnected ? new Date(m.lastConnected) : undefined,
          })) as BACnetMapping[]
          
          // Remove mappings for zones that no longer exist
          existingMappings = existingMappings.filter(m => 
            zones.some(z => z.id === m.zoneId)
          )
          
          // If mappings are saved, use them and don't auto-create
          if (mappingsSaved && existingMappings.length > 0) {
            setMappings(existingMappings)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved mappings:', e)
        }
      }

      // Find zones without mappings (limit to first 12 zones)
      const zonesToMap = zones.slice(0, 12)
      const zonesWithoutMappings = zonesToMap.filter(zone => 
        !existingMappings.find(m => m.zoneId === zone.id)
      )

      // Only auto-create mappings if zones are not marked as saved
      // This prevents overwriting user's saved BACnet mappings
      const zonesSaved = localStorage.getItem('fusion_zones_saved') === 'true'
      if (zonesWithoutMappings.length > 0 && !zonesSaved) {
        // Create mappings for new zones
        const newMappings: BACnetMapping[] = zonesWithoutMappings.map((zone, index) => {
          const initialMapping = initialBACnetMappings.find(m => m.zoneName === zone.name)
          const deviceCount = devices.filter(d => d.zone === zone.name).length
          const zoneIndex = zonesToMap.indexOf(zone)
          
          if (initialMapping) {
            return {
              zoneId: zone.id,
              zoneName: zone.name,
              bacnetObjectId: initialMapping.bacnetObjectId,
              status: initialMapping.status,
              controlCapabilities: initialMapping.controlCapabilities,
              description: initialMapping.description,
              lastConnected: initialMapping.status === 'connected' 
                ? new Date(Date.now() - 1000 * 60 * (5 + Math.floor(Math.random() * 10)))
                : initialMapping.status === 'error'
                ? new Date(Date.now() - 1000 * 60 * 60 * (1 + Math.floor(Math.random() * 3)))
                : undefined,
              deviceCount,
              networkAddress: initialMapping.networkAddress,
              priority: initialMapping.priority,
            }
          } else {
            // Auto-generate mapping for discovered zones
            return generateMappingForZone(zone.name, zone.id, deviceCount, zoneIndex)
          }
        })

        // Merge with existing mappings (only for zones that still exist)
        const allMappings = [...existingMappings, ...newMappings]
        setMappings(allMappings)
        localStorage.setItem('fusion_bacnet_mappings', JSON.stringify(allMappings))
      } else if (existingMappings.length > 0) {
        // Update device counts for existing mappings
        const updatedMappings = existingMappings.map(m => {
          const zone = zones.find(z => z.id === m.zoneId)
          if (zone) {
            const deviceCount = devices.filter(d => d.zone === zone.name).length
            return { ...m, deviceCount }
          }
          return m
        })
        setMappings(updatedMappings)
      } else if (zones.length === 0) {
        // Clear mappings if all zones are cleared
        setMappings([])
        localStorage.removeItem('fusion_bacnet_mappings')
      }
    } else if (zones.length === 0) {
      // Clear mappings when zones are cleared
      setMappings([])
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fusion_bacnet_mappings')
      }
    }
  }, [zones.length]) // Only depend on zones.length to avoid infinite loops


  const selectedMapping = zoneMappings.find(m => m.zoneId === selectedMappingId) || null

  const handleEditSave = (mappingData: Partial<BACnetMapping>) => {
    if (!selectedMappingId) return
    
    const updated: BACnetMapping[] = zoneMappings.map(m => 
      m.zoneId === selectedMappingId 
        ? { 
            ...m, 
            ...mappingData,
            status: mappingData.bacnetObjectId 
              ? (mappingData.status || 'connected') as 'connected' | 'error' | 'not-assigned'
              : 'not-assigned',
            lastConnected: mappingData.bacnetObjectId ? new Date() : m.lastConnected,
            networkAddress: mappingData.bacnetObjectId 
              ? mappingData.networkAddress || `192.168.1.${100 + parseInt(selectedMappingId.slice(-1))}`
              : undefined,
            priority: mappingData.bacnetObjectId 
              ? (mappingData.priority || Math.floor(Math.random() * 5) + 1)
              : undefined,
          }
        : m
    )
    setMappings(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_bacnet_mappings', JSON.stringify(updated))
    }
  }

  const handleAddNew = () => {
    // Find first zone without a mapping
    const unmappedZone = zones.find(z => !zoneMappings.find(m => m.zoneId === z.id && m.bacnetObjectId))
    if (unmappedZone) {
      setSelectedMappingId(unmappedZone.id)
    }
    setShowAddDialog(false)
  }

  const handleDelete = () => {
    if (selectedMappingId) {
      const updated: BACnetMapping[] = zoneMappings.map(m => 
        m.zoneId === selectedMappingId 
          ? { ...m, bacnetObjectId: null, status: 'not-assigned' as const, lastConnected: undefined }
          : m
      )
      setMappings(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('fusion_bacnet_mappings', JSON.stringify(updated))
      }
      setSelectedMappingId(null)
    }
  }

  const handleTestConnection = () => {
    if (selectedMapping) {
      // Simulate connection test
      const updated: BACnetMapping[] = zoneMappings.map(m => 
        m.zoneId === selectedMapping.zoneId 
          ? { ...m, lastConnected: new Date(), status: 'connected' as const }
          : m
      )
      setMappings(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('fusion_bacnet_mappings', JSON.stringify(updated))
      }
    }
  }


  const getStatusIcon = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={14} />
      case 'error':
        return <AlertCircle size={14} />
      case 'not-assigned':
        return <XCircle size={14} />
    }
  }

  const getStatusTokenClass = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return 'token token-status-success'
      case 'error':
        return 'token token-status-error'
      case 'not-assigned':
        return 'token token-status-not-assigned'
    }
  }

  const formatLastConnected = (date?: Date) => {
    if (!date) return null
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

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

  // Handle zone selection from map
  const handleZoneSelect = (zoneId: string | null) => {
    setSelectedZoneId(zoneId)
    if (zoneId) {
      // Find mapping for this zone and select it
      const mapping = zoneMappings.find(m => m.zoneId === zoneId)
      if (mapping) {
        setSelectedMappingId(mapping.zoneId)
      }
    }
  }

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
      setSelectedMappingId(null)
      setSelectedZoneId(null)
    }
  }

  // Filter mappings based on selected zone
  const filteredMappings = useMemo(() => {
    // If zones are still initializing, return empty array
    if (zones.length === 0) return []
    if (!selectedZoneId) return zoneMappings
    return zoneMappings.filter(m => m.zoneId === selectedZoneId)
  }, [zoneMappings, selectedZoneId, zones.length])

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedMappingId || filteredMappings.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = filteredMappings.findIndex(m => m.zoneId === selectedMappingId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < filteredMappings.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          setSelectedMappingId(filteredMappings[newIndex].zoneId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMappingId, filteredMappings])

  // Prepare zones for map with BACnet status
  const mapZones = useMemo(() => {
    return zones.map(z => ({
      id: z.id,
      name: z.name,
      color: z.color,
      polygon: z.polygon,
    }))
  }, [zones])

  // Prepare devices for map
  const mapDevices = useMemo(() => {
    return devices.map(d => ({
      id: d.id,
      x: d.x || 0,
      y: d.y || 0,
      type: d.type,
      deviceId: d.deviceId,
      status: d.status,
      signal: d.signal,
      location: d.location,
    }))
  }, [devices])

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="BACnet Mapping"
          subtitle="Map zones to BACnet objects for BMS integration"
          placeholder="Search mappings or type 'add mapping'..."
          onActionDetected={(action) => {
            if (action.id === 'add-mapping') {
              handleAddNew()
            }
          }}
        />
      </div>

      {/* Main Content: Table/Map + Details Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" 
        style={{ overflow: 'visible' }}
        onClick={handleMainContentClick}
      >
        {/* Table/Map - Left Side */}
        <div 
          ref={listContainerRef}
          className="flex-1 min-w-0 flex flex-col"
        >
          {/* View Toggle */}
          <div className="mb-3 flex items-center justify-between">
            <MapViewToggle currentView={viewMode} onViewChange={setViewMode} />
            {selectedZoneId && viewMode === 'map' && (
              <button
                onClick={() => {
                  setSelectedZoneId(null)
                  setSelectedMappingId(null)
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
                <div 
                  className="flex-1 overflow-auto"
                  onClick={(e) => {
                    // If clicking on the container itself (not a table row), deselect
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'TABLE') {
                      setSelectedMappingId(null)
                    }
                  }}
                >
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[var(--color-surface)] z-10">
                      <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-muted)]">
                          Zone
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-muted)]">
                          Control Capabilities
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-muted)]">
                          BACnet Object ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-muted)]">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-muted)]">
                          Connection Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                            Loading zones...
                          </td>
                        </tr>
                      ) : filteredMappings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                            {selectedZoneId ? 'No mappings for selected zone' : 'No zones configured. Create zones on the Zones page first.'}
                          </td>
                        </tr>
                      ) : (
                        filteredMappings.map((mapping) => {
                          const isSelected = selectedMappingId === mapping.zoneId
                          
                          return (
                            <tr 
                              key={mapping.zoneId}
                              onClick={(e) => {
                                e.stopPropagation() // Prevent container click handler
                                // Toggle: if already selected, deselect; otherwise select
                                setSelectedMappingId(isSelected ? null : mapping.zoneId)
                              }}
                              className={`
                                border-b border-[var(--color-border-subtle)] 
                                transition-colors cursor-pointer
                                ${isSelected 
                                  ? 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)]' 
                                  : 'hover:bg-[var(--color-surface-subtle)]'
                                }
                              `}
                            >
                              {/* Zone Name */}
                              <td className="py-4 px-4">
                                <div className="font-medium text-sm text-[var(--color-text)]">
                                  {mapping.zoneName}
                                </div>
                              </td>

                              {/* Control Capabilities */}
                              <td className="py-4 px-4">
                                {mapping.controlCapabilities.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {mapping.controlCapabilities.map((cap) => {
                                      const { label, icon: Icon } = capabilityLabels[cap]
                                      return (
                                        <span
                                          key={cap}
                                          className="token token-status-info"
                                        >
                                          <Icon size={12} />
                                          {label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--color-text-muted)]">No capabilities assigned</span>
                                )}
                              </td>

                              {/* BACnet Object ID */}
                              <td className="py-4 px-4">
                                {mapping.bacnetObjectId ? (
                                  <span className="text-sm font-mono text-[var(--color-text)]">
                                    {mapping.bacnetObjectId}
                                  </span>
                                ) : (
                                  <span className="text-sm text-[var(--color-text-muted)] italic">
                                    Not assigned
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={getStatusTokenClass(mapping.status)}>
                                  {getStatusIcon(mapping.status)}
                                    <span className="capitalize">{mapping.status === 'not-assigned' ? 'Not Assigned' : mapping.status}</span>
                                  </span>
                                  {mapping.lastConnected && (
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                      {formatLastConnected(mapping.lastConnected)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Connection Details */}
                              <td className="py-4 px-4">
                                <p className="text-xs text-[var(--color-text-muted)] max-w-md line-clamp-2">
                                  {mapping.description}
                                </p>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
                {!mapUploaded ? (
                  <div className="w-full h-full">
                    <MapUpload onMapUpload={handleMapUpload} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden">
                    <BACnetZoneCanvas
                      zones={mapZones}
                      devices={mapDevices}
                      mappings={zoneMappings}
                      mapImageUrl={mapImageUrl}
                      selectedZoneId={selectedZoneId || selectedMappingId}
                      onZoneSelect={handleZoneSelect}
                      devicesData={devices}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel - Right Side */}
        <div ref={panelRef}>
        <BACnetDetailsPanel
          mapping={selectedMapping}
          onEdit={handleEditSave}
          onDelete={handleDelete}
          onTestConnection={handleTestConnection}
          onAdd={handleAddNew}
        />
        </div>
      </div>
    </div>
  )
}
