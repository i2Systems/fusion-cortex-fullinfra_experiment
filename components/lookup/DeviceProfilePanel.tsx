/**
 * Device Profile Panel Component
 * 
 * Right-side panel showing comprehensive device details.
 * Acts as an "object profile page" for understanding the light.
 * 
 * AI Note: Shows I2QR details, build date, CCT, warranty, parts list, etc.
 */

'use client'

import { Image, Calendar, Thermometer, Shield, Package, MapPin, Radio, Battery, Wifi, WifiOff, CheckCircle2, AlertCircle, XCircle, QrCode, AlertTriangle, ExternalLink, Plus, Upload, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Device, Component } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'
import { useDevices } from '@/lib/DeviceContext'
import { isFixtureType } from '@/lib/deviceUtils'

interface DeviceProfilePanelProps {
  device: Device | null
  onComponentClick?: (component: Component, parentDevice: Device) => void
  onManualEntry?: () => void
  onQRScan?: () => void
  onImport?: () => void
  onExport?: () => void
}

export function DeviceProfilePanel({ device, onComponentClick, onManualEntry, onQRScan, onImport, onExport }: DeviceProfilePanelProps) {
  const router = useRouter()
  const { devices } = useDevices()
  
  if (!device) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col">
          {/* Empty State Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
              <QrCode size={40} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              No Device Selected
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-8">
              Select a device from the list to view detailed information
            </p>
          </div>

          {/* Action Buttons Bar */}
          <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onManualEntry}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Add Device Manually
              </button>
              <button
                onClick={onQRScan}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
              >
                <QrCode size={16} />
                Scan QR Code
              </button>
              <div className="flex-1" />
              <button
                onClick={onImport}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Upload size={16} />
                Import List
              </button>
              <button
                onClick={onExport}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Lighting Fixture'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 size={14} />
      case 'offline': return <XCircle size={14} />
      case 'missing': return <AlertCircle size={14} />
      default: return null
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

  // Get warranty info
  const warrantyInfo = calculateWarrantyStatus(device.warrantyExpiry)
  
  // Generate fake I2QR data based on device (use actual data if available)
  const buildDate = device.warrantyExpiry 
    ? new Date(new Date(device.warrantyExpiry).getTime() - 5 * 365 * 24 * 60 * 60 * 1000) // Approximate 5 years before warranty expiry
    : new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
  const cct = isFixtureType(device.type) ? [2700, 3000, 3500, 4000, 5000][Math.floor(Math.random() * 5)] : undefined
  const partsList = isFixtureType(device.type) 
    ? ['LCM', 'Driver Board', 'Power Supply', 'LED Board', 'Metal Bracket', 'Cable Harness', 'Lower LED Housing with Optic', 'Sensor']
    : device.type === 'motion'
    ? ['PIR Sensor', 'Lens', 'Mounting Bracket']
    : ['Photodiode', 'Lens', 'Mounting Bracket']

  // Generate faults for this device (similar to faults page logic)
  const deviceFaults = (() => {
    const faults: Array<{ faultType: string; description: string; detectedAt: Date }> = []
    
    // Check if device has fault status
    if (device.status === 'missing' || device.status === 'offline') {
      const faultCategory = assignFaultCategory(device)
      faults.push({
        faultType: faultCategory,
        description: generateFaultDescription(faultCategory, device.deviceId),
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 48) + 1)),
      })
    }
    
    // Check for low battery
    if (device.battery !== undefined && device.battery < 20) {
      faults.push({
        faultType: 'electrical-driver',
        description: device.battery < 10 
          ? `Critical battery level (${device.battery}%). Device may shut down. Power supply or charging system issue suspected.`
          : `Battery level is below 20% (${device.battery}%). Replacement recommended. May indicate charging system or power supply problem.`,
        detectedAt: new Date(Date.now() - 1000 * 60 * (Math.floor(Math.random() * 120) + 30)),
      })
    }
    
    return faults
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Data-Dense Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
        <div className="flex items-start gap-3 mb-3">
          {/* Device Image/Icon */}
          <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]">
            {isFixtureType(device.type) ? (
              <Image size={32} className="text-[var(--color-primary)]" />
            ) : device.type === 'motion' ? (
              <Radio size={32} className="text-[var(--color-accent)]" />
            ) : (
              <Thermometer size={32} className="text-[var(--color-success)]" />
            )}
          </div>
          {/* Meta Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                  {device.deviceId}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {getTypeLabel(device.type)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={getStatusTokenClass(device.status)}>
                {getStatusIcon(device.status)}
                  {device.status}
                </span>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Serial</div>
                <div className="text-xs font-mono font-semibold text-[var(--color-text)] truncate">{device.serialNumber}</div>
              </div>
              {device.location && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin size={10} />
                    Location
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{device.location}</div>
                </div>
              )}
              {device.zone && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Zone</div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{device.zone}</div>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Signal</div>
                  {device.signal > 0 ? (
                  <div className={getSignalTokenClass(device.signal)}>
                    <Wifi size={10} />
                    <span>{device.signal}%</span>
                  </div>
                  ) : (
                  <div className="token token-data">
                    <WifiOff size={10} />
                    <span>—</span>
                  </div>
                  )}
              </div>
              {device.battery !== undefined && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Battery</div>
                  <div className={getBatteryTokenClass(device.battery)}>
                    <Battery size={10} />
                    <span>{device.battery}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-2">
        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Basic Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-sm font-mono font-medium text-[var(--color-text)]">
                {device.serialNumber}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Device ID</span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {device.deviceId}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {getTypeLabel(device.type)}
              </span>
            </div>
            {device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">
                  {device.location}
                </span>
              </div>
            )}
            {device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {device.zone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Connection Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                Signal Strength
              </span>
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
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  Battery Level
                </span>
                <div className={getBatteryTokenClass(device.battery)}>
                  <Battery size={14} />
                  <span>{device.battery}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* I2QR Information */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <QrCode size={16} />
            I2QR Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Calendar size={14} />
                Build Date
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {buildDate.toLocaleDateString()}
              </span>
            </div>
            {cct && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Thermometer size={14} />
                  Color Temperature
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {cct}K
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Information */}
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
              {device.warrantyExpiry ? (
                <span className={getWarrantyStatusTokenClass(warrantyInfo.status)}>
                  {getWarrantyStatusLabel(warrantyInfo.status)}
                </span>
              ) : (
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  No warranty
                </span>
              )}
            </div>
            {device.warrantyExpiry && (
              <>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Expiry Date</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {formatWarrantyExpiry(device.warrantyExpiry)}
                  </span>
                </div>
                {warrantyInfo.daysRemaining !== null && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                    <span className="text-sm text-[var(--color-text-muted)]">Days Remaining</span>
                    <span className={`text-sm font-medium ${
                      warrantyInfo.isNearEnd
                        ? 'text-[var(--color-warning)]'
                        : 'text-[var(--color-text)]'
                    }`}>
                      {warrantyInfo.daysRemaining} days
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                  <button
                    onClick={() => {
                      // Navigate to i2systems.com for replacement parts
                      window.open('https://i2systems.com', '_blank')
                    }}
                    className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2"
                  >
                    <Package size={14} />
                    Request Replacement
                    <ExternalLink size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Device Faults */}
        {deviceFaults.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
              Active Faults
            </h4>
            <div className="space-y-2">
              {deviceFaults.map((fault, index) => {
                const categoryInfo = faultCategories[fault.faultType as keyof typeof faultCategories]
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--color-text-muted)]">
                        {categoryInfo?.shortLabel || fault.faultType}
                      </span>
                      <span className="text-xs text-[var(--color-text-soft)]">
                        {new Date(fault.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {fault.description}
                    </p>
                    <button
                      onClick={() => {
                        sessionStorage.setItem('highlightDevice', device.deviceId)
                        router.push('/faults')
                      }}
                      className="mt-2 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 flex items-center gap-1"
                    >
                      View on Faults page
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Components */}
        {device.components && device.components.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Package size={16} />
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

        {/* Parts List (fallback for devices without components) */}
        {(!device.components || device.components.length === 0) && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Package size={16} />
              Parts List
            </h4>
            <div className="space-y-1.5">
              {partsList.map((part, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-[var(--color-surface-subtle)] text-sm text-[var(--color-text-muted)]"
                >
                  {part}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Position */}
        {device.x !== undefined && device.y !== undefined && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Map Position</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">X Coordinate</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {(device.x * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Y Coordinate</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {(device.y * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

