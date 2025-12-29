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
  
  // Validate libraryId before attempting any queries
  if (!libraryId || typeof libraryId !== 'string' || libraryId.length === 0) {
    console.warn(`⚠️ Invalid libraryId provided to getCustomImage: ${libraryId}`)
    return null
  }
  
  console.log(`🔍 Loading custom image for libraryId: ${libraryId}`)
  
  // METHOD 1: Try to load from Supabase database first (primary source)
  try {
    if (trpcClient && libraryId && libraryId.length > 0) {
      const dbImage = await trpcClient.image.getLibraryImage.query({ libraryId })
      if (dbImage) {
        console.log(`✅ Loaded library image from Supabase database for ${libraryId}`)
        return dbImage
      } else {
        console.log(`ℹ️ No database image found for ${libraryId}`)
      }
    } else {
      // Try direct API call if trpcClient not provided
      // Use GET request for tRPC queries
      try {
        const input = encodeURIComponent(JSON.stringify({ libraryId }))
        const response = await fetch(`/api/trpc/image.getLibraryImage?input=${input}`)
        if (response.ok) {
          const result = await response.json()
          if (result?.result?.data) {
            const dbImage = result.result.data
            if (dbImage) {
              console.log(`✅ Loaded library image from database via API for ${libraryId}`)
              return dbImage
            }
          }
        }
      } catch (apiError: any) {
        // Silently fail - will fallback to client storage
        console.log(`ℹ️ Direct API call failed for ${libraryId}, trying client storage`)
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
 * Aggressive compression for free storage - images are not critical
 * Always converts to JPEG for maximum compression
 */
export async function compressImage(base64String: string, maxWidth: number = 400, quality: number = 0.6, maxSizeBytes: number = 200000): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Scale down if too large (more aggressive)
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        
        // Always use JPEG for maximum compression (images are not critical)
        // Start with aggressive quality setting
        let compressed = canvas.toDataURL('image/jpeg', quality)
        let currentQuality = quality
        
        // If still too large, reduce quality further (down to 0.4 minimum)
        let attempts = 0
        while (compressed.length > maxSizeBytes && attempts < 5 && currentQuality > 0.4) {
          currentQuality -= 0.05
          compressed = canvas.toDataURL('image/jpeg', currentQuality)
          attempts++
        }
        
        // If still too large after quality reduction, scale down more aggressively
        if (compressed.length > maxSizeBytes && width > 300) {
          const scaleFactor = Math.sqrt(maxSizeBytes / compressed.length) * 0.9 // Extra 10% reduction
          width = Math.max(300, Math.floor(width * scaleFactor))
          height = Math.floor((height * width) / img.width)
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          compressed = canvas.toDataURL('image/jpeg', 0.5)
        }
        
        console.log(`✅ Compressed image: ${compressed.length} bytes (${(compressed.length / 1024).toFixed(1)} KB)`)
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
 * Set custom image for a library object (stored in Supabase database AND client storage as backup)
 */
export async function setCustomImage(libraryId: string, imageUrl: string, trpcClient?: any): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    // Compress image first to reduce size (aggressive compression to avoid 414 errors)
    const compressedImage = await compressImage(imageUrl, 600, 0.7, 500000) // Max 500KB
    console.log(`Compressed library image size: ${compressedImage.length} chars (${(compressedImage.length / 1024).toFixed(1)} KB)`)
    
    // Check if compressed image is still too large for HTTP requests
    const MAX_REQUEST_SIZE = 500000 // 500KB
    if (compressedImage.length > MAX_REQUEST_SIZE) {
      console.warn(`⚠️ Compressed library image still too large (${compressedImage.length} bytes), using client storage only`)
      // Skip database save, go straight to client storage
    } else {
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
          // Try direct API call for mutation (POST with batch format)
          try {
            console.log('💾 Attempting to save library image to Supabase database (direct API call)...')
            // tRPC batch format for mutations: POST with JSON body
            const requestBody = JSON.stringify({
              "0": {
                json: {
                  libraryId,
                  imageData: compressedImage,
                  mimeType,
                },
              },
            })
            
            // Check request body size
            if (requestBody.length > MAX_REQUEST_SIZE) {
              throw new Error('Request body too large (414 URI_TOO_LONG)')
            }
            
            const response = await fetch(`/api/trpc/image.saveLibraryImage?batch=1`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody,
            })
          if (response.ok) {
            const result = await response.json()
            if (Array.isArray(result) && result[0]?.result?.data) {
              console.log('✅ Library image saved to Supabase database via API')
            } else if (result[0]?.error) {
              throw new Error(result[0].error.json?.message || result[0].error.message || 'Database save failed')
            } else {
              throw new Error('Invalid response format')
            }
          } else {
            const errorText = await response.text()
            throw new Error(`API returned ${response.status}: ${errorText.substring(0, 200)}`)
          }
          } catch (apiError: any) {
            if (apiError.message?.includes('414') || apiError.message?.includes('URI_TOO_LONG')) {
              console.warn('⚠️ Library image too large for database (414 error), using client storage only')
            } else {
              console.warn('⚠️ Failed to save library image to database via API, using client storage:', apiError.message)
            }
            // Continue to client storage fallback
          }
        }
      } catch (dbError: any) {
        if (dbError.message?.includes('414') || dbError.message?.includes('URI_TOO_LONG')) {
          console.warn('⚠️ Library image too large for database (414 error), using client storage only')
        } else {
          console.warn('⚠️ Failed to save to database, using client storage as fallback:', dbError.message)
        }
        // Continue to client storage fallback
      }
    }
    
    // METHOD 2: Also save to client storage as backup (IndexedDB or localStorage)
    // Always save to client storage as backup, even if database save succeeded
    console.log('💾 Saving to client storage as backup...')
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
  
  // Validate siteId before attempting any queries
  if (!siteId || typeof siteId !== 'string' || siteId.length === 0) {
    console.warn(`⚠️ Invalid siteId provided to getSiteImage: ${siteId}`)
    return null
  }
  
  console.log(`🔍 Loading site image for siteId: ${siteId}`)
  
  // METHOD 1: Try to load from Supabase database first (primary source)
  // NOTE: Only works if trpcClient is provided. Components should use tRPC hooks directly.
  try {
    if (trpcClient && siteId && siteId.length > 0) {
      const dbImage = await trpcClient.image.getSiteImage.query({ siteId })
      if (dbImage) {
        console.log(`✅ Loaded site image from Supabase database for ${siteId}`)
        return dbImage
      } else {
        console.log(`ℹ️ No database image found for ${siteId}`)
      }
    } else {
      // No trpcClient provided - skip database lookup, go straight to client storage
      // Components should use tRPC hooks (trpc.image.getSiteImage.useQuery) instead of this utility
      console.log(`ℹ️ No trpcClient provided for ${siteId}, skipping database lookup, using client storage only`)
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
    // Compress image first (aggressive compression to avoid 414 errors)
    console.log('Compressing image...')
    const compressedImage = await compressImage(imageUrl, 600, 0.7, 500000) // Max 500KB
    console.log(`Compressed size: ${compressedImage.length} chars (${(compressedImage.length / 1024).toFixed(1)} KB)`)

    // Check if compressed image is still too large for HTTP requests (avoid 414 errors)
    // Most servers have URL length limits around 8KB-32KB, but POST body can be larger
    // However, to be safe, we'll limit to 500KB for the entire request body
    const MAX_REQUEST_SIZE = 500000 // 500KB
    if (compressedImage.length > MAX_REQUEST_SIZE) {
      console.warn(`⚠️ Compressed image still too large (${compressedImage.length} bytes), using client storage only`)
      // Skip database save, go straight to client storage
    } else {
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
          // Check for 414 error specifically
          if (dbError.message?.includes('414') || dbError.message?.includes('URI_TOO_LONG')) {
            console.warn('⚠️ Image too large for database (414 error), using client storage only')
          } else {
            console.warn('⚠️ Failed to save to database, using client storage as fallback:', dbError.message)
          }
          // Continue to client storage fallback
        }
      } else {
        // Try direct API call for mutation (POST with batch format)
        try {
          console.log('💾 Attempting to save to Supabase database (direct API call)...')
          // tRPC batch format for mutations: POST with JSON body
          const requestBody = JSON.stringify({
            "0": {
              json: {
                siteId,
                imageData: compressedImage,
                mimeType,
              },
            },
          })
          
          // Check request body size
          if (requestBody.length > MAX_REQUEST_SIZE) {
            throw new Error('Request body too large (414 URI_TOO_LONG)')
          }
          
          const response = await fetch(`/api/trpc/image.saveSiteImage?batch=1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          })
        if (response.ok) {
          const result = await response.json()
          if (Array.isArray(result) && result[0]?.result?.data) {
            console.log('✅ Site image saved to Supabase database via API')
          } else if (result[0]?.error) {
            throw new Error(result[0].error.json?.message || result[0].error.message || 'Database save failed')
          } else {
            throw new Error('Invalid response format')
          }
          } else {
            const errorText = await response.text()
            const errorMsg = `API returned ${response.status}: ${errorText.substring(0, 200)}`
            // Check for 414 specifically
            if (response.status === 414 || errorText.includes('URI_TOO_LONG')) {
              console.warn('⚠️ Image too large for database (414 URI_TOO_LONG), using client storage only')
            } else {
              throw new Error(errorMsg)
            }
          }
        } catch (apiError: any) {
          if (apiError.message?.includes('414') || apiError.message?.includes('URI_TOO_LONG')) {
            console.warn('⚠️ Image too large for database (414 error), using client storage only')
          } else {
            console.warn('⚠️ Failed to save to database via API, using client storage:', apiError.message)
          }
          // Continue to client storage fallback
        }
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
      // Also dispatch a general event without detail to force all components to refresh
      window.dispatchEvent(new Event('siteImageUpdated'))
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

