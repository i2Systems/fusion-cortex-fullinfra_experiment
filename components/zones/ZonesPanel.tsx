/**
 * Zones Panel Component
 * 
 * Right-side panel for zone management.
 * Shows zone list and properties.
 * 
 * AI Note: This panel displays zones and allows editing zone properties.
 * 
 * Performance optimized with:
 * - Memoized ZoneListItem component
 * - useCallback for handlers
 * - useMemo for derived state
 */

'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Layers, Edit2, Trash2, MapPin, X, Save, CheckSquare, Square, Maximize2, AlertCircle, Monitor, Wifi, WifiOff, Battery } from 'lucide-react'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'
import { SelectSwitcher } from '@/components/shared/SelectSwitcher'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { getZoneColorOptions, resolveZoneColor, DEFAULT_ZONE_COLOR } from '@/lib/zoneColors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ZoneFocusedModal } from './ZoneFocusedContent'
import { Device } from '@/lib/mockData'
import { Rule } from '@/lib/mockRules'
import { ConfirmationModal } from '@/components/shared/ConfirmationModal'
import { useToast } from '@/lib/ToastContext'

interface Zone {
  id: string
  name: string
  deviceCount: number
  description: string
  colorVar?: string // CSS variable name like '--color-primary'
  color?: string // Hex color (alternative to colorVar)
  deviceIds?: string[] // Device IDs assigned to this zone
}

interface ZonesPanelProps {
  zones: Zone[]
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
  onCreateZone?: () => void
  onDeleteZone?: (zoneId: string) => void
  onDeleteZones?: (zoneIds: string[]) => void // Bulk delete
  onEditZone?: (zoneId: string, updates: { name?: string; description?: string; color?: string }) => void
  selectionMode?: boolean // When true, hide details and show only zone list
  devices?: Device[] // For focused modal
  rules?: Rule[] // For focused modal
  onDeviceMove?: (deviceId: string, fromZoneId: string | null, toZoneId: string) => void
}

// Memoized zone list item component
interface ZoneListItemProps {
  zone: Zone
  isSelected: boolean
  isMultiSelected: boolean
  zoneColor: string
  onSelect: () => void
  onToggleMultiSelect: () => void
}

const ZoneListItem = memo(function ZoneListItem({
  zone,
  isSelected,
  isMultiSelected,
  zoneColor,
  onSelect,
  onToggleMultiSelect
}: ZoneListItemProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle single selection if clicking on checkbox or buttons
    if ((e.target as HTMLElement).closest('button, input[type="checkbox"]')) {
      return
    }
    e.stopPropagation()
    onSelect()
  }, [onSelect])

  const handleToggleMultiSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleMultiSelect()
  }, [onToggleMultiSelect])

  const handleSelectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }, [onSelect])



  return (
    <div
      onClick={handleClick}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
          : isMultiSelected
            ? 'bg-[var(--color-primary-soft)]/50 border-[var(--color-primary)]/50'
            : 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleToggleMultiSelect}
            className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
            title={isMultiSelected ? "Deselect zone" : "Select zone"}
          >
            {isMultiSelected ? (
              <CheckSquare size={16} className="text-[var(--color-primary)]" />
            ) : (
              <Square size={16} className="text-[var(--color-text-muted)]" />
            )}
          </button>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: zoneColor }}
          />
          <h4 className="font-semibold text-sm text-[var(--color-text)] truncate">
            {zone.name}
          </h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleSelectClick}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
            title="Select zone"
          >
            <MapPin size={14} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-1">
        {zone.deviceCount} device{zone.deviceCount !== 1 ? 's' : ''}
      </p>
      {zone.description && (
        <p className="text-xs text-[var(--color-text-soft)]">
          {zone.description}
        </p>
      )}
    </div>
  )
})

// Ungrouped Devices Section Component
function UngroupedDevicesSection({ devices, zones, onDeviceMove }: { devices: Device[]; zones: Zone[]; onDeviceMove?: (deviceId: string, fromZoneId: string | null, toZoneId: string) => void }) {
  // Get all device IDs that are assigned to any zone
  const allZonedDeviceIds = useMemo(() => {
    const zonedIds = new Set<string>()
    zones.forEach(zone => {
      if (zone.deviceIds) {
        zone.deviceIds.forEach(deviceId => zonedIds.add(deviceId))
      }
    })
    return zonedIds
  }, [zones])

  // Calculate ungrouped devices - devices that are not in any zone's deviceIds array
  const ungroupedDevices = useMemo(() => {
    if (!devices || devices.length === 0) return []
    if (!zones || zones.length === 0) return devices
    
    const ungrouped = devices.filter(device => {
      // Device is "ungrouped" if it's not in any zone's deviceIds array
      return !allZonedDeviceIds.has(device.id)
    })
    return ungrouped
  }, [devices, allZonedDeviceIds, zones])

  const unplacedCount = ungroupedDevices.filter(d => d.x === undefined || d.y === undefined).length
  const placedButNoZoneCount = ungroupedDevices.filter(d => d.x !== undefined && d.y !== undefined).length

  const handleDragStart = useCallback((e: React.DragEvent, device: Device) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'device', deviceId: device.id, fromZoneId: null }))
  }, [])

  const handleDragEnd = useCallback(() => {
    // Cleanup if needed
  }, [])

  if (ungroupedDevices.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-[var(--color-success)]" />
            <h4 className="text-sm font-semibold text-[var(--color-text)]">All Devices Zoned</h4>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            All {devices.length} devices are assigned to zones
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-[var(--color-warning)]" />
          <h4 className="text-sm font-semibold text-[var(--color-text)]">Unzoned Devices</h4>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {unplacedCount > 0 && `${unplacedCount} not placed`}
          {unplacedCount > 0 && placedButNoZoneCount > 0 && ', '}
          {placedButNoZoneCount > 0 && `${placedButNoZoneCount} placed but not in a zone`}
        </p>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {ungroupedDevices.slice(0, 30).map(device => (
            <div
              key={device.id}
              draggable
              onDragStart={(e) => handleDragStart(e, device)}
              onDragEnd={handleDragEnd}
              className="group p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 cursor-move transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--color-text)] truncate">
                  {device.deviceId || device.serialNumber}
                </span>
                <span className={getStatusTokenClass(device.status)}>
                  {device.status}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {device.signal > 0 ? (
                  <div className={getSignalTokenClass(device.signal)}>
                    <Wifi size={12} />
                    <span className="text-xs">{device.signal}%</span>
                  </div>
                ) : (
                  <div className="token token-data">
                    <WifiOff size={12} />
                    <span className="text-xs">—</span>
                  </div>
                )}
                {device.battery !== undefined && (
                  <div className={getBatteryTokenClass(device.battery)}>
                    <Battery size={12} />
                    <span className="text-xs">{device.battery}%</span>
                  </div>
                )}
                <span className="text-xs text-[var(--color-text-muted)] capitalize">
                  {device.type}
                </span>
                {(device.x === undefined || device.y === undefined) && (
                  <span className="text-xs text-[var(--color-warning)] flex-shrink-0">Not placed</span>
                )}
                {device.x !== undefined && device.y !== undefined && (
                  <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">No zone</span>
                )}
              </div>
            </div>
          ))}
          {ungroupedDevices.length > 30 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-2">
              +{ungroupedDevices.length - 30} more devices
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ZonesPanel({ zones, selectedZoneId, onZoneSelect, onCreateZone, onDeleteZone, onDeleteZones, onEditZone, selectionMode = false, devices = [], rules = [], onDeviceMove }: ZonesPanelProps) {
  const { addToast } = useToast()
  const [colors, setColors] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [showFocusedModal, setShowFocusedModal] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<{ name: string; description: string; color: string }>({
    name: '',
    description: '',
    color: DEFAULT_ZONE_COLOR,
  })
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set())
  const [nameError, setNameError] = useState<string | null>(null)

  // Memoized derived values
  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  const allSelected = useMemo(() => zones.length > 0 && selectedZoneIds.size === zones.length, [zones.length, selectedZoneIds.size])
  const someSelected = useMemo(() => selectedZoneIds.size > 0 && selectedZoneIds.size < zones.length, [selectedZoneIds.size, zones.length])

  useEffect(() => {
    // Resolve zone colors (semantic keys or hex) to display hex
    const colorMap: Record<string, string> = {}
    zones.forEach(zone => {
      const raw = zone.color || (zone.colorVar && typeof window !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue(zone.colorVar).trim()
        : null)
      colorMap[zone.id] = raw ? resolveZoneColor(raw) : resolveZoneColor(DEFAULT_ZONE_COLOR)
    })
    setColors(colorMap)
  }, [zones])

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && selectedZone) {
      setEditFormData({
        name: selectedZone.name,
        description: selectedZone.description || '',
        color: selectedZone.color || DEFAULT_ZONE_COLOR,
      })
      setNameError(null)
    } else if (!selectedZone) {
      setIsEditing(false)
      setNameError(null)
    }
  }, [isEditing, selectedZone])

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedZoneId || zones.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = zones.findIndex(z => z.id === selectedZoneId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < zones.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onZoneSelect?.(zones[newIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedZoneId, zones, onZoneSelect])

  // Memoized handlers
  const handleStartEdit = useCallback(() => {
    if (selectedZone) {
      setIsEditing(true)
    }
  }, [selectedZone])

  const handleSaveEdit = useCallback(() => {
    if (!selectedZone) return

    if (!editFormData.name.trim()) {
      setNameError('Zone name is required')
      return
    }
    setNameError(null)

    if (onEditZone) {
      onEditZone(selectedZone.id, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        color: editFormData.color,
      })
    }
    setIsEditing(false)
  }, [selectedZone, editFormData, onEditZone, addToast])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setNameError(null)
    if (selectedZone) {
      setEditFormData({
        name: selectedZone.name,
        description: selectedZone.description || '',
        color: selectedZone.color || DEFAULT_ZONE_COLOR,
      })
    }
  }, [selectedZone])

  const handleToggleZoneSelection = useCallback((zoneId: string) => {
    setSelectedZoneIds(prev => {
      const next = new Set(prev)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedZoneIds(new Set())
    } else {
      setSelectedZoneIds(new Set(zones.map(z => z.id)))
    }
  }, [allSelected, zones])

  const handleBulkDelete = useCallback(() => {
    if (selectedZoneIds.size === 0) return
    setIsBulkDeleteModalOpen(true)
  }, [selectedZoneIds.size])

  const handleConfirmBulkDelete = useCallback(() => {
    if (selectedZoneIds.size === 0) return

    if (onDeleteZones) {
      onDeleteZones(Array.from(selectedZoneIds))
    } else if (onDeleteZone) {
      // Fallback to individual delete if bulk delete not available
      selectedZoneIds.forEach(zoneId => onDeleteZone(zoneId))
    }
    setSelectedZoneIds(new Set())
    // Clear single selection if it was deleted
    if (selectedZoneId && selectedZoneIds.has(selectedZoneId)) {
      onZoneSelect?.(null)
    }
    setIsBulkDeleteModalOpen(false)
  }, [selectedZoneIds, onDeleteZones, onDeleteZone, selectedZoneId, onZoneSelect])

  const handleCreateZone = useCallback(() => {
    if (onCreateZone) {
      onCreateZone()
    } else {
      // Fallback: clear selection
      onZoneSelect?.(null)
    }
  }, [onCreateZone, onZoneSelect])

  const handleDeleteSelectedZone = useCallback(() => {
    if (!selectedZone || !onDeleteZone) return
    setIsDeleteModalOpen(true)
  }, [selectedZone, onDeleteZone])

  const handleConfirmDeleteZone = useCallback(() => {
    if (!selectedZone || !onDeleteZone) return
    onDeleteZone(selectedZone.id)
    onZoneSelect?.(null)
    setIsDeleteModalOpen(false)
  }, [selectedZone, onDeleteZone, onZoneSelect])

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // If clicking on the container itself (not a zone item), deselect
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('zones-list-container')) {
      onZoneSelect?.(null)
    }
  }, [onZoneSelect])

  // Clear multi-select when single selection changes
  useEffect(() => {
    if (selectedZoneId) {
      setSelectedZoneIds(new Set())
    }
  }, [selectedZoneId])

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header - Always visible */}
      <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base md:text-lg font-semibold text-[var(--color-text)]">
            Zones
          </h3>
          {zones.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                title={allSelected ? "Deselect all" : "Select all"}
              >
                {allSelected ? (
                  <CheckSquare size={16} className="text-[var(--color-primary)]" />
                ) : (
                  <Square size={16} className="text-[var(--color-text-muted)]" />
                )}
              </button>
              {selectedZoneIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-danger)]"
                  title={`Delete ${selectedZoneIds.size} selected zone(s)`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        {selectedZoneIds.size > 0 && (
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {selectedZoneIds.size} zone{selectedZoneIds.size !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Data-Dense Header for Selected Zone - Hidden in selection mode */}
      {selectedZone && !selectionMode && (
        <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
          {isEditing ? (
            /* Edit Form */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-[var(--color-text)]">Edit Zone</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-success)]"
                    title="Save changes"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                    title="Cancel editing"
                  >
                    <X size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Zone Name
                </label>
                <Input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value })
                    if (nameError) setNameError(null)
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Enter zone name"
                  errorMessage={nameError ?? undefined}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  placeholder="Enter zone description (optional)"
                  rows={3}
                />
              </div>

              {/* Color Picker - Semantic options + custom hex */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Zone Color
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {getZoneColorOptions().map((opt) => {
                      const isSelected = editFormData.color === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditFormData(prev => ({ ...prev, color: opt.id }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0 ${isSelected
                            ? 'border-[var(--color-text)] scale-110 shadow-[var(--shadow-soft)]'
                            : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                            }`}
                          style={{ backgroundColor: opt.hex }}
                          title={opt.label}
                        />
                      )
                    })}
                    <input
                      type="color"
                      value={editFormData.color.startsWith('#') ? editFormData.color : resolveZoneColor(editFormData.color)}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded-lg border-2 border-[var(--color-border-subtle)] cursor-pointer flex-shrink-0 p-0"
                      title="Custom color"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">Custom hex:</span>
                    <input
                      type="text"
                      value={editFormData.color.startsWith('#') ? editFormData.color : ''}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        if (v === '' || /^#[0-9A-Fa-f]{0,6}$/.test(v) || /^[0-9A-Fa-f]{0,6}$/.test(v)) {
                          const hex = v.startsWith('#') ? v : (v ? `#${v}` : '')
                          setEditFormData(prev => ({ ...prev, color: hex || DEFAULT_ZONE_COLOR }))
                        }
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim().replace(/^#?/, '')
                        if (v.length === 6 && /^[0-9A-Fa-f]{6}$/.test(v)) {
                          setEditFormData(prev => ({ ...prev, color: `#${v}` }))
                        }
                      }}
                      placeholder="#000000"
                      className="w-24 px-2 py-1 rounded text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Device Count (Read-only) */}
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)]">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5">Devices in Zone</div>
                <div className="text-sm font-semibold text-[var(--color-text)]">{selectedZone.deviceCount}</div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="flex items-start gap-3 mb-3">
              {/* Zone Image/Icon */}
              <div
                className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]"
                style={{ backgroundColor: colors[selectedZone.id] ? `${colors[selectedZone.id]}20` : 'var(--color-primary-soft)' }}
              >
                <Layers size={32} style={{ color: colors[selectedZone.id] || 'var(--color-primary)' }} />
              </div>
              {/* Meta Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    {zones.length > 1 ? (
                      <SelectSwitcher
                        items={zones}
                        selectedItem={selectedZone}
                        onSelect={(zone) => onZoneSelect?.(zone?.id || null)}
                        getLabel={(z) => z.name}
                        getKey={(z) => z.id}
                        className="mb-1"
                        maxWidth="100%"
                      />
                    ) : (
                      <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                        {selectedZone.name}
                      </h3>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Control Zone
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowFocusedModal(true)
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      title="Open focused view"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit()
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                      title="Edit zone"
                    >
                      <Edit2 size={14} className="text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                </div>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Devices</div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{selectedZone.deviceCount}</div>
                  </div>
                  <div
                    className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0"
                    style={{ borderColor: colors[selectedZone.id] ? `${colors[selectedZone.id]}40` : undefined }}
                  >
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Color</div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[selectedZone.id] || 'var(--color-primary)' }}
                      />
                      <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                        {colors[selectedZone.id] || 'Default'}
                      </div>
                    </div>
                  </div>
                  {selectedZone.description && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] col-span-2 min-w-0">
                      <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Description</div>
                      <div className="text-xs font-semibold text-[var(--color-text)] line-clamp-2">{selectedZone.description}</div>
                    </div>
                  )}
                </div>

                {/* Delete Zone Button */}
                {onDeleteZone && (
                  <div className="pt-3 mt-3 border-t border-[var(--color-border-subtle)]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSelectedZone()
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-lg text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 transition-colors"
                      title="Delete this zone"
                    >
                      <Trash2 size={14} />
                      Delete Zone
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone List - Top Half */}
      <div
        className="flex-1 min-h-0 overflow-auto border-b border-[var(--color-border-subtle)]"
        onClick={handleContainerClick}
      >
        {zones.length === 0 ? (
          <PanelEmptyState
            icon={Layers}
            title="No Zones Created"
            description="Create your first zone by drawing on the map or clicking 'Create New Zone' below."
            className="h-full"
          />
        ) : (
          <div
            className="space-y-2 p-2 zones-list-container"
            onClick={handleContainerClick}
          >
            {zones.map((zone) => {
              const isSelected = selectedZoneId === zone.id
              const isMultiSelected = selectedZoneIds.has(zone.id)
              const zoneColor = colors[zone.id] || 'var(--color-primary)'

              return (
                <ZoneListItem
                  key={zone.id}
                  zone={zone}
                  isSelected={isSelected}
                  isMultiSelected={isMultiSelected}
                  zoneColor={zoneColor}
                  onSelect={() => onZoneSelect?.(isSelected ? null : zone.id)}
                  onToggleMultiSelect={() => handleToggleZoneSelection(zone.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Ungrouped Devices - Bottom Half */}
      <UngroupedDevicesSection devices={devices} zones={zones} onDeviceMove={onDeviceMove} />

      {/* Actions Footer */}
      <div className="fusion-panel-footer">
        <div className="fusion-panel-footer-actions fusion-panel-footer-actions--stacked">
          <Button
            onClick={handleCreateZone}
            variant="primary"
            className="w-full flex items-center justify-center gap-2 text-sm"
            title="Create New Zone"
          >
            <Layers size={14} className="md:w-4 md:h-4" />
            <span className="hidden md:inline">Create New Zone</span>
            <span className="md:hidden">Create Zone</span>
          </Button>
        </div>
      </div>

      {/* Focused Modal */}
      {selectedZone && (
        <ZoneFocusedModal
          isOpen={showFocusedModal}
          onClose={() => setShowFocusedModal(false)}
          zone={selectedZone}
          devices={devices}
          rules={rules}
          allZones={zones}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteZone}
        title="Delete Zone"
        message={selectedZone ? `Are you sure you want to delete "${selectedZone.name}"? This action cannot be undone.` : ''}
        variant="danger"
        confirmLabel="Delete Zone"
      />

      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Zones"
        message={
          selectedZoneIds.size > 0
            ? `Are you sure you want to delete ${selectedZoneIds.size} zone(s)?\n\n${zones
                .filter(z => selectedZoneIds.has(z.id))
                .map(z => z.name)
                .join(', ')}\n\nThis action cannot be undone.`
            : ''
        }
        variant="danger"
        confirmLabel={`Delete ${selectedZoneIds.size} Zone(s)`}
      />
    </div>
  )
}

