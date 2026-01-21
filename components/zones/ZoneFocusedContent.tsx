/**
 * Zone Focused Content Component
 * 
 * Provides tabbed content for the zone focused modal.
 * Tabs: Overview, Metrics, History, Related
 * 
 * AI Note: This is the detailed view for a zone, showing all information
 * from the panel plus metrics, history, and related entities.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Layers,
  Info,
  Activity,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  Battery,
  MapPin,
  Workflow,
  Plus,
  Minus,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { FocusedObjectModal } from '@/components/shared/FocusedObjectModal'
import { TabDefinition } from '@/components/shared/FocusedModalTabs'
import { Device } from '@/lib/mockData'
import { Rule } from '@/lib/mockRules'
import { ZONE_COLORS, DEFAULT_ZONE_COLOR } from '@/lib/zoneColors'

interface Zone {
  id: string
  name: string
  deviceCount: number
  description: string
  colorVar?: string
  color?: string
}

interface ZoneFocusedContentProps {
  zone: Zone
  devices?: Device[]
  rules?: Rule[]
  allZones?: Zone[]
}

// Tab definitions
const zoneTabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'related', label: 'Related', icon: Users },
]

// Get zone color from CSS variable or hex
function getZoneColor(zone: Zone): string {
  if (zone.color) return zone.color
  if (zone.colorVar) {
    const root = document.documentElement
    const computed = getComputedStyle(root).getPropertyValue(zone.colorVar).trim()
    if (computed) return computed
  }
  return DEFAULT_ZONE_COLOR
}

// Overview Tab Content
function OverviewTab({ zone, devices = [] }: { zone: Zone; devices?: Device[] }) {
  const zoneColor = getZoneColor(zone)
  const zoneDevices = devices.filter(d => d.zone === zone.name)
  
  const onlineCount = zoneDevices.filter(d => d.status === 'online').length
  const offlineCount = zoneDevices.filter(d => d.status === 'offline').length
  const missingCount = zoneDevices.filter(d => d.status === 'missing').length
  
  // Group devices by type
  const devicesByType = zoneDevices.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getTypeLabel = (type: string) => {
    if (type.startsWith('fixture-')) {
      const parts = type.replace('fixture-', '').split('-')
      const size = parts[0].toUpperCase()
      const category = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      return `${size} ${category}`
    }
    switch (type) {
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Zone Visual */}
        <div
          className="w-full aspect-video rounded-xl border-2 flex items-center justify-center"
          style={{
            backgroundColor: `${zoneColor}15`,
            borderColor: zoneColor,
          }}
        >
          <div className="text-center">
            <Layers size={64} style={{ color: zoneColor }} className="mx-auto mb-3" />
            <div className="text-2xl font-bold text-[var(--color-text)]">{zone.name}</div>
            <div className="text-sm text-[var(--color-text-muted)]">{zone.deviceCount} devices</div>
          </div>
        </div>

        {/* Zone Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Info size={16} className="text-[var(--color-primary)]" />
            Zone Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Name</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{zone.name}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Device Count</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{zone.deviceCount}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-[var(--color-border-subtle)]"
                  style={{ backgroundColor: zoneColor }}
                />
                <span className="text-sm font-medium text-[var(--color-text)]">{zoneColor}</span>
              </div>
            </div>
            {zone.description && (
              <div className="p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] block mb-1">Description</span>
                <span className="text-sm text-[var(--color-text)]">{zone.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Device Status Summary */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Activity size={16} className="text-[var(--color-primary)]" />
            Device Status
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-success)]">{onlineCount}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Online</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-warning)]">{offlineCount}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Offline</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-danger)]">{missingCount}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Missing</div>
            </div>
          </div>
          {/* Health percentage bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
              <span>Zone Health</span>
              <span>{zone.deviceCount > 0 ? Math.round((onlineCount / zone.deviceCount) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-success)] rounded-full transition-all"
                style={{ width: `${zone.deviceCount > 0 ? (onlineCount / zone.deviceCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Devices by Type */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            Devices by Type
          </h4>
          <div className="space-y-2">
            {Object.entries(devicesByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">{getTypeLabel(type)}</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{count}</span>
              </div>
            ))}
            {Object.keys(devicesByType).length === 0 && (
              <div className="p-4 text-center text-[var(--color-text-muted)] text-sm">
                No devices in this zone
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Metrics Tab Content
function MetricsTab({ zone, devices = [] }: { zone: Zone; devices?: Device[] }) {
  const zoneDevices = devices.filter(d => d.zone === zone.name)
  
  // Calculate average metrics
  const avgSignal = zoneDevices.length > 0
    ? Math.round(zoneDevices.reduce((a, d) => a + d.signal, 0) / zoneDevices.length)
    : 0

  const devicesWithBattery = zoneDevices.filter(d => d.battery !== undefined)
  const avgBattery = devicesWithBattery.length > 0
    ? Math.round(devicesWithBattery.reduce((a, d) => a + (d.battery || 0), 0) / devicesWithBattery.length)
    : null

  // Mock 7-day device count trend
  const deviceTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.max(0, zone.deviceCount + Math.floor((Math.random() - 0.5) * 4)),
  }))

  // Mock online percentage trend
  const onlineTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.min(100, Math.max(50, 85 + Math.floor((Math.random() - 0.5) * 30))),
  }))

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-text)]">{zone.deviceCount}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Devices</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{avgSignal}%</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Avg Signal</div>
        </div>
        {avgBattery !== null && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
            <div className={`text-2xl font-bold ${avgBattery > 50 ? 'text-[var(--color-success)]' : avgBattery > 20 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
              {avgBattery}%
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Avg Battery</div>
          </div>
        )}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-success)]">
            {zone.deviceCount > 0 ? Math.round((zoneDevices.filter(d => d.status === 'online').length / zone.deviceCount) * 100) : 0}%
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Online Rate</div>
        </div>
      </div>

      {/* Online Rate Trend */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-primary)]" />
          Online Rate (7 Day Trend)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {onlineTrend.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all ${
                  item.value >= 90 ? 'bg-[var(--color-success)]' :
                  item.value >= 70 ? 'bg-[var(--color-warning)]' :
                  'bg-[var(--color-danger)]'
                }`}
                style={{ height: `${item.value}%` }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>Avg: {Math.round(onlineTrend.reduce((a, b) => a + b.value, 0) / 7)}%</span>
          <span>Target: 95%</span>
        </div>
      </div>

      {/* Device Count Trend */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-primary)]" />
          Device Count (7 Day Trend)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {deviceTrend.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-[var(--color-primary)] transition-all"
                style={{ height: `${(item.value / Math.max(...deviceTrend.map(d => d.value), 1)) * 100}%` }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// History Tab Content
function HistoryTab({ zone }: { zone: Zone }) {
  const zoneColor = getZoneColor(zone)

  // Mock history events
  const historyEvents = [
    { type: 'device_add', title: '2 devices added', time: '2 hours ago', icon: Plus, color: 'var(--color-success)' },
    { type: 'device_remove', title: '1 device removed', time: '1 day ago', icon: Minus, color: 'var(--color-warning)' },
    { type: 'config', title: 'Zone color updated', time: '3 days ago', icon: Settings, color: zoneColor },
    { type: 'rule', title: 'Rule "Evening Mode" applied', time: '5 days ago', icon: Workflow, color: 'var(--color-primary)' },
    { type: 'created', title: 'Zone created', time: '14 days ago', icon: Layers, color: 'var(--color-success)' },
  ]

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[var(--color-primary)]" />
          Activity Timeline
        </h4>
        <div className="space-y-3">
          {historyEvents.map((event, i) => {
            const Icon = event.icon
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${event.color} 20%, transparent)` }}
                >
                  <Icon size={16} style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{event.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{event.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Created</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Last Modified</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Related Tab Content
function RelatedTab({ zone, devices = [], rules = [], allZones = [] }: { zone: Zone; devices?: Device[]; rules?: Rule[]; allZones?: Zone[] }) {
  const zoneDevices = devices.filter(d => d.zone === zone.name)
  const zoneRules = rules.filter(r => 
    r.action?.zones?.includes(zone.name) ||
    r.condition?.zone === zone.name ||
    r.targetName === zone.name
  )

  // Find overlapping zones (zones that share devices by location)
  const deviceLocations = new Set(zoneDevices.map(d => d.location).filter(Boolean))
  const overlappingZones = allZones.filter(z => 
    z.id !== zone.id && 
    devices.some(d => d.zone === z.name && deviceLocations.has(d.location))
  )

  return (
    <div className="space-y-6">
      {/* Devices in Zone */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <Layers size={16} className="text-[var(--color-primary)]" />
          Devices in Zone ({zoneDevices.length})
        </h4>
        {zoneDevices.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {zoneDevices.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    d.status === 'online' ? 'bg-[var(--color-success)]' :
                    d.status === 'offline' ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-danger)]'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{d.deviceId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.location || 'Unknown location'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi size={12} className="text-[var(--color-text-muted)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">{d.signal}%</span>
                </div>
              </div>
            ))}
            {zoneDevices.length > 10 && (
              <div className="text-center text-xs text-[var(--color-text-muted)] py-2">
                +{zoneDevices.length - 10} more devices
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-[var(--color-text-muted)] text-sm">
            No devices in this zone
          </div>
        )}
      </div>

      {/* Rules Affecting Zone */}
      {zoneRules.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Workflow size={16} className="text-[var(--color-accent)]" />
            Rules Affecting Zone ({zoneRules.length})
          </h4>
          <div className="space-y-2">
            {zoneRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{rule.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {rule.trigger || 'Manual'} trigger
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  rule.enabled !== false
                    ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                    : 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]'
                }`}>
                  {rule.enabled !== false ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Zones */}
      {overlappingZones.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-[var(--color-primary)]" />
            Nearby Zones ({overlappingZones.length})
          </h4>
          <div className="space-y-2">
            {overlappingZones.map((z) => {
              const color = getZoneColor(z)
              return (
                <div key={z.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{z.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{z.deviceCount} devices</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {zoneDevices.length === 0 && zoneRules.length === 0 && overlappingZones.length === 0 && (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No related items to display</p>
        </div>
      )}
    </div>
  )
}

// Main Export: Zone Focused Modal wrapper
export function ZoneFocusedModal({
  isOpen,
  onClose,
  zone,
  devices = [],
  rules = [],
  allZones = [],
}: {
  isOpen: boolean
  onClose: () => void
  zone: Zone
  devices?: Device[]
  rules?: Rule[]
  allZones?: Zone[]
}) {
  const zoneColor = getZoneColor(zone)

  return (
    <FocusedObjectModal
      isOpen={isOpen}
      onClose={onClose}
      title={zone.name}
      subtitle={`${zone.deviceCount} devices • Control Zone`}
      icon={<Layers size={28} style={{ color: zoneColor }} />}
      iconBgClass="bg-[var(--color-surface-subtle)]"
      tabs={zoneTabs}
    >
      {(activeTab) => {
        switch (activeTab) {
          case 'overview':
            return <OverviewTab zone={zone} devices={devices} />
          case 'metrics':
            return <MetricsTab zone={zone} devices={devices} />
          case 'history':
            return <HistoryTab zone={zone} />
          case 'related':
            return <RelatedTab zone={zone} devices={devices} rules={rules} allZones={allZones} />
          default:
            return <OverviewTab zone={zone} devices={devices} />
        }
      }}
    </FocusedObjectModal>
  )
}
