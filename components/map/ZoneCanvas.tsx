/**
 * Zone Canvas Component
 * 
 * Extended MapCanvas with zone drawing capabilities.
 * Supports drawing rectangles and polygons for zones.
 * 
 * AI Note: This component extends MapCanvas with zone drawing functionality.
 */

'use client'

import { Stage, Layer, Circle, Image as KonvaImage, Group, Text, Rect, Line } from 'react-konva'
import { useEffect, useState, useRef } from 'react'

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

interface ZoneCanvasProps {
  onDeviceSelect?: (deviceId: string | null) => void
  selectedDeviceId?: string | null
  mapImageUrl?: string | null
  devices?: DevicePoint[]
  zones?: Zone[]
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
  mode?: 'select' | 'draw-rectangle' | 'draw-polygon' | 'edit' | 'delete'
  onZoneCreated?: (polygon: Array<{ x: number; y: number }>) => void
}

function FloorPlanImage({ url, width, height }: { url: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.src = url
  }, [url])

  return image ? (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      opacity={0.8}
    />
  ) : null
}

export function ZoneCanvas({ 
  onDeviceSelect, 
  selectedDeviceId, 
  mapImageUrl, 
  devices = [], 
  zones = [],
  selectedZoneId,
  onZoneSelect,
  mode = 'select',
  onZoneCreated
}: ZoneCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [drawingZone, setDrawingZone] = useState<Array<{ x: number; y: number }> | null>(null)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [colors, setColors] = useState({
    primary: '#4c7dff',
    accent: '#f97316',
    success: '#22c55e',
    muted: '#9ca3af',
    text: '#ffffff',
  })

  useEffect(() => {
    const updateDimensions = () => {
      const availableWidth = window.innerWidth - 80 - 384 - 32
      const availableHeight = window.innerHeight - 48 - 80 - 32
      setDimensions({
        width: Math.max(availableWidth, 400),
        height: Math.max(availableHeight, 400),
      })
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
    
    window.addEventListener('resize', updateDimensions)
    
    const observer = new MutationObserver(updateColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
      observer.disconnect()
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

  const handleStageClick = (e: any) => {
    if (mode === 'select') {
      // Clear selection if clicking on empty space
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) {
        onZoneSelect?.(null)
      }
      return
    }

    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()
    if (!pointerPos) return

    // Account for stage position and scale
    const stageX = (pointerPos.x - stagePosition.x) / scale
    const stageY = (pointerPos.y - stagePosition.y) / scale

    // Convert to normalized coordinates (0-1)
    const normalizedX = Math.max(0, Math.min(1, stageX / dimensions.width))
    const normalizedY = Math.max(0, Math.min(1, stageY / dimensions.height))

    if (mode === 'draw-rectangle') {
      if (!drawStart) {
        setDrawStart({ x: normalizedX, y: normalizedY })
        setDrawingZone([{ x: normalizedX, y: normalizedY }])
      } else {
        // Complete rectangle
        const rect = [
          drawStart,
          { x: normalizedX, y: drawStart.y },
          { x: normalizedX, y: normalizedY },
          { x: drawStart.x, y: normalizedY },
          drawStart, // Close the polygon
        ]
        onZoneCreated?.(rect)
        setDrawStart(null)
        setDrawingZone(null)
      }
    } else if (mode === 'draw-polygon') {
      if (!drawingZone) {
        setDrawingZone([{ x: normalizedX, y: normalizedY }])
      } else {
        const newZone = [...drawingZone, { x: normalizedX, y: normalizedY }]
        setDrawingZone(newZone)
      }
    }
  }

  const handleStageMouseMove = (e: any) => {
    if (mode === 'draw-rectangle' && drawStart) {
      const stage = e.target.getStage()
      const pointerPos = stage.getPointerPosition()
      if (!pointerPos) return

      // Account for stage position and scale
      const stageX = (pointerPos.x - stagePosition.x) / scale
      const stageY = (pointerPos.y - stagePosition.y) / scale

      // Convert to normalized coordinates (0-1)
      const normalizedX = Math.max(0, Math.min(1, stageX / dimensions.width))
      const normalizedY = Math.max(0, Math.min(1, stageY / dimensions.height))

      setDrawingZone([
        drawStart,
        { x: normalizedX, y: drawStart.y },
        { x: normalizedX, y: normalizedY },
        { x: drawStart.x, y: normalizedY },
        drawStart,
      ])
    }
  }

  const handleDoubleClick = () => {
    if (mode === 'draw-polygon' && drawingZone && drawingZone.length >= 3) {
      // Close polygon on double click
      const closedZone = [...drawingZone, drawingZone[0]]
      onZoneCreated?.(closedZone)
      setDrawingZone(null)
    }
  }

  // Convert normalized coordinates to canvas coordinates
  const toCanvasCoords = (point: { x: number; y: number }) => ({
    x: point.x * dimensions.width,
    y: point.y * dimensions.height,
  })

  return (
    <div className="w-full h-full overflow-hidden">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={scale}
        scaleY={scale}
        draggable={mode === 'select'}
        onDragEnd={(e) => {
          setStagePosition({ x: e.target.x(), y: e.target.y() })
        }}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onDblClick={handleDoubleClick}
      >
        {/* Background Layer */}
        <Layer>
          {/* Floor Plan Background */}
          {mapImageUrl && (
            <FloorPlanImage 
              url={mapImageUrl} 
              width={dimensions.width} 
              height={dimensions.height}
            />
          )}
        </Layer>

        {/* Zones Layer */}
        <Layer>
          {/* Render Zones */}
          {zones.map((zone) => {
            const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])
            const isSelected = selectedZoneId === zone.id
            
            return (
              <Group key={zone.id}>
                <Line
                  points={points}
                  fill={`${zone.color}40`} // 40 = 25% opacity
                  stroke={zone.color}
                  strokeWidth={isSelected ? 3 : 2}
                  closed
                  onClick={() => onZoneSelect?.(zone.id)}
                  onTap={() => onZoneSelect?.(zone.id)}
                />
                {isSelected && (
                  <Text
                    x={points[0]}
                    y={points[1] - 20}
                    text={zone.name}
                    fontSize={14}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={zone.color}
                    padding={4}
                    align="left"
                  />
                )}
              </Group>
            )
          })}

          {/* Drawing Zone Preview */}
          {drawingZone && drawingZone.length > 0 && (
            <Line
              points={drawingZone.map(toCanvasCoords).flatMap(p => [p.x, p.y])}
              fill={`${colors.primary}40`}
              stroke={colors.primary}
              strokeWidth={2}
              closed={mode === 'draw-rectangle'}
              dash={[5, 5]}
              listening={false}
            />
          )}
        </Layer>

        {/* Devices Layer - Always on top */}
        <Layer>
          {/* Device points */}
          {devices.map((device) => {
            const deviceX = device.x * dimensions.width
            const deviceY = device.y * dimensions.height
            const isSelected = selectedDeviceId === device.id
            const isHovered = hoveredDevice?.id === device.id
            
            return (
              <Group key={device.id}>
                <Circle
                  x={deviceX}
                  y={deviceY}
                  radius={isSelected ? 6 : (isHovered ? 5 : 3)}
                  fill={getDeviceColor(device.type)}
                  stroke={isSelected ? colors.text : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isSelected ? 2 : 1}
                  shadowBlur={isSelected ? 10 : (isHovered ? 5 : 2)}
                  shadowColor={isSelected ? colors.primary : 'black'}
                  opacity={isSelected ? 0.9 : (isHovered ? 0.7 : 0.5)}
                  onClick={() => onDeviceSelect?.(device.id)}
                  onTap={() => onDeviceSelect?.(device.id)}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container()
                    if (container) container.style.cursor = 'pointer'
                    setHoveredDevice(device)
                    const stage = e.target.getStage()
                    if (stage) {
                      const pointerPos = stage.getPointerPosition()
                      if (pointerPos) {
                        setTooltipPosition({ x: pointerPos.x, y: pointerPos.y })
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredDevice(null)
                  }}
                />
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

