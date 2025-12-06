/**
 * Discovery Controls Component
 * 
 * Controls for starting/stopping discovery, manual entry, and discovery modes.
 * 
 * AI Note: Supports both network scanning and manual device entry workflows.
 */

'use client'

import { useState } from 'react'
import { Play, Square, Plus, QrCode, Upload, Download } from 'lucide-react'

interface DiscoveryControlsProps {
  isScanning: boolean
  onStartScan: () => void
  onStopScan: () => void
  onManualEntry: () => void
  onQRScan: () => void
  onImport: () => void
  onExport: () => void
}

export function DiscoveryControls({
  isScanning,
  onStartScan,
  onStopScan,
  onManualEntry,
  onQRScan,
  onImport,
  onExport,
}: DiscoveryControlsProps) {
  return (
    <div className="fusion-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            Network Discovery
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Scan for devices on the network or add them manually
          </p>
        </div>
        <div className="flex gap-3">
          {isScanning ? (
            <button 
              onClick={onStopScan}
              className="fusion-button flex items-center gap-2"
              style={{ background: 'var(--color-danger)', color: 'var(--color-text)' }}
            >
              <Square size={18} />
              Stop Scan
            </button>
          ) : (
            <button 
              onClick={onStartScan}
              className="fusion-button fusion-button-primary flex items-center gap-2"
            >
              <Play size={18} />
              Start Discovery
            </button>
          )}
        </div>
      </div>

      {/* Additional Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border-subtle)]">
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
          Export List
        </button>
      </div>
    </div>
  )
}

