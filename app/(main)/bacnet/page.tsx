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

import { useState, useMemo, useEffect } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { useZones } from '@/lib/ZoneContext'
import { useDevices } from '@/lib/DeviceContext'
import { BACnetDetailsPanel } from '@/components/bacnet/BACnetDetailsPanel'
import { initialBACnetMappings, type ControlCapability } from '@/lib/initialBACnetMappings'
import { Power, Sun, Clock, Radio, CheckCircle2, AlertCircle, XCircle, Plus } from 'lucide-react'

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
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Generate mappings for all zones (limit to 12)
  const zoneMappings = useMemo(() => {
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
      // When zones are cleared and recreated, clear mappings too
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
        } catch (e) {
          console.error('Failed to parse saved mappings:', e)
        }
      }

      // Find zones without mappings (limit to first 12 zones)
      const zonesToMap = zones.slice(0, 12)
      const zonesWithoutMappings = zonesToMap.filter(zone => 
        !existingMappings.find(m => m.zoneId === zone.id)
      )

      if (zonesWithoutMappings.length > 0) {
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

  const handleEditStart = (mapping: BACnetMapping) => {
    setEditingZoneId(mapping.zoneId)
    setEditValue(mapping.bacnetObjectId || '')
  }

  const handleEditSave = (zoneId: string) => {
    const updated: BACnetMapping[] = zoneMappings.map(m => 
      m.zoneId === zoneId 
        ? { 
            ...m, 
            bacnetObjectId: editValue || null, 
            status: (editValue ? 'connected' : 'not-assigned') as 'connected' | 'error' | 'not-assigned',
            lastConnected: editValue ? new Date() : undefined,
            networkAddress: editValue ? `192.168.1.${100 + parseInt(zoneId.slice(-1))}` : undefined,
            priority: editValue ? Math.floor(Math.random() * 5) + 1 : undefined,
          }
        : m
    )
    setMappings(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_bacnet_mappings', JSON.stringify(updated))
    }
    setEditingZoneId(null)
    setEditValue('')
  }

  const handleAddNew = () => {
    // Find first zone without a mapping
    const unmappedZone = zones.find(z => !zoneMappings.find(m => m.zoneId === z.id && m.bacnetObjectId))
    if (unmappedZone) {
      setSelectedMappingId(unmappedZone.id)
      const mapping = zoneMappings.find(m => m.zoneId === unmappedZone.id) || {
        zoneId: unmappedZone.id,
        zoneName: unmappedZone.name,
        bacnetObjectId: null,
        status: 'not-assigned' as const,
        controlCapabilities: [] as ControlCapability[],
        description: '',
        deviceCount: devices.filter(d => d.zone === unmappedZone.name).length,
      }
      handleEditStart(mapping)
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

  const handleEditCancel = () => {
    setEditingZoneId(null)
    setEditValue('')
  }

  const getStatusIcon = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={16} className="text-[var(--color-success)]" />
      case 'error':
        return <AlertCircle size={16} className="text-[var(--color-warning)]" />
      case 'not-assigned':
        return <XCircle size={16} className="text-[var(--color-text-muted)]" />
    }
  }

  const getStatusColor = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
      case 'error':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
      case 'not-assigned':
        return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]'
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

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Main Content: Table + Details Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-4 pb-32 overflow-visible">
        {/* Table - Left Side */}
        <div className="flex-1 min-w-0">
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-[var(--color-border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                  Zone to BMS Connections
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Configure how lighting zones connect to your Building Management System via BACnet protocol
                </p>
            </div>

            <div className="flex-1 overflow-auto">
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
                  {zoneMappings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                        No zones configured. Create zones on the Zones page first.
                      </td>
                    </tr>
                  ) : (
                    zoneMappings.map((mapping) => {
                      const isEditing = editingZoneId === mapping.zoneId
                      const isSelected = selectedMappingId === mapping.zoneId
                      
                      return (
                        <tr 
                          key={mapping.zoneId}
                          onClick={() => setSelectedMappingId(mapping.zoneId)}
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
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20"
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
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSave(mapping.zoneId)
                              } else if (e.key === 'Escape') {
                                handleEditCancel()
                              }
                            }}
                            autoFocus
                            className="w-24 px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-primary)] rounded text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            placeholder="e.g. 4001"
                          />
                          <button
                            onClick={() => handleEditSave(mapping.zoneId)}
                            className="px-2 py-1 text-xs bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary)]/90 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-2 py-1 text-xs bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] rounded hover:bg-[var(--color-surface)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {mapping.bacnetObjectId ? (
                            <span className="text-sm font-mono text-[var(--color-text)]">
                              {mapping.bacnetObjectId}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--color-text-muted)] italic">
                              Not assigned
                            </span>
                          )}
                          <button
                            onClick={() => handleEditStart(mapping)}
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            {mapping.bacnetObjectId ? 'Edit' : 'Assign'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(mapping.status)}
                        <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(mapping.status)}`}>
                          {mapping.status === 'not-assigned' ? 'Not Assigned' : mapping.status}
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
        </div>

        {/* Details Panel - Right Side */}
        <BACnetDetailsPanel
          mapping={selectedMapping}
          onEdit={() => selectedMapping && handleEditStart(selectedMapping)}
          onDelete={handleDelete}
          onTestConnection={handleTestConnection}
          onAdd={handleAddNew}
        />
      </div>

      {/* Bottom Search Island */}
      <div className="fixed bottom-10 left-[80px] right-4 z-50">
      <SearchIsland 
        position="bottom" 
        fullWidth={true}
        title="BACnet Mapping"
        subtitle="Map zones to BACnet objects for BMS integration"
      />
      </div>
    </div>
  )
}
