/**
 * Fault Details Panel Component
 * 
 * Right-side panel showing comprehensive fault details and device information.
 * Acts as a detailed view for understanding and resolving faults.
 * 
 * AI Note: Shows fault diagnosis, device details, troubleshooting steps, etc.
 */

'use client'

import { AlertCircle, Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb, MapPin, Radio, RefreshCw, CheckCircle2, Clock, TrendingDown, XCircle, Battery, Shield, ExternalLink, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Device } from '@/lib/mockData'
import { FaultCategory, faultCategories } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'

interface Fault {
  device: Device
  faultType: FaultCategory
  detectedAt: Date
  description: string
}

interface FaultDetailsPanelProps {
  fault: Fault | null
  onAddNewFault?: () => void
}

export function FaultDetailsPanel({ fault, onAddNewFault }: FaultDetailsPanelProps) {
  const router = useRouter()
  
  if (!fault) {
    return (
      <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
        <div className="flex-1 flex flex-col">
          {/* Empty State Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
              <AlertCircle size={40} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              No Fault Selected
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-8">
              Select a fault from the list to view detailed information and troubleshooting steps
            </p>
          </div>

          {/* Add New Fault Button */}
          {onAddNewFault && (
            <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
              <button
                onClick={onAddNewFault}
                className="w-full px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add New Fault
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const getFaultIcon = (faultType: FaultCategory) => {
    const iconMap: Record<FaultCategory, React.ReactNode> = {
      'environmental-ingress': <Droplets size={24} className="text-[var(--color-danger)]" />,
      'electrical-driver': <Zap size={24} className="text-[var(--color-danger)]" />,
      'thermal-overheat': <Thermometer size={24} className="text-[var(--color-warning)]" />,
      'installation-wiring': <Plug size={24} className="text-[var(--color-warning)]" />,
      'control-integration': <Settings size={24} className="text-[var(--color-primary)]" />,
      'manufacturing-defect': <Package size={24} className="text-[var(--color-primary)]" />,
      'mechanical-structural': <Wrench size={24} className="text-[var(--color-primary)]" />,
      'optical-output': <Lightbulb size={24} className="text-[var(--color-warning)]" />,
    }
    return iconMap[faultType] || <AlertCircle size={24} className="text-[var(--color-text-muted)]" />
  }

  const getFaultLabel = (faultType: FaultCategory) => {
    return faultCategories[faultType]?.label || faultType
  }

  const getFaultColor = (faultType: FaultCategory) => {
    const categoryInfo = faultCategories[faultType]
    if (!categoryInfo) {
      return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
    }
    
    const colorMap = {
      danger: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30',
      warning: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30',
      info: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    }
    
    return colorMap[categoryInfo.color] || colorMap.info
  }

  const getTroubleshootingSteps = (faultType: FaultCategory) => {
    return faultCategories[faultType]?.troubleshootingSteps || []
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Lighting Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
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

  const troubleshootingSteps = getTroubleshootingSteps(fault.faultType)

  return (
    <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
      {/* Data-Dense Header */}
      <div className={`p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br ${getFaultColor(fault.faultType)}/10 to-[var(--color-surface-subtle)]`}>
        <div className="flex items-start gap-3 mb-3">
          {/* Device Image/Icon */}
          <div className={`w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)] ${getFaultColor(fault.faultType)}`}>
            {getFaultIcon(fault.faultType)}
          </div>
          {/* Meta Information */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <button
                onClick={() => {
                  // Navigate to lookup page with device selected
                  sessionStorage.setItem('selectedDeviceId', fault.device.id)
                  router.push('/lookup')
                }}
                className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate group-hover:text-[var(--color-primary)] transition-colors">
                  {fault.device.deviceId}
                </h3>
                <ExternalLink size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0" />
              </button>
              <p className="text-xs text-[var(--color-text-muted)]">
                {faultCategories[fault.faultType]?.shortLabel || getFaultLabel(fault.faultType)} • {getTypeLabel(fault.device.type)}
              </p>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Serial</div>
                <div className="text-xs font-mono font-semibold text-[var(--color-text)] truncate">{fault.device.serialNumber}</div>
              </div>
              {fault.device.location && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin size={10} />
                    Location
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{fault.device.location}</div>
                </div>
              )}
              {fault.device.zone && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Zone</div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{fault.device.zone}</div>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                  <Clock size={10} />
                  Detected
                </div>
                <div className="text-xs font-semibold text-[var(--color-text)] truncate">{formatTimeAgo(fault.detectedAt)}</div>
              </div>
              {fault.device.signal > 0 && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Signal</div>
                  <div className={getSignalTokenClass(fault.device.signal)}>
                    <Radio size={10} />
                    <span>{fault.device.signal}%</span>
                  </div>
                </div>
              )}
              {fault.device.battery !== undefined && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Battery</div>
                  <div className={getBatteryTokenClass(fault.device.battery)}>
                    <Battery size={10} />
                    <span>{fault.device.battery}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-2">
        {/* Fault Description */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Fault Description</h4>
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              {fault.description}
            </p>
            {faultCategories[fault.faultType] && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <p className="text-xs text-[var(--color-text-soft)] mb-2">
                  <strong>Category:</strong> {faultCategories[fault.faultType].label}
                </p>
                <p className="text-xs text-[var(--color-text-soft)]">
                  {faultCategories[fault.faultType].description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Information */}
        {fault.device.warrantyExpiry && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Shield size={16} />
              Warranty Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Shield size={14} />
                  Warranty Status
                </span>
                <span className={getWarrantyStatusTokenClass(calculateWarrantyStatus(fault.device.warrantyExpiry).status)}>
                  {getWarrantyStatusLabel(calculateWarrantyStatus(fault.device.warrantyExpiry).status)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Expiry Date</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {formatWarrantyExpiry(fault.device.warrantyExpiry)}
                </span>
              </div>
              {calculateWarrantyStatus(fault.device.warrantyExpiry).daysRemaining !== null && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Days Remaining</span>
                  <span className={`text-sm font-medium ${
                    calculateWarrantyStatus(fault.device.warrantyExpiry).isNearEnd
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-text)]'
                  }`}>
                    {calculateWarrantyStatus(fault.device.warrantyExpiry).daysRemaining} days
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device Information */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Device Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-sm font-mono font-medium text-[var(--color-text)]">
                {fault.device.serialNumber}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {getTypeLabel(fault.device.type)}
              </span>
            </div>
            {fault.device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">
                  {fault.device.location}
                </span>
              </div>
            )}
            {fault.device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {fault.device.zone}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Radio size={14} />
                Signal Strength
              </span>
              <span className={`text-sm font-medium ${
                fault.device.signal >= 80 ? 'text-[var(--color-success)]' :
                fault.device.signal >= 50 ? 'text-[var(--color-warning)]' :
                'text-[var(--color-danger)]'
              }`}>
                {fault.device.signal}%
              </span>
            </div>
            {fault.device.battery !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Battery size={14} className={fault.device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                  Battery Level
                </span>
                <span className={`text-sm font-medium ${
                  fault.device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
                }`}>
                  {fault.device.battery}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Steps */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <RefreshCw size={16} />
            Troubleshooting Steps
          </h4>
          <div className="space-y-2">
            {troubleshootingSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] flex-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Status History */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <TrendingDown size={16} />
            Status History
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <XCircle size={16} className="text-[var(--color-danger)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">Fault detected</p>
                <p className="text-xs text-[var(--color-text-muted)]">{formatTimeAgo(fault.detectedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <CheckCircle2 size={16} className="text-[var(--color-success)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">Last online</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {fault.device.status === 'missing' 
                    ? 'Never' 
                    : fault.device.status === 'offline'
                    ? `${Math.floor((Date.now() - fault.detectedAt.getTime()) / (1000 * 60 * 60)) + 1} hours ago`
                    : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2 flex-shrink-0">
        <button className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          Retry Connection
        </button>
        <button 
          className="w-full fusion-button"
          style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}
        >
          Mark as Resolved
        </button>
      </div>
    </div>
  )
}

