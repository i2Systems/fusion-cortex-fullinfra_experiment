/**
 * Fault Details Panel Component
 * 
 * Right-side panel showing comprehensive fault details and device information.
 * Acts as a detailed view for understanding and resolving faults.
 * 
 * AI Note: Shows fault diagnosis, device details, troubleshooting steps, etc.
 */

'use client'

import { AlertCircle, WifiOff, Battery, XCircle, MapPin, Radio, Calendar, RefreshCw, CheckCircle2, Clock, TrendingDown } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface Fault {
  device: Device
  faultType: 'missing' | 'offline' | 'low-battery'
  detectedAt: Date
  description: string
}

interface FaultDetailsPanelProps {
  fault: Fault | null
}

export function FaultDetailsPanel({ fault }: FaultDetailsPanelProps) {
  if (!fault) {
    return (
      <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
        <div className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
            <AlertCircle size={40} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            No Fault Selected
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a fault from the list to view detailed information and troubleshooting steps
          </p>
        </div>
      </div>
    )
  }

  const getFaultIcon = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return <XCircle size={24} className="text-[var(--color-danger)]" />
      case 'offline':
        return <WifiOff size={24} className="text-[var(--color-warning)]" />
      case 'low-battery':
        return <Battery size={24} className="text-[var(--color-warning)]" />
      default:
        return <AlertCircle size={24} className="text-[var(--color-text-muted)]" />
    }
  }

  const getFaultLabel = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return 'Missing'
      case 'offline':
        return 'Offline'
      case 'low-battery':
        return 'Low Battery'
      default:
        return faultType
    }
  }

  const getFaultColor = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30'
      case 'offline':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30'
      case 'low-battery':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30'
      default:
        return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
    }
  }

  const getTroubleshootingSteps = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return [
          'Verify device is powered on and connected to network',
          'Check physical location - device may have been moved or removed',
          'Attempt to ping device on network',
          'Review discovery logs for last successful communication',
          'Check if device serial number matches inventory records',
        ]
      case 'offline':
        return [
          'Check network connectivity and signal strength',
          'Verify device power supply is functioning',
          'Review device logs for error messages',
          'Check for network outages or interference',
          'Attempt manual reconnection via device interface',
        ]
      case 'low-battery':
        return [
          'Schedule battery replacement within 48 hours',
          'Check battery voltage and charging status',
          'Review battery age and warranty information',
          'Verify device is not in high-power mode unnecessarily',
          'Consider reducing reporting frequency to conserve battery',
        ]
      default:
        return []
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Lighting Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  const troubleshootingSteps = getTroubleshootingSteps(fault.faultType)

  return (
    <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-start gap-3 mb-3">
          <div className={`
            p-3 rounded-lg flex-shrink-0
            ${getFaultColor(fault.faultType)}
          `}>
            {getFaultIcon(fault.faultType)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              {fault.device.deviceId}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {getFaultLabel(fault.faultType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-soft)]">
          <Clock size={14} />
          <span>Detected {formatTimeAgo(fault.detectedAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Fault Description */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Fault Description</h4>
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              {fault.description}
            </p>
          </div>
        </div>

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
                  {fault.faultType === 'missing' 
                    ? 'Never' 
                    : fault.faultType === 'offline'
                    ? `${Math.floor((Date.now() - fault.detectedAt.getTime()) / (1000 * 60 * 60)) + 1} hours ago`
                    : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2">
        <button className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          Retry Connection
        </button>
        <button className="w-full px-4 py-2 bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] rounded-lg hover:bg-[var(--color-surface)] transition-colors text-sm font-medium">
          Mark as Resolved
        </button>
      </div>
    </div>
  )
}

