/**
 * Edit Device Modal Component
 * 
 * Modal for editing device details.
 * Patterned after AddSiteModal for consistent "focused" experience.
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, HardDrive, Hash, Tag, MapPin, Wifi, Battery, Activity } from 'lucide-react'
import { Device, DeviceType, DeviceStatus } from '@/lib/mockData'
import { isFixtureType } from '@/lib/deviceUtils'

interface EditDeviceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (deviceId: string, updates: Partial<Device>) => void
    device: Device | null
}

export function EditDeviceModal({ isOpen, onClose, onSave, device }: EditDeviceModalProps) {
    const [formData, setFormData] = useState<{
        deviceId: string
        serialNumber: string
        type: DeviceType
        status: DeviceStatus
        location: string
        zone: string
        signal: string
        battery: string
    }>({
        deviceId: '',
        serialNumber: '',
        type: 'fixture-16ft-power-entry',
        status: 'online',
        location: '',
        zone: '',
        signal: '',
        battery: '',
    })

    // Populate form when device changes
    useEffect(() => {
        if (device) {
            setFormData({
                deviceId: device.deviceId,
                serialNumber: device.serialNumber,
                type: device.type,
                status: device.status,
                location: device.location || '',
                zone: device.zone || '',
                signal: device.signal.toString(),
                battery: device.battery !== undefined ? device.battery.toString() : '',
            })
        }
    }, [device])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!device) return

        const updates: Partial<Device> = {
            deviceId: formData.deviceId,
            serialNumber: formData.serialNumber,
            type: formData.type,
            status: formData.status,
            location: formData.location,
            zone: formData.zone,
            signal: parseInt(formData.signal) || 0,
            battery: formData.battery ? parseInt(formData.battery) : undefined,
        }

        onSave(device.id, updates)
        onClose()
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!isOpen || !device || !mounted) return null

    const deviceTypes: DeviceType[] = [
        'fixture-16ft-power-entry',
        'fixture-12ft-power-entry',
        'fixture-8ft-power-entry',
        'fixture-16ft-follower',
        'fixture-12ft-follower',
        'fixture-8ft-follower',
        'motion',
        'light-sensor',
    ]

    // Use portal to render at document root level, avoiding z-index/transform clipping
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] flex items-center justify-center">
                            <HardDrive size={20} className="text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text)]">
                                Edit Device
                            </h2>
                            <p className="text-xs text-[var(--color-text-muted)]">
                                Update device configuration and status
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                    >
                        <X size={20} className="text-[var(--color-text-muted)]" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Identity Section */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Device ID
                            </label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="text"
                                    value={formData.deviceId}
                                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Serial Number
                            </label>
                            <div className="relative">
                                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="text"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Device Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as DeviceType })}
                                className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent appearance-none"
                            >
                                {deviceTypes.map(type => (
                                    <option key={type} value={type}>
                                        {type.replace(/-/g, ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Status
                            </label>
                            <div className="relative">
                                <Activity size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as DeviceStatus })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent appearance-none"
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="missing">Missing</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location & Zone */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Main Lobby"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Zone
                            </label>
                            <input
                                type="text"
                                value={formData.zone}
                                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                placeholder="e.g. Zone 1 - Entrance"
                                className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Telemetry */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Signal Strength (%)
                            </label>
                            <div className="relative">
                                <Wifi size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.signal}
                                    onChange={(e) => setFormData({ ...formData, signal: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                                Battery (%)
                            </label>
                            <div className="relative">
                                <Battery size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.battery}
                                    onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                                    placeholder="N/A"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
