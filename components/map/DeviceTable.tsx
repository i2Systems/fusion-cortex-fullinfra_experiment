/**
 * Device Table Component
 * 
 * Table showing detailed information about devices.
 * Displays device ID, serial, type, signal, battery, status, etc.
 * 
 * AI Note: This table should be filterable, sortable, and clickable
 * to highlight devices on the map.
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Signal, Battery, Wifi, WifiOff, Image, Radio, Thermometer, MapPin, Edit2, Plus, ChevronRight, ChevronDown, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle, Trash2, CheckSquare, Square, Info } from 'lucide-react'
import type { Component, Device, DeviceType } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'
import { getDeviceLibraryUrl, getDeviceImage } from '@/lib/libraryUtils'
import { isFixtureType } from '@/lib/deviceUtils'

interface DeviceTableProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  onComponentClick?: (component: Component, parentDevice: Device) => void
  onDevicesDelete?: (deviceIds: string[]) => void
}

export function DeviceTable({ devices, selectedDeviceId, onDeviceSelect, onComponentClick, onDevicesDelete }: DeviceTableProps) {
  const [sortField, setSortField] = useState<keyof Device>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set())
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLDivElement>(null)
  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  const handleSort = (field: keyof Device) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedDevices = [...devices].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (aVal === undefined || bVal === undefined) return 0
    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  const getStatusTokenClass = (status: string) => {
    switch (status) {
      case 'online': return 'token token-status-online'
      case 'offline': return 'token token-status-offline'
      case 'missing': return 'token token-status-error'
      default: return 'token token-status-offline'
    }
  }

  const getSignalTokenClass = (signal: number) => {
    if (signal >= 80) return 'token token-data token-data-signal-high'
    if (signal >= 50) return 'token token-data token-data-signal-medium'
    return 'token token-data token-data-signal-low'
  }

  const getBatteryTokenClass = (battery: number) => {
    if (battery >= 80) return 'token token-data token-data-battery-high'
    if (battery >= 20) return 'token token-data token-data-battery-medium'
    return 'token token-data token-data-battery-low'
  }

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

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'fixture': return Image
      case 'motion': return Radio
      case 'light-sensor': return Thermometer
      default: return Image
    }
  }

  const getDeviceIconColor = (type: string) => {
    switch (type) {
      case 'fixture': return 'text-[var(--color-primary)]'
      case 'motion': return 'text-[var(--color-accent)]'
      case 'light-sensor': return 'text-[var(--color-success)]'
      default: return 'text-[var(--color-text-muted)]'
    }
  }

  // Device Icon Component with image support
  function DeviceIcon({ deviceType }: { deviceType: string }) {
    const [imageError, setImageError] = useState(false)
    const [imageKey, setImageKey] = useState(0)

    // Listen for library image updates
    useEffect(() => {
      const handleImageUpdate = () => {
        setImageKey(prev => prev + 1)
        setImageError(false) // Reset error state
      }
      window.addEventListener('libraryImageUpdated', handleImageUpdate)
      return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
    }, [])

    // Call getDeviceImage on every render (it checks localStorage each time)
    const deviceImage = getDeviceImage(deviceType as DeviceType)
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
  }

  const toggleDeviceExpansion = (deviceId: string, e: React.MouseEvent) => {
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
  }

  const handleToggleSelect = (deviceId: string) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedDeviceIds.size === sortedDevices.length) {
      setSelectedDeviceIds(new Set())
    } else {
      setSelectedDeviceIds(new Set(sortedDevices.map(d => d.id)))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedDeviceIds.size === 0) return
    
    const confirmMessage = `Delete ${selectedDeviceIds.size} device${selectedDeviceIds.size > 1 ? 's' : ''}?`
    if (confirm(confirmMessage)) {
      onDevicesDelete?.(Array.from(selectedDeviceIds))
      setSelectedDeviceIds(new Set())
    }
  }

  const allSelected = sortedDevices.length > 0 && selectedDeviceIds.size === sortedDevices.length
  const someSelected = selectedDeviceIds.size > 0 && selectedDeviceIds.size < sortedDevices.length

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header - Always visible */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            Devices
          </h3>
          {selectedDeviceIds.size > 0 && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {selectedDeviceIds.size} selected
            </span>
          )}
        </div>
        {/* Selection controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border-subtle)]"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? (
              <CheckSquare size={16} />
            ) : someSelected ? (
              <Square size={16} className="border-2 border-current" />
            ) : (
              <Square size={16} />
            )}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          {selectedDeviceIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--color-danger-soft)] hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-white transition-colors border border-[var(--color-danger)]"
              title={`Delete ${selectedDeviceIds.size} selected device${selectedDeviceIds.size > 1 ? 's' : ''}`}
            >
              <Trash2 size={16} />
              <span>Delete ({selectedDeviceIds.size})</span>
            </button>
          )}
        </div>
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
                      // Handle edit - could open device profile or edit modal
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
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
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
              {sortedDevices.map((device) => {
                const isExpanded = expandedDevices.has(device.id)
                const hasComponents = device.components && device.components.length > 0
                return (
                  <React.Fragment key={device.id}>
                    <tr
                      ref={selectedDeviceId === device.id ? selectedRowRef : null}
                      onClick={() => onDeviceSelect?.(device.id)}
                      className={`
                        border-b border-[var(--color-border-subtle)]/50 cursor-pointer transition-all duration-150
                        ${selectedDeviceId === device.id
                          ? 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)] shadow-[var(--shadow-glow-primary)]'
                          : selectedDeviceIds.has(device.id)
                          ? 'bg-[var(--color-primary-soft)]/30 hover:bg-[var(--color-primary-soft)]/40'
                          : 'hover:bg-[var(--color-surface-subtle)]/50'
                        }
                      `}
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedDeviceIds.has(device.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleToggleSelect(device.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-5 text-sm text-[var(--color-text)] font-semibold">
                        <div className="flex items-center gap-2">
                          {hasComponents && (
                            <button
                              onClick={(e) => toggleDeviceExpansion(device.id, e)}
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
                    {getDeviceLibraryUrl(device.type) && (
                      <Link
                        href={getDeviceLibraryUrl(device.type)!}
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
                    ${selectedDeviceId === device.id
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
              </React.Fragment>
              )
            })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


