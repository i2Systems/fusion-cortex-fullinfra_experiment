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
async function getCustomImage(libraryId: string, trpcClient?: any): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  console.log(`🔍 Loading custom image for libraryId: ${libraryId}`)
  
  // METHOD 1: Try to load from Supabase database first (primary source)
  try {
    if (trpcClient) {
      const dbImage = await trpcClient.image.getLibraryImage.query({ libraryId })
      if (dbImage) {
        console.log(`✅ Loaded library image from Supabase database for ${libraryId}`)
        return dbImage
      } else {
        console.log(`ℹ️ No database image found for ${libraryId}`)
      }
    } else {
      // Try direct API call (tRPC format)
      try {
        const input = encodeURIComponent(JSON.stringify({ libraryId }))
        const response = await fetch(`/api/trpc/image.getLibraryImage?batch=1&input=${input}`)
        if (response.ok) {
          const result = await response.json()
          // tRPC batch response format: array of results
          if (result[0]?.result?.data) {
            console.log(`✅ Loaded library image from Supabase database via API for ${libraryId}`)
            return result[0].result.data
          } else if (result[0]?.result?.data === null) {
            console.log(`ℹ️ No database image found in API response for ${libraryId} (null)`)
          } else if (result[0]?.error) {
            console.warn(`⚠️ API returned error for ${libraryId}:`, result[0].error)
          } else {
            console.log(`ℹ️ No database image found in API response for ${libraryId} (empty result)`)
          }
        } else {
          const errorText = await response.text()
          console.warn(`⚠️ API returned ${response.status} for ${libraryId}:`, errorText.substring(0, 200))
        }
      } catch (apiError: any) {
        console.warn(`⚠️ API call failed for ${libraryId}:`, apiError.message)
        // Continue to client storage fallback
      }
    }
  } catch (dbError: any) {
    console.warn(`⚠️ Failed to load from database for ${libraryId}, trying client storage:`, dbError.message)
  }

  // METHOD 2: Fallback to client storage (localStorage/IndexedDB)
  try {
    const stored = localStorage.getItem(`library_image_${libraryId}`)
    if (!stored) return null
    
    // Check if it's an IndexedDB reference
    if (stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      const retries = 3
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const { getImage, getImageDataUrl } = await import('./indexedDB')
          const storedImage = await getImage(imageId)
          if (storedImage) {
            const dataUrl = await getImageDataUrl(storedImage.id, retries)
            if (dataUrl) {
              return dataUrl
            }
          }
          // If not found and not last attempt, wait and retry
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
            continue
          }
        } catch (error) {
          if (attempt < retries - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
            continue
          }
          console.error('Failed to load image from IndexedDB:', error)
          return null
        }
      }
      return null
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
 * Preserves original format (PNG/JPEG) to maintain transparency
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
        
        // Detect original format and preserve it
        const isPNG = base64String.startsWith('data:image/png') || base64String.includes('image/png')
        const isJPEG = base64String.startsWith('data:image/jpeg') || base64String.startsWith('data:image/jpg') || base64String.includes('image/jpeg') || base64String.includes('image/jpg')
        
        // Preserve PNG format for transparency, use JPEG for photos
        if (isPNG) {
          const compressed = canvas.toDataURL('image/png')
          resolve(compressed)
        } else {
          // Default to JPEG for photos and other formats
          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        }
      } else {
        resolve(base64String) // Fallback to original
      }
    }
    img.onerror = () => resolve(base64String) // Fallback to original on error
    img.src = base64String
  })
}

/**
 * Set custom image for a library object (stored in Supabase database AND client storage as backup)
 */
export async function setCustomImage(libraryId: string, imageUrl: string, trpcClient?: any): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    // Compress image first to reduce size
    const compressedImage = await compressImage(imageUrl)
    
    // Determine mime type
    const isPNG = compressedImage.startsWith('data:image/png')
    const mimeType = isPNG ? 'image/png' : 'image/jpeg'

    // METHOD 1: Try to save to Supabase database first (primary storage)
    try {
      if (trpcClient) {
        console.log('💾 Attempting to save library image to Supabase database...')
        await trpcClient.image.saveLibraryImage.mutateAsync({
          libraryId,
          imageData: compressedImage,
          mimeType,
        })
        console.log('✅ Library image saved to Supabase database')
      } else {
        // Try direct API call (tRPC format)
        const input = encodeURIComponent(JSON.stringify({
          libraryId,
          imageData: compressedImage,
          mimeType,
        }))
        const response = await fetch(`/api/trpc/image.saveLibraryImage?batch=1&input=${input}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (response.ok) {
          const result = await response.json()
          if (result[0]?.result?.data) {
            console.log('✅ Library image saved to Supabase database via API')
          } else if (result[0]?.error) {
            throw new Error(result[0].error.message || 'Database save failed')
          } else {
            throw new Error('Invalid response format')
          }
        } else {
          const errorText = await response.text()
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }
      }
    } catch (dbError: any) {
      console.warn('⚠️ Failed to save to database, using client storage as fallback:', dbError.message)
      // Continue to client storage fallback
    }
    
    // METHOD 2: Also save to client storage as backup (IndexedDB or localStorage)
    // Check if compressed image is still too large for localStorage
    if (compressedImage.length > IMAGE_SIZE_THRESHOLD) {
      // Large image - store in IndexedDB
      try {
        const { storeImage, getImage } = await import('./indexedDB')
        // Convert base64 to Blob
        const response = await fetch(compressedImage)
        const blob = await response.blob()
        
        // Determine file extension and mime type based on compressed image format
        const isPNG = compressedImage.startsWith('data:image/png')
        const fileExtension = isPNG ? 'png' : 'jpg'
        const mimeType = isPNG ? 'image/png' : 'image/jpeg'
        
        // Store in IndexedDB and wait for it to complete
        const imageId = await storeImage(
          LIBRARY_STORE_ID,
          blob,
          `library_${libraryId}.${fileExtension}`,
          mimeType
        )
        
            // Verify the image was actually stored before saving reference
        // Note: We wait a bit longer for IndexedDB to be ready
        let verified = false
        for (let i = 0; i < 5; i++) {
          try {
            const storedImage = await getImage(imageId)
            if (storedImage) {
              verified = true
              console.log(`✅ Verified image stored in IndexedDB on attempt ${i + 1}`)
              break
            }
          } catch (verifyError) {
            console.warn(`Verification attempt ${i + 1} failed:`, verifyError)
          }
          // Wait a bit before retrying (longer waits for later attempts)
          await new Promise(resolve => setTimeout(resolve, 150 * (i + 1)))
        }

        if (!verified) {
          console.warn('⚠️ Image stored but could not be verified after 5 attempts - saving reference anyway')
          // Don't throw - save the reference anyway, retry logic will handle it on read
        }
        
        // Store only the reference in localStorage after verification
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
    // Add a small delay to ensure IndexedDB is ready
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('libraryImageUpdated', { detail: { libraryId } }))
      window.dispatchEvent(new Event('libraryImageUpdated'))
    }, 200)
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
export async function getSiteImage(siteId: string, retries: number = 3, trpcClient?: any): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  // METHOD 1: Try to load from Supabase database first (primary source)
  try {
    if (trpcClient) {
      const dbImage = await trpcClient.image.getSiteImage.query({ siteId })
      if (dbImage) {
        console.log(`✅ Loaded site image from Supabase database for ${siteId}`)
        return dbImage
      }
    } else {
      // Try direct API call (tRPC format)
      try {
        const input = encodeURIComponent(JSON.stringify({ siteId }))
        const response = await fetch(`/api/trpc/image.getSiteImage?batch=1&input=${input}`)
        if (response.ok) {
          const result = await response.json()
          if (result[0]?.result?.data) {
            console.log(`✅ Loaded site image from Supabase database via API for ${siteId}`)
            return result[0].result.data
          }
        }
      } catch (apiError) {
        // Continue to client storage fallback
      }
    }
  } catch (dbError: any) {
    console.warn(`⚠️ Failed to load from database for ${siteId}, trying client storage:`, dbError.message)
  }

  // METHOD 2: Fallback to client storage (localStorage/IndexedDB)
  try {
    const stored = localStorage.getItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    if (!stored) {
      console.log(`No site image found in client storage for ${siteId}`)
      return null
    }

    // Check if it's an IndexedDB reference
    if (stored.startsWith('indexeddb:')) {
      const imageId = stored.replace('indexeddb:', '')
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const { getImageDataUrl } = await import('./indexedDB')
          const dataUrl = await getImageDataUrl(imageId, retries)
          if (dataUrl) {
            return dataUrl
          }
          // If no data URL and not last attempt, wait and retry
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
            continue
          }
          console.warn(`Failed to load site image from IndexedDB for ${siteId} after ${retries} attempts, imageId: ${imageId}`)
        } catch (error) {
          if (attempt < retries - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
            continue
          }
          console.error(`Failed to load site image from IndexedDB for ${siteId}:`, error)
          // Try to remove the broken reference
          try {
            localStorage.removeItem(`${SITE_IMAGE_PREFIX}${siteId}`)
          } catch {}
          return null
        }
      }
      return null
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
 * Set site image (stored in Supabase database AND client storage as backup)
 */
export async function setSiteImage(siteId: string, imageUrl: string, trpcClient?: any): Promise<void> {
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

    // Determine mime type
    const isPNG = compressedImage.startsWith('data:image/png')
    const mimeType = isPNG ? 'image/png' : 'image/jpeg'

    // METHOD 1: Try to save to Supabase database first (primary storage)
    if (trpcClient) {
      try {
        console.log('💾 Attempting to save to Supabase database...')
        await trpcClient.image.saveSiteImage.mutateAsync({
          siteId,
          imageData: compressedImage,
          mimeType,
        })
        console.log('✅ Site image saved to Supabase database')
      } catch (dbError: any) {
        console.warn('⚠️ Failed to save to database, using client storage as fallback:', dbError.message)
        // Continue to client storage fallback
      }
    } else {
      // Try to get tRPC client dynamically
      try {
        const { trpc } = await import('./trpc/client')
        // Note: This won't work in non-React contexts, but we'll try
        console.log('💾 Attempting to save to Supabase database (dynamic import)...')
        // We can't use hooks here, so we'll need to make a direct API call (tRPC format)
        const input = encodeURIComponent(JSON.stringify({
          siteId,
          imageData: compressedImage,
          mimeType,
        }))
        const response = await fetch(`/api/trpc/image.saveSiteImage?batch=1&input=${input}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (response.ok) {
          const result = await response.json()
          if (result[0]?.result?.data) {
            console.log('✅ Site image saved to Supabase database via API')
          } else if (result[0]?.error) {
            throw new Error(result[0].error.message || 'Database save failed')
          } else {
            throw new Error('Invalid response format')
          }
        } else {
          const errorText = await response.text()
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }
      } catch (apiError: any) {
        console.warn('⚠️ Failed to save to database via API, using client storage:', apiError.message)
        // Continue to client storage fallback
      }
    }

    // Check if compressed image is still too large for localStorage
    if (compressedImage.length > IMAGE_SIZE_THRESHOLD) {
      console.log('Image is large, storing in IndexedDB...')
      // Large image - store in IndexedDB
      try {
        const { storeImage } = await import('./indexedDB')
        const response = await fetch(compressedImage)
        const blob = await response.blob()
        console.log(`Blob size: ${blob.size} bytes`)

        // Determine file extension and mime type based on compressed image format
        const isPNG = compressedImage.startsWith('data:image/png')
        const fileExtension = isPNG ? 'png' : 'jpg'
        const mimeType = isPNG ? 'image/png' : 'image/jpeg'
        
        // Store in IndexedDB and wait for it to complete
        const imageId = await storeImage(
          siteId,
          blob,
          `site_image_${siteId}.${fileExtension}`,
          mimeType
        )
        console.log(`✅ Stored in IndexedDB with ID: ${imageId}`)

        // Verify the image was actually stored before saving reference
        const { getImage } = await import('./indexedDB')
        let verified = false
        for (let i = 0; i < 5; i++) {
          try {
            const storedImage = await getImage(imageId)
            if (storedImage) {
              verified = true
              console.log(`✅ Verified library image stored in IndexedDB on attempt ${i + 1}`)
              break
            }
          } catch (verifyError) {
            console.warn(`Library image verification attempt ${i + 1} failed:`, verifyError)
          }
          // Wait a bit before retrying (longer waits for later attempts)
          await new Promise(resolve => setTimeout(resolve, 150 * (i + 1)))
        }

        if (!verified) {
          console.warn('⚠️ Library image stored but could not be verified after 5 attempts - saving reference anyway')
          // Don't throw - save the reference anyway, retry logic will handle it on read
        }

        // Store only the reference in localStorage after verification
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

    // Verify it was saved (with a small delay for IndexedDB)
    await new Promise(resolve => setTimeout(resolve, 200))
    const verify = localStorage.getItem(`${SITE_IMAGE_PREFIX}${siteId}`)
    if (verify) {
      console.log(`✅ Verified: Image reference saved in localStorage for ${siteId}`)
      console.log(`   Reference type: ${verify.startsWith('indexeddb:') ? 'IndexedDB' : 'localStorage'}`)
    } else {
      console.error(`❌ Verification failed: Image reference not found after save for ${siteId}`)
    }

    // Dispatch event to notify components (with a delay to ensure IndexedDB is ready)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('siteImageUpdated', { detail: { siteId } }))
      console.log(`✅ Dispatched siteImageUpdated event for ${siteId}`)
    }, 300)
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

