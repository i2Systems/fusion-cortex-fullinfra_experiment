/**
 * Library Card Component
 * 
 * Card displaying a library object (device type or component type).
 * Clicking opens the detailed modal.
 */

'use client'

import { useState, useEffect } from 'react'
import { LibraryObject } from '@/app/(main)/library/page'
import { Image as ImageIcon } from 'lucide-react'
import { getDeviceImage, getComponentImage, getDeviceImageAsync, getComponentImageAsync } from '@/lib/libraryUtils'

interface LibraryCardProps {
  object: LibraryObject
  onClick: () => void
}

export function LibraryCard({ object, onClick }: LibraryCardProps) {
  const [imageKey, setImageKey] = useState(0)
  const [currentImage, setCurrentImage] = useState<string | null>(object.defaultImage || null)
  const isComponent = 'quantity' in object

  // Load custom image after mount to avoid hydration mismatch
  // Uses async loading to check database first, then client storage, then default
  useEffect(() => {
    const loadImage = async () => {
      console.log(`🖼️ Loading image for ${isComponent ? 'component' : 'device'}: ${isComponent ? object.name : (object as any).id || object.name}`)
      if (isComponent) {
        // Try sync first (for localStorage images)
        const syncImage = getComponentImage(object.name)
        if (syncImage && !syncImage.startsWith('https://images.unsplash.com')) {
          // Only use sync image if it's not a default image
          console.log(`✅ Using sync image for component ${object.name}`)
          setCurrentImage(syncImage)
          return
        }
        
        // Try async (for database/IndexedDB images)
        try {
          const asyncImage = await getComponentImageAsync(object.name)
          if (asyncImage && !asyncImage.startsWith('https://images.unsplash.com')) {
            // Only use async image if it's not a default image
            console.log(`✅ Using async image for component ${object.name}`)
            setCurrentImage(asyncImage)
            return
          } else if (asyncImage) {
            console.log(`ℹ️ Async returned default image for component ${object.name}`)
          }
        } catch (error) {
          console.error('❌ Failed to load component image:', error)
        }
        
        // Fallback to default
        console.log(`📷 Using default image for component ${object.name}`)
        setCurrentImage(object.defaultImage || null)
      } else {
        // Map library object ID to device type
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
          // Try sync first (for localStorage images)
          const syncImage = getDeviceImage(deviceType as any)
          if (syncImage && !syncImage.startsWith('https://images.unsplash.com')) {
            // Only use sync image if it's not a default image
            console.log(`✅ Using sync image for device ${object.id} (type: ${deviceType})`)
            setCurrentImage(syncImage)
            return
          }
          
          // Try async (for database/IndexedDB images)
          try {
            const asyncImage = await getDeviceImageAsync(deviceType as any)
            if (asyncImage && !asyncImage.startsWith('https://images.unsplash.com')) {
              // Only use async image if it's not a default image
              console.log(`✅ Using async image for device ${object.id} (type: ${deviceType})`)
              setCurrentImage(asyncImage)
              return
            } else if (asyncImage) {
              console.log(`ℹ️ Async returned default image for device ${object.id} (type: ${deviceType})`)
            }
          } catch (error) {
            console.error('❌ Failed to load device image:', error)
          }
          
          // Fallback to default
          console.log(`📷 Using default image for device ${object.id} (type: ${deviceType})`)
          setCurrentImage(object.defaultImage || null)
        } else {
          setCurrentImage(object.defaultImage || null)
        }
      }
    }
    
    loadImage()
    
    // Listen for library image updates
    const handleImageUpdate = () => {
      setImageKey(prev => prev + 1)
      loadImage() // Reload image when updated
    }
    window.addEventListener('libraryImageUpdated', handleImageUpdate)
    return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
  }, [object, isComponent])

  return (
    <button
      onClick={onClick}
      className="fusion-card text-left cursor-pointer hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all group"
    >
      <div className="aspect-video w-full mb-4 rounded-lg bg-[var(--color-surface-subtle)] overflow-hidden relative">
        {currentImage ? (
          <img
            key={imageKey}
            src={currentImage}
            alt={object.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-[var(--color-text-muted)]" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
            {object.name}
          </h3>
          <span className="text-xs px-2 py-1 rounded token-type-fixture">
            {object.category}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
          {object.description}
        </p>
        {'quantity' in object && (
          <div className="text-xs text-[var(--color-text-soft)]">
            Quantity per fixture: {object.quantity}
          </div>
        )}
      </div>
    </button>
  )
}

