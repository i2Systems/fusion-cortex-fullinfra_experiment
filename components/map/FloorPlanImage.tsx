/**
 * Floor Plan Image Component
 * 
 * Renders a floor plan image with aspect ratio preservation.
 * Calculates and reports actual image bounds for responsive coordinate conversion.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Image as KonvaImage, Group } from 'react-konva'

export interface ImageBounds {
  x: number
  y: number
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

interface FloorPlanImageProps {
  url: string
  width: number
  height: number
  onImageBoundsChange?: (bounds: ImageBounds) => void
  zoomBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
}

export function FloorPlanImage({ url, width, height, onImageBoundsChange, zoomBounds }: FloorPlanImageProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      
      // Calculate aspect-ratio preserving dimensions
      const naturalAspect = img.naturalWidth / img.naturalHeight
      const canvasAspect = width / height
      
      let renderedWidth: number
      let renderedHeight: number
      let offsetX: number
      let offsetY: number
      
      if (naturalAspect > canvasAspect) {
        // Image is wider - fit to width
        renderedWidth = width
        renderedHeight = width / naturalAspect
        offsetX = 0
        offsetY = (height - renderedHeight) / 2
      } else {
        // Image is taller - fit to height
        renderedWidth = height * naturalAspect
        renderedHeight = height
        offsetX = (width - renderedWidth) / 2
        offsetY = 0
      }
      
      // Notify parent of actual image bounds
      onImageBoundsChange?.({
        x: offsetX,
        y: offsetY,
        width: renderedWidth,
        height: renderedHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      })
    }
    img.src = url
  }, [url, width, height, onImageBoundsChange])

  // Calculate aspect-ratio preserving dimensions
  const imageBounds = useMemo(() => {
    if (!image) return null
    
    const naturalAspect = image.naturalWidth / image.naturalHeight
    const canvasAspect = width / height
    
    let renderedWidth: number
    let renderedHeight: number
    let offsetX: number
    let offsetY: number
    
    if (naturalAspect > canvasAspect) {
      // Image is wider - fit to width
      renderedWidth = width
      renderedHeight = width / naturalAspect
      offsetX = 0
      offsetY = (height - renderedHeight) / 2
    } else {
      // Image is taller - fit to height
      renderedWidth = height * naturalAspect
      renderedHeight = height
      offsetX = (width - renderedWidth) / 2
      offsetY = 0
    }
    
    return { x: offsetX, y: offsetY, width: renderedWidth, height: renderedHeight }
  }, [image, width, height])

  // Calculate zoomed view if zoom bounds are provided
  const zoomedBounds = useMemo(() => {
    if (!imageBounds || !zoomBounds) return imageBounds
    
    // Calculate the actual pixel coordinates of the zoom area within the rendered image
    const zoomMinX = imageBounds.x + zoomBounds.minX * imageBounds.width
    const zoomMinY = imageBounds.y + zoomBounds.minY * imageBounds.height
    const zoomWidth = (zoomBounds.maxX - zoomBounds.minX) * imageBounds.width
    const zoomHeight = (zoomBounds.maxY - zoomBounds.minY) * imageBounds.height
    
    return {
      x: zoomMinX,
      y: zoomMinY,
      width: zoomWidth,
      height: zoomHeight,
    }
  }, [imageBounds, zoomBounds])

  const displayBounds = zoomedBounds || imageBounds

  if (!image || !displayBounds) return null

  // If zoom bounds are provided, we need to transform the image to show only the zoomed area
  if (zoomBounds && imageBounds) {
    // Calculate the crop area in the source image
    const cropX = zoomBounds.minX * imageBounds.width
    const cropY = zoomBounds.minY * imageBounds.height
    const cropWidth = (zoomBounds.maxX - zoomBounds.minX) * imageBounds.width
    const cropHeight = (zoomBounds.maxY - zoomBounds.minY) * imageBounds.height
    
    // Scale to fill the canvas with the cropped area
    const scaleX = width / cropWidth
    const scaleY = height / cropHeight
    const scale = Math.min(scaleX, scaleY)
    
    // Calculate position to center the cropped area
    const scaledWidth = cropWidth * scale
    const scaledHeight = cropHeight * scale
    const offsetX = (width - scaledWidth) / 2 - cropX * scale
    const offsetY = (height - scaledHeight) / 2 - cropY * scale
    
    return (
      <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
        <KonvaImage
          image={image}
          x={offsetX}
          y={offsetY}
          width={imageBounds.width * scale}
          height={imageBounds.height * scale}
          opacity={0.8}
        />
      </Group>
    )
  }

  // Normal display without zoom
  if (!imageBounds) return null
  
  return (
    <KonvaImage
      image={image}
      x={imageBounds.x}
      y={imageBounds.y}
      width={imageBounds.width}
      height={imageBounds.height}
      opacity={0.8}
    />
  )
}

