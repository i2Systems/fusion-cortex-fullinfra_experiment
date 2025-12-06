/**
 * Discovered Devices List Component
 * 
 * Displays list of discovered devices with filtering and actions.
 * 
 * AI Note: Shows devices found during discovery, allows filtering by type/status.
 */

'use client'

import { useState } from 'react'
import { Filter, CheckCircle2, XCircle, AlertCircle, Wifi, Battery } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface DiscoveredDevicesListProps {
  devices: Device[]
  onDeviceSelect?: (device: Device) => void
  selectedDeviceId?: string | null
}

export function DiscoveredDevicesList({
  devices,
  onDeviceSelect,
  selectedDeviceId,
}: DiscoveredDevicesListProps) {
  const [filterType, setFilterType] = useState<'all' | 'fixture' | 'motion' | 'light-sensor'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'missing'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredDevices = devices.filter(device => {
    if (filterType !== 'all' && device.type !== filterType) return false
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
        return <CheckCircle2 size={16} className="text-[var(--color-success)]" />
      case 'offline':
        return <XCircle size={16} className="text-[var(--color-warning)]" />
      case 'missing':
        return <AlertCircle size={16} className="text-[var(--color-danger)]" />
      default:
        return null
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

  return (
    <div className="fusion-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
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

      {/* Device List */}
      <div className="space-y-2 max-h-[50vh] overflow-auto">
        {filteredDevices.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
            No devices match the current filters
          </div>
        ) : (
          filteredDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => onDeviceSelect?.(device)}
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
                    {getStatusIcon(device.status)}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">
                    {device.serialNumber}
                  </p>
                  <p className="text-xs text-[var(--color-text-soft)]">
                    {getTypeLabel(device.type)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md bg-[var(--color-surface-subtle)] ${getStatusColor(device.status)}`}>
                  {device.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <Wifi size={14} className={getSignalColor(device.signal)} />
                  <span className={`text-xs ${getSignalColor(device.signal)}`}>
                    {device.signal}%
                  </span>
                </div>
                {device.battery !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Battery size={14} className={device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {device.battery}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

