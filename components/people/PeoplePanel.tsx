'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { User, Edit2, Trash2, Save, X, Mail, Shield, Upload, MapPin, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { ConfirmationModal } from '@/components/shared/ConfirmationModal'
import { useToast } from '@/lib/ToastContext'
import { Person } from '@/lib/stores/personStore'
import { SITE_ROLE_TYPES } from '@/lib/constants/roleTypes'
import { trpc } from '@/lib/trpc/client'
import { useGroups } from '@/lib/hooks/useGroups'

interface PeoplePanelProps {
    people: Person[]
    selectedPersonId: string | null
    onPersonSelect: (personId: string | null) => void
    onCreatePerson: () => void
    onDeletePerson: (personId: string) => void
    onDeletePeople: (personIds: string[]) => void
    onEditPerson: (personId: string, updates: Partial<Person>) => void
}

export function PeoplePanel({
    people,
    selectedPersonId,
    onPersonSelect,
    onCreatePerson,
    onDeletePerson,
    onDeletePeople,
    onEditPerson
}: PeoplePanelProps) {
    const { addToast } = useToast()

    const [isEditing, setIsEditing] = useState(false)
    const [editFormData, setEditFormData] = useState<{ firstName: string; lastName: string; email: string; role: string; customRole: string }>({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        customRole: ''
    })
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    const savePersonImageMutation = trpc.person.saveImage.useMutation()
    const { groups } = useGroups()

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({})

    const selectedPerson = useMemo(() => people.find(p => p.id === selectedPersonId), [people, selectedPersonId])

    // Find groups the selected person is in
    const personGroups = useMemo(() => {
        if (!selectedPersonId || !groups) return []
        const allGroups = groups.filter(g => (g.personIds ?? []).includes(selectedPersonId))
        
        // Sort: role groups first, then others
        return allGroups.sort((a, b) => {
            const aIsRole = SITE_ROLE_TYPES.some(r => r.value === a.name) || a.name === selectedPerson?.role
            const bIsRole = SITE_ROLE_TYPES.some(r => r.value === b.name) || b.name === selectedPerson?.role
            if (aIsRole && !bIsRole) return -1
            if (!aIsRole && bIsRole) return 1
            return 0
        })
    }, [selectedPersonId, groups, selectedPerson?.role])

    // Check if a group is a role group
    const isRoleGroup = (groupName: string) => {
        return SITE_ROLE_TYPES.some(r => r.value === groupName) || groupName === selectedPerson?.role
    }

    useEffect(() => {
        if (selectedPerson) {
            const role = selectedPerson.role || ''
            const isCustomRole = role && !SITE_ROLE_TYPES.some(r => r.value === role)
            setEditFormData({
                firstName: selectedPerson.firstName,
                lastName: selectedPerson.lastName,
                email: selectedPerson.email || '',
                role: isCustomRole ? 'Other' : role,
                customRole: isCustomRole ? role : ''
            })
            setPreviewImage(null)
            setIsEditing(false)
            setNameErrors({})
        }
    }, [selectedPerson])

    const handleStartEdit = () => setIsEditing(true)

    const handleCancelEdit = () => {
        setIsEditing(false)
        setPreviewImage(null)
        setNameErrors({})
        if (selectedPerson) {
            const role = selectedPerson.role || ''
            const isCustomRole = role && !SITE_ROLE_TYPES.some(r => r.value === role)
            setEditFormData({
                firstName: selectedPerson.firstName,
                lastName: selectedPerson.lastName,
                email: selectedPerson.email || '',
                role: isCustomRole ? 'Other' : role,
                customRole: isCustomRole ? role : ''
            })
        }
    }
    
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            addToast({ type: 'error', title: 'Invalid File', message: 'Please select a valid image file' })
            return
        }

        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            addToast({ type: 'error', title: 'File Too Large', message: 'Image size must be less than 10MB' })
            return
        }

        setIsUploadingImage(true)

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const base64String = event.target?.result as string
                if (base64String) {
                    const { compressImage } = await import('@/lib/libraryUtils')
                    const compressed = await compressImage(base64String, 400, 0.8, 300000)
                    setPreviewImage(compressed)
                    setIsUploadingImage(false)
                }
            }
            reader.onerror = () => {
                addToast({ type: 'error', title: 'Read Error', message: 'Failed to read image file' })
                setIsUploadingImage(false)
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error('Error processing image:', error)
            addToast({ type: 'error', title: 'Processing Error', message: 'Failed to process image' })
            setIsUploadingImage(false)
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }
    
    const handleSaveImage = async () => {
        if (!previewImage || !selectedPerson) {
            addToast({ type: 'warning', title: 'No Image', message: 'Please select an image first' })
            return
        }

        setIsUploadingImage(true)
        try {
            const { compressImage } = await import('@/lib/libraryUtils')
            const compressedImage = await compressImage(previewImage, 400, 0.8, 300000)
            
            const updatedPerson = await savePersonImageMutation.mutateAsync({
                personId: selectedPerson.id,
                imageData: compressedImage,
                mimeType: compressedImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
            })
            
            onEditPerson(selectedPerson.id, {
                imageUrl: updatedPerson.imageUrl || undefined
            })
            
            addToast({ type: 'success', title: 'Image Saved', message: 'Profile image updated' })
            setPreviewImage(null)
        } catch (error: any) {
            console.error('Failed to save person image:', error)
            const errorMessage = error?.message || 'Failed to save image'
            addToast({ type: 'error', title: 'Save Failed', message: errorMessage })
        } finally {
            setIsUploadingImage(false)
        }
    }

    const handleSaveEdit = async () => {
        if (!selectedPerson) return
        const errors: { firstName?: string; lastName?: string } = {}
        if (!editFormData.firstName.trim()) errors.firstName = 'First name is required'
        if (!editFormData.lastName.trim()) errors.lastName = 'Last name is required'
        if (Object.keys(errors).length > 0) {
            setNameErrors(errors)
            return
        }
        setNameErrors({})

        const finalRole = editFormData.role === 'Other' ? editFormData.customRole : editFormData.role

        onEditPerson(selectedPerson.id, {
            firstName: editFormData.firstName,
            lastName: editFormData.lastName,
            email: editFormData.email,
            role: finalRole || undefined
        })
        
        if (previewImage) {
            await handleSaveImage()
        }
        
        setIsEditing(false)
    }

    const handleConfirmDelete = () => {
        if (selectedPerson) {
            onDeletePerson(selectedPerson.id)
            setIsDeleteModalOpen(false)
        }
    }

    // Empty state when no person is selected
    if (!selectedPerson) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Profile</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <PanelEmptyState 
                        icon={User} 
                        title="No Person Selected" 
                        description="Select a person from the list to view their profile"
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="fusion-panel-header">
                <h3 className="fusion-panel-header-title text-lg">Profile</h3>
                {!isEditing && (
                    <div className="fusion-panel-header-actions">
                        <button type="button" onClick={handleStartEdit} className="fusion-panel-header-action" title="Edit profile">
                            <Edit2 size={16} />
                        </button>
                        <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="fusion-panel-header-action text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]" title="Delete person">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {isEditing ? (
                    /* Edit Mode */
                    <div className="p-4 space-y-4">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] flex items-center justify-center">
                                {previewImage || selectedPerson.imageUrl ? (
                                    <img 
                                        src={previewImage || selectedPerson.imageUrl || undefined} 
                                        alt={`${editFormData.firstName} ${editFormData.lastName}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User size={40} className="text-[var(--color-text-muted)]" />
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                variant="secondary"
                                disabled={isUploadingImage}
                            >
                                <Upload size={14} />
                                {isUploadingImage ? 'Processing...' : 'Change Photo'}
                            </Button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    value={editFormData.firstName}
                                    onChange={e => {
                                        setEditFormData({ ...editFormData, firstName: e.target.value })
                                        if (nameErrors.firstName) setNameErrors((prev) => ({ ...prev, firstName: undefined }))
                                    }}
                                    placeholder="First Name"
                                    fullWidth
                                    errorMessage={nameErrors.firstName}
                                />
                                <Input
                                    value={editFormData.lastName}
                                    onChange={e => {
                                        setEditFormData({ ...editFormData, lastName: e.target.value })
                                        if (nameErrors.lastName) setNameErrors((prev) => ({ ...prev, lastName: undefined }))
                                    }}
                                    placeholder="Last Name"
                                    fullWidth
                                    errorMessage={nameErrors.lastName}
                                />
                            </div>
                            <Input
                                value={editFormData.email}
                                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                placeholder="Email"
                                type="email"
                                fullWidth
                                icon={<Mail size={16} className="text-[var(--color-text-muted)]" />}
                            />
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--color-text)]">Role</label>
                                <Select
                                    value={editFormData.role}
                                    onChange={(e) => {
                                        const newRole = e.target.value
                                        setEditFormData({ 
                                            ...editFormData, 
                                            role: newRole,
                                            customRole: newRole !== 'Other' ? '' : editFormData.customRole
                                        })
                                    }}
                                    options={SITE_ROLE_TYPES as SelectOption[]}
                                    placeholder="Select role..."
                                    fullWidth
                                />
                                {editFormData.role === 'Other' && (
                                    <Input
                                        value={editFormData.customRole}
                                        onChange={e => setEditFormData({ ...editFormData, customRole: e.target.value })}
                                        placeholder="Enter custom role..."
                                        fullWidth
                                    />
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleCancelEdit} variant="secondary" className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit} variant="primary" className="flex-1">
                                <Save size={16} />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* View Mode - simple header (no repeated token) */
                    <div className="p-4">
                        <div className="flex flex-col items-center text-center pb-6 border-b border-[var(--color-border-subtle)]">
                            <div className="relative w-24 h-24 rounded-full bg-[var(--color-surface-subtle)] border-2 border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden mb-4">
                                {selectedPerson.imageUrl ? (
                                    <img
                                        src={selectedPerson.imageUrl}
                                        alt={`${selectedPerson.firstName} ${selectedPerson.lastName}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User size={40} className="text-[var(--color-text-muted)]" />
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-[var(--color-text)]">
                                {selectedPerson.firstName} {selectedPerson.lastName}
                            </h2>
                            {selectedPerson.role && (
                                <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--color-text-muted)]">
                                    <Shield size={14} />
                                    <span>{selectedPerson.role}</span>
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="py-4 space-y-4">
                            {selectedPerson.email && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                                        <Mail size={16} className="text-[var(--color-text-muted)]" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Email</div>
                                        <div className="text-sm text-[var(--color-text)]">{selectedPerson.email}</div>
                                    </div>
                                </div>
                            )}

                            {(selectedPerson.x !== undefined && selectedPerson.y !== undefined && selectedPerson.x !== null && selectedPerson.y !== null) && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                                        <MapPin size={16} className="text-[var(--color-text-muted)]" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Location</div>
                                        <div className="text-sm text-[var(--color-text)]">Placed on map</div>
                                    </div>
                                </div>
                            )}

                            {selectedPerson.createdAt != null && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                                        <Calendar size={16} className="text-[var(--color-text-muted)]" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Added</div>
                                        <div className="text-sm text-[var(--color-text)]">
                                            {(selectedPerson.createdAt instanceof Date
                                                ? selectedPerson.createdAt
                                                : new Date(selectedPerson.createdAt as string)
                                            ).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Groups Section */}
                        <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Users size={16} className="text-[var(--color-text-muted)]" />
                                <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Groups</span>
                            </div>
                            {personGroups.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {personGroups.map(group => {
                                        const isRole = isRoleGroup(group.name)
                                        return (
                                            <div
                                                key={group.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${group.color}20`,
                                                    color: group.color,
                                                    border: `1px solid ${group.color}40`
                                                }}
                                                title={isRole ? 'Auto-generated role group' : undefined}
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                {group.name}
                                                {isRole && (
                                                    <span className="ml-1 text-[10px] opacity-70" title="Auto-generated from role">
                                                        ⚡
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--color-text-soft)] italic">Not in any groups</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Person"
                message={`Are you sure you want to delete ${selectedPerson?.firstName} ${selectedPerson?.lastName}? This action cannot be undone.`}
                variant="danger"
                confirmLabel="Delete"
            />
        </div>
    )
}
