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
import { Device } from '@/lib/mockData'

interface DeviceProfilePanelProps {
  device: Device | null
}

export function DeviceProfilePanel({ device }: DeviceProfilePanelProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 size={16} className="text-[var(--color-success)]" />
      case 'offline':
        return <AlertCircle size={16} className="text-[var(--color-warning)]" />
      case 'missing':
        return <XCircle size={16} className="text-[var(--color-danger)]" />
      default:
        return <AlertCircle size={16} className="text-[var(--color-text-muted)]" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
      case 'offline': return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
      case 'missing': return 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
      default: return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]'
    }
  }

  const getSignalColor = (signal: number) => {
    if (signal >= 80) return 'text-[var(--color-success)]'
    if (signal >= 50) return 'text-[var(--color-warning)]'
    return 'text-[var(--color-danger)]'
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
      {/* Image Placeholder */}
      <div className="w-full h-48 bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface-subtle)] flex items-center justify-center border-b border-[var(--color-border-subtle)]">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-3 rounded-lg bg-[var(--color-surface)]/50 backdrop-blur-sm border border-[var(--color-border-subtle)] flex items-center justify-center shadow-[var(--shadow-soft)]">
            {device.type === 'fixture' ? (
              <Image size={64} className="text-[var(--color-primary)] opacity-60" />
            ) : device.type === 'motion' ? (
              <Radio size={64} className="text-[var(--color-accent)] opacity-60" />
            ) : (
              <Thermometer size={64} className="text-[var(--color-success)] opacity-60" />
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Device Image</p>
        </div>
      </div>

      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
              {device.deviceId}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {getTypeLabel(device.type)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(device.status)}
            <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(device.status)}`}>
              {device.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                {device.signal > 0 ? (
                  <Wifi size={14} className={getSignalColor(device.signal)} />
                ) : (
                  <WifiOff size={14} className="text-[var(--color-text-muted)]" />
                )}
                Signal Strength
              </span>
              <span className={`text-sm font-medium ${getSignalColor(device.signal)}`}>
                {device.signal}%
              </span>
            </div>
            {device.battery !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Battery size={14} className={device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                  Battery Level
                </span>
                <span className={`text-sm font-medium ${device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                  {device.battery}%
                </span>
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

        {/* Parts List */}
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

