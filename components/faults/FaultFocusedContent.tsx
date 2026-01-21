/**
 * Fault Focused Content Component
 * 
 * Provides tabbed content for the fault focused modal.
 * Tabs: Overview, Metrics, History, Related
 * 
 * AI Note: This is the detailed view for a fault, showing all information
 * from the panel plus metrics, history, and related entities.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Droplets,
  Zap,
  Thermometer,
  Plug,
  Settings,
  Package,
  Wrench,
  Lightbulb,
  MapPin,
  Radio,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingDown,
  XCircle,
  Battery,
  Shield,
  ExternalLink,
  Info,
  Activity,
  Users,
  AlertTriangle,
  Image,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { Device, DeviceType } from '@/lib/mockData'
import { FaultCategory, faultCategories, generateFaultDescription } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { getDeviceLibraryUrl, getDeviceImage, getDeviceImageAsync } from '@/lib/libraryUtils'
import { isFixtureType } from '@/lib/deviceUtils'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'
import { FocusedObjectModal } from '@/components/shared/FocusedObjectModal'
import { TabDefinition } from '@/components/shared/FocusedModalTabs'
import { Button } from '@/components/ui/Button'

interface Fault {
  id?: string
  device: Device
  faultType: FaultCategory
  detectedAt: Date
  description: string
  resolved?: boolean
}

interface FaultFocusedContentProps {
  fault: Fault
  allFaults?: Fault[]
  allDevices?: Device[]
}

// Tab definitions
const faultTabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'related', label: 'Related', icon: Users },
]

// Device Icon Component with image support
function DeviceIconLarge({ deviceType }: { deviceType: string }) {
  const [imageError, setImageError] = useState(false)
  const [deviceImage, setDeviceImage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      const syncImage = getDeviceImage(deviceType as DeviceType)
      if (syncImage && !syncImage.startsWith('https://images.unsplash.com')) {
        if (isMounted) {
          setDeviceImage(syncImage)
          setImageError(false)
        }
        return
      }

      try {
        const asyncImage = await getDeviceImageAsync(deviceType as DeviceType)
        if (asyncImage && isMounted) {
          setDeviceImage(asyncImage)
          setImageError(false)
        }
      } catch (error) {
        console.error('Failed to load device image:', error)
      }
    }

    loadImage()
    return () => { isMounted = false }
  }, [deviceType])

  const showImage = deviceImage && !imageError

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
    <div className="w-full aspect-video rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
      {showImage ? (
        <img
          src={deviceImage}
          alt={getTypeLabel(deviceType)}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center justify-center">
          {isFixtureType(deviceType as DeviceType) ? (
            <Image size={64} className="text-[var(--color-primary)]" />
          ) : deviceType === 'motion' ? (
            <Radio size={64} className="text-[var(--color-accent)]" />
          ) : (
            <Thermometer size={64} className="text-[var(--color-success)]" />
          )}
        </div>
      )}
    </div>
  )
}

// Get fault icon
function getFaultIcon(faultType: FaultCategory, size: number = 24) {
  const iconMap: Record<FaultCategory, React.ReactNode> = {
    'environmental-ingress': <Droplets size={size} className="text-[var(--color-danger)]" />,
    'electrical-driver': <Zap size={size} className="text-[var(--color-danger)]" />,
    'thermal-overheat': <Thermometer size={size} className="text-[var(--color-warning)]" />,
    'installation-wiring': <Plug size={size} className="text-[var(--color-warning)]" />,
    'control-integration': <Settings size={size} className="text-[var(--color-primary)]" />,
    'manufacturing-defect': <Package size={size} className="text-[var(--color-primary)]" />,
    'mechanical-structural': <Wrench size={size} className="text-[var(--color-primary)]" />,
    'optical-output': <Lightbulb size={size} className="text-[var(--color-warning)]" />,
  }
  return iconMap[faultType] || <AlertCircle size={size} className="text-[var(--color-text-muted)]" />
}

// Get fault severity color
function getFaultSeverity(faultType: FaultCategory): 'danger' | 'warning' | 'info' {
  const categoryInfo = faultCategories[faultType]
  return categoryInfo?.color || 'info'
}

// Overview Tab Content
function OverviewTab({ fault }: { fault: Fault }) {
  const warrantyInfo = calculateWarrantyStatus(fault.device.warrantyExpiry)
  const categoryInfo = faultCategories[fault.faultType]
  const troubleshootingSteps = categoryInfo?.troubleshootingSteps || []

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

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Device Image */}
        <DeviceIconLarge deviceType={fault.device.type} />

        {/* Fault Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--color-warning)]" />
            Fault Information
          </h4>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface)]">
              <div className="flex items-center gap-2 mb-2">
                {getFaultIcon(fault.faultType, 20)}
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {categoryInfo?.label || fault.faultType}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{fault.description}</p>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Clock size={14} />
                Detected
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">{formatTimeAgo(fault.detectedAt)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Status</span>
              <span className={`text-sm font-medium ${fault.resolved ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                {fault.resolved ? 'Resolved' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Description */}
        {categoryInfo && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Info size={16} className="text-[var(--color-primary)]" />
              About This Fault Type
            </h4>
            <p className="text-sm text-[var(--color-text-muted)]">{categoryInfo.description}</p>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Device Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Radio size={16} className="text-[var(--color-primary)]" />
            Device Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Device ID</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{fault.device.deviceId}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-sm font-mono font-medium text-[var(--color-text)]">{fault.device.serialNumber}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{getTypeLabel(fault.device.type)}</span>
            </div>
            {fault.device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">{fault.device.location}</span>
              </div>
            )}
            {fault.device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{fault.device.zone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Steps */}
        {troubleshootingSteps.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <RefreshCw size={16} className="text-[var(--color-primary)]" />
              Troubleshooting Steps
            </h4>
            <div className="space-y-2">
              {troubleshootingSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warranty Information */}
        {fault.device.warrantyExpiry && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Shield size={16} className="text-[var(--color-primary)]" />
              Warranty Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                <span className={getWarrantyStatusTokenClass(warrantyInfo.status)}>
                  {getWarrantyStatusLabel(warrantyInfo.status)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">Expiry</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {formatWarrantyExpiry(fault.device.warrantyExpiry)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Metrics Tab Content
function MetricsTab({ fault, allFaults = [] }: { fault: Fault; allFaults?: Fault[] }) {
  const categoryInfo = faultCategories[fault.faultType]
  
  // Count faults by category
  const faultsByCategory = allFaults.reduce((acc, f) => {
    acc[f.faultType] = (acc[f.faultType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Mock occurrence frequency data
  const occurrenceTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.floor(Math.random() * 5),
  }))

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-danger)]">{allFaults.filter(f => !f.resolved).length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Active Faults</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-success)]">{allFaults.filter(f => f.resolved).length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Resolved</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-text)]">{faultsByCategory[fault.faultType] || 1}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Same Type</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-warning)]">
            {Math.floor((Date.now() - fault.detectedAt.getTime()) / (1000 * 60 * 60))}h
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Time Open</div>
        </div>
      </div>

      {/* Occurrence Frequency */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-primary)]" />
          Occurrence Frequency (7 Days)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {occurrenceTrend.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all ${
                  item.value > 3 ? 'bg-[var(--color-danger)]' :
                  item.value > 1 ? 'bg-[var(--color-warning)]' :
                  item.value > 0 ? 'bg-[var(--color-primary)]' :
                  'bg-[var(--color-surface)]'
                }`}
                style={{ height: `${Math.max(10, item.value * 20)}%` }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>Total: {occurrenceTrend.reduce((a, b) => a + b.value, 0)} occurrences</span>
          <span>Avg: {(occurrenceTrend.reduce((a, b) => a + b.value, 0) / 7).toFixed(1)}/day</span>
        </div>
      </div>

      {/* Faults by Category */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-primary)]" />
          Faults by Category
        </h4>
        <div className="space-y-2">
          {Object.entries(faultsByCategory).map(([category, count]) => {
            const catInfo = faultCategories[category as FaultCategory]
            const isCurrentCategory = category === fault.faultType
            return (
              <div
                key={category}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentCategory
                    ? 'bg-[var(--color-primary-soft)] border border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getFaultIcon(category as FaultCategory, 16)}
                  <span className="text-sm text-[var(--color-text)]">{catInfo?.shortLabel || category}</span>
                </div>
                <span className="text-sm font-bold text-[var(--color-text)]">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// History Tab Content
function HistoryTab({ fault }: { fault: Fault }) {
  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  // Mock history events
  const historyEvents = [
    { type: 'detected', title: 'Fault detected', time: formatTimeAgo(fault.detectedAt), icon: AlertCircle, color: 'var(--color-danger)' },
    { type: 'notify', title: 'Notification sent to admin', time: formatTimeAgo(new Date(fault.detectedAt.getTime() + 5 * 60 * 1000)), icon: Activity, color: 'var(--color-primary)' },
  ]

  if (fault.device.status === 'online') {
    historyEvents.push({
      type: 'recover',
      title: 'Device came back online',
      time: '30 minutes ago',
      icon: CheckCircle2,
      color: 'var(--color-success)',
    })
  }

  if (fault.resolved) {
    historyEvents.push({
      type: 'resolved',
      title: 'Fault marked as resolved',
      time: '10 minutes ago',
      icon: CheckCircle2,
      color: 'var(--color-success)',
    })
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[var(--color-primary)]" />
          Status Timeline
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

      {/* Device Status History */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <TrendingDown size={16} className="text-[var(--color-primary)]" />
          Device Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface)]">
            <XCircle size={16} className="text-[var(--color-danger)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">Fault detected</p>
              <p className="text-xs text-[var(--color-text-muted)]">{formatTimeAgo(fault.detectedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface)]">
            <CheckCircle2 size={16} className="text-[var(--color-success)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">Last online</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {fault.device.status === 'online' ? 'Currently online' : 'Before fault'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Related Tab Content
function RelatedTab({ fault, allFaults = [], allDevices = [] }: { fault: Fault; allFaults?: Fault[]; allDevices?: Device[] }) {
  // Find similar faults (same type)
  const similarFaults = allFaults.filter(f => 
    f.faultType === fault.faultType && f.device.id !== fault.device.id
  ).slice(0, 5)

  // Find affected devices (devices with same fault type or in same zone/location)
  const affectedDevices = allDevices.filter(d => 
    (d.status === 'offline' || d.status === 'missing') && 
    d.id !== fault.device.id &&
    (d.zone === fault.device.zone || d.location === fault.device.location)
  ).slice(0, 5)

  // Devices in same zone
  const zoneDevices = fault.device.zone 
    ? allDevices.filter(d => d.zone === fault.device.zone && d.id !== fault.device.id).slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      {/* Similar Faults */}
      {similarFaults.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--color-warning)]" />
            Similar Faults ({similarFaults.length})
          </h4>
          <div className="space-y-2">
            {similarFaults.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{f.device.deviceId}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{f.device.location || 'Unknown location'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  f.resolved
                    ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                    : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                }`}>
                  {f.resolved ? 'Resolved' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Affected Devices */}
      {affectedDevices.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-[var(--color-danger)]" />
            Other Affected Devices ({affectedDevices.length})
          </h4>
          <div className="space-y-2">
            {affectedDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    d.status === 'offline' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{d.deviceId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.location || 'Unknown location'}</p>
                  </div>
                </div>
                <span className={getStatusTokenClass(d.status)}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devices in Same Zone */}
      {zoneDevices.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-[var(--color-primary)]" />
            Devices in "{fault.device.zone}" ({zoneDevices.length})
          </h4>
          <div className="space-y-2">
            {zoneDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    d.status === 'online' ? 'bg-[var(--color-success)]' :
                    d.status === 'offline' ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-danger)]'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{d.deviceId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.type}</p>
                  </div>
                </div>
                <span className={getStatusTokenClass(d.status)}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {similarFaults.length === 0 && affectedDevices.length === 0 && zoneDevices.length === 0 && (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No related items to display</p>
        </div>
      )}
    </div>
  )
}

// Main Export: Fault Focused Modal wrapper
export function FaultFocusedModal({
  isOpen,
  onClose,
  fault,
  allFaults = [],
  allDevices = [],
}: {
  isOpen: boolean
  onClose: () => void
  fault: Fault
  allFaults?: Fault[]
  allDevices?: Device[]
}) {
  const categoryInfo = faultCategories[fault.faultType]

  return (
    <FocusedObjectModal
      isOpen={isOpen}
      onClose={onClose}
      title={fault.device.deviceId}
      subtitle={`${categoryInfo?.shortLabel || fault.faultType} • ${fault.device.serialNumber}`}
      icon={getFaultIcon(fault.faultType, 28)}
      iconBgClass={`bg-[var(--color-${getFaultSeverity(fault.faultType)})]/20`}
      tabs={faultTabs}
    >
      {(activeTab) => {
        switch (activeTab) {
          case 'overview':
            return <OverviewTab fault={fault} />
          case 'metrics':
            return <MetricsTab fault={fault} allFaults={allFaults} />
          case 'history':
            return <HistoryTab fault={fault} />
          case 'related':
            return <RelatedTab fault={fault} allFaults={allFaults} allDevices={allDevices} />
          default:
            return <OverviewTab fault={fault} />
        }
      }}
    </FocusedObjectModal>
  )
}
