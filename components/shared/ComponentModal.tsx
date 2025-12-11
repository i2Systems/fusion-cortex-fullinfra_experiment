/**
 * Component Modal Component
 * 
 * Focused modal for displaying detailed component information.
 * Shows warranty details, notes, and all component-specific information.
 * 
 * AI Note: Modal follows the app's modal pattern with curtain backdrop.
 * Notes are instance-specific to this component within this device.
 */

'use client'

import { X, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle, FileText, ExternalLink } from 'lucide-react'
import { Component, Device } from '@/lib/mockData'

interface ComponentModalProps {
  component: Component | null
  parentDevice: Device | null
  isOpen: boolean
  onClose: () => void
}

export function ComponentModal({ component, parentDevice, isOpen, onClose }: ComponentModalProps) {
  if (!isOpen || !component) {
    return null
  }

  const getWarrantyIcon = (warrantyStatus?: string) => {
    switch (warrantyStatus) {
      case 'Active':
        return <CheckCircle2 size={20} className="text-[var(--color-success)]" />
      case 'Expired':
        return <XCircle size={20} className="text-[var(--color-danger)]" />
      default:
        return <AlertCircle size={20} className="text-[var(--color-text-muted)]" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 size={16} className="text-[var(--color-success)]" />
      case 'offline':
        return <AlertCircle size={16} className="text-[var(--color-warning)]" />
      case 'missing':
        return <XCircle size={16} className="text-[var(--color-danger)]" />
      default:
        return null
    }
  }

  const warrantyColor = component.warrantyStatus === 'Active' 
    ? 'text-[var(--color-success)]' 
    : component.warrantyStatus === 'Expired'
    ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text-muted)]'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] backdrop-blur-xl rounded-[var(--radius-2xl)] shadow-[var(--shadow-strong)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-[var(--color-primary)]/30"
        style={{ boxShadow: 'var(--glow-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <Package size={24} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {component.componentType}
              </h2>
              {parentDevice && (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  Component of {parentDevice.deviceId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Component Serial Number */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
              Serial Number
            </h3>
            <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
              <p className="text-lg font-mono font-semibold text-[var(--color-text)]">
                {component.componentSerialNumber}
              </p>
            </div>
          </div>

          {/* Status */}
          {component.status && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Status
              </h3>
              <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                {getStatusIcon(component.status)}
                <span className="text-base font-medium text-[var(--color-text)] capitalize">
                  {component.status}
                </span>
              </div>
            </div>
          )}

          {/* Warranty Information */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center gap-2">
              <Shield size={14} />
              Warranty Information
            </h3>
            <div className="space-y-3">
              {component.warrantyStatus && (
                <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-3 mb-2">
                    {getWarrantyIcon(component.warrantyStatus)}
                    <span className={`text-lg font-semibold ${warrantyColor}`}>
                      {component.warrantyStatus}
                    </span>
                  </div>
                  {component.warrantyExpiry && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                      <Calendar size={16} className="text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Expiry Date</p>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {component.warrantyExpiry.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {component.warrantyStatus === 'Active' && component.warrantyExpiry && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                      <button
                        className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
                        onClick={() => {
                          // TODO: Open warranty claim or documentation
                          window.open('#', '_blank')
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>View Warranty Details</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Build Information */}
          {component.buildDate && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Build Information
              </h3>
              <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Build Date</p>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {component.buildDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instance-Specific Notes */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} />
              Notes
            </h3>
            <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] min-h-[120px]">
              {component.notes ? (
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                  {component.notes}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <FileText size={32} className="text-[var(--color-text-muted)] mb-2 opacity-50" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No notes for this component instance
                  </p>
                  <p className="text-xs text-[var(--color-text-soft)] mt-1">
                    Notes are specific to this {component.componentType} within {parentDevice?.deviceId || 'this device'}
                  </p>
                </div>
              )}
            </div>
            {component.notes && (
              <p className="text-xs text-[var(--color-text-soft)] mt-2 italic">
                These notes are specific to this component instance, not the generic {component.componentType} type
              </p>
            )}
          </div>

          {/* Parent Device Reference */}
          {parentDevice && (
            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
              <div className="p-4 rounded-lg bg-[var(--color-primary-soft)]/20 border border-[var(--color-primary)]/20">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Parent Device</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {parentDevice.deviceId} - {parentDevice.serialNumber}
                </p>
                {parentDevice.location && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {parentDevice.location}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
