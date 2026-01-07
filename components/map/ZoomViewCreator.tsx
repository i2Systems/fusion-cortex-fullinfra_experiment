/**
 * Zoom View Creator Component
 * 
 * Allows users to create a zoomed-in view of a location by:
 * 1. Selecting a rectangular area on the map
 * 2. Providing a name for the zoom view
 * 3. Creating the zoom view with proper coordinate mapping
 * 
 * AI Note: The zoom view maintains coordinate mapping back to the parent location.
 * IMPORTANT: This component calculates its OWN image bounds based on the modal's
 * container size, not the main map canvas bounds.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, Square } from 'lucide-react'
import type { Location } from '@/lib/locationStorage'

interface ZoomViewCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void
  mapWidth: number
  mapHeight: number
  imageBounds?: { x: number; y: number; width: number; height: number; naturalWidth: number; naturalHeight: number } | null
  mapImageUrl?: string | null
}

// Calculated image bounds for the modal's preview image
interface ModalImageBounds {
  x: number      // Offset from container left
  y: number      // Offset from container top
  width: number  // Rendered width
  height: number // Rendered height
}

export function ZoomViewCreator({
  isOpen,
  onClose,
  onSave,
  mapWidth,
  mapHeight,
  imageBounds,
  mapImageUrl,
}: ZoomViewCreatorProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [viewName, setViewName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Track the actual rendered bounds of the image in the modal
  const [modalImageBounds, setModalImageBounds] = useState<ModalImageBounds | null>(null)

  // Calculate the actual rendered bounds of the image within the modal container
  const calculateModalImageBounds = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return

    const container = containerRef.current
    const img = imageRef.current

    // Get container dimensions
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Get image natural dimensions
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight

    if (naturalWidth === 0 || naturalHeight === 0) return

    // Calculate aspect-ratio-preserving dimensions (same as object-contain)
    const containerAspect = containerWidth / containerHeight
    const imageAspect = naturalWidth / naturalHeight

    let renderedWidth: number
    let renderedHeight: number
    let offsetX: number
    let offsetY: number

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      renderedWidth = containerWidth
      renderedHeight = containerWidth / imageAspect
      offsetX = 0
      offsetY = (containerHeight - renderedHeight) / 2
    } else {
      // Image is taller - fit to height
      renderedHeight = containerHeight
      renderedWidth = containerHeight * imageAspect
      offsetX = (containerWidth - renderedWidth) / 2
      offsetY = 0
    }

    setModalImageBounds({
      x: offsetX,
      y: offsetY,
      width: renderedWidth,
      height: renderedHeight,
    })
  }, [])

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      setViewName('')
      setModalImageBounds(null)
    }
  }, [isOpen])

  // Recalculate image bounds when container/image changes
  useEffect(() => {
    if (!isOpen) return

    // Wait a frame for the modal to render
    const timer = setTimeout(() => {
      calculateModalImageBounds()
    }, 100)

    // Also listen for resize
    window.addEventListener('resize', calculateModalImageBounds)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', calculateModalImageBounds)
    }
  }, [isOpen, mapImageUrl, calculateModalImageBounds])

  if (!isOpen) return null

  // Calculate normalized coordinates (0-1) from pixel coordinates
  // Uses the MODAL's image bounds, not the main map canvas bounds
  const getNormalizedCoords = (x: number, y: number): { x: number; y: number } => {
    if (modalImageBounds) {
      // Convert pixel coordinates to normalized coordinates relative to modal image bounds
      const relativeX = (x - modalImageBounds.x) / modalImageBounds.width
      const relativeY = (y - modalImageBounds.y) / modalImageBounds.height
      return {
        x: Math.max(0, Math.min(1, relativeX)),
        y: Math.max(0, Math.min(1, relativeY)),
      }
    } else if (imageBounds) {
      // Fallback to passed imageBounds if modal bounds not yet calculated
      const relativeX = (x - imageBounds.x) / imageBounds.width
      const relativeY = (y - imageBounds.y) / imageBounds.height
      return {
        x: Math.max(0, Math.min(1, relativeX)),
        y: Math.max(0, Math.min(1, relativeY)),
      }
    } else {
      // Last fallback to container dimensions
      const container = containerRef.current
      const containerWidth = container?.clientWidth || mapWidth
      const containerHeight = container?.clientHeight || mapHeight
      return {
        x: Math.max(0, Math.min(1, x / containerWidth)),
        y: Math.max(0, Math.min(1, y / containerHeight)),
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsSelecting(true)
    setSelectionStart({ x, y })
    setSelectionEnd({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setSelectionEnd({ x, y })
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  const handleSave = () => {
    if (!selectionStart || !selectionEnd || !viewName.trim()) return

    const start = getNormalizedCoords(selectionStart.x, selectionStart.y)
    const end = getNormalizedCoords(selectionEnd.x, selectionEnd.y)

    const bounds = {
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y),
    }

    // Ensure minimum size
    if (bounds.maxX - bounds.minX < 0.05 || bounds.maxY - bounds.minY < 0.05) {
      alert('Selection area is too small. Please select a larger area.')
      return
    }

    onSave(viewName.trim(), bounds)
    onClose()
  }

  const selectionBox = selectionStart && selectionEnd ? (
    (() => {
      const minX = Math.min(selectionStart.x, selectionEnd.x)
      const maxX = Math.max(selectionStart.x, selectionEnd.x)
      const minY = Math.min(selectionStart.y, selectionEnd.y)
      const maxY = Math.max(selectionStart.y, selectionEnd.y)
      const width = maxX - minX
      const height = maxY - minY

      return (
        <div
          className="absolute border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 pointer-events-none"
          style={{
            left: minX,
            top: minY,
            width,
            height,
          }}
        >
          <div className="absolute -top-6 left-0 text-xs text-[var(--color-primary)] font-medium whitespace-nowrap">
            {width.toFixed(0)} × {height.toFixed(0)} px
          </div>
        </div>
      )
    })()
  ) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-strong)] w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <Square size={20} className="text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Create Zoom View
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-[var(--color-primary-soft)]/20 border-b border-[var(--color-border-subtle)]">
          <p className="text-sm text-[var(--color-text)]">
            Click and drag on the map below to select the area you want to zoom into.
            This will create a new view focused on that section for precise device placement.
          </p>
        </div>

        {/* Map selection area */}
        <div className="flex-1 relative overflow-hidden bg-[var(--color-bg-elevated)]">
          <div
            ref={containerRef}
            className="w-full h-full cursor-crosshair relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ minHeight: '400px' }}
          >
            {/* Map image background */}
            {mapImageUrl && (
              <img
                ref={imageRef}
                src={mapImageUrl}
                alt="Floor plan"
                className="absolute inset-0 w-full h-full object-contain opacity-60"
                style={{ pointerEvents: 'none' }}
                onLoad={calculateModalImageBounds}
              />
            )}

            {/* Selection overlay */}
            {selectionBox}

            {/* Hint text */}
            {!selectionStart && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm">
                <div className="text-center">
                  <Square size={48} className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-50" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Click and drag to select area
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Name input and actions */}
        <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Zoom View Name
            </label>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., Main Floor - Entrance Area"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectionStart || !selectionEnd || !viewName.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Check size={16} />
              Create Zoom View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

