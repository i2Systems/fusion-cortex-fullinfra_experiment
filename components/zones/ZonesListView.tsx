/**
 * Zones List View Component
 * 
 * Displays zones as columns with devices as tags.
 * Supports drag and drop to move devices between zones.
 * 
 * Performance optimized with:
 * - Memoized filtered data
 * - Extracted DeviceCard component with React.memo
 * - Helper functions outside component
 */

'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/mockData'
import { Wifi, Battery, WifiOff, Info, Signal, Target, Plus, CheckSquare, Square, Trash2 } from 'lucide-react'
import { getDeviceLibraryUrl } from '@/lib/libraryUtils'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'

interface Zone {
  id: string
  name: string
  color: string
  deviceIds: string[]
}

interface ZonesListViewProps {
  zones: Zone[]
  devices: Device[]
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
  onDeviceMove?: (deviceId: string, fromZoneId: string | null, toZoneId: string) => void
  searchQuery?: string
}

// Helper functions moved outside component to prevent recreation
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'fixture': return 'Fixture'
    case 'motion': return 'Motion Sensor'
    case 'light-sensor': return 'Light Sensor'
    default: return type
  }
}

// Extracted DeviceCard component with React.memo for performance
interface DeviceCardProps {
  device: Device
  zoneId: string | null
  onDragStart: (e: React.DragEvent, device: Device, zoneId: string | null) => void
  onDragEnd: () => void
}

const DeviceCard = memo(function DeviceCard({ device, zoneId, onDragStart, onDragEnd }: DeviceCardProps) {
  const libraryUrl = getDeviceLibraryUrl(device.type)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, device, zoneId)}
      onDragEnd={onDragEnd}
      className="group p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 cursor-move transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[var(--color-text)] truncate">
          {device.deviceId}
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
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-muted)] capitalize">
            {device.type}
          </span>
          {libraryUrl && (
            <Link
              href={libraryUrl}
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="View in library"
            >
              <Info size={10} className="text-[var(--color-primary)]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
})

export function ZonesListView({
  zones,
  devices,
  selectedZoneId,
  onZoneSelect,
  onDeviceMove,
  searchQuery = ''
}: ZonesListViewProps) {
  const [draggedDevice, setDraggedDevice] = useState<{ device: Device; fromZoneId: string | null } | null>(null)
  const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null)

  // Memoized filtered devices - only recalculates when devices or searchQuery change
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices

    const query = searchQuery.toLowerCase()
    return devices.filter(device => {
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

  // Memoized zone-device mapping - creates a map of zoneId -> devices for O(1) lookup
  const zoneDevicesMap = useMemo(() => {
    const map = new Map<string, Device[]>()

    zones.forEach(zone => {
      const zoneDeviceIds = new Set(zone.deviceIds)
      map.set(zone.id, filteredDevices.filter(d => zoneDeviceIds.has(d.id)))
    })

    return map
  }, [zones, filteredDevices])

  // Memoized unassigned devices
  const unassignedDevices = useMemo(() => {
    const allZoneDeviceIds = new Set(zones.flatMap(z => z.deviceIds))
    return filteredDevices.filter(d => !allZoneDeviceIds.has(d.id))
  }, [zones, filteredDevices])

  // Stable callback handlers
  const handleDragStart = useCallback((e: React.DragEvent, device: Device, zoneId: string | null) => {
    setDraggedDevice({ device, fromZoneId: zoneId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, zoneId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZoneId(zoneId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverZoneId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toZoneId: string) => {
    e.preventDefault()
    if (draggedDevice && onDeviceMove) {
      onDeviceMove(draggedDevice.device.id, draggedDevice.fromZoneId, toZoneId)
    }
    setDraggedDevice(null)
    setDragOverZoneId(null)
  }, [draggedDevice, onDeviceMove])

  const handleDragEnd = useCallback(() => {
    setDraggedDevice(null)
    setDragOverZoneId(null)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Zones Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, zones.length + (unassignedDevices.length > 0 ? 1 : 0))}, minmax(200px, 1fr))` }}>
          {/* Zone Columns */}
          {zones.map((zone) => {
            const zoneDevices = zoneDevicesMap.get(zone.id) || []
            const isSelected = selectedZoneId === zone.id
            const isDragOver = dragOverZoneId === zone.id

            return (
              <div
                key={zone.id}
                className={`
                  flex flex-col rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                    : 'border-[var(--color-border-subtle)]'
                  }
                  ${isDragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, zone.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, zone.id)}
                onClick={() => onZoneSelect?.(isSelected ? null : zone.id)}
              >
                {/* Zone Header */}
                <div
                  className="p-3 rounded-t-lg border-b border-[var(--color-border-subtle)] cursor-pointer"
                  style={{
                    backgroundColor: `${zone.color}20`,
                    borderColor: isSelected ? zone.color : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm text-[var(--color-text)]">
                      {zone.name}
                    </h4>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {zoneDevices.length} device{zoneDevices.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Devices List */}
                <div className="flex-1 p-3 space-y-2 min-h-[200px] bg-[var(--color-surface-subtle)]/30 rounded-b-lg">
                  {zoneDevices.length === 0 ? (
                    <div className="text-xs text-[var(--color-text-soft)] text-center py-8 italic">
                      No devices
                    </div>
                  ) : (
                    zoneDevices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        zoneId={zone.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Unassigned Devices Column */}
          {unassignedDevices.length > 0 && (
            <div
              className={`
                flex flex-col rounded-lg border-2 transition-all
                ${dragOverZoneId === 'unassigned'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30'
                  : 'border-[var(--color-border-subtle)]'
                }
              `}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverZoneId('unassigned')
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault()
                setDraggedDevice(null)
                setDragOverZoneId(null)
              }}
            >
              {/* Unassigned Header */}
              <div className="p-3 rounded-t-lg border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-[var(--color-text)]">
                    Unassigned
                  </h4>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {unassignedDevices.length} device{unassignedDevices.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Unassigned Devices List */}
              <div className="flex-1 p-3 space-y-2 min-h-[200px] bg-[var(--color-surface-subtle)]/30 rounded-b-lg">
                {unassignedDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    zoneId={null}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

