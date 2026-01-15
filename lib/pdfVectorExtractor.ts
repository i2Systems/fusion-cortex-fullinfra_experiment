/**
 * PDF Vector Types
 * 
 * Type definitions for extracted vector data from PDFs.
 * Used by light detection and map context.
 */

export interface ExtractedText {
  x: number
  y: number
  text: string
  fontSize: number
  fontName: string
  rotation?: number // Rotation angle in degrees (0 = horizontal, 90 = vertical)
}

export interface ExtractedPath {
  type: 'line' | 'rect' | 'circle' | 'path'
  points: number[] // [x1, y1, x2, y2, ...] or path commands
  stroke?: string
  fill?: string
  strokeWidth?: number
  layer?: string // Layer type: 'walls', 'annotations', 'dimensions', 'structure', 'text'
}

export interface ExtractedVectorData {
  texts: ExtractedText[]
  paths: ExtractedPath[]
  bounds: { width: number; height: number }
  isVector: boolean
}
