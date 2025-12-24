/**
 * Add Site Modal Component
 * 
 * Modal for creating/editing sites (stores).
 * Consistent with other add/edit modals in the app.
 * 
 * AI Note: This modal follows the same pattern as ManualDeviceEntry and other modals.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Building2, MapPin, Phone, User, Calendar, Hash, Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
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
    imageUrl: '',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compress image function
  const compressImage = async (base64String: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        } else {
          resolve(base64String)
        }
      }
      img.onerror = () => resolve(base64String)
      img.src = base64String
    })
  }

  // Load site image when editing
  useEffect(() => {
    const loadSiteImage = async () => {
      if (!isOpen) return
      
      if (editingStore) {
        // Load client-side stored image
        try {
          const { getSiteImage } = await import('@/lib/libraryUtils')
          const image = await getSiteImage(editingStore.id)
          setCurrentImage(image)
        } catch (error) {
          console.error('Failed to load site image:', error)
          setCurrentImage(null)
        }
      } else {
        setCurrentImage(null)
      }
    }
    
    loadSiteImage()
    
    // Listen for site image updates
    const handleSiteImageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ siteId: string }>
      if (editingStore && customEvent.detail?.siteId === editingStore.id) {
        loadSiteImage()
      }
    }
    window.addEventListener('siteImageUpdated', handleSiteImageUpdate)
    return () => window.removeEventListener('siteImageUpdated', handleSiteImageUpdate)
  }, [editingStore, isOpen])

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
        imageUrl: '', // Don't use imageUrl from store - load from client storage
      })
      setPreviewImage(null) // Reset preview when editing
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
        imageUrl: '',
      })
      setPreviewImage(null)
      setCurrentImage(null)
    }
  }, [editingStore, isOpen])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image size must be less than 10MB')
      return
    }

    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64String = event.target?.result as string
        if (base64String) {
          // Compress the image
          const compressed = await compressImage(base64String)
          setPreviewImage(compressed)
          setIsUploading(false)
        }
      }
      reader.onerror = () => {
        alert('Failed to read image file')
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Failed to process image')
      setIsUploading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveImage = async () => {
    if (!previewImage) {
      console.warn('No preview image to save')
      return
    }
    
    console.log('💾 Starting image save process...')
    setIsUploading(true)
    try {
      const { setSiteImage, getSiteImage } = await import('@/lib/libraryUtils')
      
      if (editingStore) {
        // Save for existing store
        console.log(`Saving image for existing store: ${editingStore.id}`)
        await setSiteImage(editingStore.id, previewImage)
        // Reload the image to display
        const savedImage = await getSiteImage(editingStore.id)
        if (savedImage) {
          console.log('✅ Image saved and retrieved successfully')
          setCurrentImage(savedImage)
        } else {
          console.error('❌ Image saved but could not be retrieved')
          alert('Image saved but could not be loaded. Please refresh the page.')
        }
        setPreviewImage(null)
      } else {
        // For new sites, store in a temporary location
        const tempId = `temp-${Date.now()}`
        console.log(`Saving image for new site (temp ID: ${tempId})`)
        await setSiteImage(tempId, previewImage)
        // Store the temp ID so we can move it after site creation
        setFormData(prev => ({ ...prev, imageUrl: tempId }))
        // Show the preview as current image for now
        setCurrentImage(previewImage)
        setPreviewImage(null)
        console.log('✅ Image saved to temporary location')
      }
    } catch (error) {
      console.error('❌ Failed to save site image:', error)
      alert(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (!confirm('Remove image?')) return
    
    if (editingStore) {
      try {
        const { removeSiteImage } = await import('@/lib/libraryUtils')
        await removeSiteImage(editingStore.id)
        setCurrentImage(null)
      } catch (error) {
        console.error('Failed to remove site image:', error)
        alert('Failed to remove image.')
      }
    }
    
    setPreviewImage(null)
    setCurrentImage(null)
  }

  const displayImage = previewImage || currentImage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Site name is required')
      return
    }
    
    if (!formData.storeNumber.trim()) {
      alert('Store number is required')
      return
    }

    // Site images are stored client-side (localStorage/IndexedDB), NOT in database
    // So we don't pass imageUrl to the database
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
      // Don't save imageUrl to database - it's stored client-side
    }
    
    // Save image client-side if we have one (for new sites)
    if (previewImage && !editingStore) {
      try {
        // Image will be saved after site creation in the callback
        // Store preview temporarily
      } catch (error) {
        console.error('Failed to save site image:', error)
        // Don't block form submission if image save fails
      }
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

          {/* Store Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Store Image
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              {displayImage && (
                <div className="relative aspect-video w-full rounded-lg bg-[var(--color-surface-subtle)] overflow-hidden border border-[var(--color-border-subtle)]">
                  <img
                    src={displayImage}
                    alt="Store preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Image Controls - Lower Left */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {previewImage ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveImage}
                          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] transition-colors flex items-center gap-1.5 shadow-lg font-medium"
                        >
                          Save Image
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelPreview}
                          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shadow-lg"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          <Upload size={14} />
                          {isUploading ? 'Uploading...' : 'Replace Image'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-danger)]/20 border border-[var(--color-border-subtle)] hover:border-[var(--color-danger)]/30 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors shadow-lg"
                          title="Remove image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Upload Button (when no image) */}
              {!displayImage && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-subtle)] border-2 border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={18} />
                    {isUploading ? 'Uploading...' : 'Upload Store Image'}
                  </button>
                </div>
              )}
              
              {previewImage && (
                <p className="text-xs text-[var(--color-text-muted)] text-center">
                  Preview - Click Save to apply
                </p>
              )}
            </div>
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

