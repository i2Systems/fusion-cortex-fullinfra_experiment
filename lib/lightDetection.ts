/**
 * Light Detection System
 * 
 * Analyzes PDF data and rendered images to detect light fixture locations
 * and automatically place device objects at those positions
 */

import { generateComponentsForFixture, generateWarrantyExpiry } from './deviceUtils'

/**
 * Analyzes PDF data to determine if it contains light symbols
 * Returns a report of what was found
 */
export function analyzePDFForLights(vectorData: ExtractedVectorData | null): {
  hasLights: boolean
  circleCount: number
  smallRectCount: number
  lightKeywords: number
  totalPaths: number
  totalTexts: number
  report: string
} {
  if (!vectorData) {
    return {
      hasLights: false,
      circleCount: 0,
      smallRectCount: 0,
      lightKeywords: 0,
      totalPaths: 0,
      totalTexts: 0,
      report: 'No vector data available. PDF may use Form XObjects (nested content) which cannot be analyzed directly.'
    }
  }
  
  let circleCount = 0
  let smallRectCount = 0
  let lightKeywords = 0
  
  // Count circles
  vectorData.paths.forEach(path => {
    if (path.type === 'path' && path.points.length >= 6 && path.points.length <= 20) {
      const points = path.points
      const xs = points.filter((_, i) => i % 2 === 0)
      const ys = points.filter((_, i) => i % 2 === 1)
      const width = Math.max(...xs) - Math.min(...xs)
      const height = Math.max(...ys) - Math.min(...ys)
      const aspectRatio = width / height
      const size = Math.max(width, height)
      
      if (aspectRatio > 0.7 && aspectRatio < 1.3 && size > 2 && size < 100) {
        circleCount++
      }
    } else if (path.type === 'rect' && path.points.length >= 4) {
      const [x, y, w, h] = path.points
      const size = Math.max(w, h)
      if (size > 2 && size < 50) {
        smallRectCount++
      }
    }
  })
  
  // Count light-related keywords
  const lightKeywordsList = ['LIGHT', 'FIXTURE', 'LED', 'LAMP', 'F', 'L', 'LT']
  vectorData.texts.forEach(text => {
    const textUpper = text.text.toUpperCase().trim()
    if (lightKeywordsList.some(keyword => textUpper.includes(keyword))) {
      lightKeywords++
    }
  })
  
  const hasLights = circleCount > 0 || smallRectCount > 10 || lightKeywords > 0
  
  let report = `PDF Analysis:\n`
  report += `- Total paths: ${vectorData.paths.length}\n`
  report += `- Total text items: ${vectorData.texts.length}\n`
  report += `- Circular shapes (potential lights): ${circleCount}\n`
  report += `- Small rectangles (potential fixtures): ${smallRectCount}\n`
  report += `- Light-related keywords: ${lightKeywords}\n`
  
  if (vectorData.paths.length === 0) {
    report += `\n⚠️ WARNING: No paths extracted. This PDF likely uses Form XObjects.\n`
    report += `Vector extraction cannot access nested content. Image-based detection will be used instead.`
  } else if (!hasLights) {
    report += `\n⚠️ No obvious light symbols detected in vector data.\n`
    report += `Lights may be in Form XObjects or use symbols we don't recognize.\n`
    report += `Image-based detection will attempt to find light patterns.`
  } else {
    report += `\n✅ Light symbols detected! Auto-detection should work.`
  }
  
  return {
    hasLights,
    circleCount,
    smallRectCount,
    lightKeywords,
    totalPaths: vectorData.paths.length,
    totalTexts: vectorData.texts.length,
    report
  }
}

import type { ExtractedVectorData } from './pdfVectorExtractor'
import type { Device } from './mockData'

export interface LightLocation {
  x: number // Normalized 0-1
  y: number // Normalized 0-1
  confidence: number // 0-1
  type: 'fixture' | 'motion' | 'light-sensor'
  size?: number // Approximate size in pixels
}

/**
 * Analyzes extracted vector data to find light symbols
 * Looks for:
 * - Circles (common light symbol)
 * - Small rectangles (fixture symbols)
 * - Text labels containing light-related keywords
 */
export function detectLightsFromVectorData(
  vectorData: ExtractedVectorData,
  imageWidth: number,
  imageHeight: number
): LightLocation[] {
  const lights: LightLocation[] = []
  
  // Normalize coordinates from PDF space to 0-1
  const normalizeX = (x: number) => x / vectorData.bounds.width
  const normalizeY = (y: number) => y / vectorData.bounds.height
  
  // 1. Look for circles (common light fixture symbol)
  vectorData.paths.forEach((path, idx) => {
    if (path.type === 'path' && path.points.length >= 6) {
      // Check if path forms a circle (roughly circular shape)
      const points = path.points
      if (points.length >= 6 && points.length <= 20) {
        // Get bounding box
        const xs = points.filter((_, i) => i % 2 === 0)
        const ys = points.filter((_, i) => i % 2 === 1)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        
        const width = maxX - minX
        const height = maxY - minY
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        
        // Check if roughly circular (aspect ratio close to 1, small size)
        const aspectRatio = width / height
        const size = Math.max(width, height)
        
        // Light symbols are typically small circles (5-50 pixels at scale 1)
        if (aspectRatio > 0.7 && aspectRatio < 1.3 && size > 2 && size < 100) {
          lights.push({
            x: normalizeX(centerX),
            y: normalizeY(centerY),
            confidence: 0.7,
            type: 'fixture',
            size: size,
          })
        }
      }
    } else if (path.type === 'rect' && path.points.length >= 4) {
      const [x, y, w, h] = path.points
      const size = Math.max(w, h)
      
      // Small rectangles are often light fixtures
      if (size > 2 && size < 50) {
        lights.push({
          x: normalizeX(x + w / 2),
          y: normalizeY(y + h / 2),
          confidence: 0.6,
          type: 'fixture',
          size: size,
        })
      }
    }
  })
  
  // 2. Look for text labels that might indicate lights
  const lightKeywords = ['LIGHT', 'FIXTURE', 'LED', 'LAMP', 'F', 'L', 'LT']
  vectorData.texts.forEach((text) => {
    const textUpper = text.text.toUpperCase().trim()
    
    // Check if text contains light-related keywords
    if (lightKeywords.some(keyword => textUpper.includes(keyword))) {
      lights.push({
        x: normalizeX(text.x),
        y: normalizeY(text.y),
        confidence: 0.5,
        type: 'fixture',
      })
    }
    
    // Single letters or numbers near small shapes might be light labels
    if (textUpper.length <= 2 && text.fontSize < 20) {
      // Check if there's a nearby path (within 20 pixels)
      const nearbyPath = vectorData.paths.find(path => {
        if (path.type === 'rect' && path.points.length >= 4) {
          const [px, py] = path.points
          const distance = Math.sqrt((text.x - px) ** 2 + (text.y - py) ** 2)
          return distance < 30
        }
        return false
      })
      
      if (nearbyPath) {
        lights.push({
          x: normalizeX(text.x),
          y: normalizeY(text.y),
          confidence: 0.4,
          type: 'fixture',
        })
      }
    }
  })
  
  // Remove duplicates (lights very close to each other)
  const uniqueLights: LightLocation[] = []
  lights.forEach(light => {
    const isDuplicate = uniqueLights.some(existing => {
      const distance = Math.sqrt(
        (light.x - existing.x) ** 2 + (light.y - existing.y) ** 2
      )
      return distance < 0.01 // Within 1% of image size
    })
    
    if (!isDuplicate) {
      uniqueLights.push(light)
    }
  })
  
  return uniqueLights
}

/**
 * Detects lights from a rendered image using canvas image processing
 * IMPROVED: Specifically looks for vertical dashed lines (common light fixture pattern)
 */
export async function detectLightsFromImage(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number
): Promise<LightLocation[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve([])
        return
      }
      
      canvas.width = imageWidth
      canvas.height = imageHeight
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
      
      const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight)
      const lights: LightLocation[] = []
      const threshold = 50 // Dark pixel threshold
      const minLineLength = 10 // Minimum pixels for a line segment
      const gapTolerance = 5 // Max gap in dashed lines
      
      // IMPROVED: Scan for vertical dashed lines (these are the light fixtures!)
      // Architectural PDFs often show lights as vertical dashed lines in a grid
      const verticalLines: Array<{ x: number; segments: Array<{ start: number; end: number }> }> = []
      
      for (let x = 0; x < imageWidth; x += 2) { // Sample every 2 pixels for performance
        const segments: Array<{ start: number; end: number }> = []
        let lineStart = -1
        let gapCount = 0
        
        for (let y = 0; y < imageHeight; y++) {
          const idx = (y * imageWidth + x) * 4
          const r = imageData.data[idx]
          const g = imageData.data[idx + 1]
          const b = imageData.data[idx + 2]
          const brightness = (r + g + b) / 3
          
          if (brightness < threshold) {
            gapCount = 0
            if (lineStart === -1) {
              lineStart = y
            }
          } else {
            gapCount++
            if (gapCount > gapTolerance) {
              if (lineStart !== -1 && y - lineStart - gapCount >= 2) {
                segments.push({ start: lineStart, end: y - gapCount })
              }
              lineStart = -1
              gapCount = 0
            }
          }
        }
        
        // Handle segment at end
        if (lineStart !== -1 && imageHeight - lineStart >= 2) {
          segments.push({ start: lineStart, end: imageHeight })
        }
        
        // If we have multiple segments, it's likely a dashed vertical line (light fixture)
        if (segments.length >= 2) {
          // Calculate total line length
          let totalLength = 0
          segments.forEach(seg => {
            totalLength += seg.end - seg.start
          })
          
          // If total length is significant, it's a light fixture
          if (totalLength >= minLineLength) {
            // Use the middle Y coordinate of all segments
            const avgY = segments.reduce((sum, seg) => sum + (seg.start + seg.end) / 2, 0) / segments.length
            verticalLines.push({ x, segments })
            
            lights.push({
              x: x / imageWidth,
              y: avgY / imageHeight,
              confidence: Math.min(0.9, 0.5 + (segments.length / 10)), // More segments = higher confidence
              type: 'fixture',
            })
          }
        } else if (segments.length === 1 && segments[0].end - segments[0].start >= minLineLength) {
          // Single solid vertical line (also could be a light)
          const seg = segments[0]
          const centerY = (seg.start + seg.end) / 2
          lights.push({
            x: x / imageWidth,
            y: centerY / imageHeight,
            confidence: 0.6,
            type: 'fixture',
          })
        }
      }
      
      // Also look for horizontal patterns (less common but still possible)
      for (let y = 0; y < imageHeight; y += 2) {
        const segments: Array<{ start: number; end: number }> = []
        let lineStart = -1
        let gapCount = 0
        
        for (let x = 0; x < imageWidth; x++) {
          const idx = (y * imageWidth + x) * 4
          const r = imageData.data[idx]
          const g = imageData.data[idx + 1]
          const b = imageData.data[idx + 2]
          const brightness = (r + g + b) / 3
          
          if (brightness < threshold) {
            gapCount = 0
            if (lineStart === -1) {
              lineStart = x
            }
          } else {
            gapCount++
            if (gapCount > gapTolerance) {
              if (lineStart !== -1 && x - lineStart - gapCount >= 2) {
                segments.push({ start: lineStart, end: x - gapCount })
              }
              lineStart = -1
              gapCount = 0
            }
          }
        }
        
        if (lineStart !== -1 && imageWidth - lineStart >= 2) {
          segments.push({ start: lineStart, end: imageWidth })
        }
        
        if (segments.length >= 2) {
          const totalLength = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
          if (totalLength >= minLineLength) {
            const avgX = segments.reduce((sum, seg) => sum + (seg.start + seg.end) / 2, 0) / segments.length
            lights.push({
              x: avgX / imageWidth,
              y: y / imageHeight,
              confidence: 0.5,
              type: 'fixture',
            })
          }
        }
      }
      
      // Remove duplicates (lights very close to each other)
      const uniqueLights = lights
        .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
        .filter((light, idx, arr) => {
          return !arr.slice(0, idx).some(existing => {
            const distance = Math.sqrt(
              (light.x - existing.x) ** 2 + (light.y - existing.y) ** 2
            )
            return distance < 0.015 // Within 1.5% of image size
          })
        })
      
      console.log(`Image detection found ${uniqueLights.length} potential light fixtures (vertical lines: ${verticalLines.length})`)
      resolve(uniqueLights)
    }
    
    img.onerror = () => {
      resolve([])
    }
    
    img.src = imageUrl
  })
}

/**
 * Combines vector and image detection for best results
 */
export async function detectAllLights(
  vectorData: ExtractedVectorData | null,
  imageUrl: string | null,
  imageWidth: number,
  imageHeight: number
): Promise<LightLocation[]> {
  const allLights: LightLocation[] = []
  
  // Try vector detection first (more accurate if available)
  if (vectorData && vectorData.paths.length > 0) {
    const vectorLights = detectLightsFromVectorData(vectorData, imageWidth, imageHeight)
    allLights.push(...vectorLights)
    console.log(`Detected ${vectorLights.length} lights from vector data`)
  }
  
  // Fall back to image detection
  if (imageUrl && allLights.length === 0) {
    const imageLights = await detectLightsFromImage(imageUrl, imageWidth, imageHeight)
    allLights.push(...imageLights)
    console.log(`Detected ${imageLights.length} lights from image analysis`)
  }
  
  // Remove duplicates and sort by confidence
  const uniqueLights = allLights
    .sort((a, b) => b.confidence - a.confidence)
    .filter((light, idx, arr) => {
      return !arr.slice(0, idx).some(existing => {
        const distance = Math.sqrt(
          (light.x - existing.x) ** 2 + (light.y - existing.y) ** 2
        )
        return distance < 0.015 // Within 1.5% of image size
      })
    })
  
  console.log(`Total unique lights detected: ${uniqueLights.length}`)
  return uniqueLights
}

/**
 * Converts detected light locations to Device objects
 */
export function createDevicesFromLights(
  lights: LightLocation[],
  baseDeviceId: number = 1
): Device[] {
  return lights.map((light, idx) => {
    const deviceId = `light-${baseDeviceId + idx}`
    const serialNumber = `SN${String(baseDeviceId + idx).padStart(6, '0')}`
    const warrantyExpiry = generateWarrantyExpiry()
    
    return {
      id: deviceId,
      deviceId: String(baseDeviceId + idx),
      serialNumber,
      type: light.type,
      signal: Math.floor(70 + Math.random() * 30), // 70-100
      status: Math.random() > 0.1 ? 'online' : 'offline', // 90% online
      location: `Auto-detected ${light.type}`,
      x: light.x,
      y: light.y,
      orientation: 0,
      locked: false,
      // Generate components for fixtures
      components: light.type === 'fixture' 
        ? generateComponentsForFixture(deviceId, serialNumber, warrantyExpiry)
        : undefined,
      warrantyStatus: 'Active',
      warrantyExpiry,
    }
  })
}

