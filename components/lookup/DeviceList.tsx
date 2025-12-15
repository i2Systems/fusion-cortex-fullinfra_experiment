/**
 * Device List Component
 * 
 * Main view showing all devices in a table.
 * Clickable rows that select a device for viewing details.
 * 
 * AI Note: This is the left-side main view, similar to RulesList.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Signal, Battery, Wifi, WifiOff } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface DeviceListProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  searchQuery?: string
}

export function DeviceList({ devices, selectedDeviceId, onDeviceSelect, searchQuery = '' }: DeviceListProps) {
  const [sortField, setSortField] = useState<keyof Device>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const tableRef = useRef<HTMLDivElement>(null)
  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  // Filter devices by search query
  const filteredDevices = devices.filter(device => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      device.deviceId.toLowerCase().includes(query) ||
      device.serialNumber.toLowerCase().includes(query) ||
      (device.location && device.location.toLowerCase().includes(query)) ||
      (device.zone && device.zone.toLowerCase().includes(query))
    )
  })

  // Sort devices
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (aVal === undefined || bVal === undefined) return 0
    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: keyof Device) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

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

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div 
        ref={tableRef} 
        className="flex-1 overflow-auto pb-2"
        onClick={(e) => {
          // If clicking on the container itself (not a table row), deselect
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'TABLE') {
            onDeviceSelect?.(null)
          }
        }}
      >
        {sortedDevices.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            {searchQuery ? `No devices found matching "${searchQuery}"` : 'No devices found'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] z-10">
              <tr>
                <th 
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('deviceId')}
                >
                  Device ID {sortField === 'deviceId' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('serialNumber')}
                >
                  Serial {sortField === 'serialNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('type')}
                >
                  Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('signal')}
                >
                  Signal {sortField === 'signal' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Battery
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDevices.map((device) => {
                const isSelected = selectedDeviceId === device.id
                return (
                <tr
                  key={device.id}
                  ref={isSelected ? selectedRowRef : null}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent container click handler
                    // Toggle: if already selected, deselect; otherwise select
                    onDeviceSelect?.(isSelected ? null : device.id)
                  }}
                  className={`
                    border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors
                    ${selectedDeviceId === device.id
                      ? 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)]'
                      : 'hover:bg-[var(--color-surface-subtle)]'
                    }
                  `}
                >
                  <td className="py-3 px-4 text-sm text-[var(--color-text)] font-medium">
                    {device.deviceId}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-muted)] font-mono">
                    {device.serialNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-muted)]">
                    {getTypeLabel(device.type)}
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4">
                    {device.battery !== undefined ? (
                      <div className={getBatteryTokenClass(device.battery)}>
                        <Battery size={16} />
                        <span>{device.battery}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--color-text-soft)]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={getStatusTokenClass(device.status)}>
                      {device.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-muted)]">
                    {device.location}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


