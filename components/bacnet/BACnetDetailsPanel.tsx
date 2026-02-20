/**
 * BACnet Details Panel Component
 * 
 * Right-side panel showing detailed information about a selected BACnet mapping.
 * Shows connection details, control capabilities, history, and configuration options.
 * 
 * AI Note: This panel appears when a BACnet mapping is selected from the table.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Power, Sun, Clock, Radio, CheckCircle2, AlertCircle, XCircle, Edit2, Trash2, RefreshCw, Plus, Layers, Save } from 'lucide-react'
import type { ControlCapability } from '@/lib/initialBACnetMappings'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/shared/ConfirmationModal'

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
  onEdit: (mappingData: Partial<BACnetMapping>) => void
  onDelete: () => void
  onTestConnection: () => void
  onAdd: () => void
  hasZones?: boolean
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
  onTestConnection,
  onAdd,
  hasZones = true
}: BACnetDetailsPanelProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<BACnetMapping>>({
    bacnetObjectId: null,
    networkAddress: undefined,
    priority: undefined,
  })

  // Update form data when mapping changes
  useEffect(() => {
    if (mapping) {
      setFormData({
        bacnetObjectId: mapping.bacnetObjectId || null,
        networkAddress: mapping.networkAddress,
        priority: mapping.priority,
      })
      setIsEditing(false)
    } else {
      setFormData({
        bacnetObjectId: null,
        networkAddress: undefined,
        priority: undefined,
      })
      setIsEditing(false)
    }
  }, [mapping])

  const handleSave = () => {
    onEdit(formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (mapping) {
      setFormData({
        bacnetObjectId: mapping.bacnetObjectId || null,
        networkAddress: mapping.networkAddress,
        priority: mapping.priority,
      })
    }
    setIsEditing(false)
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }

  if (!mapping) {
    // If no zones exist, show a different empty state
    if (!hasZones) {
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              BACnet Mapping
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              BACnet mappings are automatically created when you add zones. Create zones first to enable BMS integration.
            </p>
          </div>
          <PanelEmptyState
            icon={Layers}
            title="No Zones Yet"
            description="Add at least one zone first to create BACnet mappings."
            action={
              <Button
                onClick={() => router.push('/zones')}
                className="flex items-center justify-center gap-2 px-4"
                variant="primary"
              >
                <Layers size={16} />
                Go to Zones
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            BACnet Mapping
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            Select a zone from the table to view detailed BACnet connection information and configure BMS integration.
          </p>
          {/* Add Mapping Button - In header like RulesPanel */}
          <Button
            onClick={onAdd}
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Mapping
          </Button>
        </div>
        <PanelEmptyState
          icon={Radio}
          title="No Mapping Selected"
          description="Select a zone from the table to view detailed BACnet connection information"
        />
      </div>
    )
  }

  const getStatusIcon = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={14} />
      case 'error':
        return <AlertCircle size={14} />
      case 'not-assigned':
        return <XCircle size={14} />
    }
  }

  const getStatusTokenClass = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return 'token token-status-success'
      case 'error':
        return 'token token-status-error'
      case 'not-assigned':
        return 'token token-status-not-assigned'
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
    <div className="flex flex-col h-full">
      {/* Data-Dense Header */}
      <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
        <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
          {/* Zone Image/Icon */}
          <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]">
            <Layers size={32} className="text-[var(--color-primary)]" />
          </div>
          {/* Meta Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                  {mapping.zoneName}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  BACnet Mapping
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isEditing && (
                  <button type="button" onClick={handleEditClick} className="fusion-panel-header-action" title="Edit mapping">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              {mapping.deviceCount !== undefined && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Devices</div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{mapping.deviceCount}</div>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Status</div>
                <div className={getStatusTokenClass(mapping.status)}>
                  {getStatusIcon(mapping.status)}
                  <span className="truncate">{mapping.status === 'not-assigned' ? 'Not Assigned' : mapping.status}</span>
                </div>
              </div>
              {mapping.bacnetObjectId && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] col-span-2 min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Object ID</div>
                  <div className="text-sm font-mono font-semibold text-[var(--color-text)] truncate">{mapping.bacnetObjectId}</div>
                </div>
              )}
              {mapping.networkAddress && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] col-span-2 min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Network</div>
                  <div className="text-sm font-mono font-semibold text-[var(--color-text)] truncate">{mapping.networkAddress}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 pb-2">
        {/* Status */}
        <div>
          <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3">Connection Status</h4>
          <div className="p-3 rounded-lg border border-[var(--color-border-subtle)]">
            <div className={getStatusTokenClass(mapping.status)}>
              {getStatusIcon(mapping.status)}
              <span className="font-medium capitalize">{mapping.status === 'not-assigned' ? 'Not Assigned' : mapping.status}</span>
            </div>
            {mapping.lastConnected && (
              <div className="text-xs opacity-80 mt-2 text-[var(--color-text-muted)]">
                Last connected: {formatLastConnected(mapping.lastConnected)}
              </div>
            )}
          </div>
        </div>

        {/* BACnet Object ID */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">BACnet Object ID</h4>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-2">
                  Object ID
                </label>
                <input
                  type="text"
                  value={formData.bacnetObjectId || ''}
                  onChange={(e) => setFormData({ ...formData, bacnetObjectId: e.target.value || null })}
                  placeholder="e.g. 4001"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-2">
                  Network Address
                </label>
                <input
                  type="text"
                  value={formData.networkAddress || ''}
                  onChange={(e) => setFormData({ ...formData, networkAddress: e.target.value || undefined })}
                  placeholder="e.g. 192.168.1.101"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-2">
                  Priority Level
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={formData.priority || ''}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="1-16"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                />
              </div>
            </div>
          ) : (
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
              {mapping.priority && (
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  Priority: {mapping.priority}
                </div>
              )}
            </div>
          )}
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

        {/* Delete Action - at bottom of scrollable content */}
        {!isEditing && (
          <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-lg text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete Mapping
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          onDelete()
          setIsDeleteModalOpen(false)
        }}
        title="Delete BACnet Mapping"
        message={`Are you sure you want to delete the BACnet mapping for "${mapping.zoneName}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Mapping"
      />

      {/* Actions Footer */}
      <div className="fusion-panel-footer">
        <div className="fusion-panel-footer-actions fusion-panel-footer-actions--stacked">
          {isEditing ? (
            <>
              <Button onClick={handleSave} variant="primary" className="w-full flex items-center justify-center gap-2 text-sm">
                <Save size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <Button onClick={handleCancel} variant="secondary" className="w-full flex items-center justify-center gap-2 text-sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onTestConnection}
                disabled={mapping.status === 'not-assigned'}
                variant="primary"
                className="w-full flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">Test Connection</span>
                <span className="sm:hidden">Test</span>
              </Button>
              {mapping.status === 'error' && (
                <Button onClick={handleEditClick} variant="secondary" className="w-full flex items-center justify-center gap-2 text-sm">
                  Troubleshoot Connection
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

