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

import { Upload, Map as MapIcon, Loader2, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/StoreContext'
import { pdfToImage, isPdfFile } from '@/lib/pdfUtils'
import { extractVectorData, isVectorPDF, type ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import { storeVectorData, storeImage } from '@/lib/indexedDB'
import { useAdvancedSettings } from '@/lib/AdvancedSettingsContext'

interface MapUploadProps {
  onMapUpload: (imageUrl: string) => void
  onVectorDataUpload?: (vectorData: ExtractedVectorData) => void
}

export function MapUpload({ onMapUpload, onVectorDataUpload }: MapUploadProps) {
  const { activeStoreId } = useStore()
  const { enableSVGExtraction } = useAdvancedSettings()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper to get store-scoped localStorage key
  const getStorageKey = () => {
    return activeStoreId ? `fusion_map-image-url_${activeStoreId}` : 'map-image-url'
  }

  const handleFileSelect = async (file: File) => {
    // Reset error state
    setError(null)
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf']
    const validExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.pdf']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Please upload a valid image file (PNG, JPG, SVG) or PDF')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('File size must be less than 50MB. Please choose a smaller file.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsProcessing(true)
    setProcessingStatus('Analyzing PDF structure...')

    try {
      let base64String: string | undefined = undefined

      // Handle PDF files - try vector extraction first (if enabled in settings)
      if (isPdfFile(file)) {
        try {
          // Only attempt vector extraction if enabled in advanced settings
          if (enableSVGExtraction) {
            // Vector-first pipeline: Extract vector data if PDF is vector-based
            setProcessingStatus('Checking if PDF contains vector graphics...')
            const isVector = await isVectorPDF(file)
            
            if (isVector && onVectorDataUpload) {
              // Extract and store vector data with progress updates
              setProcessingStatus('Extracting vector paths and lines from PDF...')
              const vectorData = await extractVectorData(file, (status) => {
                setProcessingStatus(status)
              })
              
              setProcessingStatus(`Found ${vectorData.paths.length.toLocaleString()} paths, processing...`)
              
              // Check if extraction seems complete enough
              // Architectural drawings should have many paths relative to text
              const hasEnoughPaths = vectorData.paths.length >= 100 || 
                                     (vectorData.paths.length >= 50 && vectorData.texts.length < 100) ||
                                     (vectorData.paths.length > 0 && vectorData.texts.length < 10)
              
              if (hasEnoughPaths) {
                const storageKey = getStorageKey()
                const vectorKey = `${storageKey}_vector`
                
                // Store vector data in IndexedDB (handles large datasets that exceed localStorage limits)
                setProcessingStatus('Saving vector data (this may take a moment for large files)...')
                try {
                  if (activeStoreId) {
                    await storeVectorData(activeStoreId, vectorData, vectorKey)
                  } else {
                    // Fallback to localStorage for small datasets if no store ID
                    const jsonString = JSON.stringify(vectorData)
                    if (jsonString.length < 4 * 1024 * 1024) { // 4MB limit
                      localStorage.setItem(vectorKey, jsonString)
                    } else {
                      throw new Error('Vector data too large for localStorage. Please select a store.')
                    }
                  }
                } catch (storageError: unknown) {
                  // If IndexedDB fails, try localStorage as fallback (might fail for large data)
                  console.warn('IndexedDB storage failed, trying localStorage:', storageError)
                  try {
                    localStorage.setItem(vectorKey, JSON.stringify(vectorData))
                  } catch (localError: unknown) {
                    // If both fail, still use the data but warn user
                    console.error('Both IndexedDB and localStorage failed:', localError)
                    throw new Error('Failed to save vector data. The file may be too large. Try clearing browser storage and try again.')
                  }
                }
                
                onVectorDataUpload(vectorData)
                
                // Also create a fallback image for compatibility
                try {
setProcessingStatus('Creating preview image...')
                base64String = await pdfToImage(file, 3)
                  localStorage.setItem(storageKey, base64String)
                  onMapUpload(base64String)
                } catch (imgError) {
                  console.warn('Could not create fallback image, using vector data only:', imgError)
                  // Continue with vector data only
                }
                
                setProcessingStatus('Complete!')
                
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
                setIsProcessing(false)
                return
              } else {
                // Vector extraction seems incomplete - use high-res image instead
                console.warn(`Vector extraction incomplete (${vectorData.paths.length} paths, ${vectorData.texts.length} texts).`)
                console.warn('This PDF likely uses Form XObjects (nested content) which PDF.js operator list cannot access.')
                console.warn('Falling back to high-resolution image rendering (scale 4) for maximum accuracy...')
                setProcessingStatus('Vector extraction incomplete, rendering high-resolution image...')
                // Fall through to image conversion
              }
            }
          }
          
          // Convert PDF to high-res image (for non-vector PDFs, incomplete vector extraction, or when SVG disabled)
          // Use scale 4 for architectural drawings to ensure all lines are crisp
          if (!base64String) {
            setProcessingStatus('Rendering PDF to high-resolution image (this may take a moment)...')
            base64String = await pdfToImage(file, 6)
          }
        } catch (pdfError) {
          console.error('PDF processing error:', pdfError)
          throw new Error(
            pdfError instanceof Error 
              ? `Failed to process PDF: ${pdfError.message}` 
              : 'Failed to process PDF. Please ensure the file is a valid PDF.'
          )
        }
      } else {
        // Handle regular image files
        setProcessingStatus('Reading image file...')
        base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            if (result) {
              resolve(result)
            } else {
              reject(new Error('Failed to read file'))
            }
          }
          reader.onerror = () => {
            reject(new Error('Error reading file'))
          }
          reader.readAsDataURL(file)
        })
      }

      // Store image data - use IndexedDB for large images to avoid localStorage quota
      setProcessingStatus('Saving map data...')
      const storageKey = getStorageKey()
      const IMAGE_SIZE_THRESHOLD = 100000 // ~100KB - store larger images in IndexedDB
      
      if (base64String.length > IMAGE_SIZE_THRESHOLD && activeStoreId) {
        // Large image - store in IndexedDB
        try {
          // Convert base64 to Blob
          const response = await fetch(base64String)
          const blob = await response.blob()
          
          // Store in IndexedDB
          const imageId = await storeImage(
            activeStoreId,
            blob,
            file.name,
            blob.type || 'image/png'
          )
          
          // Store only the reference in localStorage
          const reference = `indexeddb:${imageId}`
          localStorage.setItem(storageKey, reference)
          
          // Return the data URL for immediate use (it's already in memory)
          onMapUpload(base64String)
        } catch (error) {
          console.error('Failed to store image in IndexedDB:', error)
          // Fallback: try to store in localStorage anyway (might fail if too large)
          try {
            localStorage.setItem(storageKey, base64String)
            onMapUpload(base64String)
          } catch (storageError) {
            throw new Error('Image is too large to store. Please use a smaller image or clear browser storage.')
          }
        }
      } else {
        // Small image - can store in localStorage
        try {
          localStorage.setItem(storageKey, base64String)
          onMapUpload(base64String)
        } catch (error) {
          // If localStorage fails, try IndexedDB as fallback
          if (activeStoreId && base64String.length > 0) {
            try {
              const response = await fetch(base64String)
              const blob = await response.blob()
              const imageId = await storeImage(
                activeStoreId,
                blob,
                file.name,
                blob.type || 'image/png'
              )
              const reference = `indexeddb:${imageId}`
              localStorage.setItem(storageKey, reference)
              onMapUpload(base64String)
            } catch (indexedDBError) {
              throw new Error('Failed to save image. Storage may be full. Please clear browser storage and try again.')
            }
          } else {
            throw error
          }
        }
      }
      
      setProcessingStatus('Complete!')
      
      // Reset input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('File processing error:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'An error occurred while processing the file. Please try again.'
      )
      setProcessingStatus('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      // Small delay to show "Complete!" message
      setTimeout(() => {
        setIsProcessing(false)
        setProcessingStatus('')
      }, 500)
    }
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

  const handleUpload = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      console.error('File input ref is not available')
      setError('File input is not ready. Please try again.')
    }
  }

  const handleLoadDefault = async () => {
    // Prevent double-clicks
    if (isProcessing) {
      console.log('Already processing, ignoring click')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    setProcessingStatus('Loading sample floor plan...')
    
    try {
      // Load one of the sample PDF floor plans
      const samplePdfPath = '/floorplans/WMT 157 STORE PLAN (1).pdf'
      
      console.log('Fetching sample floor plan from:', samplePdfPath)
      
      // Fetch the PDF file with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      let response: Response
      try {
        response = await fetch(samplePdfPath, { signal: controller.signal })
        clearTimeout(timeoutId)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your network connection and try again.')
        }
        // Network errors (CORS, offline, etc.)
        console.error('Fetch failed:', fetchError)
        throw new Error('Network error: Unable to load the sample floor plan. Please try uploading a file manually.')
      }
      
      if (!response.ok) {
        console.error('Fetch response not OK:', response.status, response.statusText)
        throw new Error(`Failed to load sample floor plan (HTTP ${response.status}). Please try uploading a file manually.`)
      }
      
      setProcessingStatus('Processing PDF...')
      
      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty. Please try uploading a file manually.')
      }
      
      console.log('Downloaded blob size:', blob.size)
      
      const file = new File([blob], 'WMT 157 STORE PLAN (1).pdf', { type: 'application/pdf' })
      
      // Process it like a regular PDF upload
      await handleFileSelect(file)
      
    } catch (err) {
      console.error('Error loading sample floor plan:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to load sample floor plan. Please try uploading manually.'
      )
      setIsProcessing(false)
      setProcessingStatus('')
    }
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

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)] flex items-start gap-3">
            <AlertCircle size={20} className="text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-danger)] mb-1">Upload Error</p>
              <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-4 p-8 border-2 border-dashed rounded-xl transition-all ${
            isProcessing
              ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]/30 opacity-60 cursor-wait'
              : isDragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
              : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {processingStatus || 'Processing file...'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  This may take a moment for large files
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                {isDragging ? 'Drop file here' : 'Drag and drop a file here, or'}
              </p>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isProcessing}
                className="fusion-button fusion-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={20} />
                Choose File
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-[var(--color-border-subtle)]"></div>
          <span className="text-xs text-[var(--color-text-soft)]">OR</span>
          <div className="flex-1 h-px bg-[var(--color-border-subtle)]"></div>
        </div>

        <button
          type="button"
          onClick={handleLoadDefault}
          disabled={isProcessing}
          className="fusion-button w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}
        >
          Load Sample Walmart Floor Plan
        </button>

        <div className="text-sm text-[var(--color-text-soft)] space-y-1">
          <p>Supported formats: PNG, JPG, SVG, PDF</p>
          <p className="text-xs opacity-75">Max file size: 50MB • PDFs will be converted to images</p>
        </div>
      </div>
    </div>
  )
}

