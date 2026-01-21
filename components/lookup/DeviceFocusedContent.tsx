/**
 * Device Focused Content Component
 * 
 * Provides tabbed content for the device focused modal.
 * Tabs: Overview, Metrics, History, Related
 * 
 * AI Note: This is the detailed view for a device, showing all information
 * from the panel plus metrics, history, and related entities.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Image,
  Calendar,
  Thermometer,
  Shield,
  Package,
  MapPin,
  Radio,
  Battery,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  XCircle,
  QrCode,
  AlertTriangle,
  ExternalLink,
  Activity,
  Clock,
  TrendingUp,
  Users,
  Layers,
  Zap,
  Info,
  Download as DownloadIcon,
} from 'lucide-react'
import { Device, Component, DeviceType } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'
import { isFixtureType } from '@/lib/deviceUtils'
import { getDeviceLibraryUrl, getDeviceImage, getDeviceImageAsync } from '@/lib/libraryUtils'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'
import { FocusedObjectModal, FocusedModalTrigger } from '@/components/shared/FocusedObjectModal'
import { TabDefinition } from '@/components/shared/FocusedModalTabs'
import { Button } from '@/components/ui/Button'

interface DeviceFocusedContentProps {
  device: Device
  allDevices?: Device[]
  onComponentClick?: (component: Component, parentDevice: Device) => void
}

// Tab definitions
const deviceTabs: TabDefinition[] = [
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

  return (
    <div className="w-full aspect-video rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
      {showImage ? (
        <img
          src={deviceImage}
          alt={deviceType}
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

// Overview Tab Content
function OverviewTab({ device, onComponentClick }: { device: Device; onComponentClick?: (component: Component, parentDevice: Device) => void }) {
  const warrantyInfo = calculateWarrantyStatus(device.warrantyExpiry)

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 size={14} />
      case 'offline': return <XCircle size={14} />
      case 'missing': return <AlertCircle size={14} />
      default: return null
    }
  }

  // Build date (approximated from warranty)
  const buildDate = device.warrantyExpiry
    ? new Date(new Date(device.warrantyExpiry).getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
    : new Date(2024, 0, 1)
  const cct = isFixtureType(device.type) ? [2700, 3000, 3500, 4000, 5000][Math.floor(Math.random() * 5)] : undefined

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Device Image */}
        <DeviceIconLarge deviceType={device.type} />

        {/* Basic Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Info size={16} className="text-[var(--color-primary)]" />
            Basic Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Device ID</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{device.deviceId}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-sm font-mono font-medium text-[var(--color-text)]">{device.serialNumber}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{getTypeLabel(device.type)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Status</span>
              <span className={getStatusTokenClass(device.status)}>
                {getStatusIcon(device.status)}
                {device.status}
              </span>
            </div>
            {device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">{device.location}</span>
              </div>
            )}
            {device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{device.zone}</span>
              </div>
            )}
          </div>
        </div>

        {/* I2QR Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <QrCode size={16} className="text-[var(--color-primary)]" />
            I2QR Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Calendar size={14} />
                Build Date
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">{buildDate.toLocaleDateString()}</span>
            </div>
            {cct && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Thermometer size={14} />
                  Color Temperature
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">{cct}K</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Wifi size={16} className="text-[var(--color-primary)]" />
            Connection Status
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Signal Strength</span>
              {device.signal > 0 ? (
                <div className={getSignalTokenClass(device.signal)}>
                  <Wifi size={14} />
                  <span>{device.signal}%</span>
                </div>
              ) : (
                <div className="token token-data">
                  <WifiOff size={14} />
                  <span>—</span>
                </div>
              )}
            </div>
            {device.battery !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)]">Battery Level</span>
                <div className={getBatteryTokenClass(device.battery)}>
                  <Battery size={14} />
                  <span>{device.battery}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Shield size={16} className="text-[var(--color-primary)]" />
            Warranty Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Status</span>
              {device.warrantyExpiry ? (
                <span className={getWarrantyStatusTokenClass(warrantyInfo.status)}>
                  {getWarrantyStatusLabel(warrantyInfo.status)}
                </span>
              ) : (
                <span className="text-sm font-medium text-[var(--color-text-muted)]">No warranty</span>
              )}
            </div>
            {device.warrantyExpiry && (
              <>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Expiry Date</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {formatWarrantyExpiry(device.warrantyExpiry)}
                  </span>
                </div>
                {warrantyInfo.daysRemaining !== null && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                    <span className="text-sm text-[var(--color-text-muted)]">Days Remaining</span>
                    <span className={`text-sm font-medium ${warrantyInfo.isNearEnd ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]'}`}>
                      {warrantyInfo.daysRemaining} days
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="pt-2">
              <Button
                onClick={() => window.open('https://i2systems.com', '_blank')}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                <Package size={14} />
                Request Replacement Parts
                <ExternalLink size={12} />
              </Button>
            </div>
          </div>
        </div>

        {/* Firmware Information */}
        {(device.firmwareVersion || device.firmwareStatus) && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <DownloadIcon size={16} className="text-[var(--color-primary)]" />
              Firmware Information
            </h4>
            <div className="space-y-2">
              {device.firmwareVersion && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Current Version</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">{device.firmwareVersion}</span>
                </div>
              )}
              {device.firmwareTarget && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Target Version</span>
                  <span className="text-sm font-medium text-[var(--color-warning)]">{device.firmwareTarget}</span>
                </div>
              )}
              {device.firmwareStatus && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                  <span className={`text-sm font-medium ${
                    device.firmwareStatus === 'UP_TO_DATE' ? 'text-[var(--color-success)]' :
                    device.firmwareStatus === 'UPDATE_AVAILABLE' ? 'text-[var(--color-warning)]' :
                    'text-[var(--color-text-muted)]'
                  }`}>
                    {device.firmwareStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Components */}
        {device.components && device.components.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Package size={16} className="text-[var(--color-primary)]" />
              Components
            </h4>
            <ComponentTree
              components={device.components}
              expanded={true}
              showHeader={false}
              parentDevice={device}
              onComponentClick={onComponentClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Metrics Tab Content
function MetricsTab({ device }: { device: Device }) {
  // Generate mock metrics data
  const signalHistory = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.max(20, Math.min(100, device.signal + (Math.random() - 0.5) * 30)),
  }))

  const batteryHistory = device.battery !== undefined
    ? Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        value: Math.max(0, Math.min(100, device.battery! - i * 2 + Math.random() * 5)),
      }))
    : null

  return (
    <div className="space-y-6">
      {/* Signal Strength Chart */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Wifi size={16} className="text-[var(--color-primary)]" />
          Signal Strength (7 Day Trend)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {signalHistory.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-[var(--color-primary)] transition-all"
                style={{ height: `${item.value}%` }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>Avg: {Math.round(signalHistory.reduce((a, b) => a + b.value, 0) / 7)}%</span>
          <span>Current: {device.signal}%</span>
        </div>
      </div>

      {/* Battery Chart */}
      {batteryHistory && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Battery size={16} className="text-[var(--color-primary)]" />
            Battery Level (7 Day Trend)
          </h4>
          <div className="flex items-end gap-2 h-32">
            {batteryHistory.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    item.value > 50 ? 'bg-[var(--color-success)]' :
                    item.value > 20 ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-danger)]'
                  }`}
                  style={{ height: `${item.value}%` }}
                />
                <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>Drain Rate: ~{Math.round((batteryHistory[0].value - batteryHistory[6].value) / 7)}%/day</span>
            <span>Current: {device.battery}%</span>
          </div>
        </div>
      )}

      {/* Uptime Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-success)]">99.2%</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Uptime (30d)</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-text)]">847</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Hours</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-warning)]">3</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Disconnects</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{device.signal}%</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Avg Signal</div>
        </div>
      </div>
    </div>
  )
}

// History Tab Content
function HistoryTab({ device }: { device: Device }) {
  // Generate mock history events
  const historyEvents = [
    { type: 'status', title: 'Status changed to ' + device.status, time: '2 hours ago', icon: Activity, color: device.status === 'online' ? 'var(--color-success)' : 'var(--color-danger)' },
    { type: 'firmware', title: 'Firmware check completed', time: '1 day ago', icon: DownloadIcon, color: 'var(--color-primary)' },
    { type: 'zone', title: `Assigned to zone: ${device.zone || 'None'}`, time: '3 days ago', icon: Layers, color: 'var(--color-accent)' },
    { type: 'signal', title: 'Signal strength dropped below 50%', time: '5 days ago', icon: Wifi, color: 'var(--color-warning)' },
    { type: 'created', title: 'Device registered', time: '30 days ago', icon: CheckCircle2, color: 'var(--color-success)' },
  ]

  if (device.firmwareVersion) {
    historyEvents.splice(2, 0, {
      type: 'firmware',
      title: `Firmware updated to ${device.firmwareVersion}`,
      time: '7 days ago',
      icon: DownloadIcon,
      color: 'var(--color-success)',
    })
  }

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
          <div className="text-xs text-[var(--color-text-muted)] mb-1">First Seen</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Last Update</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Related Tab Content
function RelatedTab({ device, allDevices = [] }: { device: Device; allDevices?: Device[] }) {
  // Find devices in the same zone
  const zoneDevices = allDevices.filter(d => d.zone === device.zone && d.id !== device.id).slice(0, 5)

  // Find devices with similar faults (offline/missing status)
  const faultyDevices = allDevices.filter(d => 
    (d.status === 'offline' || d.status === 'missing') && d.id !== device.id
  ).slice(0, 3)

  // Generate device faults for this device
  const deviceFaults = (() => {
    const faults: Array<{ faultType: string; description: string }> = []
    if (device.status === 'missing' || device.status === 'offline') {
      const faultCategory = assignFaultCategory(device)
      faults.push({
        faultType: faultCategory,
        description: generateFaultDescription(faultCategory, device.deviceId),
      })
    }
    if (device.battery !== undefined && device.battery < 20) {
      faults.push({
        faultType: 'electrical-driver',
        description: `Low battery level (${device.battery}%)`,
      })
    }
    return faults
  })()

  return (
    <div className="space-y-6">
      {/* Active Faults */}
      {deviceFaults.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--color-warning)]" />
            Active Faults ({deviceFaults.length})
          </h4>
          <div className="space-y-2">
            {deviceFaults.map((fault, i) => {
              const categoryInfo = faultCategories[fault.faultType as keyof typeof faultCategories]
              return (
                <div key={i} className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--color-warning)]">
                      {categoryInfo?.shortLabel || fault.faultType}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{fault.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Devices in Same Zone */}
      {device.zone && zoneDevices.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            Devices in "{device.zone}" ({zoneDevices.length})
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

      {/* Similar Faults */}
      {faultyDevices.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-[var(--color-danger)]" />
            Other Devices with Issues ({faultyDevices.length})
          </h4>
          <div className="space-y-2">
            {faultyDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{d.deviceId}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{d.location || 'Unknown location'}</p>
                </div>
                <span className={getStatusTokenClass(d.status)}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {deviceFaults.length === 0 && zoneDevices.length === 0 && faultyDevices.length === 0 && (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No related items to display</p>
        </div>
      )}
    </div>
  )
}

// Main Export: Device Focused Modal wrapper
export function DeviceFocusedModal({
  isOpen,
  onClose,
  device,
  allDevices = [],
  onComponentClick,
}: {
  isOpen: boolean
  onClose: () => void
  device: Device
  allDevices?: Device[]
  onComponentClick?: (component: Component, parentDevice: Device) => void
}) {
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
    <FocusedObjectModal
      isOpen={isOpen}
      onClose={onClose}
      title={device.deviceId}
      subtitle={`${getTypeLabel(device.type)} • ${device.serialNumber}`}
      icon={
        isFixtureType(device.type) ? (
          <Image size={28} className="text-[var(--color-primary)]" />
        ) : device.type === 'motion' ? (
          <Radio size={28} className="text-[var(--color-accent)]" />
        ) : (
          <Thermometer size={28} className="text-[var(--color-success)]" />
        )
      }
      tabs={deviceTabs}
    >
      {(activeTab) => {
        switch (activeTab) {
          case 'overview':
            return <OverviewTab device={device} onComponentClick={onComponentClick} />
          case 'metrics':
            return <MetricsTab device={device} />
          case 'history':
            return <HistoryTab device={device} />
          case 'related':
            return <RelatedTab device={device} allDevices={allDevices} />
          default:
            return <OverviewTab device={device} onComponentClick={onComponentClick} />
        }
      }}
    </FocusedObjectModal>
  )
}

// Re-export trigger for convenience
export { FocusedModalTrigger as DeviceFocusedTrigger }
