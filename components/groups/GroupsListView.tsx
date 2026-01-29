/**
 * Groups List View Component
 * 
 * Displays groups as columns with people/devices as tokens.
 * Matches the Zones list view style.
 */

'use client'

import { useMemo, useCallback, useState, memo } from 'react'
import { Users, Monitor, Layers, Plus, FolderPlus } from 'lucide-react'
import { Group } from '@/lib/stores/groupStore'
import { Person } from '@/lib/stores/personStore'
import { Device } from '@/lib/mockData'
import { GroupsFilterMode } from './GroupsViewToggle'
import { PersonToken } from '@/components/people/PersonToken'

interface GroupsListViewProps {
    groups: Group[]
    selectedGroupId: string | null
    onGroupSelect: (groupId: string | null) => void
    searchQuery: string
    filterMode?: GroupsFilterMode
    /** When true, hide groups that have no people (People filter), no devices (Devices filter), or both empty (Both filter) */
    hideEmptyGroups?: boolean
    /** When true and filterMode is 'both', show tiered sections: People only | Devices only | Mixed */
    tieredView?: boolean
    people?: Person[]
    devices?: Device[]
    /** Called when an item is moved/copied. `copy` is true when Shift is held (add to group without removing from source) */
    onItemMove?: (itemId: string, itemType: 'person' | 'device', fromGroupId: string | null, toGroupId: string, copy?: boolean) => void
    onPersonClick?: (personId: string) => void
    /** Called when user wants to create a new group */
    onCreateGroup?: () => void
    /** Called when user clicks the + button on a group to add items */
    onAddToGroup?: (groupId: string) => void
}

// Person Card Component
interface PersonCardProps {
    person: Person
    groupId: string | null
    onDragStart: (e: React.DragEvent, person: Person, groupId: string | null) => void
    onDragEnd: () => void
    onClick?: (personId: string) => void
    /** Number of groups this person belongs to (for multi-group indicator) */
    groupCount?: number
}

const PersonCard = memo(function PersonCard({ person, groupId, onDragStart, onDragEnd, onClick, groupCount = 1 }: PersonCardProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onClick) {
            onClick(person.id)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault()
            onClick(person.id)
        }
    }

    const isMultiGroup = groupCount > 1

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, person, groupId)}
            onDragEnd={onDragEnd}
            onClick={onClick ? handleClick : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            tabIndex={0}
            role="button"
            aria-label={`${person.firstName} ${person.lastName}${person.role ? `, ${person.role}` : ''}${isMultiGroup ? `, in ${groupCount} groups` : ''}. Drag to move${onClick ? ', or press Enter to view profile' : ''}.`}
            title={`${person.firstName} ${person.lastName}${person.role ? ` • ${person.role}` : ''}${isMultiGroup ? ` • In ${groupCount} groups` : ''}`}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-subtle)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${onClick ? 'cursor-pointer' : 'cursor-grab'}`}
        >
            {person.imageUrl ? (
                <img src={person.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            ) : (
                <div className="w-4 h-4 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                    {person.firstName[0]}{person.lastName[0]}
                </div>
            )}
            <span className="truncate max-w-[100px] text-[var(--color-text)]">{person.firstName}</span>
            {isMultiGroup && (
                <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {groupCount}
                </span>
            )}
        </div>
    )
})

// Device Card Component
interface DeviceCardProps {
    device: Device
    groupId: string | null
    onDragStart: (e: React.DragEvent, device: Device, groupId: string | null) => void
    onDragEnd: () => void
    /** Number of groups this device belongs to (for multi-group indicator) */
    groupCount?: number
}

const DeviceCard = memo(function DeviceCard({ device, groupId, onDragStart, onDragEnd, groupCount = 1 }: DeviceCardProps) {
    const isMultiGroup = groupCount > 1
    
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, device, groupId)}
            onDragEnd={onDragEnd}
            tabIndex={0}
            role="button"
            aria-label={`${device.deviceId}, ${device.type}, ${device.status}${isMultiGroup ? `, in ${groupCount} groups` : ''}. Drag to move.`}
            title={`${device.deviceId} • ${device.type} • ${device.status}${isMultiGroup ? ` • In ${groupCount} groups` : ''}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-subtle)] cursor-move transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
            <Monitor size={12} className="text-[var(--color-text-muted)] flex-shrink-0" />
            <span className="truncate max-w-[80px] text-[var(--color-text)]">{device.deviceId}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${device.status === 'online' ? 'bg-[var(--color-success)]' : device.status === 'offline' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'}`} />
            {isMultiGroup && (
                <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {groupCount}
                </span>
            )}
        </div>
    )
})

export function GroupsListView({ 
    groups, 
    selectedGroupId, 
    onGroupSelect, 
    searchQuery, 
    filterMode = 'both',
    hideEmptyGroups = false,
    tieredView = true,
    people = [],
    devices = [],
    onItemMove,
    onPersonClick,
    onCreateGroup,
    onAddToGroup
}: GroupsListViewProps) {
    const [draggedItem, setDraggedItem] = useState<{ item: Person | Device; type: 'person' | 'device'; fromGroupId: string | null } | null>(null)
    const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)

    // Create maps for quick lookup (needed for isEmpty / tier logic)
    const personMap = useMemo(() => new Map(people.map(p => [p.id, p])), [people])
    const deviceMap = useMemo(() => new Map(devices.map(d => [d.id, d])), [devices])

    // Filter groups by search, then by empty when hideEmptyGroups
    const filteredGroups = useMemo(() => {
        let result = groups

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase()
            result = result.filter(g =>
                g.name.toLowerCase().includes(lowerQuery) ||
                g.description?.toLowerCase().includes(lowerQuery)
            )
        }

        if (hideEmptyGroups) {
            result = result.filter(g => {
                const groupPeople = (g.personIds ?? []).map(id => personMap.get(id)).filter(Boolean)
                const groupDevices = g.deviceIds.map(id => deviceMap.get(id)).filter(Boolean)
                const isEmpty =
                    (filterMode === 'people' && groupPeople.length === 0) ||
                    (filterMode === 'devices' && groupDevices.length === 0) ||
                    (filterMode === 'both' && groupPeople.length === 0 && groupDevices.length === 0)
                return !isEmpty
            })
        }

        return result
    }, [groups, searchQuery, hideEmptyGroups, filterMode, personMap, deviceMap])

    // Tiered sections when filterMode is 'both' and tieredView: people-only | devices-only | mixed
    const tieredSections = useMemo(() => {
        if (filterMode !== 'both' || !tieredView || filteredGroups.length === 0) return null
        const peopleOnly: Group[] = []
        const devicesOnly: Group[] = []
        const mixed: Group[] = []
        filteredGroups.forEach(g => {
            const hasPeople = (g.personIds ?? []).length > 0
            const hasDevices = g.deviceIds.length > 0
            if (hasPeople && hasDevices) mixed.push(g)
            else if (hasPeople) peopleOnly.push(g)
            else if (hasDevices) devicesOnly.push(g)
        })
        return { peopleOnly, devicesOnly, mixed }
    }, [filterMode, tieredView, filteredGroups])

    // Flatten for non-tiered or when filterMode is people/devices (single list)
    const groupsToRender = tieredSections
        ? [
            ...tieredSections.peopleOnly,
            ...tieredSections.devicesOnly,
            ...tieredSections.mixed,
        ]
        : filteredGroups

    // Get ungrouped items
    const allGroupedPersonIds = useMemo(() => {
        const ids = new Set<string>()
        groups.forEach(g => (g.personIds ?? []).forEach(id => ids.add(id)))
        return ids
    }, [groups])

    const allGroupedDeviceIds = useMemo(() => {
        const ids = new Set<string>()
        groups.forEach(g => g.deviceIds.forEach(id => ids.add(id)))
        return ids
    }, [groups])

    // Count how many groups each person/device belongs to
    const personGroupCount = useMemo(() => {
        const counts = new Map<string, number>()
        groups.forEach(g => {
            (g.personIds ?? []).forEach(id => {
                counts.set(id, (counts.get(id) || 0) + 1)
            })
        })
        return counts
    }, [groups])

    const deviceGroupCount = useMemo(() => {
        const counts = new Map<string, number>()
        groups.forEach(g => {
            g.deviceIds.forEach(id => {
                counts.set(id, (counts.get(id) || 0) + 1)
            })
        })
        return counts
    }, [groups])

    const ungroupedPeople = useMemo(() => {
        return people.filter(p => !allGroupedPersonIds.has(p.id))
    }, [people, allGroupedPersonIds])

    const ungroupedDevices = useMemo(() => {
        return devices.filter(d => !allGroupedDeviceIds.has(d.id))
    }, [devices, allGroupedDeviceIds])

    // Drag handlers
    const handlePersonDragStart = useCallback((e: React.DragEvent, person: Person, groupId: string | null) => {
        setDraggedItem({ item: person, type: 'person', fromGroupId: groupId })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', '')
    }, [])

    const handleDeviceDragStart = useCallback((e: React.DragEvent, device: Device, groupId: string | null) => {
        setDraggedItem({ item: device, type: 'device', fromGroupId: groupId })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', '')
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = e.shiftKey ? 'copy' : 'move'
        setDragOverGroupId(groupId)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOverGroupId(null)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent, toGroupId: string) => {
        e.preventDefault()
        const isCopy = e.shiftKey
        
        // Check if data came from panel (JSON format)
        try {
            const jsonData = e.dataTransfer.getData('application/json')
            if (jsonData) {
                const data = JSON.parse(jsonData)
                if ((data.type === 'device' || data.type === 'person') && data.itemId && onItemMove) {
                    onItemMove(data.itemId, data.type, data.fromGroupId, toGroupId, isCopy)
                    setDraggedItem(null)
                    setDragOverGroupId(null)
                    return
                }
            }
        } catch (err) {
            // Not JSON data, continue with normal flow
        }
        
        // Normal drag from within the list
        if (draggedItem && onItemMove) {
            onItemMove(draggedItem.item.id, draggedItem.type, draggedItem.fromGroupId, toGroupId, isCopy)
        }
        setDraggedItem(null)
        setDragOverGroupId(null)
    }, [draggedItem, onItemMove])

    const handleDragEnd = useCallback(() => {
        setDraggedItem(null)
        setDragOverGroupId(null)
    }, [])

    const columnCount = Math.max(1, groupsToRender.length)

    const renderGroupCard = (group: Group) => {
        const groupPeople = (group.personIds ?? []).map(id => personMap.get(id)).filter(Boolean) as Person[]
        const groupDevices = group.deviceIds.map(id => deviceMap.get(id)).filter(Boolean) as Device[]
        const isSelected = selectedGroupId === group.id
        const isDragOver = dragOverGroupId === group.id

        const showPeople = filterMode === 'people' || filterMode === 'both'
        const showDevices = filterMode === 'devices' || filterMode === 'both'
        const isEmpty =
            (filterMode === 'people' && groupPeople.length === 0) ||
            (filterMode === 'devices' && groupDevices.length === 0) ||
            (filterMode === 'both' && groupPeople.length === 0 && groupDevices.length === 0)

        return (
            <div
                key={group.id}
                                className={`
                                    flex flex-col rounded-lg border-2 transition-all
                                    ${isSelected
                                        ? 'border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                                        : 'border-[var(--color-border-subtle)]'
                                    }
                                    ${isDragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30' : ''}
                                    ${isEmpty ? 'self-start' : ''}
                                `}
                                style={isEmpty ? { height: 'auto' } : undefined}
                                onDragOver={(e) => handleDragOver(e, group.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, group.id)}
                                onClick={() => onGroupSelect?.(isSelected ? null : group.id)}
                            >
                                {/* Group Header */}
                                <div
                                    className="p-3 rounded-t-lg border-b border-[var(--color-border-subtle)] cursor-pointer"
                                    style={{
                                        backgroundColor: `${group.color}20`,
                                        borderColor: isSelected ? group.color : undefined
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-sm text-[var(--color-text)] truncate flex-1 mr-2">
                                            {group.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {onAddToGroup && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        onAddToGroup(group.id)
                                                    }}
                                                    className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                                    title="Add items to group — opens panel to drag items in"
                                                    aria-label={`Add items to ${group.name}`}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: group.color }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                                        {showPeople && (
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {groupPeople.length}
                                            </span>
                                        )}
                                        {showDevices && (
                                            <span className="flex items-center gap-1">
                                                <Monitor size={12} />
                                                {groupDevices.length}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className={`${isEmpty ? 'flex-none p-2' : 'flex-1 p-3'} bg-[var(--color-surface-subtle)]/30 rounded-b-lg overflow-auto ${isEmpty ? '' : 'min-h-[120px] max-h-[400px]'}`}>
                                    {/* People Section */}
                                    {showPeople && groupPeople.length > 0 && (
                                        <div className={showDevices && groupDevices.length > 0 ? 'mb-3' : ''}>
                                            {filterMode === 'both' && (
                                                <div className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1 uppercase tracking-wider">
                                                    <Users size={10} />
                                                    People
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {groupPeople.map((person) => (
                                                    <PersonCard
                                                        key={person.id}
                                                        person={person}
                                                        groupId={group.id}
                                                        onDragStart={handlePersonDragStart}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={onPersonClick}
                                                        groupCount={personGroupCount.get(person.id) || 1}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Devices Section */}
                                    {showDevices && groupDevices.length > 0 && (
                                        <div>
                                            {filterMode === 'both' && (
                                                <div className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1 uppercase tracking-wider">
                                                    <Monitor size={10} />
                                                    Devices
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {groupDevices.map((device) => (
                                                    <DeviceCard
                                                        key={device.id}
                                                        device={device}
                                                        groupId={group.id}
                                                        onDragStart={handleDeviceDragStart}
                                                        onDragEnd={handleDragEnd}
                                                        groupCount={deviceGroupCount.get(device.id) || 1}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {((showPeople && groupPeople.length === 0) && (showDevices && groupDevices.length === 0)) && (
                                        <div className={`text-xs text-[var(--color-text-soft)] text-center italic ${isEmpty ? 'py-1' : 'py-8'}`}>
                                            No items — drag here to add
                                        </div>
                                    )}
                                    {showPeople && !showDevices && groupPeople.length === 0 && (
                                        <div className={`text-xs text-[var(--color-text-soft)] text-center italic ${isEmpty ? 'py-1' : 'py-8'}`}>
                                            No people
                                        </div>
                                    )}
                                    {showDevices && !showPeople && groupDevices.length === 0 && (
                                        <div className={`text-xs text-[var(--color-text-soft)] text-center italic ${isEmpty ? 'py-1' : 'py-8'}`}>
                                            No devices
                                        </div>
                                    )}
                                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-4">
                {tieredSections ? (
                    /* Tiered: People only | Devices only | Mixed */
                    <div className="space-y-6">
                        {tieredSections.peopleOnly.length > 0 && (
                            <section>
                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Users size={12} />
                                    People
                                </h3>
                                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `repeat(${tieredSections.peopleOnly.length}, minmax(220px, 1fr))` }}>
                                    {tieredSections.peopleOnly.map(renderGroupCard)}
                                </div>
                            </section>
                        )}
                        {tieredSections.devicesOnly.length > 0 && (
                            <section>
                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Monitor size={12} />
                                    Devices
                                </h3>
                                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `repeat(${tieredSections.devicesOnly.length}, minmax(220px, 1fr))` }}>
                                    {tieredSections.devicesOnly.map(renderGroupCard)}
                                </div>
                            </section>
                        )}
                        {tieredSections.mixed.length > 0 && (
                            <section>
                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Layers size={12} />
                                    People & devices
                                </h3>
                                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `repeat(${tieredSections.mixed.length}, minmax(220px, 1fr))` }}>
                                    {tieredSections.mixed.map(renderGroupCard)}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    /* Flat grid */
                    <div
                        className="grid gap-4 items-start"
                        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))` }}
                    >
                        {groupsToRender.map(renderGroupCard)}
                    </div>
                )}

                {groupsToRender.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <FolderPlus size={48} className="mb-4 text-[var(--color-text-muted)] opacity-50" />
                        {groups.length === 0 ? (
                            <>
                                <p className="text-[var(--color-text-muted)] mb-1">No groups yet</p>
                                <p className="text-sm text-[var(--color-text-soft)] mb-4">
                                    Groups help organize people and devices together
                                </p>
                                {onCreateGroup && (
                                    <button
                                        onClick={onCreateGroup}
                                        className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Create your first group
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-[var(--color-text-muted)]">No groups match your filters</p>
                                <p className="text-sm text-[var(--color-text-soft)]">
                                    Try adjusting search or filter settings
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
