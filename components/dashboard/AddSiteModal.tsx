/**
 * Add Site Modal Component
 * 
 * Modal for creating/editing sites (stores).
 * Consistent with other add/edit modals in the app.
 * 
 * AI Note: This modal follows the same pattern as ManualDeviceEntry and other modals.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Building2, MapPin, Phone, User, Calendar, Hash } from 'lucide-react'
import { Store } from '@/lib/StoreContext'

interface AddSiteModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (siteData: Omit<Store, 'id'>) => void
  onEdit?: (storeId: string, updates: Partial<Omit<Store, 'id'>>) => void
  editingStore?: Store | null
}

export function AddSiteModal({ isOpen, onClose, onAdd, onEdit, editingStore }: AddSiteModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    storeNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    manager: '',
    squareFootage: '',
  })

  // Populate form when editing
  useEffect(() => {
    if (editingStore) {
      setFormData({
        name: editingStore.name || '',
        storeNumber: editingStore.storeNumber || '',
        address: editingStore.address || '',
        city: editingStore.city || '',
        state: editingStore.state || '',
        zipCode: editingStore.zipCode || '',
        phone: editingStore.phone || '',
        manager: editingStore.manager || '',
        squareFootage: editingStore.squareFootage?.toString() || '',
      })
    } else {
      // Reset form for new site
      setFormData({
        name: '',
        storeNumber: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        manager: '',
        squareFootage: '',
      })
    }
  }, [editingStore, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Site name is required')
      return
    }
    
    if (!formData.storeNumber.trim()) {
      alert('Store number is required')
      return
    }

    const siteData: Omit<Store, 'id'> = {
      name: formData.name.trim(),
      storeNumber: formData.storeNumber.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      zipCode: formData.zipCode.trim(),
      phone: formData.phone.trim() || undefined,
      manager: formData.manager.trim() || undefined,
      squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : undefined,
      openedDate: new Date(),
    }

    if (editingStore && onEdit) {
      onEdit(editingStore.id, siteData)
    } else {
      onAdd(siteData)
    }
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
              <Building2 size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {editingStore ? 'Edit Site' : 'Add New Site'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {editingStore ? 'Update site information' : 'Enter site details to add a new location'}
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
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Site Name *
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Store #1234 - Main St"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Store Number */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Store Number *
            </label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={formData.storeNumber}
                onChange={(e) => setFormData({ ...formData, storeNumber: e.target.value })}
                placeholder="e.g., 1234"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Street Address
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 1250 Main Street"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                maxLength={2}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="ZIP"
                maxLength={10}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., (555) 123-4567"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Store Manager
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                placeholder="e.g., John Smith"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Square Footage
            </label>
            <input
              type="number"
              value={formData.squareFootage}
              onChange={(e) => setFormData({ ...formData, squareFootage: e.target.value })}
              placeholder="e.g., 180000"
              min="0"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors flex items-center gap-2"
          >
            <Building2 size={16} />
            {editingStore ? 'Save Changes' : 'Add Site'}
          </button>
        </div>
      </div>
    </div>
  )
}

