/**
 * BACnet Details Panel Component
 * 
 * Right-side panel showing detailed information about a selected BACnet mapping.
 * Shows connection details, control capabilities, history, and configuration options.
 * 
 * AI Note: This panel appears when a BACnet mapping is selected from the table.
 */

'use client'

import { Power, Sun, Clock, Radio, CheckCircle2, AlertCircle, XCircle, Edit2, Trash2, RefreshCw } from 'lucide-react'
import type { ControlCapability } from '@/lib/initialBACnetMappings'

interface BACnetMapping {
  zoneId: string
  zoneName: string
  bacnetObjectId: string | null
  status: 'connected' | 'error' | 'not-assigned'
  controlCapabilities: ControlCapability[]
  description: string
  lastConnected?: Date
  deviceCount?: number
  networkAddress?: string
  priority?: number
}

interface BACnetDetailsPanelProps {
  mapping: BACnetMapping | null
  onEdit: () => void
  onDelete: () => void
  onTestConnection: () => void
}

const capabilityLabels: Record<ControlCapability, { label: string; icon: any; description: string }> = {
  'on-off': { 
    label: 'On/Off', 
    icon: Power,
    description: 'Basic binary control - BMS can turn zone on or off'
  },
  'dimming': { 
    label: 'Dimming', 
    icon: Sun,
    description: 'Analog control - BMS can adjust brightness level (0-100%)'
  },
  'scheduled': { 
    label: 'Scheduled', 
    icon: Clock,
    description: 'Time-based control - Zone follows predefined schedule'
  },
  'motion': { 
    label: 'Motion', 
    icon: Radio,
    description: 'Motion-activated - Zone responds to occupancy sensors'
  },
  'daylight': { 
    label: 'Daylight', 
    icon: Sun,
    description: 'Daylight harvesting - Zone adjusts based on natural light'
  },
  'override': { 
    label: 'Override', 
    icon: Power,
    description: 'BMS override - Building management can override local control'
  },
}

export function BACnetDetailsPanel({ 
  mapping, 
  onEdit, 
  onDelete, 
  onTestConnection 
}: BACnetDetailsPanelProps) {
  if (!mapping) {
    return (
      <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
        <div className="p-6 flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mb-4">
            <Radio size={24} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            No Mapping Selected
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a zone from the table to view detailed BACnet connection information
          </p>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={20} className="text-[var(--color-success)]" />
      case 'error':
        return <AlertCircle size={20} className="text-[var(--color-warning)]" />
      case 'not-assigned':
        return <XCircle size={20} className="text-[var(--color-text-muted)]" />
    }
  }

  const getStatusColor = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30'
      case 'error':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30'
      case 'not-assigned':
        return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
    }
  }

  const formatLastConnected = (date?: Date) => {
    if (!date) return 'Never'
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  return (
    <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            BACnet Connection
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Edit mapping"
            >
              <Edit2 size={16} className="text-[var(--color-text-muted)]" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Delete mapping"
            >
              <Trash2 size={16} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {mapping.zoneName}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Connection Status</h4>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor(mapping.status)}`}>
            {getStatusIcon(mapping.status)}
            <div className="flex-1">
              <div className="font-medium capitalize">{mapping.status === 'not-assigned' ? 'Not Assigned' : mapping.status}</div>
              {mapping.lastConnected && (
                <div className="text-xs opacity-80 mt-0.5">
                  Last connected: {formatLastConnected(mapping.lastConnected)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BACnet Object ID */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">BACnet Object ID</h4>
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            {mapping.bacnetObjectId ? (
              <div className="font-mono text-lg text-[var(--color-text)]">
                {mapping.bacnetObjectId}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)] italic">
                Not assigned
              </div>
            )}
            {mapping.networkAddress && (
              <div className="text-xs text-[var(--color-text-muted)] mt-2">
                Network: {mapping.networkAddress}
              </div>
            )}
          </div>
        </div>

        {/* Control Capabilities */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Control Capabilities</h4>
          {mapping.controlCapabilities.length > 0 ? (
            <div className="space-y-2">
              {mapping.controlCapabilities.map((cap) => {
                const { label, icon: Icon, description } = capabilityLabels[cap]
                return (
                  <div
                    key={cap}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]"
                  >
                    <Icon size={18} className="text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--color-text)] mb-0.5">
                        {label}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-muted)] text-center">
              No control capabilities assigned
            </div>
          )}
        </div>

        {/* Zone Information */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Zone Information</h4>
          <div className="space-y-2">
            {mapping.deviceCount !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Devices</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{mapping.deviceCount}</span>
              </div>
            )}
            {mapping.priority !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Priority Level</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{mapping.priority}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Connection Details</h4>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            {mapping.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2">
        <button
          onClick={onTestConnection}
          disabled={mapping.status === 'not-assigned'}
          className="w-full fusion-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} />
          Test Connection
        </button>
        {mapping.status === 'error' && (
          <button
            onClick={onEdit}
            className="w-full px-4 py-2 bg-[var(--color-warning)]/20 text-[var(--color-warning)] rounded-lg hover:bg-[var(--color-warning)]/30 transition-colors text-sm font-medium"
          >
            Troubleshoot Connection
          </button>
        )}
      </div>
    </div>
  )
}

