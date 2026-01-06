/**
 * Shared Map Upload Hook
 * 
 * Provides a consistent way to upload maps across all pages.
 * Ensures maps are saved to the database and available in all views.
 */

import { useState } from 'react'
import { useSite } from './SiteContext'
import { trpc } from './trpc/client'
import { supabaseAdmin, STORAGE_BUCKETS } from './supabase'

export function useMapUpload() {
  const { activeSiteId } = useSite()
  const [isUploading, setIsUploading] = useState(false)
  const utils = trpc.useUtils()
  
  const createLocationMutation = trpc.location.create.useMutation({
    onSuccess: () => {
      // Invalidate location list to refresh all views
      utils.location.list.invalidate({ siteId: activeSiteId || '' })
    }
  })

  const uploadMap = async (imageUrl: string, locationName?: string): Promise<void> => {
    if (!activeSiteId) {
      throw new Error('No site selected')
    }

    const name = locationName || prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!name) {
      throw new Error('Location name is required')
    }

    setIsUploading(true)
    let finalImageUrl = imageUrl

    try {
      // If it's a base64 string, upload it to Supabase
      if (imageUrl.startsWith('data:')) {
        try {
          console.log('📤 Uploading map image to Supabase...')

          // Convert base64 to Blob
          const fetchRes = await fetch(imageUrl)
          const blob = await fetchRes.blob()
          const file = new File([blob], `map-${Date.now()}.jpg`, { type: 'image/jpeg' })

          // Upload
          const formData = new FormData()
          formData.append('file', file)
          formData.append('bucket', STORAGE_BUCKETS.MAP_DATA)
          formData.append('fileName', `${activeSiteId}/${Date.now()}-map.jpg`)

          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          })

          if (!uploadRes.ok) throw new Error('Upload failed')

          const { url } = await uploadRes.json()
          finalImageUrl = url
          console.log('✅ Map image uploaded to Supabase:', url)
        } catch (e) {
          console.error('Failed to upload map image:', e)
          alert('Failed to upload map image. Using local copy (may not persist).')
          // Fallback to base64 if upload fails
        }
      }

      console.log('💾 Creating location in database...')
      // Create location in database
      await createLocationMutation.mutateAsync({
        siteId: activeSiteId,
        name,
        type: 'base',
        imageUrl: finalImageUrl,
      })

      console.log('✅ Location created successfully')
    } catch (error: any) {
      console.error('Failed to upload map:', error)
      throw new Error(error.message || 'Failed to upload map')
    } finally {
      setIsUploading(false)
    }
  }

  const uploadVectorData = async (vectorData: any, locationName?: string): Promise<void> => {
    if (!activeSiteId) {
      throw new Error('No site selected')
    }

    const name = locationName || prompt('Enter a name for this location:', 'Main Floor Plan')
    if (!name) {
      throw new Error('Location name is required')
    }

    setIsUploading(true)

    try {
      // Store vector data as JSON string (or upload to storage if too large)
      const vectorDataString = JSON.stringify(vectorData)
      
      // For now, store in vectorDataUrl field (could be enhanced to use Supabase Storage)
      const vectorDataUrl = `data:application/json;base64,${btoa(vectorDataString)}`

      console.log('💾 Creating location with vector data in database...')
      await createLocationMutation.mutateAsync({
        siteId: activeSiteId,
        name,
        type: 'base',
        vectorDataUrl,
      })

      console.log('✅ Location with vector data created successfully')
    } catch (error: any) {
      console.error('Failed to upload vector data:', error)
      throw new Error(error.message || 'Failed to upload vector data')
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadMap,
    uploadVectorData,
    isUploading,
  }
}

