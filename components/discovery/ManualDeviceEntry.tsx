/**
 * Manual Device Entry Modal
 * 
 * Allows users to manually add devices by entering their information.
 * 
 * AI Note: Useful for devices that can't be discovered automatically or for quick entry.
 */

'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ManualDeviceEntryProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (device: {
    deviceId: string
    serialNumber: string
    type: 'fixture' | 'motion' | 'light-sensor'
  }) => void
}

export function ManualDeviceEntry({ isOpen, onClose, onAdd }: ManualDeviceEntryProps) {
  const [deviceId, setDeviceId] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [type, setType] = useState<'fixture' | 'motion' | 'light-sensor'>('fixture')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (deviceId.trim() && serialNumber.trim()) {
      onAdd({ deviceId: deviceId.trim(), serialNumber: serialNumber.trim(), type })
      setDeviceId('')
      setSerialNumber('')
      setType('fixture')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] p-6" style={{ boxShadow: 'var(--glow-modal)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            Add Device Manually
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Device ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g., FLX-1234"
              className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Serial Number
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g., SN-2024-1234-A1"
              className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Device Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)]"
            >
              <option value="fixture">Fixture</option>
              <option value="motion">Motion Sensor</option>
              <option value="light-sensor">Light Sensor</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 fusion-button fusion-button-primary"
            >
              Add Device
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

