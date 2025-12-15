/**
 * Discovered Devices List Component
 * 
 * Displays list of discovered devices with filtering and actions.
 * 
 * AI Note: Shows devices found during discovery, allows filtering by type/status.
 */

'use client'

import { useState, useEffect } from 'react'
import { Filter, CheckCircle2, XCircle, AlertCircle, Wifi, Battery } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface DiscoveredDevicesListProps {
  devices: Device[]
  onDeviceSelect?: (device: Device | null) => void
  selectedDeviceId?: string | null
  searchQuery?: string
}

export function DiscoveredDevicesList({
  devices,
  onDeviceSelect,
  selectedDeviceId,
  searchQuery = '',
}: DiscoveredDevicesListProps) {
  const [filterType, setFilterType] = useState<'all' | 'fixture' | 'motion' | 'light-sensor'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'missing'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredDevices = devices.filter(device => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        device.deviceId.toLowerCase().includes(query) ||
        device.serialNumber.toLowerCase().includes(query) ||
        device.type.toLowerCase().includes(query) ||
        (device.location && device.location.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }
    
    // Type filter
    if (filterType !== 'all' && device.type !== filterType) return false
    
    // Status filter
    if (filterStatus !== 'all' && device.status !== filterStatus) return false
    
    return true
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 size={14} />
      case 'offline':
        return <XCircle size={14} />
      case 'missing':
        return <AlertCircle size={14} />
      default:
        return null
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

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedDeviceId || filteredDevices.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = filteredDevices.findIndex(d => d.id === selectedDeviceId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < filteredDevices.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onDeviceSelect?.(filteredDevices[newIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeviceId, filteredDevices, onDeviceSelect])

  return (
    <div className="fusion-card h-full flex flex-col min-h-0">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between mb-4">
        <div>
          <h3 className="text-md font-semibold text-[var(--color-text)] mb-1">
            Discovered Devices
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {filteredDevices.length} of {devices.length} devices
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all flex items-center gap-2"
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Filters - Fixed */}
      {showFilters && (
        <div className="flex-shrink-0 mb-4 p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-2">
                Device Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)]"
              >
                <option value="all">All Types</option>
                <option value="fixture">Fixtures</option>
                <option value="motion">Motion Sensors</option>
                <option value="light-sensor">Light Sensors</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)]"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Device List - Scrollable */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        onClick={(e) => {
          // If clicking on the container itself (not a device item), deselect
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('discovered-devices-list-container')) {
            onDeviceSelect?.(null)
          }
        }}
      >
        <div 
          className="space-y-2 discovered-devices-list-container"
          onClick={(e) => {
            // If clicking on empty space in the list container, deselect
            if (e.target === e.currentTarget) {
              onDeviceSelect?.(null)
            }
          }}
        >
          {filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
              No devices match the current filters
            </div>
          ) : (
            filteredDevices.map((device) => {
              const isSelected = selectedDeviceId === device.id
              return (
              <div
                key={device.id}
                onClick={(e) => {
                  e.stopPropagation() // Prevent container click handler
                  // Toggle: if already selected, deselect; otherwise select
                  onDeviceSelect?.(isSelected ? null : device)
                }}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedDeviceId === device.id
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                    : 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-[var(--color-text)]">
                        {device.deviceId}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">
                      {device.serialNumber}
                    </p>
                    <p className="text-xs text-[var(--color-text-soft)]">
                      {getTypeLabel(device.type)}
                    </p>
                  </div>
                  <span className={getStatusTokenClass(device.status)}>
                    {getStatusIcon(device.status)}
                    {device.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className={getSignalTokenClass(device.signal)}>
                    <Wifi size={14} />
                    <span>{device.signal}%</span>
                  </div>
                  {device.battery !== undefined && (
                    <div className={getBatteryTokenClass(device.battery)}>
                      <Battery size={14} />
                      <span>{device.battery}%</span>
                    </div>
                  )}
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}


