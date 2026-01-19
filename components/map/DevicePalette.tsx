import { useState, useRef, useEffect } from 'react'
import { Monitor, LayoutGrid, AlignJustify, Plus, Lightbulb, MousePointer2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Device } from '@/lib/mockData' // Adjust import based on your project structure

interface DevicePaletteProps {
    devices: Device[] // Unplaced devices
    selectedDeviceIds: string[]
    onSelectionChange: (ids: string[]) => void
    onDragStart: (e: React.DragEvent, deviceIds: string[]) => void
    placementLayout: 'grid' | 'line'
    onPlacementLayoutChange: (layout: 'grid' | 'line') => void
    onAdd: () => void
}

export function DevicePalette({
    devices,
    selectedDeviceIds,
    onSelectionChange,
    onDragStart,
    placementLayout,
    onPlacementLayoutChange,
    onAdd
}: DevicePaletteProps) {
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    // Handle device click with Shift-select support
    const handleDeviceClick = (e: React.MouseEvent, deviceId: string) => {
        e.stopPropagation()

        if (e.shiftKey && lastSelectedId) {
            // Find range
            const lastIndex = devices.findIndex(d => d.id === lastSelectedId)
            const currentIndex = devices.findIndex(d => d.id === deviceId)

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex)
                const end = Math.max(lastIndex, currentIndex)
                const range = devices.slice(start, end + 1).map(d => d.id)
                onSelectionChange(range)
            }
        } else if (e.metaKey || e.ctrlKey) {
            // Toggle
            if (selectedDeviceIds.includes(deviceId)) {
                onSelectionChange(selectedDeviceIds.filter(id => id !== deviceId))
            } else {
                onSelectionChange([...selectedDeviceIds, deviceId])
            }
            setLastSelectedId(deviceId)
        } else {
            // Single select
            onSelectionChange([deviceId])
            setLastSelectedId(deviceId)
        }
    }

    // Handle drag start
    const handleDragStartInternal = (e: React.DragEvent, deviceId: string) => {
        // If dragging a device that is NOT selected, select it (and deselect others)
        let idsToDrag = selectedDeviceIds
        if (!selectedDeviceIds.includes(deviceId)) {
            idsToDrag = [deviceId]
            onSelectionChange([deviceId])
        }

        // Set drag data
        e.dataTransfer.setData('application/json', JSON.stringify(idsToDrag))
        e.dataTransfer.effectAllowed = 'copyMove'

        // Call parent handler
        onDragStart(e, idsToDrag)

        // Visual feedback
        const element = e.currentTarget as HTMLElement
        element.style.opacity = '0.5'
    }

    const handleDragEndInternal = (e: React.DragEvent) => {
        const element = e.currentTarget as HTMLElement
        element.style.opacity = '1'
    }

    return (
        <div className="absolute top-24 left-4 z-10 w-56 flex flex-col gap-2 bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden max-h-[60vh] transition-all duration-200">
            {/* Header */}
            <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-hover)]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md">
                        <Lightbulb size={14} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-[var(--color-text)] leading-tight">New Devices</h3>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{devices.length} waiting</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Add Button */}
                    <button
                        onClick={onAdd}
                        className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                        title="Add Device"
                    >
                        <Plus size={14} />
                    </button>

                    {/* Placement Layout Toggles - Only show if devices exist */}
                    {devices.length > 0 && (
                        <div className="flex bg-[var(--color-surface)] rounded-lg p-0.5 border border-[var(--color-border-subtle)] ml-1">
                            <button
                                onClick={() => onPlacementLayoutChange('line')}
                                className={`p-1 rounded-md transition-colors ${placementLayout === 'line' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                title="Place in Line"
                            >
                                <AlignJustify size={14} />
                            </button>
                            <button
                                onClick={() => onPlacementLayoutChange('grid')}
                                className={`p-1 rounded-md transition-colors ${placementLayout === 'grid' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                title="Place in Grid"
                            >
                                <LayoutGrid size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className={`overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent ${devices.length === 0 ? 'h-32 flex items-center justify-center' : ''}`}>
                {devices.length === 0 ? (
                    <div className="text-center p-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mx-auto mb-2 cursor-pointer hover:bg-[var(--color-primary)]/10 transition-colors" onClick={onAdd}>
                            <Plus size={18} className="text-[var(--color-text-muted)]" />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">No new devices</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {devices.map(device => {
                            const isSelected = selectedDeviceIds.includes(device.id)
                            return (
                                <div
                                    key={device.id}
                                    draggable
                                    onDragStart={(e) => handleDragStartInternal(e, device.id)}
                                    onDragEnd={handleDragEndInternal}
                                    onClick={(e) => handleDeviceClick(e, device.id)}
                                    className={`
                      relative group cursor-grab active:cursor-grabbing
                      border rounded-lg transition-all duration-200 select-none
                      flex items-center gap-3 p-2
                      ${isSelected
                                            ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]'
                                        }
                    `}
                                >
                                    {/* Selection Check (visible on hover or selected) */}
                                    <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border border-current flex items-center justify-center transition-opacity ${isSelected ? 'text-blue-500 opacity-100' : 'text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'}`}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                    </div>

                                    {/* Icon */}
                                    <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                                        {device.type === 'motion' ? <Monitor size={16} /> : <Lightbulb size={16} />}
                                    </div>

                                    {/* Label */}
                                    <div className="text-left overflow-hidden">
                                        <div className="text-[10px] font-medium text-[var(--color-text)] truncate w-full">
                                            {device.deviceId}
                                        </div>
                                        <div className="text-[9px] text-[var(--color-text-muted)] truncate">
                                            {device.type}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
