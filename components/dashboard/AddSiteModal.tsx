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
import { skipToken } from '@tanstack/react-query'
import { X, Building2, MapPin, Phone, User, Calendar, Hash, Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { Site } from '@/lib/SiteContext'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/lib/ToastContext'

interface AddSiteModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (siteData: Omit<Site, 'id'>) => Promise<void> | void
  onEdit?: (siteId: string, updates: Partial<Omit<Site, 'id'>>) => Promise<void> | void
  editingSite?: Site | null
}

export function AddSiteModal({ isOpen, onClose, onAdd, onEdit, editingSite }: AddSiteModalProps) {
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    siteNumber: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // tRPC hooks for image operations
  const utils = trpc.useUtils()

  // Validate siteId before querying - use skipToken to completely skip query if invalid
  // Accept both 'site-*' and 'store-*' prefixes for backward compatibility with database
  const isValidSiteId = !!(editingSite?.id && typeof editingSite.id === 'string' && editingSite.id.length > 0 && isOpen)

  // Ensure input is always a proper object, never undefined
  const queryInput = isValidSiteId && editingSite?.id ? { siteId: String(editingSite.id).trim() } : skipToken
  const { data: dbImage, refetch: refetchSiteImage } = trpc.image.getSiteImage.useQuery(
    queryInput,
    {
      // Double protection: enabled flag prevents query execution
      enabled: isValidSiteId && !!editingSite?.id && editingSite.id.trim().length > 0 && isOpen,
      // Skip if siteId is invalid to avoid validation errors
      retry: false,
      // Refetch when modal opens to get fresh data
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      // Don't use stale data
      staleTime: 0,
    }
  )
  const saveSiteImageMutation = trpc.image.saveSiteImage.useMutation({
    onSuccess: async (result) => {
      console.log('✅ [CLIENT] saveSiteImage mutation succeeded:', result)
      console.log('   Result imageUrl length:', result?.imageUrl?.length || 'N/A')

      // Wait a bit for the database write to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Invalidate and refetch the image query
      if (editingSite?.id) {
        console.log('🔄 Invalidating query cache for site:', editingSite.id)
        // Invalidate all queries for this site
        await utils.image.getSiteImage.invalidate({ siteId: editingSite.id })
        // Also refetch immediately
        refetchSiteImage()
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('siteImageUpdated', { detail: { siteId: editingSite.id } }))
        window.dispatchEvent(new Event('siteImageUpdated')) // General event too
        console.log('✅ Cache invalidated and events dispatched')
      }
    },
    onError: (error) => {
      console.error('❌ [CLIENT] saveSiteImage mutation failed:', error)
      console.error('   Error details:', {
        message: error.message,
        data: error.data,
        shape: error.shape,
      })
    },
  })
  const ensureSiteMutation = trpc.site.ensureExists.useMutation()

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

  // Load site image when editing (database first, then client storage fallback)
  useEffect(() => {
    const loadSiteImage = async () => {
      if (!isOpen) return

      if (editingSite) {
        try {
          // First try database (from tRPC query)
          if (dbImage) {
            console.log(`✅ Loaded image from database for site ${editingSite.id}`)
            setCurrentImage(dbImage)
            return
          }

          // Fallback to client storage
          const { getSiteImage } = await import('@/lib/libraryUtils')
          const image = await getSiteImage(editingSite.id)
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
      if (editingSite && customEvent.detail?.siteId === editingSite.id) {
        // Only refetch if we have a valid, non-temporary site ID
        const currentSiteId = editingSite.id
        if (currentSiteId) {
          // Temporary IDs are: "site-" followed only by digits (timestamp), or "temp-"
          const isTempId = /^site-\d+$/.test(currentSiteId) || currentSiteId.startsWith('temp-')
          // Also check that the query wasn't configured with skipToken by verifying we have a real database ID format
          const isRealDbId = currentSiteId.length > 15 && !isTempId // Database CUIDs are longer

          if (!isTempId && isRealDbId) {
            console.log(`✅ Refetching image for valid site ID: ${currentSiteId}`)
            refetchSiteImage()
          } else {
            console.log(`⏭️ Skipping refetch for temporary site ID: ${currentSiteId}`)
          }
        }
        loadSiteImage()
      }
    }
    window.addEventListener('siteImageUpdated', handleSiteImageUpdate)
    return () => window.removeEventListener('siteImageUpdated', handleSiteImageUpdate)
  }, [editingSite, isOpen, dbImage, refetchSiteImage])

  // Populate form when editing
  useEffect(() => {
    if (editingSite) {
      setFormData({
        name: editingSite.name || '',
        siteNumber: editingSite.siteNumber || '',
        address: editingSite.address || '',
        city: editingSite.city || '',
        state: editingSite.state || '',
        zipCode: editingSite.zipCode || '',
        phone: editingSite.phone || '',
        manager: editingSite.manager || '',
        squareFootage: editingSite.squareFootage?.toString() || '',
        imageUrl: '', // Don't use imageUrl from store - load from client storage
      })
      setPreviewImage(null) // Reset preview when editing
    } else {
      // Reset form for new site
      setFormData({
        name: '',
        siteNumber: '',
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
  }, [editingSite, isOpen])

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
          // Compress the image using the utility function
          const { compressImage } = await import('@/lib/libraryUtils')
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
    console.log('🖱️ handleSaveImage called!')
    console.log('   previewImage:', !!previewImage, previewImage ? `${previewImage.length} chars` : 'null')
    console.log('   editingSite:', editingSite ? editingSite.id : 'null')

    if (!previewImage) {
      console.warn('⚠️ No preview image to save')
      alert('Please select an image first')
      return
    }

    if (!editingSite?.id) {
      console.log('ℹ️ No site ID available, will save to temporary storage')
      // We'll handle this in the else block below
    }

    console.log('💾 Starting image save process for site:', editingSite?.id || 'new-site')
    setIsUploading(true)
    try {
      const { setSiteImage, getSiteImage } = await import('@/lib/libraryUtils')

      if (editingSite && editingSite.id) {
        // Save for existing site - ensure site exists in database first
        console.log(`Saving image for existing site: ${editingSite.id}`)

        // CRITICAL: Ensure site exists in database before saving image
        try {
          await ensureSiteMutation.mutateAsync({
            id: editingSite.id,
            name: editingSite.name,
            storeNumber: editingSite.siteNumber || '',
            address: editingSite.address || '',
            city: editingSite.city || '',
            state: editingSite.state || '',
            zipCode: editingSite.zipCode || '',
            phone: editingSite.phone || '',
            manager: editingSite.manager || '',
            squareFootage: editingSite.squareFootage || 0,
            openedDate: editingSite.openedDate ? new Date(editingSite.openedDate) : new Date(),
          })
          console.log('✅ Site ensured in database')
        } catch (ensureError: any) {
          console.warn('⚠️ Error ensuring site exists:', ensureError.message)
          // Continue anyway - client storage will work
        }

        // Use the mutation hook directly (same pattern as components, but using React hooks)
        try {
          console.log('💾 Attempting to save to database via mutation hook...')
          console.log('   Preview image size:', previewImage.length, 'chars')

          // Compress the image first (same as components do)
          const { compressImage } = await import('@/lib/libraryUtils')
          const compressedImage = await compressImage(previewImage, 600, 0.7, 500000)
          console.log(`   Compressed size: ${compressedImage.length} chars (${(compressedImage.length / 1024).toFixed(1)} KB)`)

          // Use the mutation hook directly - this is the React way (components use direct fetch, but mutation hook is better)
          const saveResult = await saveSiteImageMutation.mutateAsync({
            siteId: editingSite.id,
            imageData: compressedImage,
            mimeType: compressedImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          })
          console.log('✅ Image saved via mutation hook, result:', saveResult)
          console.log('   Saved imageUrl:', saveResult?.imageUrl ? `${saveResult.imageUrl.substring(0, 50)}...` : 'N/A')

          // Wait for cache invalidation to complete (handled in onSuccess)
          await new Promise(resolve => setTimeout(resolve, 500))

          // Also save to client storage as backup (like components do)
          const { setSiteImage } = await import('@/lib/libraryUtils')
          await setSiteImage(editingSite.id, compressedImage) // Without trpcClient - will use direct fetch as fallback
          console.log('✅ Image also saved to client storage as backup')
        } catch (saveError: any) {
          console.error('❌ Failed to save image:', saveError)
          alert(`Failed to save image: ${saveError.message || 'Unknown error'}`)
          setIsUploading(false)
          return
        }

        // Wait a bit for the save to complete and event to dispatch
        console.log('⏳ Waiting for save to complete...')
        await new Promise(resolve => setTimeout(resolve, 500))

        // Reload the image to display (database query will refetch automatically)
        console.log('🔄 Refetching image from database...')
        refetchSiteImage()
        await new Promise(resolve => setTimeout(resolve, 300))

        const savedImage = dbImage || await getSiteImage(editingSite.id)
        if (savedImage) {
          console.log('✅ Image saved and retrieved successfully')
          setCurrentImage(savedImage)
          setPreviewImage(null)
        } else {
          console.warn('⚠️ Image saved but could not be retrieved immediately, will reload on next render')
          setPreviewImage(null)
          // Trigger a reload by dispatching event again
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('siteImageUpdated', { detail: { siteId: editingSite.id } }))
            window.dispatchEvent(new Event('siteImageUpdated')) // General event too
          }, 500)
        }
      } else {
        // For new sites, store in a temporary location (client storage only for now)
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

    if (editingSite) {
      try {
        const { removeSiteImage } = await import('@/lib/libraryUtils')
        await removeSiteImage(editingSite.id)
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

    // Check if there's an unsaved preview image (only for existing sites)
    if (previewImage && editingSite?.id) {
      const shouldSaveImage = confirm(
        '⚠️ You have an unsaved image preview!\n\n' +
        'Would you like to save the image now before saving the site changes?\n\n' +
        'Click OK to save the image first, or Cancel to proceed without saving the image.'
      )

      if (shouldSaveImage) {
        console.log('💾 User chose to save image before submitting form')
        try {
          // Save the image first
          await handleSaveImage()
          // Wait a moment for the image save to complete
          await new Promise(resolve => setTimeout(resolve, 500))
          console.log('✅ Image saved, proceeding with form submission')
        } catch (error) {
          console.error('❌ Failed to save image:', error)
          const proceed = confirm(
            'Failed to save the image. Would you like to proceed with saving the site anyway?'
          )
          if (!proceed) {
            return // User cancelled, don't submit the form
          }
        }
      } else {
        console.log('ℹ️ User chose to proceed without saving the image')
        // Clear the preview so it doesn't get saved accidentally
        setPreviewImage(null)
      }
    }

    if (!formData.name.trim()) {
      alert('Site name is required')
      return
    }

    if (!formData.siteNumber.trim()) {
      alert('Site number is required')
      return
    }

    // Site images are stored client-side (localStorage/IndexedDB), NOT in database
    // So we don't pass imageUrl to the database
    const siteData: Omit<Site, 'id'> = {
      name: formData.name.trim(),
      siteNumber: formData.siteNumber.trim(),
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
    if (previewImage && !editingSite) {
      try {
        // Image will be saved after site creation in the callback
        // Store preview temporarily
      } catch (error) {
        console.error('Failed to save site image:', error)
        // Don't block form submission if image save fails
      }
    }

    setIsSubmitting(true)

    try {
      if (editingSite && onEdit) {
        await onEdit(editingSite.id, siteData)
        addToast({
          type: 'success',
          title: 'Site Updated',
          message: `${siteData.name} has been successfully updated.`
        })
      } else {
        await onAdd(siteData)
        addToast({
          type: 'success',
          title: 'Site Created',
          message: `${siteData.name} has been successfully added.`
        })
      }
      onClose()
    } catch (error) {
      console.error('Failed to submit site:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save site. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
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
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {editingSite ? 'Update site information' : 'Enter site details to add a new location'}
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
        <form id="add-site-form" onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Site Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Site #1234 - Main St"
              fullWidth
              icon={<Building2 size={16} className="text-[var(--color-text-muted)]" />}
              required
            />
          </div>

          {/* Site Number */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Site Number *
            </label>
            <Input
              value={formData.siteNumber}
              onChange={(e) => setFormData({ ...formData, siteNumber: e.target.value })}
              placeholder="e.g., 1234"
              fullWidth
              icon={<Hash size={16} className="text-[var(--color-text-muted)]" />}
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Street Address
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., 1250 Main Street"
              fullWidth
              icon={<MapPin size={16} className="text-[var(--color-text-muted)]" />}
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                State
              </label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                maxLength={2}
                fullWidth
                className="uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                ZIP Code
              </label>
              <Input
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="ZIP"
                maxLength={10}
                fullWidth
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g., (555) 123-4567"
              fullWidth
              icon={<Phone size={16} className="text-[var(--color-text-muted)]" />}
            />
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Site Manager
            </label>
            <Input
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              placeholder="e.g., John Smith"
              fullWidth
              icon={<User size={16} className="text-[var(--color-text-muted)]" />}
            />
          </div>

          {/* Square Footage */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Square Footage
            </label>
            <Input
              type="number"
              value={formData.squareFootage}
              onChange={(e) => setFormData({ ...formData, squareFootage: e.target.value })}
              placeholder="e.g., 180000"
              min="0"
              fullWidth
            />
          </div>

          {/* Site Image Upload - Only available when editing existing site */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Site Image
            </label>
            {editingSite ? (
              <div className="space-y-3">
                {/* Image Preview */}
                {displayImage && (
                  <div className="relative aspect-video w-full rounded-lg bg-[var(--color-surface-subtle)] overflow-hidden border border-[var(--color-border-subtle)]">
                    <img
                      src={displayImage}
                      alt="Site preview"
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
                          <Button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('🖱️ Save Image button clicked! (overlay button)')
                              try {
                                await handleSaveImage()
                              } catch (error) {
                                console.error('❌ Error in handleSaveImage:', error)
                              }
                            }}
                            disabled={isUploading}
                            variant="primary"
                            className="h-8 text-xs px-3 py-1.5 shadow-lg"
                          >
                            {isUploading ? 'Saving...' : '💾 Save Image'}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleCancelPreview}
                            disabled={isUploading}
                            variant="secondary"
                            className="h-8 text-xs px-3 py-1.5 bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] shadow-lg"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            variant="secondary"
                            className="h-8 text-xs px-3 py-1.5 bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] shadow-lg gap-1.5"
                          >
                            <Upload size={14} />
                            {isUploading ? 'Uploading...' : 'Replace Image'}
                          </Button>
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
                      {isUploading ? 'Uploading...' : 'Upload Site Image'}
                    </button>
                  </div>
                )}

                {previewImage && (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--color-text-muted)] text-center">
                      Preview - Click "Save Image" button below to save
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('🖱️ Save Image button clicked! (below preview)')
                          try {
                            await handleSaveImage()
                          } catch (error) {
                            console.error('❌ Error in handleSaveImage:', error)
                          }
                        }}
                        disabled={isUploading}
                        variant="primary"
                      >
                        {isUploading ? 'Saving...' : '💾 Save Image'}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelPreview}
                        disabled={isUploading}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* New Site - Show message instead of upload */
              <div className="px-4 py-3 rounded-lg bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border-subtle)] text-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Save the site first, then edit it to add an image.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-site-form"
            variant="primary"
            className="flex items-center gap-2"
            disabled={isUploading || isSubmitting}
          >
            <Building2 size={16} className={isSubmitting ? 'animate-pulse' : ''} />
            {isSubmitting ? 'Saving...' : (editingSite ? 'Save Changes' : 'Add Site')}
          </Button>
        </div>
      </div>
    </div>
  )
}

