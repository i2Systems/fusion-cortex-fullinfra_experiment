/**
 * Device List Component
 * 
 * Main view showing all devices in a table.
 * Clickable rows that select a device for viewing details.
 * 
 * AI Note: This is the left-side main view, similar to RulesList.
 * 
 * Performance optimized with:
 * - Memoized DeviceListRow component
 * - useMemo for filtered and sorted data
 * - Helper functions moved outside
 * - useCallback for handlers
 */

'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { Signal, Battery, Wifi, WifiOff, Shield, Plus, QrCode, Upload, Download, Info } from 'lucide-react'
import { Device } from '@/lib/mockData'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass } from '@/lib/warranty'
import { getDeviceLibraryUrl } from '@/lib/libraryUtils'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'

interface DeviceListProps {
  devices: Device[]
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  searchQuery?: string
}

type SortableField = keyof Device | 'warrantyStatus'

// Helper functions moved outside component
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'fixture': return 'Fixture'
    case 'motion': return 'Motion Sensor'
    case 'light-sensor': return 'Light Sensor'
    default: return type
  }
}

// Memoized table row component
interface DeviceListRowProps {
  device: Device
  isSelected: boolean
  onSelect: () => void
  selectedRowRef?: React.RefObject<HTMLTableRowElement>
}

const DeviceListRow = memo(function DeviceListRow({
  device,
  isSelected,
  onSelect,
  selectedRowRef
}: DeviceListRowProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }, [onSelect])

  const libraryUrl = getDeviceLibraryUrl(device.type)
  const warrantyStatus = device.warrantyExpiry ? calculateWarrantyStatus(device.warrantyExpiry) : null

  return (
    <tr
      ref={isSelected ? selectedRowRef : null}
      onClick={handleClick}
      className={`
        border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors
        ${isSelected
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
      <td className="py-3 px-4">
        {warrantyStatus ? (
          <span className={getWarrantyStatusTokenClass(warrantyStatus.status)}>
            {getWarrantyStatusLabel(warrantyStatus.status)}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-text-soft)]">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-[var(--color-text-muted)]">
        {device.location}
      </td>
    </tr>
  )
})

export function DeviceList({ devices, selectedDeviceId, onDeviceSelect, searchQuery = '' }: DeviceListProps) {
  const [sortField, setSortField] = useState<SortableField>('deviceId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const tableRef = useRef<HTMLDivElement>(null)
  const selectedRowRef = useRef<HTMLTableRowElement>(null)

  // Memoized filter - only recalculate when devices or searchQuery changes
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices

    const query = searchQuery.toLowerCase()
    return devices.filter(device => {
      // Build searchable text from all device fields
      const searchableText = [
        device.deviceId,
        device.serialNumber,
        device.location,
        device.zone,
        device.type,
        device.status,
        String(device.signal),
        device.battery !== undefined ? String(device.battery) : '',
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(query)
    })
  }, [devices, searchQuery])

  // Memoized sort - only recalculate when filtered devices or sort settings change
  const sortedDevices = useMemo(() => {
    return [...filteredDevices].sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortField === 'warrantyStatus') {
        const aWarranty = calculateWarrantyStatus(a.warrantyExpiry)
        const bWarranty = calculateWarrantyStatus(b.warrantyExpiry)
        const statusOrder = { 'in-warranty': 0, 'near-end': 1, 'out-of-warranty': 2 }
        aVal = statusOrder[aWarranty.status]
        bVal = statusOrder[bWarranty.status]
      } else {
        aVal = a[sortField as keyof Device]
        bVal = b[sortField as keyof Device]
      }

      if (aVal === undefined || bVal === undefined) return 0
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredDevices, sortField, sortDirection])

  // Memoized sort handler
  const handleSort = useCallback((field: SortableField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  // Memoized container click handler
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'TABLE') {
      onDeviceSelect?.(null)
    }
  }, [onDeviceSelect])

  // Scroll to selected device when it changes
  useEffect(() => {
    if (selectedDeviceId && selectedRowRef.current && tableRef.current) {
      const row = selectedRowRef.current
      const container = tableRef.current
      const rowTop = row.offsetTop
      const rowBottom = rowTop + row.offsetHeight
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.offsetHeight

      if (rowTop < containerTop || rowBottom > containerBottom) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedDeviceId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        onClick={handleContainerClick}
      >
        {sortedDevices.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center mb-6">
              <p className="text-sm text-[var(--color-text-muted)] mb-8">
                {searchQuery ? `No devices found matching "${searchQuery}"` : 'No devices found. Add devices to get started.'}
              </p>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const event = new CustomEvent('manualEntry')
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Add Device Manually
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const event = new CustomEvent('qrScan')
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
              >
                <QrCode size={16} />
                Scan QR Code
              </button>
              <div className="flex-1 min-w-full md:min-w-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const event = new CustomEvent('importList')
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Upload size={16} />
                Import List
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const event = new CustomEvent('exportList')
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Export List
              </button>
            </div>
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
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] transition-colors"
                  onClick={() => handleSort('warrantyStatus')}
                >
                  Warranty {sortField === 'warrantyStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                  <DeviceListRow
                    key={device.id}
                    device={device}
                    isSelected={isSelected}
                    onSelect={() => onDeviceSelect?.(isSelected ? null : device.id)}
                    selectedRowRef={selectedRowRef as React.RefObject<HTMLTableRowElement>}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

