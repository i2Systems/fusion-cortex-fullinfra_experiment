/**
 * Library Object Modal Component
 * 
 * Full-screen modal displaying detailed information about a library object
 * (device type or component type), including images and specifications.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Image as ImageIcon, Info, Package, Zap, Settings, Upload, Trash2 } from 'lucide-react'
import { LibraryObject } from '@/app/(main)/library/page'
import { setCustomImage, removeCustomImage, getDeviceImage, getComponentImage } from '@/lib/libraryUtils'

interface LibraryObjectModalProps {
  object: LibraryObject
  onClose: () => void
}

export function LibraryObjectModal({ object, onClose }: LibraryObjectModalProps) {
  const isComponent = 'quantity' in object
  const [currentImage, setCurrentImage] = useState<string>(object.defaultImage || '')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Track mount state to avoid hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load custom image if it exists (only after mount to avoid hydration issues)
  useEffect(() => {
    if (!isMounted) return
    
    const loadImage = () => {
      // Use the same logic as LibraryCard to get current image
      if (isComponent) {
        const image = getComponentImage(object.name) || object.defaultImage || null
        if (image) setCurrentImage(image)
      } else {
        // For devices, we need to map the object ID to device type
        const deviceTypeMap: Record<string, string> = {
          'fixture-16ft-power-entry': 'fixture-16ft-power-entry',
          'fixture-12ft-power-entry': 'fixture-12ft-power-entry',
          'fixture-8ft-power-entry': 'fixture-8ft-power-entry',
          'fixture-16ft-follower': 'fixture-16ft-follower',
          'fixture-12ft-follower': 'fixture-12ft-follower',
          'fixture-8ft-follower': 'fixture-8ft-follower',
          'motion-sensor': 'motion',
          'light-sensor': 'light-sensor',
        }
        const deviceType = deviceTypeMap[object.id]
        if (deviceType) {
          const image = getDeviceImage(deviceType as any) || object.defaultImage || null
          if (image) setCurrentImage(image)
        } else if (object.defaultImage) {
          setCurrentImage(object.defaultImage)
        }
      }
    }
    loadImage()
    
    // Listen for image updates - reload on any image update
    const handleImageUpdate = () => {
      loadImage()
    }
    window.addEventListener('libraryImageUpdated', handleImageUpdate)
    return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
  }, [object, isComponent, isMounted])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image size must be less than 10MB')
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64 for preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        if (base64String) {
          setPreviewImage(base64String)
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveImage = async () => {
    if (previewImage) {
      try {
        await setCustomImage(object.id, previewImage)
        setCurrentImage(previewImage)
        setPreviewImage(null)
        // Trigger update event so other components refresh - dispatch globally
        window.dispatchEvent(new CustomEvent('libraryImageUpdated', { detail: { libraryId: object.id } }))
        // Also dispatch a general event without detail to force all components to refresh
        window.dispatchEvent(new Event('libraryImageUpdated'))
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to save image. The image may be too large. Please try a smaller image.')
      }
    }
  }

  const handleCancelPreview = () => {
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveCustomImage = () => {
    if (confirm('Remove custom image and restore default?')) {
      removeCustomImage(object.id)
      setCurrentImage(object.defaultImage || '')
    }
  }

  const hasCustomImage = () => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(`library_image_${object.id}`) !== null
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] shadow-[var(--glow-modal)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-soft)]">
              {isComponent ? (
                <Package size={24} className="text-[var(--color-primary)]" />
              ) : (
                <Zap size={24} className="text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {object.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-1 rounded token-type-fixture">
                  {object.category}
                </span>
                {isComponent && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Quantity: {object.quantity} per fixture
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
          >
            <X size={20} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-lg bg-[var(--color-surface-subtle)] overflow-hidden relative">
                {(previewImage || currentImage) ? (
                  <img
                    src={previewImage || currentImage}
                    alt={object.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={48} className="text-[var(--color-text-muted)]" />
                  </div>
                )}
                {/* Image Upload Button - Lower Left (absolute positioned) */}
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
                        onClick={handleSaveImage}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] transition-colors flex items-center gap-1.5 shadow-lg font-medium"
                        title="Save image"
                      >
                        Save Image
                      </button>
                      <button
                        onClick={handleCancelPreview}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shadow-lg"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        title="Replace image"
                      >
                        <Upload size={14} />
                        {isUploading ? 'Uploading...' : 'Replace Image'}
                      </button>
                      {hasCustomImage() && (
                        <button
                          onClick={handleRemoveCustomImage}
                          className="p-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm hover:bg-[var(--color-danger)]/20 border border-[var(--color-border-subtle)] hover:border-[var(--color-danger)]/30 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors shadow-lg"
                          title="Remove custom image"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-[var(--color-text-muted)] text-center">
                {previewImage ? 'Preview - Click Save to apply' : (hasCustomImage() ? 'Custom image' : 'Base reference image')}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={18} className="text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text)]">Description</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {object.description}
                </p>
              </div>

              {/* Specifications */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={18} className="text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text)]">Specifications</h3>
                </div>
                <div className="space-y-2">
                  {isComponent ? (
                    <>
                      <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
                        <div className="text-xs text-[var(--color-text-muted)] mb-1">
                          Quantity per Fixture
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {object.quantity}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
                        <div className="text-xs text-[var(--color-text-muted)] mb-1">
                          Component Type
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {object.name}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
                        <div className="text-xs text-[var(--color-text-muted)] mb-1">
                          Device Type
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {object.name}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
                        <div className="text-xs text-[var(--color-text-muted)] mb-1">
                          Category
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {object.category}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="p-4 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20">
                <div className="text-xs text-[var(--color-text-muted)] mb-2">
                  Library Reference
                </div>
                <div className="text-sm text-[var(--color-text)]">
                  This is a base inventory object. All devices and components in stores reference these base types.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

