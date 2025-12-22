/**
 * BACnet Zone Canvas Component
 * 
 * Extended ZoneCanvas with BACnet status indicators on zones
 */

'use client'

import { Stage, Layer, Circle, Image as KonvaImage, Group, Text, Rect, Line } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { FloorPlanImage, type ImageBounds } from '@/components/map/FloorPlanImage'
import { VectorFloorPlan } from '@/components/map/VectorFloorPlan'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'

interface DevicePoint {
  id: string
  x: number
  y: number
  type: 'fixture' | 'motion' | 'light-sensor'
  deviceId: string
  status: string
  signal: number
  location?: string
}

interface Zone {
  id: string
  name: string
  color: string
  polygon: Array<{ x: number; y: number }>
}

interface BACnetMapping {
  zoneId: string
  zoneName: string
  bacnetObjectId: string | null
  status: 'connected' | 'error' | 'not-assigned'
  deviceCount?: number
}

interface BACnetZoneCanvasProps {
  zones: Zone[]
  devices: DevicePoint[]
  mappings: BACnetMapping[]
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
  devicesData?: any[]
}


export function BACnetZoneCanvas({
  zones,
  devices,
  mappings,
  mapImageUrl,
  vectorData,
  selectedZoneId,
  onZoneSelect,
  devicesData = []
}: BACnetZoneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null)
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  
  // Convert normalized coordinates to canvas coordinates using actual image bounds
  const toCanvasCoords = useCallback((point: { x: number; y: number }) => {
    if (imageBounds) {
      return {
        x: imageBounds.x + point.x * imageBounds.width,
        y: imageBounds.y + point.y * imageBounds.height,
      }
    } else {
      return {
        x: point.x * dimensions.width,
        y: point.y * dimensions.height,
      }
    }
  }, [imageBounds, dimensions])
  const [colors, setColors] = useState({
    primary: '#4c7dff',
    accent: '#f97316',
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    muted: '#9ca3af',
    text: '#ffffff',
  })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(rect.width, 400),
          height: Math.max(rect.height, 400),
        })
      }
    }

    const updateColors = () => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      setColors({
        primary: computedStyle.getPropertyValue('--color-primary').trim() || '#4c7dff',
        accent: computedStyle.getPropertyValue('--color-accent').trim() || '#f97316',
        success: computedStyle.getPropertyValue('--color-success').trim() || '#22c55e',
        warning: computedStyle.getPropertyValue('--color-warning').trim() || '#eab308',
        danger: computedStyle.getPropertyValue('--color-danger').trim() || '#ef4444',
        muted: computedStyle.getPropertyValue('--color-text-muted').trim() || '#9ca3af',
        text: computedStyle.getPropertyValue('--color-text').trim() || '#ffffff',
      })
    }

    updateDimensions()
    updateColors()
    
    // Use ResizeObserver to respond to container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    window.addEventListener('resize', updateDimensions)
    
    const mutationObserver = new MutationObserver(updateColors)
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
      mutationObserver.disconnect()
    }
  }, [])

  const getDeviceColor = (type: string) => {
    switch (type) {
      case 'fixture':
        return colors.primary
      case 'motion':
        return colors.accent
      case 'light-sensor':
        return colors.success
      default:
        return colors.muted
    }
  }

  const getBACnetStatusColor = (status: BACnetMapping['status']) => {
    switch (status) {
      case 'connected':
        return colors.success
      case 'error':
        return colors.warning
      case 'not-assigned':
        return colors.muted
    }
  }


  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={scale}
        scaleY={scale}
        draggable={true}
        onDragEnd={(e) => {
          setStagePosition({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={(e) => {
          // Handle trackpad/mouse wheel zoom
          e.evt.preventDefault()
          
          const stage = e.target.getStage()
          if (!stage) return
          
          const pointerPos = stage.getPointerPosition()
          if (!pointerPos) return
          
          // Get wheel delta (positive = zoom in, negative = zoom out)
          const deltaY = e.evt.deltaY
          
          // Determine zoom direction (trackpad: negative deltaY = zoom in, positive = zoom out)
          // Mouse wheel: positive deltaY = scroll down = zoom out
          const zoomFactor = deltaY > 0 ? 0.9 : 1.1
          const newScale = Math.max(0.1, Math.min(10, scale * zoomFactor))
          
          // Calculate mouse position relative to stage
          const mouseX = (pointerPos.x - stagePosition.x) / scale
          const mouseY = (pointerPos.y - stagePosition.y) / scale
          
          // Calculate new position to zoom towards mouse point
          const newX = pointerPos.x - mouseX * newScale
          const newY = pointerPos.y - mouseY * newScale
          
          setScale(newScale)
          setStagePosition({ x: newX, y: newY })
        }}
      >
        {/* Background Layer */}
        <Layer>
          {/* Vector floor plan (preferred) */}
          {vectorData && (
            <VectorFloorPlan
              vectorData={vectorData}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
          {/* Image floor plan (fallback) */}
          {!vectorData && mapImageUrl && (
            <FloorPlanImage 
              url={mapImageUrl} 
              width={dimensions.width} 
              height={dimensions.height}
              onImageBoundsChange={setImageBounds}
            />
          )}
        </Layer>

        {/* Zones Layer */}
        <Layer>
          {zones.map((zone) => {
            const mapping = mappings.find(m => m.zoneId === zone.id)
            const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])
            const isSelected = selectedZoneId === zone.id
            const isHovered = hoveredZone?.id === zone.id
            const statusColor = mapping ? getBACnetStatusColor(mapping.status) : colors.muted
            
            // Calculate center point for status indicator
            const centerX = points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (points.length / 2)
            const centerY = points.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (points.length / 2)
            
            return (
              <Group key={zone.id}>
                <Line
                  points={points}
                  fill={`${zone.color}40`}
                  stroke={isSelected ? statusColor : zone.color}
                  strokeWidth={isSelected ? 4 : (isHovered ? 3 : 2)}
                  closed
                  onClick={() => onZoneSelect?.(zone.id)}
                  onTap={() => onZoneSelect?.(zone.id)}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                />
                
                {/* BACnet Status Indicator */}
                {mapping && (
                  <Group x={centerX} y={centerY - 25}>
                    <Circle
                      x={0}
                      y={0}
                      radius={8}
                      fill={statusColor}
                      stroke={colors.text}
                      strokeWidth={2}
                      shadowBlur={8}
                      shadowColor={statusColor}
                      opacity={0.9}
                    />
                    {/* Status icon representation */}
                    {mapping.status === 'connected' && (
                      <Text
                        x={-4}
                        y={-6}
                        text="✓"
                        fontSize={12}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontStyle="bold"
                        fill={colors.text}
                        align="center"
                        listening={false}
                      />
                    )}
                    {mapping.status === 'error' && (
                      <Text
                        x={-4}
                        y={-6}
                        text="!"
                        fontSize={12}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontStyle="bold"
                        fill={colors.text}
                        align="center"
                        listening={false}
                      />
                    )}
                    {mapping.status === 'not-assigned' && (
                      <Text
                        x={-4}
                        y={-6}
                        text="—"
                        fontSize={12}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontStyle="bold"
                        fill={colors.text}
                        align="center"
                        listening={false}
                      />
                    )}
                  </Group>
                )}
                
                {/* Zone Label */}
                {(isSelected || isHovered) && (
                  <Text
                    x={points[0]}
                    y={points[1] - 20}
                    text={`${zone.name}${mapping?.bacnetObjectId ? ` (${mapping.bacnetObjectId})` : ''}`}
                    fontSize={14}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={isSelected ? statusColor : zone.color}
                    padding={4}
                    align="left"
                    listening={false}
                  />
                )}
              </Group>
            )
          })}
        </Layer>

        {/* Devices Layer - Always on top */}
        <Layer>
          {devices.map((device) => {
            const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
            
            return (
              <Group key={device.id}>
                <Circle
                  x={deviceCoords.x}
                  y={deviceCoords.y}
                  radius={3}
                  fill={getDeviceColor(device.type)}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={1}
                  opacity={0.5}
                  listening={false}
                />
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

