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
import { Signal, Battery, Wifi, WifiOff, Image, Radio, Thermometer, MapPin, Edit2, Plus, ChevronRight, ChevronDown, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import type { Component, Device as DeviceType } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'

import type { Device } from '@/lib/mockData'

interface DeviceTableProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  onComponentClick?: (component: Component, parentDevice: DeviceType) => void
}

export function DeviceTable({ devices, selectedDeviceId, onDeviceSelect, onComponentClick }: DeviceTableProps) {
  const [sortField, setSortField] = useState<keyof Device>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set())
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-[var(--color-success)]'
      case 'offline': return 'text-[var(--color-warning)]'
      case 'missing': return 'text-[var(--color-danger)]'
      default: return 'text-[var(--color-text-muted)]'
    }
  }

  const getSignalColor = (signal: number) => {
    if (signal >= 80) return 'text-[var(--color-success)]'
    if (signal >= 50) return 'text-[var(--color-warning)]'
    return 'text-[var(--color-danger)]'
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

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header - Always visible */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            Devices
          </h3>
        </div>
      </div>

      {/* Data-Dense Header for Selected Device */}
      {selectedDevice && (
        <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
          <div className="flex items-start gap-3 mb-3">
            {/* Device Image/Icon */}
            {(() => {
              const DeviceIcon = getDeviceIcon(selectedDevice.type)
              return (
                <div className={`w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]`}>
                  <DeviceIcon size={32} className={getDeviceIconColor(selectedDevice.type)} />
                </div>
              )
            })()}
            {/* Meta Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                    {selectedDevice.deviceId}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {getTypeLabel(selectedDevice.type)}
                  </p>
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
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                    {selectedDevice.signal > 0 ? (
                      <Wifi size={10} className={getSignalColor(selectedDevice.signal)} />
                    ) : (
                      <WifiOff size={10} className="text-[var(--color-text-muted)]" />
                    )}
                    Signal
                  </div>
                  <div className={`text-xs font-semibold ${getSignalColor(selectedDevice.signal)}`}>{selectedDevice.signal}%</div>
                </div>
                {selectedDevice.battery !== undefined && (
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                      <Battery size={10} className={selectedDevice.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                      Battery
                    </div>
                    <div className={`text-xs font-semibold ${selectedDevice.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>{selectedDevice.battery}%</div>
                  </div>
                )}
                <div className={`px-2.5 py-1.5 rounded border ${getStatusColor(selectedDevice.status)} bg-[var(--color-surface)]/50 min-w-0`}>
                  <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Status</div>
                  <div className="text-xs font-semibold capitalize">{selectedDevice.status}</div>
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
                          : 'hover:bg-[var(--color-surface-subtle)]/50'
                        }
                      `}
                    >
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
                  {getTypeLabel(device.type)}
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    {device.signal > 0 ? (
                      <Wifi size={16} className={getSignalColor(device.signal)} />
                    ) : (
                      <WifiOff size={16} className="text-[var(--color-text-muted)]" />
                    )}
                    <span className={`text-sm font-medium ${getSignalColor(device.signal)}`}>
                      {device.signal}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-5">
                  {device.battery !== undefined ? (
                    <div className="flex items-center gap-2">
                      <Battery size={16} className={device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                      <span className="text-sm text-[var(--color-text-muted)] font-medium">
                        {device.battery}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--color-text-soft)]">—</span>
                  )}
                </td>
                <td className="py-3.5 px-5">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${getStatusColor(device.status)} bg-[var(--color-surface-subtle)]`}>
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
                  <td colSpan={6} className="py-3 px-5">
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

