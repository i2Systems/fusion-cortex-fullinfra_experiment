import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Monitor, LayoutGrid, AlignJustify, Plus, Lightbulb, GripVertical } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface DevicePaletteProps {
    devices: Device[]
    selectedDeviceIds: string[]
    onSelectionChange: (ids: string[]) => void
    onDragStart: (e: React.DragEvent, deviceIds: string[]) => void
    placementLayout: 'grid' | 'line'
    onPlacementLayoutChange: (layout: 'grid' | 'line') => void
    onAdd: () => void
    onReorder?: (reorderedDevices: Device[]) => void
}

export function DevicePalette({
    devices,
    selectedDeviceIds,
    onSelectionChange,
    onDragStart,
    placementLayout,
    onPlacementLayoutChange,
    onAdd,
    onReorder
}: DevicePaletteProps) {
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    // Internal reorder state
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dropTargetId, setDropTargetId] = useState<string | null>(null)
    const [isReorderMode, setIsReorderMode] = useState(false)
    const pendingReorderRef = useRef<boolean>(false)

    // Track local order by device IDs (not full objects to avoid stale data)
    const [localOrder, setLocalOrder] = useState<string[]>([])

    // Sync local order when devices prop changes (new devices added/removed)
    useEffect(() => {
        const currentIds = devices.map(d => d.id)
        const hasNewDevices = currentIds.some(id => !localOrder.includes(id))
        const hasRemovedDevices = localOrder.some(id => !currentIds.includes(id))

        if (localOrder.length === 0 || hasNewDevices || hasRemovedDevices) {
            // Preserve existing order for devices that still exist, append new ones at end
            const existingOrdered = localOrder.filter(id => currentIds.includes(id))
            const newIds = currentIds.filter(id => !localOrder.includes(id))
            setLocalOrder([...existingOrdered, ...newIds])
        }
    }, [devices])

    // Build ordered device list from localOrder
    const displayDevices = useMemo(() => {
        if (localOrder.length === 0) return devices

        const deviceMap = new Map(devices.map(d => [d.id, d]))
        return localOrder
            .map(id => deviceMap.get(id))
            .filter((d): d is Device => d !== undefined)
    }, [devices, localOrder])

    // Handle device click with Shift-select support
    const handleDeviceClick = (e: React.MouseEvent, deviceId: string) => {
        e.stopPropagation()

        if (e.shiftKey && lastSelectedId) {
            const lastIndex = displayDevices.findIndex(d => d.id === lastSelectedId)
            const currentIndex = displayDevices.findIndex(d => d.id === deviceId)
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex)
                const end = Math.max(lastIndex, currentIndex)
                const range = displayDevices.slice(start, end + 1).map(d => d.id)
                onSelectionChange(range)
            }
        } else if (e.metaKey || e.ctrlKey) {
            if (selectedDeviceIds.includes(deviceId)) {
                onSelectionChange(selectedDeviceIds.filter(id => id !== deviceId))
            } else {
                onSelectionChange([...selectedDeviceIds, deviceId])
            }
            setLastSelectedId(deviceId)
        } else {
            onSelectionChange([deviceId])
            setLastSelectedId(deviceId)
        }
    }

    // Handle internal reorder drag start
    const handleReorderDragStart = (e: React.DragEvent, deviceId: string) => {
        e.stopPropagation()
        setDraggedId(deviceId)
        setIsReorderMode(true)

        // Set drag image
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', deviceId)

        // Apply visual effect after a frame
        requestAnimationFrame(() => {
            const el = e.currentTarget as HTMLElement
            el.style.opacity = 'var(--drag-active-opacity)'
        })
    }

    // Handle external drag start (to map)
    const handleExternalDragStart = (e: React.DragEvent, deviceId: string) => {
        if (isReorderMode) return

        let idsToDrag = selectedDeviceIds
        if (!selectedDeviceIds.includes(deviceId)) {
            idsToDrag = [deviceId]
            onSelectionChange([deviceId])
        }

        e.dataTransfer.setData('application/json', JSON.stringify(idsToDrag))
        e.dataTransfer.effectAllowed = 'copyMove'
        onDragStart(e, idsToDrag)

        const element = e.currentTarget as HTMLElement
        element.style.opacity = '0.5'
    }

    // Handle drag over for reordering
    const handleDragOver = (e: React.DragEvent, deviceId: string) => {
        e.preventDefault()
        if (!isReorderMode || !draggedId || draggedId === deviceId) return

        e.dataTransfer.dropEffect = 'move'
        setDropTargetId(deviceId)
    }

    // Handle drop for reordering
    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!isReorderMode || !draggedId || draggedId === targetId) {
            setDraggedId(null)
            setDropTargetId(null)
            setIsReorderMode(false)
            return
        }

        // Reorder using localOrder (array of IDs)
        const currentOrder = localOrder.length > 0 ? [...localOrder] : devices.map(d => d.id)
        const draggedIndex = currentOrder.indexOf(draggedId)
        const targetIndex = currentOrder.indexOf(targetId)

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove from old position and insert at new position
            currentOrder.splice(draggedIndex, 1)
            currentOrder.splice(targetIndex, 0, draggedId)
            setLocalOrder(currentOrder)

            // Notify parent of reorder with full device objects
            if (onReorder) {
                const deviceMap = new Map(devices.map(d => [d.id, d]))
                const reorderedDevices = currentOrder
                    .map(id => deviceMap.get(id))
                    .filter((d): d is Device => d !== undefined)
                onReorder(reorderedDevices)
            }
        }

        setDraggedId(null)
        setDropTargetId(null)
        setIsReorderMode(false)
    }

    // Handle drag end
    const handleDragEnd = (e: React.DragEvent) => {
        const element = e.currentTarget as HTMLElement
        element.style.opacity = '1'
        element.style.transform = ''
        setDraggedId(null)
        setDropTargetId(null)
        setIsReorderMode(false)
    }

    // Grouping state
    const [groupBy, setGroupBy] = useState<'location' | 'type'>('location')

    // Helper functions for device styling
    const getDeviceRole = (device: Device) => {
        if (device.type.includes('power-entry')) return 'entry'
        if (device.type.includes('follower')) return 'follower'
        if (device.type === 'motion' || device.type === 'light-sensor') return 'sensor'
        return 'unknown'
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'entry': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'follower': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'sensor': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }

    // Group devices
    const devicesByGroup = useMemo(() => {
        const groups = new Map<string, Device[]>()

        displayDevices.forEach(device => {
            let groupKey = 'Ungrouped'

            if (groupBy === 'location') {
                groupKey = device.location || 'Ungrouped'
            } else {
                // Group by Type
                if (device.type.includes('fixture')) groupKey = 'Fixtures'
                else if (device.type === 'motion') groupKey = 'Motion Sensors'
                else if (device.type === 'light-sensor') groupKey = 'Light Sensors'
                else groupKey = 'Other Devices' // Fallback
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, [])
            }
            groups.get(groupKey)!.push(device)
        })

        // Sort keys to ensure consistent order (e.g. Fixtures first or alphabetical)
        // For Type: Fixtures -> Sensors -> Other
        if (groupBy === 'type') {
            const priority = ['Fixtures', 'Motion Sensors', 'Light Sensors', 'Other Devices']
            const sortedMap = new Map([...groups.entries()].sort((a, b) => {
                const idxA = priority.indexOf(a[0])
                const idxB = priority.indexOf(b[0])
                return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
            }))
            return sortedMap
        }

        return groups
    }, [displayDevices, groupBy])

    return (
        <div
            className="absolute top-24 left-4 z-10 w-56 flex flex-col gap-2 bg-[var(--color-surface-glass)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl shadow-2xl overflow-hidden max-h-[60vh] transition-all duration-200"
            onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}
            onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}
        >
            {/* Header */}
            <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-hover)]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md">
                        <Lightbulb size={14} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-[var(--color-text)] leading-tight">New Devices</h3>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{displayDevices.length} waiting</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onAdd}
                        className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                        title="Add Device"
                    >
                        <Plus size={14} />
                    </button>

                    {/* Group By Toggle */}
                    <button
                        onClick={() => setGroupBy(prev => prev === 'location' ? 'type' : 'location')}
                        className={`p-1 rounded-md transition-colors ${groupBy === 'type' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={`Group by ${groupBy === 'location' ? 'Type' : 'Location'}`}
                    >
                        {/* Use a Filter icon or similar */}
                        <div className="flex flex-col gap-[1.5px] items-center justify-center w-3.5 h-3.5">
                            <div className="w-full h-[1.5px] bg-current rounded-full" />
                            <div className="w-[80%] h-[1.5px] bg-current rounded-full" />
                            <div className="w-[60%] h-[1.5px] bg-current rounded-full" />
                        </div>
                    </button>

                    {displayDevices.length > 0 && (
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
            <div className={`overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent ${displayDevices.length === 0 ? 'h-32 flex items-center justify-center' : ''}`}>
                {displayDevices.length === 0 ? (
                    <div className="text-center p-4">
                        <div
                            className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mx-auto mb-2 cursor-pointer hover:bg-[var(--color-primary)]/10 transition-colors"
                            onClick={onAdd}
                        >
                            <Plus size={18} className="text-[var(--color-text-muted)]" />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">No new devices</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {Array.from(devicesByGroup.entries()).map(([groupName, groupDevices]) => (
                            <div key={groupName} className="mb-2 last:mb-0">
                                {/* Group Header */}
                                {(groupBy === 'type' || (devicesByGroup.size > 1 && !['Unknown', 'Ungrouped', 'unknown', 'ungrouped'].includes(groupName))) && (
                                    <div className={`flex items-center gap-2 px-1 py-1 mb-1 ${groupBy === 'type' ? 'bg-[var(--color-surface-subtle)]/30 rounded' : ''}`}>
                                        {groupBy === 'location' ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                                                    <span className="text-[8px] font-bold text-[var(--color-primary)]">
                                                        {groupName.replace('Group ', '').slice(0, 2)}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                                                    {groupName} ({groupDevices.length})
                                                </span>
                                            </>
                                        ) : (
                                            /* Type Header - Surreptitious / Tertiary */
                                            <div className="w-full pl-1 border-l-2 border-[var(--color-text-soft)]/20">
                                                <span className="text-[10px] font-medium text-[var(--color-text-soft)] tracking-wider">
                                                    {groupName} <span className="opacity-50 text-[8px] ml-1">({groupDevices.length})</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Group Devices */}
                                {groupDevices.map((device, idx) => {
                                    const isSelected = selectedDeviceIds.includes(device.id)
                                    const isDragging = draggedId === device.id
                                    const isDropTarget = dropTargetId === device.id
                                    const role = getDeviceRole(device)
                                    const roleColor = getRoleColor(role)
                                    const positionNum = idx + 1

                                    return (
                                        <div
                                            key={device.id}
                                            draggable
                                            onDragStart={(e) => {
                                                if (pendingReorderRef.current) {
                                                    handleReorderDragStart(e, device.id)
                                                    pendingReorderRef.current = false
                                                } else {
                                                    handleExternalDragStart(e, device.id)
                                                }
                                            }}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => handleDragOver(e, device.id)}
                                            onDrop={(e) => handleDrop(e, device.id)}
                                            onClick={(e) => handleDeviceClick(e, device.id)}
                                            className={`
                                                relative group cursor-grab
                                                border rounded-lg select-none
                                                flex items-center gap-1.5 p-1.5 mb-0.5
                                                transition-[transform,box-shadow,background-color,border-color,opacity]
                                                ${isDragging
                                                    ? 'opacity-50 scale-[0.97] shadow-[var(--drag-hold-shadow)] bg-[var(--drag-hold-bg)]'
                                                    : isDropTarget
                                                        ? 'bg-[var(--drop-target-bg)] border-[var(--color-primary)] shadow-[var(--drop-target-shadow)] scale-[1.02]'
                                                        : isSelected
                                                            ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                            : 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] hover:border-[var(--drag-hover-border)] hover:bg-[var(--color-surface-hover)] hover:scale-[var(--drag-hover-scale)] hover:shadow-[var(--drag-hover-shadow)]'
                                                }
                                            `}
                                            style={{
                                                transitionDuration: 'var(--drag-hover-transition)',
                                            }}
                                        >
                                            <div
                                                className="reorder-grip p-0.5 rounded cursor-move text-[var(--color-text-soft)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                                                title="Drag to reorder"
                                                onMouseDown={() => { pendingReorderRef.current = true }}
                                                onMouseUp={() => { pendingReorderRef.current = false }}
                                            >
                                                <GripVertical size={12} />
                                            </div>

                                            <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border ${roleColor}`}>
                                                {positionNum}
                                            </div>

                                            <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                                                {device.type === 'motion' || device.type === 'light-sensor'
                                                    ? <Monitor size={14} />
                                                    : <Lightbulb size={14} />}
                                            </div>

                                            <div className="text-left overflow-hidden flex-1 min-w-0">
                                                <div className="text-[9px] font-medium text-[var(--color-text)] truncate">
                                                    {device.type.replace('fixture-', '').replace('-power-entry', ' Entry').replace('-follower', ' Follow')}
                                                </div>
                                            </div>

                                            <div className={`w-3 h-3 rounded-full border border-current flex items-center justify-center transition-opacity ${isSelected ? 'text-blue-500 opacity-100' : 'text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
