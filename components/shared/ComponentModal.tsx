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

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle, FileText, ExternalLink, Info } from 'lucide-react'
import { Component, Device } from '@/lib/mockData'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { getComponentLibraryUrl, getComponentImage } from '@/lib/libraryUtils'

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

  const warrantyInfo = component.warrantyExpiry ? calculateWarrantyStatus(component.warrantyExpiry) : null

  const getWarrantyIcon = (status: string) => {
    switch (status) {
      case 'in-warranty':
        return <CheckCircle2 size={20} className="text-[var(--color-success)]" />
      case 'out-of-warranty':
        return <XCircle size={20} className="text-[var(--color-danger)]" />
      case 'near-end':
        return <AlertCircle size={20} className="text-[var(--color-warning)]" />
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

  // Component Icon Component with image support
  function ComponentIcon({ componentType }: { componentType: string }) {
    const [imageError, setImageError] = useState(false)
    const [imageKey, setImageKey] = useState(0)

    // Listen for library image updates
    useEffect(() => {
      const handleImageUpdate = () => {
        setImageKey(prev => prev + 1)
        setImageError(false) // Reset error state
      }
      window.addEventListener('libraryImageUpdated', handleImageUpdate)
      return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
    }, [])

    // Call getComponentImage on every render (it checks localStorage each time)
    const componentImage = getComponentImage(componentType)
    const showImage = componentImage && !imageError

    return (
      <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
        {showImage ? (
          <img
            key={imageKey}
            src={componentImage}
            alt={componentType}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Package size={24} className="text-[var(--color-primary)]" />
        )}
      </div>
    )
  }


  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg)]/80 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)]"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="bg-[var(--color-surface)] backdrop-blur-xl rounded-[var(--radius-2xl)] shadow-[var(--shadow-strong)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-[var(--color-primary)]/30"
        style={{ boxShadow: 'var(--glow-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-4">
            <ComponentIcon componentType={component.componentType} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-[var(--color-text)]">
                  {component.componentType}
                </h2>
                {getComponentLibraryUrl(component.componentType) && (
                  <Link
                    href={getComponentLibraryUrl(component.componentType)!}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                    title="View in library"
                  >
                    <Info size={16} className="text-[var(--color-primary)]" />
                  </Link>
                )}
              </div>
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
              {warrantyInfo ? (
                <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-3 mb-2">
                    {getWarrantyIcon(warrantyInfo.status)}
                    <span className={getWarrantyStatusTokenClass(warrantyInfo.status)}>
                      {getWarrantyStatusLabel(warrantyInfo.status)}
                    </span>
                  </div>
                  {component.warrantyExpiry && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                      <Calendar size={16} className="text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Expiry Date</p>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {formatWarrantyExpiry(component.warrantyExpiry)}
                        </p>
                      </div>
                    </div>
                  )}
                  {warrantyInfo.daysRemaining !== null && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Days Remaining</p>
                      <p className={`text-sm font-medium ${
                        warrantyInfo.isNearEnd
                          ? 'text-[var(--color-warning)]'
                          : 'text-[var(--color-text)]'
                      }`}>
                        {warrantyInfo.daysRemaining} days
                      </p>
                    </div>
                  )}
                  {warrantyInfo.status !== 'out-of-warranty' && component.warrantyExpiry && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                      <button
                        className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2"
                        onClick={() => {
                          // Navigate to i2systems.com for replacement parts
                          window.open('https://i2systems.com', '_blank')
                        }}
                      >
                        <Package size={14} />
                        Request Replacement
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                  <p className="text-sm text-[var(--color-text-muted)]">No warranty information available</p>
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
