/**
 * Device Profile Panel Component
 * 
 * Right-side panel showing comprehensive device details.
 * Acts as an "object profile page" for understanding the light.
 * 
 * AI Note: Shows I2QR details, build date, CCT, warranty, parts list, etc.
 */

'use client'

import { Image, Calendar, Thermometer, Shield, Package, MapPin, Radio, Battery, Wifi, WifiOff, CheckCircle2, AlertCircle, XCircle, QrCode } from 'lucide-react'
import { Device, Component } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'

interface DeviceProfilePanelProps {
  device: Device | null
  onComponentClick?: (component: Component, parentDevice: Device) => void
}

export function DeviceProfilePanel({ device, onComponentClick }: DeviceProfilePanelProps) {
  if (!device) {
    return (
      <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
        <div className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
            <QrCode size={40} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            No Device Selected
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a device from the list to view detailed information
          </p>
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

  // Generate fake I2QR data based on device
  const buildDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
  const cct = device.type === 'fixture' ? [2700, 3000, 3500, 4000, 5000][Math.floor(Math.random() * 5)] : undefined
  const warrantyStatus = ['Active', 'Expired', 'Active'][Math.floor(Math.random() * 3)]
  const partsList = device.type === 'fixture' 
    ? ['LED Module', 'Driver', 'Lens', 'Mounting Bracket']
    : device.type === 'motion'
    ? ['PIR Sensor', 'Lens', 'Mounting Bracket']
    : ['Photodiode', 'Lens', 'Mounting Bracket']

  return (
    <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
      {/* Data-Dense Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
        <div className="flex items-start gap-3 mb-3">
          {/* Device Image/Icon */}
          <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]">
            {device.type === 'fixture' ? (
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
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Shield size={14} />
                Warranty Status
              </span>
              <span className={`text-sm font-medium ${
                warrantyStatus === 'Active' 
                  ? 'text-[var(--color-success)]' 
                  : 'text-[var(--color-warning)]'
              }`}>
                {warrantyStatus}
              </span>
            </div>
          </div>
        </div>

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

