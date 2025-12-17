/**
 * Map Upload Component
 * 
 * Initial state when no map is uploaded.
 * Shows upload button/area in the center.
 * 
 * AI Note: In production, this would handle actual file uploads
 * (PDF, DXF, SVG, images) and process them.
 */

'use client'

import { Upload, Map as MapIcon } from 'lucide-react'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/StoreContext'

interface MapUploadProps {
  onMapUpload: (imageUrl: string) => void
}

export function MapUpload({ onMapUpload }: MapUploadProps) {
  const { activeStoreId } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper to get store-scoped localStorage key
  const getStorageKey = () => {
    return activeStoreId ? `fusion_map-image-url_${activeStoreId}` : 'map-image-url'
  }

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, SVG) or PDF')
      // Reset input even on error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Convert file to base64 for localStorage persistence
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Store in localStorage with store-scoped key
      const storageKey = getStorageKey()
      localStorage.setItem(storageKey, base64String)
      onMapUpload(base64String)
      // Reset input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      alert('Error reading file. Please try again.')
      // Reset input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleLoadDefault = () => {
    // Load the default Walmart floorplan
    const defaultUrl = '/floorplans/walmart-default.svg'
    // Store default in localStorage too (store-scoped)
    const storageKey = getStorageKey()
    localStorage.setItem(storageKey, defaultUrl)
    onMapUpload(defaultUrl)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input after drop
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md w-full px-4">
        <div className="mb-8">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center border-2 border-dashed transition-all ${
            isDragging ? 'border-[var(--color-primary)] scale-110' : 'border-[var(--color-primary)]/50'
          }`}>
            <MapIcon size={48} className="text-[var(--color-primary)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            Upload Floor Plan
          </h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            Upload a blueprint, floor plan, or drawing to visualize device locations
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-4 p-8 border-2 border-dashed rounded-xl transition-all ${
            isDragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
              : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
          }`}
        >
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {isDragging ? 'Drop file here' : 'Drag and drop a file here, or'}
          </p>
          <button
            onClick={handleUpload}
            className="fusion-button fusion-button-primary"
          >
            <Upload size={20} />
            Choose File
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-[var(--color-border-subtle)]"></div>
          <span className="text-xs text-[var(--color-text-soft)]">OR</span>
          <div className="flex-1 h-px bg-[var(--color-border-subtle)]"></div>
        </div>

        <button
          onClick={handleLoadDefault}
          className="fusion-button w-full mb-4"
          style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}
        >
          Load Sample Walmart Floor Plan
        </button>

        <p className="text-sm text-[var(--color-text-soft)]">
          Supported formats: PNG, JPG, SVG, PDF
        </p>
      </div>
    </div>
  )
}

