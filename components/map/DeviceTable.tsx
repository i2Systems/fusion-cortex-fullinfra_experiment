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

import { useState, useEffect, useRef } from 'react'
import { Signal, Battery, Wifi, WifiOff, Image, Radio, Thermometer, MapPin } from 'lucide-react'

interface Device {
  id: string
  deviceId: string
  serialNumber: string
  type: 'fixture' | 'motion' | 'light-sensor'
  signal: number
  battery?: number
  status: 'online' | 'offline' | 'missing'
  location?: string
  zone?: string
}

interface DeviceTableProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
}

export function DeviceTable({ devices, selectedDeviceId, onDeviceSelect }: DeviceTableProps) {
  const [sortField, setSortField] = useState<keyof Device>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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

  return (
    <div className="h-full flex flex-col">
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
              <div className="mb-2">
                <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                  {selectedDevice.deviceId}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {getTypeLabel(selectedDevice.type)}
                </p>
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

      {/* Table Header */}
      <div className="p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/50">
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">
          Devices
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {devices.length} devices found
        </p>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
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
            {sortedDevices.map((device) => (
              <tr
                key={device.id}
                ref={selectedDeviceId === device.id ? selectedRowRef : null}
                onClick={() => onDeviceSelect?.(device.id)}
                className={`
                  border-b border-[var(--color-border-subtle)]/50 cursor-pointer transition-all duration-150
                  ${selectedDeviceId === device.id
                    ? 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)] shadow-[0_0_20px_rgba(0,217,255,0.2)]'
                    : 'hover:bg-[var(--color-surface-subtle)]/50'
                  }
                `}
              >
                <td className="py-3.5 px-5 text-sm text-[var(--color-text)] font-semibold">
                  {device.deviceId}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

