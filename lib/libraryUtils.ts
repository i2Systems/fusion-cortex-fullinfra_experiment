/**
 * Library Utilities
 * 
 * Helper functions for mapping device types and component types to library objects.
 * Provides URLs and images for linking to the library page.
 * 
 * AI Note: This centralizes the mapping between device/component types and library IDs.
 */

import { DeviceType } from './mockData'

// Use a special store ID for library images (not store-specific)
const LIBRARY_STORE_ID = 'library'
const IMAGE_SIZE_THRESHOLD = 100000 // ~100KB - store larger images in IndexedDB

// Device type to library ID mapping
const DEVICE_TYPE_TO_LIBRARY_ID: Record<string, string> = {
  'fixture-16ft-power-entry': 'fixture-16ft-power-entry',
  'fixture-12ft-power-entry': 'fixture-12ft-power-entry',
  'fixture-8ft-power-entry': 'fixture-8ft-power-entry',
  'fixture-16ft-follower': 'fixture-16ft-follower',
  'fixture-12ft-follower': 'fixture-12ft-follower',
  'fixture-8ft-follower': 'fixture-8ft-follower',
  'motion': 'motion-sensor',
  'light-sensor': 'light-sensor',
}

// Component type to library ID mapping (normalized)
const COMPONENT_TYPE_TO_LIBRARY_ID: Record<string, string> = {
  'LCM': 'lcm',
  'Driver Board': 'driver-board',
  'Power Supply': 'power-supply',
  'LED Board': 'led-board',
  'Metal Bracket': 'metal-bracket',
  'Cable Harness': 'cable-harness',
  'Lower LED Housing with Optic': 'lower-led-housing-optic',
  'Sensor': 'sensor',
}

// Default images for device types
const DEVICE_IMAGES: Record<string, string> = {
  'fixture-16ft-power-entry': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'fixture-12ft-power-entry': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'fixture-8ft-power-entry': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'fixture-16ft-follower': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'fixture-12ft-follower': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'fixture-8ft-follower': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=200&h=200&fit=crop',
  'motion-sensor': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  'light-sensor': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
}

// Default images for component types
const COMPONENT_IMAGES: Record<string, string> = {
  'lcm': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'driver-board': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'power-supply': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'led-board': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'metal-bracket': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'cable-harness': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'lower-led-housing-optic': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=200&fit=crop',
  'sensor': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
}

/**
 * Get library URL for a device type
 */
export function getDeviceLibraryUrl(deviceType: DeviceType): string | null {
  const libraryId = DEVICE_TYPE_TO_LIBRARY_ID[deviceType]
  return libraryId ? `/library#${libraryId}` : null
}

/**
 * Get library URL for a component type
 */
export function getComponentLibraryUrl(componentType: string): string | null {
  const normalized = normalizeComponentType(componentType)
  const libraryId = COMPONENT_TYPE_TO_LIBRARY_ID[normalized]
  return libraryId ? `/library#${libraryId}` : null
}

/**
 * Get custom image for a library object (stored in localStorage or IndexedDB)
 */
async function getCustomImage(libraryId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`library_image_${libraryId}`)
    if (!stored) return null
    
    // Check if it's an IndexedDB reference
    if (stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      try {
        const { getImage, getImageDataUrl } = await import('./indexedDB')
        const storedImage = await getImage(imageId)
        if (storedImage) {
          const dataUrl = await getImageDataUrl(storedImage.id)
          return dataUrl
        }
      } catch (error) {
        console.error('Failed to load image from IndexedDB:', error)
        return null
      }
    }
    
    // It's a direct base64 string
    return stored
  } catch {
    return null
  }
}

/**
 * Get custom image synchronously (for components that need immediate access)
 * Returns the stored value, which may be a reference that needs async loading
 */
function getCustomImageSync(libraryId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`library_image_${libraryId}`)
    // If it's an IndexedDB reference, return null (caller should handle async)
    if (stored && stored.startsWith('indexeddb:')) {
      return null // Will need async loading
    }
    return stored || null
  } catch {
    return null
  }
}

/**
 * Compress image by reducing quality/size
 */
async function compressImage(base64String: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Scale down if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        // Convert to JPEG with quality setting
        const compressed = canvas.toDataURL('image/jpeg', quality)
        resolve(compressed)
      } else {
        resolve(base64String) // Fallback to original
      }
    }
    img.onerror = () => resolve(base64String) // Fallback to original on error
    img.src = base64String
  })
}

/**
 * Set custom image for a library object (stored in localStorage or IndexedDB)
 */
export async function setCustomImage(libraryId: string, imageUrl: string): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    // Compress image first to reduce size
    const compressedImage = await compressImage(imageUrl)
    
    // Check if compressed image is still too large for localStorage
    if (compressedImage.length > IMAGE_SIZE_THRESHOLD) {
      // Large image - store in IndexedDB
      try {
        const { storeImage } = await import('./indexedDB')
        // Convert base64 to Blob
        const response = await fetch(compressedImage)
        const blob = await response.blob()
        
        // Store in IndexedDB
        const imageId = await storeImage(
          LIBRARY_STORE_ID,
          blob,
          `library_${libraryId}.jpg`,
          blob.type || 'image/jpeg'
        )
        
        // Store only the reference in localStorage
        const reference = `indexeddb:${imageId}`
        localStorage.setItem(`library_image_${libraryId}`, reference)
      } catch (indexedDBError) {
        console.error('Failed to store image in IndexedDB:', indexedDBError)
        // Try localStorage as fallback (might fail if too large)
        try {
          localStorage.setItem(`library_image_${libraryId}`, compressedImage)
        } catch (storageError) {
          throw new Error('Image is too large to store. Please use a smaller image or clear browser storage.')
        }
      }
    } else {
      // Small image - can store in localStorage
      localStorage.setItem(`library_image_${libraryId}`, compressedImage)
    }
    
    // Trigger a custom event so components can react to image changes
    window.dispatchEvent(new CustomEvent('libraryImageUpdated', { detail: { libraryId } }))
    window.dispatchEvent(new Event('libraryImageUpdated'))
  } catch (error) {
    console.error('Failed to save custom library image:', error)
    throw error // Re-throw so caller can show error message
  }
}

/**
 * Remove custom image for a library object
 */
export function removeCustomImage(libraryId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`library_image_${libraryId}`)
    window.dispatchEvent(new CustomEvent('libraryImageUpdated', { detail: { libraryId } }))
  } catch (error) {
    console.error('Failed to remove custom library image:', error)
  }
}

/**
 * Get image for a device type (custom first, then default)
 * Note: For IndexedDB images, this returns null and components should use async version
 */
export function getDeviceImage(deviceType: DeviceType): string | null {
  const libraryId = DEVICE_TYPE_TO_LIBRARY_ID[deviceType]
  if (!libraryId) return null
  
  // Check for custom image first (synchronous - may return null for IndexedDB refs)
  const customImage = getCustomImageSync(libraryId)
  if (customImage) return customImage
  
  // Fall back to default
  return DEVICE_IMAGES[libraryId] || null
}

/**
 * Get image for a component type (custom first, then default)
 * Note: For IndexedDB images, this returns null and components should use async version
 */
export function getComponentImage(componentType: string): string | null {
  const normalized = normalizeComponentType(componentType)
  const libraryId = COMPONENT_TYPE_TO_LIBRARY_ID[normalized]
  if (!libraryId) return null
  
  // Check for custom image first (synchronous - may return null for IndexedDB refs)
  const customImage = getCustomImageSync(libraryId)
  if (customImage) return customImage
  
  // Fall back to default
  return COMPONENT_IMAGES[libraryId] || null
}

/**
 * Get image for a device type asynchronously (handles IndexedDB)
 */
export async function getDeviceImageAsync(deviceType: DeviceType): Promise<string | null> {
  const libraryId = DEVICE_TYPE_TO_LIBRARY_ID[deviceType]
  if (!libraryId) return null
  
  // Check for custom image first
  const customImage = await getCustomImage(libraryId)
  if (customImage) return customImage
  
  // Fall back to default
  return DEVICE_IMAGES[libraryId] || null
}

/**
 * Get image for a component type asynchronously (handles IndexedDB)
 */
export async function getComponentImageAsync(componentType: string): Promise<string | null> {
  const normalized = normalizeComponentType(componentType)
  const libraryId = COMPONENT_TYPE_TO_LIBRARY_ID[normalized]
  if (!libraryId) return null
  
  // Check for custom image first
  const customImage = await getCustomImage(libraryId)
  if (customImage) return customImage
  
  // Fall back to default
  return COMPONENT_IMAGES[libraryId] || null
}

/**
 * Normalize component type by removing instance numbers
 * e.g., "Lower LED Housing with Optic 1" -> "Lower LED Housing with Optic"
 */
function normalizeComponentType(componentType: string): string {
  const trimmed = componentType.trim()
  // Remove trailing numbers and spaces (e.g., " 1", " 2", etc.)
  const normalized = trimmed.replace(/\s+\d+$/, '')
  return normalized
}

/**
 * Check if a device type has library information
 */
export function hasDeviceLibraryInfo(deviceType: DeviceType): boolean {
  return deviceType in DEVICE_TYPE_TO_LIBRARY_ID
}

/**
 * Check if a component type has library information
 */
export function hasComponentLibraryInfo(componentType: string): boolean {
  const normalized = normalizeComponentType(componentType)
  return normalized in COMPONENT_TYPE_TO_LIBRARY_ID
}

// --- Site Image Utilities (stored client-side like library images) ---
const SITE_IMAGE_PREFIX = 'site_image_'

/**
 * Get site image (stored in localStorage or IndexedDB)
 */
export async function getSiteImage(siteId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    if (!stored) {
      console.log(`No site image found for ${siteId}`)
      return null
    }

    // Check if it's an IndexedDB reference
    if (stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      try {
        const { getImageDataUrl } = await import('./indexedDB')
        const dataUrl = await getImageDataUrl(imageId)
        if (!dataUrl) {
          console.warn(`Failed to load site image from IndexedDB for ${siteId}, imageId: ${imageId}`)
        }
        return dataUrl
      } catch (error) {
        console.error(`Failed to load site image from IndexedDB for ${siteId}:`, error)
        // Try to remove the broken reference
        try {
          localStorage.removeItem(`${SITE_IMAGE_PREFIX}${siteId}`)
        } catch {}
        return null
      }
    }

    // Direct base64 string
    if (stored.startsWith('data:') || stored.length > 100) {
      return stored
    }
    
    console.warn(`Invalid site image format for ${siteId}`)
    return null
  } catch (error) {
    console.error(`Failed to get site image for ${siteId}:`, error)
    return null
  }
}

/**
 * Set site image (stored in localStorage or IndexedDB)
 */
export async function setSiteImage(siteId: string, imageUrl: string): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('setSiteImage called on server side, skipping')
    return
  }
  
  console.log(`📸 Saving site image for ${siteId}, size: ${imageUrl.length} chars`)
  
  try {
    // Compress image first
    console.log('Compressing image...')
    const compressedImage = await compressImage(imageUrl)
    console.log(`Compressed size: ${compressedImage.length} chars`)

    // Check if compressed image is still too large for localStorage
    if (compressedImage.length > IMAGE_SIZE_THRESHOLD) {
      console.log('Image is large, storing in IndexedDB...')
      // Large image - store in IndexedDB
      try {
        const { storeImage } = await import('./indexedDB')
        const response = await fetch(compressedImage)
        const blob = await response.blob()
        console.log(`Blob size: ${blob.size} bytes`)

        // Store in IndexedDB
        const imageId = await storeImage(
          siteId,
          blob,
          `site_image_${siteId}.jpg`,
          blob.type || 'image/jpeg'
        )
        console.log(`✅ Stored in IndexedDB with ID: ${imageId}`)

        // Store only the reference in localStorage
        const reference = `indexeddb:${imageId}`
        localStorage.setItem(`${SITE_IMAGE_PREFIX}${siteId}`, reference)
        console.log(`✅ Saved reference to localStorage: ${SITE_IMAGE_PREFIX}${siteId}`)
      } catch (indexedDBError) {
        console.error('❌ Failed to store image in IndexedDB:', indexedDBError)
        // Try localStorage as fallback (might fail if too large)
        try {
          localStorage.setItem(`${SITE_IMAGE_PREFIX}${siteId}`, compressedImage)
          console.log(`✅ Fallback: Saved to localStorage (may be too large)`)
        } catch (storageError) {
          console.error('❌ Failed to save to localStorage:', storageError)
          throw new Error('Image is too large to store. Please use a smaller image.')
        }
      }
    } else {
      // Small image - can store in localStorage
      console.log('Image is small, storing in localStorage...')
      localStorage.setItem(`${SITE_IMAGE_PREFIX}${siteId}`, compressedImage)
      console.log(`✅ Saved to localStorage: ${SITE_IMAGE_PREFIX}${siteId}`)
    }

    // Verify it was saved
    const verify = localStorage.getItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    if (verify) {
      console.log(`✅ Verified: Image saved successfully for ${siteId}`)
    } else {
      console.error(`❌ Verification failed: Image not found after save for ${siteId}`)
    }

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('siteImageUpdated', { detail: { siteId } }))
    console.log(`✅ Dispatched siteImageUpdated event for ${siteId}`)
  } catch (error) {
    console.error(`❌ Failed to save site image for ${siteId}:`, error)
    throw error
  }
}

/**
 * Remove site image
 */
export async function removeSiteImage(siteId: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    if (stored && stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      try {
        const { deleteImage } = await import('./indexedDB')
        await deleteImage(imageId)
      } catch (error) {
        console.error('Failed to delete image from IndexedDB:', error)
      }
    }
    localStorage.removeItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    window.dispatchEvent(new CustomEvent('siteImageUpdated', { detail: { siteId } }))
  } catch (error) {
    console.error('Failed to remove site image:', error)
    throw error
  }
}

