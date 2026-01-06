/**
 * Device Table Component
 * 
 * Table showing detailed information about devices.
 * Displays device ID, serial, type, signal, battery, status, etc.
 * 
 * AI Note: This table should be filterable, sortable, and clickable
 * to highlight devices on the map.
 * 
 * Performance optimized with:
 * - DeviceIcon extracted as separate memoized component
 * - Memoized sortedDevices 
 * - useCallback for handlers
 * - Helper functions moved outside component
 */

'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { Signal, Battery, Wifi, WifiOff, Image, Radio, Thermometer, MapPin, Edit2, Plus, ChevronRight, ChevronDown, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle, Trash2, CheckSquare, Square, Info } from 'lucide-react'
import type { Component, Device, DeviceType } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'
import { getDeviceLibraryUrl, getDeviceImage, getDeviceImageAsync } from '@/lib/libraryUtils'
import { isFixtureType } from '@/lib/deviceUtils'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'

// Helper functions moved outside component to prevent recreation
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'fixture': return 'Fixture'
    case 'motion': return 'Motion Sensor'
    case 'light-sensor': return 'Light Sensor'
    default: return type
  }
}

// DeviceIcon component extracted outside and memoized for performance
interface DeviceIconProps {
  deviceType: string
}

const DeviceIcon = memo(function DeviceIcon({ deviceType }: DeviceIconProps) {
  const [imageError, setImageError] = useState(false)
  const [imageKey, setImageKey] = useState(0)
  const [deviceImage, setDeviceImage] = useState<string | null>(null)

  // Load device image (database first, then client storage, then default)
  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      // Try sync first (for localStorage images)
      const syncImage = getDeviceImage(deviceType as DeviceType)
      if (syncImage && !syncImage.startsWith('https://images.unsplash.com')) {
        if (isMounted) setDeviceImage(syncImage)
        return
      }

      // Try async (for database/IndexedDB images)
      try {
        const asyncImage = await getDeviceImageAsync(deviceType as DeviceType)
        if (!isMounted) return
        if (asyncImage && !asyncImage.startsWith('https://images.unsplash.com')) {
          setDeviceImage(asyncImage)
          return
        } else if (asyncImage) {
          // Default image
          setDeviceImage(asyncImage)
          return
        }
      } catch (error) {
        console.error('Failed to load device image:', error)
      }

      // Fallback to sync default
      if (isMounted) {
        const defaultImage = getDeviceImage(deviceType as DeviceType)
        setDeviceImage(defaultImage)
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [deviceType, imageKey])

  // Listen for library image updates
  useEffect(() => {
    const handleImageUpdate = () => {
      setImageKey(prev => prev + 1)
      setImageError(false) // Reset error state
    }
    window.addEventListener('libraryImageUpdated', handleImageUpdate)
    return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
  }, [])

  const showImage = deviceImage && !imageError

  return (
    <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)] overflow-hidden relative">
      {showImage ? (
        <img
          key={imageKey}
          src={deviceImage}
          alt={getTypeLabel(deviceType)}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isFixtureType(deviceType as DeviceType) ? (
            <Image size={32} className="text-[var(--color-primary)]" />
          ) : deviceType === 'motion' ? (
            <Radio size={32} className="text-[var(--color-accent)]" />
          ) : (
            <Thermometer size={32} className="text-[var(--color-success)]" />
          )}
        </div>
      )}
    </div>
  )
})

// Memoized table row component to prevent unnecessary re-renders
interface DeviceRowProps {
  device: Device
  isSelected: boolean
  isChecked: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleCheck: () => void
  onToggleExpand: (e: React.MouseEvent) => void
  onComponentClick?: (component: Component, parentDevice: Device) => void
  selectedRowRef?: React.RefObject<HTMLTableRowElement>
}

const DeviceRow = memo(function DeviceRow({
  device,
  isSelected,
  isChecked,
  isExpanded,
  onSelect,
  onToggleCheck,
  onToggleExpand,
  onComponentClick,
  selectedRowRef
}: DeviceRowProps) {
  const hasComponents = device.components && device.components.length > 0
  const libraryUrl = getDeviceLibraryUrl(device.type)

  return (
    <>
      <tr
        ref={isSelected ? selectedRowRef : null}
        onClick={onSelect}
        className={`
          border-b border-[var(--color-border-subtle)]/50 cursor-pointer transition-all duration-150
          ${isSelected
            ? 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)] shadow-[var(--shadow-glow-primary)]'
            : isChecked
              ? 'bg-[var(--color-primary-soft)]/30 hover:bg-[var(--color-primary-soft)]/40'
              : 'hover:bg-[var(--color-surface-subtle)]/50'
          }
        `}
      >
        <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCheck()
            }}
            className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
            title={isChecked ? "Deselect device" : "Select device"}
          >
            {isChecked ? (
              <CheckSquare size={16} className="text-[var(--color-primary)]" />
            ) : (
              <Square size={16} className="text-[var(--color-text-muted)]" />
            )}
          </button>
        </td>
        <td className="py-3.5 px-5 text-sm text-[var(--color-text)] font-semibold">
          <div className="flex items-center gap-2">
            {hasComponents && (
              <button
                onClick={onToggleExpand}
                className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
                title={isExpanded ? 'Collapse components' : 'Expand components'}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                )}
              </button>
            )}
            {!hasComponents && <div className="w-5" />}
            <span>{device.deviceId}</span>
          </div>
        </td>
        <td className="py-3.5 px-5 text-sm text-[var(--color-text-muted)] font-mono text-xs">
          {device.serialNumber}
        </td>
        <td className="py-3.5 px-5 text-sm text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1.5">
            <span>{getTypeLabel(device.type)}</span>
            {libraryUrl && (
              <Link
                href={libraryUrl}
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                title="View in library"
              >
                <Info size={12} className="text-[var(--color-primary)]" />
              </Link>
            )}
          </div>
        </td>
        <td className="py-3.5 px-5">
          {device.signal > 0 ? (
            <div className={getSignalTokenClass(device.signal)}>
              <Wifi size={16} />
              <span>{device.signal}%</span>
            </div>
          ) : (
            <div className="token token-data">
              <WifiOff size={16} />
              <span>—</span>
            </div>
          )}
        </td>
        <td className="py-3.5 px-5">
          {device.battery !== undefined ? (
            <div className={getBatteryTokenClass(device.battery)}>
              <Battery size={16} />
              <span>{device.battery}%</span>
            </div>
          ) : (
            <span className="text-sm text-[var(--color-text-soft)]">—</span>
          )}
        </td>
        <td className="py-3.5 px-5">
          <span className={getStatusTokenClass(device.status)}>
            {device.status}
          </span>
        </td>
      </tr>
      {isExpanded && hasComponents && (
        <tr
          className={`
            border-b border-[var(--color-border-subtle)]/30
            ${isSelected
              ? 'bg-[var(--color-primary-soft)]/30'
              : 'bg-[var(--color-surface-subtle)]/20'
            }
          `}
        >
          <td colSpan={7} className="py-3 px-5">
            <ComponentTree
              components={device.components || []}
              expanded={true}
              showHeader={false}
              compact={true}
              parentDevice={device}
              onComponentClick={onComponentClick}
            />
          </td>
        </tr>
      )}
    </>
  )
})

interface DeviceTableProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  onComponentClick?: (component: Component, parentDevice: Device) => void
  onDevicesDelete?: (deviceIds: string[]) => void
  onEdit?: (device: Device) => void
}

export function DeviceTable({ devices, selectedDeviceId, onDeviceSelect, onComponentClick, onDevicesDelete, onEdit }: DeviceTableProps) {
  const [sortField, setSortField] = useState<keyof Device>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set())
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLDivElement>(null)
  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  // Memoized sort handler
  const handleSort = useCallback((field: keyof Device) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDirection('asc')
      return field
    })
  }, [])

  // Memoized sorted devices
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === undefined || bVal === undefined) return 0
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [devices, sortField, sortDirection])

  // Scroll to selected device when it changes
  useEffect(() => {
    if (selectedDeviceId && selectedRowRef.current && tableRef.current) {
      const row = selectedRowRef.current
      const container = tableRef.current
      const rowTop = row.offsetTop
      const rowBottom = rowTop + row.offsetHeight
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.offsetHeight

      // Only scroll if the row is not visible
      if (rowTop < containerTop || rowBottom > containerBottom) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedDeviceId])

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedDeviceId || sortedDevices.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = sortedDevices.findIndex(d => d.id === selectedDeviceId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < sortedDevices.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onDeviceSelect?.(sortedDevices[newIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeviceId, sortedDevices, onDeviceSelect])

  const selectedDevice = useMemo(() => devices.find(d => d.id === selectedDeviceId), [devices, selectedDeviceId])

  const toggleDeviceExpansion = useCallback((deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedDevices(prev => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }, [])

  const handleToggleSelect = useCallback((deviceId: string) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedDeviceIds(prev => {
      if (prev.size === sortedDevices.length) {
        return new Set()
      }
      return new Set(sortedDevices.map(d => d.id))
    })
  }, [sortedDevices])

  const handleDeleteSelected = useCallback(() => {
    if (selectedDeviceIds.size === 0) return

    const confirmMessage = `Delete ${selectedDeviceIds.size} device${selectedDeviceIds.size > 1 ? 's' : ''}?`
    if (confirm(confirmMessage)) {
      onDevicesDelete?.(Array.from(selectedDeviceIds))
      setSelectedDeviceIds(new Set())
    }
  }, [selectedDeviceIds, onDevicesDelete])

  const allSelected = sortedDevices.length > 0 && selectedDeviceIds.size === sortedDevices.length
  const someSelected = selectedDeviceIds.size > 0 && selectedDeviceIds.size < sortedDevices.length

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header - Always visible */}
      <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base md:text-lg font-semibold text-[var(--color-text)]">
            Devices
          </h3>
          {sortedDevices.length > 0 && (
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
              {selectedDeviceIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-danger)]"
                  title={`Delete ${selectedDeviceIds.size} selected device(s)`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        {selectedDeviceIds.size > 0 && (
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {selectedDeviceIds.size} device{selectedDeviceIds.size !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Data-Dense Header for Selected Device */}
      {selectedDevice && (
        <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
          <div className="flex items-start gap-3 mb-3">
            {/* Device Image/Icon */}
            <DeviceIcon deviceType={selectedDevice.type} />
            {/* Meta Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                    {selectedDevice.deviceId}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {getTypeLabel(selectedDevice.type)}
                    </p>
                    {getDeviceLibraryUrl(selectedDevice.type) && (
                      <Link
                        href={getDeviceLibraryUrl(selectedDevice.type)!}
                        onClick={(e) => e.stopPropagation()}
                        className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                        title="View in library"
                      >
                        <Info size={12} className="text-[var(--color-primary)]" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit?.(selectedDevice)
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                    title="Edit device"
                  >
                    <Edit2 size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Serial</div>
                  <div className="text-xs font-mono font-semibold text-[var(--color-text)] truncate">{selectedDevice.serialNumber}</div>
                </div>
                {selectedDevice.location && (
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                      <MapPin size={10} />
                      Location
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-text)] truncate">{selectedDevice.location}</div>
                  </div>
                )}
                {selectedDevice.zone && (
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Zone</div>
                    <div className="text-xs font-semibold text-[var(--color-text)] truncate">{selectedDevice.zone}</div>
                  </div>
                )}
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Signal</div>
                  {selectedDevice.signal > 0 ? (
                    <div className={getSignalTokenClass(selectedDevice.signal)}>
                      <Wifi size={10} />
                      <span>{selectedDevice.signal}%</span>
                    </div>
                  ) : (
                    <div className="token token-data">
                      <WifiOff size={10} />
                      <span>—</span>
                    </div>
                  )}
                </div>
                {selectedDevice.battery !== undefined && (
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Battery</div>
                    <div className={getBatteryTokenClass(selectedDevice.battery)}>
                      <Battery size={10} />
                      <span>{selectedDevice.battery}%</span>
                    </div>
                  </div>
                )}
                <div className="px-2.5 py-1.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50 min-w-0">
                  <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Status</div>
                  <div className={getStatusTokenClass(selectedDevice.status)}>
                    {selectedDevice.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto pb-2">
        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mb-4">
              <Image size={32} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              No Devices Found
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              No devices are currently available. Upload a map and discover devices to get started.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-[var(--color-surface)] backdrop-blur-sm border-b border-[var(--color-border-subtle)] z-10">
              <tr>
                <th className="w-12 py-3.5 px-3 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                    title={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected ? (
                      <CheckSquare size={16} className="text-[var(--color-primary)]" />
                    ) : someSelected ? (
                      <CheckSquare size={16} className="text-[var(--color-primary)] opacity-50" />
                    ) : (
                      <Square size={16} className="text-[var(--color-text-muted)]" />
                    )}
                  </button>
                </th>
                <th
                  className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('deviceId')}
                >
                  Device ID {sortField === 'deviceId' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('serialNumber')}
                >
                  Serial {sortField === 'serialNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('type')}
                >
                  Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('signal')}
                >
                  Signal {sortField === 'signal' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Battery
                </th>
                <th
                  className="text-left py-3.5 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDevices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isSelected={selectedDeviceId === device.id}
                  isChecked={selectedDeviceIds.has(device.id)}
                  isExpanded={expandedDevices.has(device.id)}
                  onSelect={() => onDeviceSelect?.(device.id)}
                  onToggleCheck={() => handleToggleSelect(device.id)}
                  onToggleExpand={(e) => toggleDeviceExpansion(device.id, e)}
                  onComponentClick={onComponentClick}
                  selectedRowRef={selectedRowRef as React.RefObject<HTMLTableRowElement>}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

