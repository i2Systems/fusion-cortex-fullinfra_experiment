'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Users, Monitor, Edit2, Trash2, Save, X, CheckSquare, Square, Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { ConfirmationModal } from '@/components/shared/ConfirmationModal'
import { useToast } from '@/lib/ToastContext'
import { Group } from '@/lib/stores/groupStore'
import { Device } from '@/lib/mockData'
import { Person } from '@/lib/stores/personStore'
import { getGroupColors } from '@/lib/canvasColors'
import { GroupsFilterMode } from './GroupsViewToggle'

interface GroupsPanelProps {
    groups: Group[]
    selectedGroupId: string | null
    onGroupSelect: (groupId: string | null) => void
    onCreateGroup: () => void
    /** Called when creating a group with pre-selected items */
    onCreateGroupWithItems?: (personIds: string[], deviceIds: string[]) => void
    onDeleteGroup: (groupId: string) => void
    onDeleteGroups: (groupIds: string[]) => void
    onEditGroup: (groupId: string, updates: Partial<Group>) => void
    devices: Device[]
    people?: Person[]
    filterMode?: GroupsFilterMode
    onAddToGroup?: (groupId: string, itemIds: string[], type: 'devices' | 'people') => Promise<void>
    /** Called when an item is moved/copied. `copy` is true when Shift is held */
    onItemMove?: (itemId: string, itemType: 'person' | 'device', fromGroupId: string | null, toGroupId: string, copy?: boolean) => void
}

export function GroupsPanel({
    groups,
    selectedGroupId,
    onGroupSelect,
    onCreateGroup,
    onCreateGroupWithItems,
    onDeleteGroup,
    onDeleteGroups,
    onEditGroup,
    devices,
    people = [],
    filterMode = 'both',
    onAddToGroup,
    onItemMove
}: GroupsPanelProps) {
    const { addToast } = useToast()
    const groupColors = getGroupColors()

    const [isEditing, setIsEditing] = useState(false)
    const [editFormData, setEditFormData] = useState<{ name: string; description: string; color: string; deviceIds: string[]; personIds: string[] }>({
        name: '',
        description: '',
        color: groupColors[0],
        deviceIds: [],
        personIds: []
    })

    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
    const [selectedUngroupedIds, setSelectedUngroupedIds] = useState<Set<string>>(new Set())
    const [itemsViewMode, setItemsViewMode] = useState<'ungrouped' | 'all'>('ungrouped')
    const [itemsFilterTab, setItemsFilterTab] = useState<'all' | 'people' | 'devices'>('all')
    const [nameError, setNameError] = useState<string | null>(null)

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId])
    const allSelected = useMemo(() => groups.length > 0 && selectedGroupIds.size === groups.length, [groups.length, selectedGroupIds.size])

    // Get all device IDs that are in any group
    const groupedDeviceIds = useMemo(() => {
        const ids = new Set<string>()
        groups.forEach(g => g.deviceIds.forEach(id => ids.add(id)))
        return ids
    }, [groups])

    // Get all person IDs that are in any group
    const groupedPersonIds = useMemo(() => {
        const ids = new Set<string>()
        groups.forEach(g => (g.personIds ?? []).forEach(id => ids.add(id)))
        return ids
    }, [groups])

    // Ungrouped devices
    const ungroupedDevices = useMemo(() => {
        return devices.filter(d => !groupedDeviceIds.has(d.id))
    }, [devices, groupedDeviceIds])

    // Ungrouped people
    const ungroupedPeople = useMemo(() => {
        return people.filter(p => !groupedPersonIds.has(p.id))
    }, [people, groupedPersonIds])

    // Filter groups based on mode
    const filteredGroups = useMemo(() => {
        if (filterMode === 'both') return groups
        if (filterMode === 'devices') {
            return groups.filter(g => g.deviceIds.length > 0 || (g.personIds ?? []).length === 0)
        }
        if (filterMode === 'people') {
            return groups.filter(g => (g.personIds ?? []).length > 0 || g.deviceIds.length === 0)
        }
        return groups
    }, [groups, filterMode])

    // Reset form when selection changes
    useEffect(() => {
        if (selectedGroup) {
            setEditFormData({
                name: selectedGroup.name,
                description: selectedGroup.description || '',
                color: selectedGroup.color,
                deviceIds: selectedGroup.deviceIds,
                personIds: selectedGroup.personIds ?? []
            })
            setIsEditing(false)
            setNameError(null)
        }
    }, [selectedGroup])

    const handleStartEdit = () => setIsEditing(true)

    const handleCancelEdit = () => {
        setIsEditing(false)
        setNameError(null)
        if (selectedGroup) {
            setEditFormData({
                name: selectedGroup.name,
                description: selectedGroup.description || '',
                color: selectedGroup.color,
                deviceIds: selectedGroup.deviceIds,
                personIds: selectedGroup.personIds ?? []
            })
        }
    }

    const handleSaveEdit = () => {
        if (!selectedGroup) return
        if (!editFormData.name.trim()) {
            setNameError('Name is required')
            return
        }
        setNameError(null)

        onEditGroup(selectedGroup.id, {
            name: editFormData.name,
            description: editFormData.description,
            color: editFormData.color,
        })
        setIsEditing(false)
    }

    const handleToggleGroupSelection = (groupId: string) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev)
            if (next.has(groupId)) next.delete(groupId)
            else next.add(groupId)
            return next
        })
    }

    const handleSelectAll = () => {
        if (allSelected) setSelectedGroupIds(new Set())
        else setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)))
    }

    const handleConfirmDelete = () => {
        if (selectedGroup) {
            onDeleteGroup(selectedGroup.id)
            setIsDeleteModalOpen(false)
        }
    }

    const handleConfirmBulkDelete = () => {
        onDeleteGroups(Array.from(selectedGroupIds))
        setSelectedGroupIds(new Set())
        setIsBulkDeleteModalOpen(false)
    }

    const handleToggleUngrouped = (id: string) => {
        setSelectedUngroupedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleAddSelectedToGroup = async () => {
        if (!selectedGroup || selectedUngroupedIds.size === 0) return

        const selectedIds = Array.from(selectedUngroupedIds)
        const deviceIds = selectedIds.filter(id => ungroupedDevices.some(d => d.id === id))
        const personIds = selectedIds.filter(id => ungroupedPeople.some(p => p.id === id))

        try {
            if (deviceIds.length > 0 && onAddToGroup) {
                await onAddToGroup(selectedGroup.id, deviceIds, 'devices')
            }
            if (personIds.length > 0 && onAddToGroup) {
                await onAddToGroup(selectedGroup.id, personIds, 'people')
            }
            setSelectedUngroupedIds(new Set())
        } catch (error) {
            console.error('Error adding to group:', error)
        }
    }

    // Get the count label for a group based on filter mode
    const getGroupCountLabel = (group: Group) => {
        const deviceCount = group.deviceIds.length
        const personCount = (group.personIds ?? []).length
        
        if (filterMode === 'devices') return `${deviceCount} device${deviceCount !== 1 ? 's' : ''}`
        if (filterMode === 'people') return `${personCount} ${personCount !== 1 ? 'people' : 'person'}`
        
        const parts = []
        if (deviceCount > 0) parts.push(`${deviceCount} device${deviceCount !== 1 ? 's' : ''}`)
        if (personCount > 0) parts.push(`${personCount} ${personCount !== 1 ? 'people' : 'person'}`)
        return parts.join(', ') || '0 items'
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-[var(--color-text)]">
                        Groups
                    </h3>
                    {filteredGroups.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                                title={allSelected ? "Deselect all" : "Select all"}
                            >
                                {allSelected ? <CheckSquare size={16} className="text-[var(--color-primary)]" /> : <Square size={16} className="text-[var(--color-text-muted)]" />}
                            </button>
                            {selectedGroupIds.size > 0 && (
                                <button
                                    onClick={() => setIsBulkDeleteModalOpen(true)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-danger)]"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Group Details / Edit */}
            {selectedGroup && (
                <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/30 flex-shrink-0">
                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-[var(--color-text)]">Edit Group</h3>
                                <div className="flex gap-1">
                                    <button onClick={handleSaveEdit} className="p-1.5 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-success)]"><Save size={16} /></button>
                                    <button onClick={handleCancelEdit} className="p-1.5 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]"><X size={16} /></button>
                                </div>
                            </div>
                            <Input
                                className="w-full p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
                                value={editFormData.name}
                                onChange={e => {
                                    setEditFormData({ ...editFormData, name: e.target.value })
                                    if (nameError) setNameError(null)
                                }}
                                placeholder="Group Name"
                                errorMessage={nameError ?? undefined}
                            />
                            <textarea
                                className="w-full p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm resize-none"
                                value={editFormData.description}
                                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                placeholder="Description"
                                rows={2}
                            />
                            <div className="flex gap-2 flex-wrap">
                                {groupColors.map(c => (
                                    <button
                                        key={c}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${editFormData.color === c ? 'border-[var(--color-text)] scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setEditFormData({ ...editFormData, color: c })}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedGroup.color}20` }}>
                                        <Users size={20} style={{ color: selectedGroup.color }} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--color-text)]">{selectedGroup.name}</h3>
                                        <p className="text-xs text-[var(--color-text-muted)]">{getGroupCountLabel(selectedGroup)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={handleStartEdit} className="p-1.5 hover:bg-[var(--color-surface-subtle)] rounded"><Edit2 size={14} className="text-[var(--color-text-muted)]" /></button>
                                    <button onClick={() => setIsDeleteModalOpen(true)} className="p-1.5 hover:bg-[var(--color-surface-subtle)] rounded text-[var(--color-danger)]"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            {selectedGroup.description && <p className="text-sm text-[var(--color-text-soft)] mt-2">{selectedGroup.description}</p>}
                        </div>
                    )}
                </div>
            )}

            {/* Groups List - Top Half */}
            <div className="flex-1 min-h-0 overflow-auto p-2 border-b border-[var(--color-border-subtle)]">
                {filteredGroups.length === 0 ? (
                    <PanelEmptyState icon={Users} title="No Groups" description="Create a group to organize items." />
                ) : (
                    <div className="space-y-2">
                        {filteredGroups.map(group => (
                            <div
                                key={group.id}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${selectedGroupId === group.id ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'}`}
                                onClick={() => onGroupSelect(group.id === selectedGroupId ? null : group.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <button
                                        className="p-1"
                                        onClick={(e) => { e.stopPropagation(); handleToggleGroupSelection(group.id); }}
                                    >
                                        {selectedGroupIds.has(group.id) ? <CheckSquare size={16} className="text-[var(--color-primary)]" /> : <Square size={16} className="text-[var(--color-text-muted)]" />}
                                    </button>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span className="font-medium text-sm text-[var(--color-text)]">{group.name}</span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">{getGroupCountLabel(group)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Items Section - Bottom Half */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Toggle: Ungrouped vs All */}
                <div className="flex-shrink-0 p-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/30">
                    <div className="flex rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-0.5">
                        <button
                            onClick={() => setItemsViewMode('ungrouped')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                itemsViewMode === 'ungrouped'
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            Ungrouped ({ungroupedDevices.length + ungroupedPeople.length})
                        </button>
                        <button
                            onClick={() => setItemsViewMode('all')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                itemsViewMode === 'all'
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            All ({devices.length + people.length})
                        </button>
                    </div>
                </div>

                {/* Filter Tabs: All / People / Devices */}
                <div className="flex-shrink-0 border-b border-[var(--color-border-subtle)]">
                    <div className="flex">
                        <button
                            onClick={() => setItemsFilterTab('all')}
                            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                                itemsFilterTab === 'all'
                                    ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setItemsFilterTab('people')}
                            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
                                itemsFilterTab === 'people'
                                    ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
                            }`}
                        >
                            <Users size={10} />
                            People
                        </button>
                        <button
                            onClick={() => setItemsFilterTab('devices')}
                            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
                                itemsFilterTab === 'devices'
                                    ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
                            }`}
                        >
                            <Monitor size={10} />
                            Devices
                        </button>
                    </div>
                </div>

                {/* Compact Tag Content */}
                <div className="flex-1 overflow-auto p-3">
                    {(() => {
                        // Determine which items to show based on viewMode
                        const showPeople = itemsViewMode === 'ungrouped' ? ungroupedPeople : people
                        const showDevices = itemsViewMode === 'ungrouped' ? ungroupedDevices : devices
                        const filteredPeople = itemsFilterTab === 'devices' ? [] : showPeople
                        const filteredDevices = itemsFilterTab === 'people' ? [] : showDevices
                        const hasItems = filteredPeople.length > 0 || filteredDevices.length > 0

                        if (!hasItems) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <CheckSquare size={24} className="text-[var(--color-success)] mb-2" />
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        {itemsViewMode === 'ungrouped' 
                                            ? (itemsFilterTab === 'all' ? 'All items are grouped!' : `All ${itemsFilterTab} are grouped!`)
                                            : 'No items found'
                                        }
                                    </p>
                                </div>
                            )
                        }

                        return (
                            <>
                                {/* People Tags */}
                                {filteredPeople.length > 0 && (
                                    <div className={itemsFilterTab === 'all' && filteredDevices.length > 0 ? 'mb-4' : ''}>
                                        {itemsFilterTab === 'all' && (
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Users size={11} className="text-[var(--color-text-muted)]" />
                                                <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">People</span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-1.5">
                                            {filteredPeople.map(person => {
                                                const isSelected = selectedUngroupedIds.has(person.id)
                                                const isGrouped = groupedPersonIds.has(person.id)
                                                const handleDragStart = (e: React.DragEvent) => {
                                                    e.dataTransfer.effectAllowed = 'move'
                                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'person', itemId: person.id, fromGroupId: null }))
                                                }
                                                const handleKeyDown = (e: React.KeyboardEvent) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        handleToggleUngrouped(person.id)
                                                    }
                                                }
                                                return (
                                                    <div
                                                        key={person.id}
                                                        draggable
                                                        onDragStart={handleDragStart}
                                                        onClick={() => handleToggleUngrouped(person.id)}
                                                        onKeyDown={handleKeyDown}
                                                        tabIndex={0}
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        aria-label={`${person.firstName} ${person.lastName}${isSelected ? ', selected' : ''}`}
                                                        className={`
                                                            inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs cursor-pointer transition-all
                                                            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                                                            ${isSelected 
                                                                ? 'bg-[var(--color-primary)] text-white' 
                                                                : isGrouped && itemsViewMode === 'all'
                                                                    ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                                                                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                                                            }
                                                        `}
                                                        title={`${person.firstName} ${person.lastName}${person.role ? ` • ${person.role}` : ''}${isGrouped ? ' • In group(s)' : ''}`}
                                                    >
                                                        {person.imageUrl ? (
                                                            <img src={person.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isSelected ? 'bg-white/20' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'}`}>
                                                                {person.firstName[0]}{person.lastName[0]}
                                                            </div>
                                                        )}
                                                        <span className="max-w-[80px] truncate">{person.firstName}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Device Tags */}
                                {filteredDevices.length > 0 && (
                                    <div>
                                        {itemsFilterTab === 'all' && (
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Monitor size={11} className="text-[var(--color-text-muted)]" />
                                                <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Devices</span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-1.5">
                                            {filteredDevices.map(device => {
                                                const isSelected = selectedUngroupedIds.has(device.id)
                                                const isGrouped = groupedDeviceIds.has(device.id)
                                                const handleDragStart = (e: React.DragEvent) => {
                                                    e.dataTransfer.effectAllowed = 'move'
                                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'device', itemId: device.id, fromGroupId: null }))
                                                }
                                                const handleKeyDown = (e: React.KeyboardEvent) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        handleToggleUngrouped(device.id)
                                                    }
                                                }
                                                return (
                                                    <div
                                                        key={device.id}
                                                        draggable
                                                        onDragStart={handleDragStart}
                                                        onClick={() => handleToggleUngrouped(device.id)}
                                                        onKeyDown={handleKeyDown}
                                                        tabIndex={0}
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        aria-label={`${device.deviceId}${isSelected ? ', selected' : ''}`}
                                                        className={`
                                                            inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs cursor-pointer transition-all
                                                            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                                                            ${isSelected 
                                                                ? 'bg-[var(--color-primary)] text-white' 
                                                                : isGrouped && itemsViewMode === 'all'
                                                                    ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                                                                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                                                            }
                                                        `}
                                                        title={`${device.deviceId} • ${device.type}${isGrouped ? ' • In group(s)' : ''}`}
                                                    >
                                                        <Monitor size={12} className={isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]'} />
                                                        <span className="max-w-[80px] truncate">{device.deviceId}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    })()}
                </div>
            </div>

            {/* Footer */}
            <div className="fusion-panel-footer">
                <div className="fusion-panel-footer-actions fusion-panel-footer-actions--stacked">
                    {selectedGroup && selectedUngroupedIds.size > 0 && (
                        <Button
                            onClick={handleAddSelectedToGroup}
                            variant="secondary"
                            className="w-full flex items-center justify-center gap-2 text-sm"
                        >
                            <UserPlus size={16} />
                            Add {selectedUngroupedIds.size} to &quot;{selectedGroup.name}&quot;
                        </Button>
                    )}
                    {selectedUngroupedIds.size > 0 && onCreateGroupWithItems ? (
                        <Button
                            onClick={() => {
                                const personIds = Array.from(selectedUngroupedIds).filter(id => people.some(p => p.id === id))
                                const deviceIds = Array.from(selectedUngroupedIds).filter(id => devices.some(d => d.id === id))
                                onCreateGroupWithItems(personIds, deviceIds)
                                setSelectedUngroupedIds(new Set())
                            }}
                            variant="primary"
                            className="w-full flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus size={16} /> Create Group with {selectedUngroupedIds.size}
                        </Button>
                    ) : (
                        <Button onClick={onCreateGroup} variant="primary" className="w-full flex items-center justify-center gap-2 text-sm">
                            <Plus size={16} /> Create Group
                        </Button>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Group"
                message={`Are you sure you want to delete ${selectedGroup?.name}?`}
                variant="danger"
                confirmLabel="Delete"
            />
            <ConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleConfirmBulkDelete}
                title="Delete Groups"
                message={`Delete ${selectedGroupIds.size} groups?`}
                variant="danger"
                confirmLabel="Delete"
            />
        </div>
    )
}
