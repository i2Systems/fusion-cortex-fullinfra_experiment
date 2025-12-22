/**
 * Rules Zone Canvas Component
 * 
 * Extended ZoneCanvas with rule indicators on zones
 */

'use client'

import { Stage, Layer, Circle, Group, Text, Rect, Line } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { FloorPlanImage, type ImageBounds } from '@/components/map/FloorPlanImage'
import { VectorFloorPlan } from '@/components/map/VectorFloorPlan'
import { Rule } from '@/lib/mockRules'
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

interface RulesZoneCanvasProps {
  zones: Zone[]
  devices: DevicePoint[]
  rules: Rule[]
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  selectedZoneName?: string | null
  onZoneSelect?: (zoneName: string | null) => void
  devicesData?: any[]
}

export function RulesZoneCanvas({
  zones,
  devices,
  rules,
  mapImageUrl,
  vectorData,
  selectedZoneName,
  onZoneSelect,
  devicesData = []
}: RulesZoneCanvasProps) {
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

  // Get rules for a zone
  const getZoneRules = (zoneName: string) => {
    return rules.filter(rule => 
      rule.condition.zone === zoneName || 
      rule.targetName === zoneName ||
      rule.action.zones?.includes(zoneName) ||
      false
    )
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
            const zoneRules = getZoneRules(zone.name)
            const hasRules = zoneRules.length > 0
            const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])
            const isSelected = selectedZoneName === zone.name
            const isHovered = hoveredZone?.id === zone.id
            
            // Calculate center point for rule indicator
            const centerX = points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (points.length / 2)
            const centerY = points.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (points.length / 2)
            
            return (
              <Group key={zone.id}>
                <Line
                  points={points}
                  fill={`${zone.color}${hasRules ? '60' : '40'}`}
                  stroke={isSelected ? colors.primary : zone.color}
                  strokeWidth={isSelected ? 4 : (isHovered ? 3 : 2)}
                  closed
                  onClick={() => onZoneSelect?.(zone.name)}
                  onTap={() => onZoneSelect?.(zone.name)}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                />
                
                {/* Rule Count Indicator */}
                {hasRules && (
                  <Group x={centerX} y={centerY - 25}>
                    <Circle
                      x={0}
                      y={0}
                      radius={10}
                      fill={colors.primary}
                      stroke={colors.text}
                      strokeWidth={2}
                      shadowBlur={8}
                      shadowColor={colors.primary}
                      opacity={0.9}
                    />
                    <Text
                      x={-6}
                      y={-6}
                      text={zoneRules.length.toString()}
                      fontSize={12}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.text}
                      align="center"
                      listening={false}
                    />
                  </Group>
                )}
                
                {/* Zone Label */}
                {(isSelected || isHovered) && (
                  <Text
                    x={points[0]}
                    y={points[1] - 20}
                    text={`${zone.name}${hasRules ? ` (${zoneRules.length} rule${zoneRules.length !== 1 ? 's' : ''})` : ''}`}
                    fontSize={14}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={isSelected ? colors.primary : zone.color}
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

