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
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { VectorFloorPlan } from './VectorFloorPlan'
import { FloorPlanImage, type ImageBounds } from './FloorPlanImage'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import { DeviceType } from '@/lib/mockData'

interface DevicePoint {
  id: string
  x: number
  y: number
  type: DeviceType
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
  vectorData?: ExtractedVectorData | null
  devices?: DevicePoint[]
  zones?: Zone[]
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
  onModeChange?: (mode: 'select' | 'draw-rectangle' | 'draw-polygon' | 'edit' | 'delete') => void
  mode?: 'select' | 'draw-rectangle' | 'draw-polygon' | 'edit' | 'delete'
  onZoneCreated?: (polygon: Array<{ x: number; y: number }>) => void
  onZoneUpdated?: (zoneId: string, polygon: Array<{ x: number; y: number }>) => void
  devicesData?: any[] // Full device data with serial numbers, components, etc.
  showWalls?: boolean
  showAnnotations?: boolean
  showText?: boolean
  showZones?: boolean
  // Shared zoom state props
  externalScale?: number
  externalStagePosition?: { x: number; y: number }
  onScaleChange?: (scale: number) => void
  onStagePositionChange?: (position: { x: number; y: number }) => void
}


export function ZoneCanvas({ 
  onDeviceSelect, 
  selectedDeviceId, 
  mapImageUrl,
  vectorData,
  devices = [], 
  zones = [],
  selectedZoneId,
  onZoneSelect,
  onModeChange,
  mode = 'select',
  onZoneCreated,
  onZoneUpdated,
  devicesData = [],
  showWalls = true,
  showAnnotations = true,
  showText = true,
  showZones = true,
  externalScale,
  externalStagePosition,
  onScaleChange,
  onStagePositionChange,
}: ZoneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePositionInternal, setStagePositionInternal] = useState({ x: 0, y: 0 })
  const [scaleInternal, setScaleInternal] = useState(1)
  
  // Use external state if provided, otherwise use internal state
  const effectiveScale = externalScale ?? scaleInternal
  const effectiveStagePosition = externalStagePosition ?? stagePositionInternal
  
  // Wrapper functions that update both internal and notify parent
  const setScale = useCallback((newScale: number) => {
    setScaleInternal(newScale)
    onScaleChange?.(newScale)
  }, [onScaleChange])
  
  const setStagePosition = useCallback((newPosition: { x: number; y: number }) => {
    setStagePositionInternal(newPosition)
    onStagePositionChange?.(newPosition)
  }, [onStagePositionChange])
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  
  // Get full device data for hovered device
  const hoveredDeviceData = useMemo(() => {
    if (!hoveredDevice || !devicesData) return null
    return devicesData.find(d => d.id === hoveredDevice.id) || null
  }, [hoveredDevice, devicesData])
  const [drawingZone, setDrawingZone] = useState<Array<{ x: number; y: number }> | null>(null)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  
  // Edit mode state - track which handle is being dragged
  const [draggingHandleIndex, setDraggingHandleIndex] = useState<number | null>(null)
  const [editingZonePolygon, setEditingZonePolygon] = useState<Array<{ x: number; y: number }> | null>(null)
  const [selectedHandleIndex, setSelectedHandleIndex] = useState<number | null>(null)
  const [colors, setColors] = useState({
    primary: '#4c7dff',
    accent: '#f97316',
    success: '#22c55e',
    muted: '#9ca3af',
    text: '#ffffff',
    tooltipBg: 'rgba(17, 24, 39, 0.95)',
    tooltipBorder: '#4c7dff',
    tooltipText: '#ffffff',
    tooltipShadow: 'rgba(0, 0, 0, 0.5)',
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
        tooltipBg: computedStyle.getPropertyValue('--color-tooltip-bg').trim() || 'rgba(17, 24, 39, 0.95)',
        tooltipBorder: computedStyle.getPropertyValue('--color-tooltip-border').trim() || computedStyle.getPropertyValue('--color-primary').trim() || '#4c7dff',
        tooltipText: computedStyle.getPropertyValue('--color-tooltip-text').trim() || computedStyle.getPropertyValue('--color-text').trim() || '#ffffff',
        tooltipShadow: computedStyle.getPropertyValue('--color-tooltip-shadow').trim() || 'rgba(0, 0, 0, 0.5)',
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
    
    const observer = new MutationObserver(updateColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
      observer.disconnect()
    }
  }, [])

  // Calculate image bounds for vector data
  useEffect(() => {
    if (vectorData) {
      // Calculate scale to fit vector data into canvas (same logic as VectorFloorPlan)
      const scaleX = dimensions.width / vectorData.bounds.width
      const scaleY = dimensions.height / vectorData.bounds.height
      const scale = Math.min(scaleX, scaleY)
      
      // Center the drawing
      const offsetX = (dimensions.width - vectorData.bounds.width * scale) / 2
      const offsetY = (dimensions.height - vectorData.bounds.height * scale) / 2
      
      setImageBounds({
        x: offsetX,
        y: offsetY,
        width: vectorData.bounds.width * scale,
        height: vectorData.bounds.height * scale,
        naturalWidth: vectorData.bounds.width,
        naturalHeight: vectorData.bounds.height,
      })
    } else if (!mapImageUrl) {
      // Reset bounds when both vector data and image URL are removed
      setImageBounds(null)
    }
  }, [vectorData, mapImageUrl, dimensions])

  const getDeviceColor = (type: DeviceType) => {
    if (type.startsWith('fixture-')) {
      return colors.primary
    }
    switch (type) {
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
    const stageX = (pointerPos.x - effectiveStagePosition.x) / effectiveScale
    const stageY = (pointerPos.y - effectiveStagePosition.y) / effectiveScale

    // Convert to normalized coordinates (0-1) using actual image bounds
    let normalizedX: number
    let normalizedY: number
    if (imageBounds) {
      // Convert from canvas coordinates to normalized coordinates within image bounds
      const imageX = stageX - imageBounds.x
      const imageY = stageY - imageBounds.y
      normalizedX = Math.max(0, Math.min(1, imageX / imageBounds.width))
      normalizedY = Math.max(0, Math.min(1, imageY / imageBounds.height))
    } else {
      // Fallback to canvas dimensions
      normalizedX = Math.max(0, Math.min(1, stageX / dimensions.width))
      normalizedY = Math.max(0, Math.min(1, stageY / dimensions.height))
    }

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
      const stageX = (pointerPos.x - effectiveStagePosition.x) / effectiveScale
      const stageY = (pointerPos.y - effectiveStagePosition.y) / effectiveScale

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

  // Convert normalized coordinates to canvas coordinates using actual image bounds
  const toCanvasCoords = useCallback((point: { x: number; y: number }) => {
    if (imageBounds) {
      // Use actual image bounds for coordinate conversion
      return {
        x: imageBounds.x + point.x * imageBounds.width,
        y: imageBounds.y + point.y * imageBounds.height,
      }
    } else {
      // Fallback to canvas dimensions if image bounds not available
      return {
        x: point.x * dimensions.width,
        y: point.y * dimensions.height,
      }
    }
  }, [imageBounds, dimensions])

  const toNormalizedCoords = (point: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(1, point.x / dimensions.width)),
    y: Math.max(0, Math.min(1, point.y / dimensions.height)),
  })

  // Initialize editing polygon when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && selectedZoneId) {
      const selectedZone = zones.find(z => z.id === selectedZoneId)
      if (selectedZone) {
        setEditingZonePolygon([...selectedZone.polygon])
      }
    } else {
      setEditingZonePolygon(null)
      setDraggingHandleIndex(null)
      setSelectedHandleIndex(null)
    }
  }, [mode, selectedZoneId, zones])

  // Handle keyboard events for deleting nodes
  useEffect(() => {
    if (mode === 'edit' && selectedHandleIndex !== null && editingZonePolygon) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedHandleIndex !== null) {
          e.preventDefault()
          
          // Don't allow deleting if polygon would have less than 3 points
          if (editingZonePolygon.length <= 3) {
            return
          }
          
          const updatedPolygon = editingZonePolygon.filter((_, index) => index !== selectedHandleIndex)
          setEditingZonePolygon(updatedPolygon)
          
          // Update the zone immediately
          if (selectedZoneId && onZoneUpdated) {
            onZoneUpdated(selectedZoneId, updatedPolygon)
          }
          
          // Clear selection
          setSelectedHandleIndex(null)
        }
      }
      
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [mode, selectedHandleIndex, editingZonePolygon, selectedZoneId, onZoneUpdated])

  // Handle handle drag
  const handleHandleDrag = (index: number, canvasPos: { x: number; y: number }) => {
    if (!editingZonePolygon) return
    
    // Convert from canvas coordinates to normalized coordinates (0-1)
    const normalizedPos = toNormalizedCoords(canvasPos)
    const updatedPolygon = [...editingZonePolygon]
    updatedPolygon[index] = normalizedPos
    setEditingZonePolygon(updatedPolygon)
  }

  // Handle handle drag end - save changes
  const handleHandleDragEnd = () => {
    if (draggingHandleIndex !== null && editingZonePolygon && selectedZoneId && onZoneUpdated) {
      onZoneUpdated(selectedZoneId, editingZonePolygon)
      setDraggingHandleIndex(null)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        x={effectiveStagePosition.x}
        y={effectiveStagePosition.y}
        scaleX={effectiveScale}
        scaleY={effectiveScale}
        draggable={mode === 'select' && draggingHandleIndex === null}
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
          const newScale = Math.max(0.1, Math.min(10, effectiveScale * zoomFactor))
          
          // Calculate mouse position relative to stage
          const mouseX = (pointerPos.x - effectiveStagePosition.x) / effectiveScale
          const mouseY = (pointerPos.y - effectiveStagePosition.y) / effectiveScale
          
          // Calculate new position to zoom towards mouse point
          const newX = pointerPos.x - mouseX * newScale
          const newY = pointerPos.y - mouseY * newScale
          
          setScale(newScale)
          setStagePosition({ x: newX, y: newY })
        }}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onDblClick={handleDoubleClick}
      >
        {/* Background Layer */}
        <Layer>
          {/* Floor Plan Background - Vector-first, fallback to image */}
          {vectorData ? (
            <VectorFloorPlan
              vectorData={vectorData}
              width={dimensions.width}
              height={dimensions.height}
              showWalls={showWalls}
              showAnnotations={showAnnotations}
              showText={showText}
            />
          ) : mapImageUrl ? (
            <FloorPlanImage 
              url={mapImageUrl} 
              width={dimensions.width} 
              height={dimensions.height}
              onImageBoundsChange={setImageBounds}
            />
          ) : null}
        </Layer>

        {/* Zones Layer */}
        <Layer>
          {/* Render non-selected zones first */}
          {showZones && zones
            .filter(zone => selectedZoneId !== zone.id)
            .map((zone) => {
              const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])
              
              return (
                <Group key={zone.id}>
                  <Line
                    points={points}
                    fill={`${zone.color}40`} // 40 = 25% opacity
                    stroke={zone.color}
                    strokeWidth={2}
                    closed
                    onClick={() => {
                      if (mode !== 'edit') {
                        onZoneSelect?.(zone.id)
                      }
                      // In edit mode, single click does nothing
                    }}
                    onTap={() => {
                      if (mode !== 'edit') {
                        onZoneSelect?.(zone.id)
                      }
                    }}
                    onDblClick={() => {
                      if (mode === 'edit') {
                        // Double-click in edit mode: switch to editing this zone
                        onZoneSelect?.(zone.id)
                      }
                    }}
                    onDblTap={() => {
                      if (mode === 'edit') {
                        // Double-tap in edit mode: switch to editing this zone
                        onZoneSelect?.(zone.id)
                      }
                    }}
                  />
                </Group>
              )
            })}
          
          {/* Render selected zone last (on top) */}
          {showZones && zones
            .filter(zone => selectedZoneId === zone.id)
            .map((zone) => {
              // Use editing polygon if in edit mode, otherwise use zone polygon
              const polygonToUse = (mode === 'edit' && editingZonePolygon) 
                ? editingZonePolygon 
                : zone.polygon
              const points = polygonToUse.map(toCanvasCoords).flatMap(p => [p.x, p.y])
              const isSelected = true
              const isEditing = mode === 'edit'
              
              return (
                <Group key={zone.id}>
                  <Line
                    points={points}
                    fill={`${zone.color}40`} // 40 = 25% opacity
                    stroke={zone.color}
                    strokeWidth={isSelected ? 4 : 3}
                    closed
                    onClick={() => {
                      if (mode !== 'edit') {
                        onZoneSelect?.(zone.id)
                      }
                      // In edit mode, single click does nothing
                    }}
                    onTap={() => {
                      if (mode !== 'edit') {
                        onZoneSelect?.(zone.id)
                      }
                    }}
                    onDblClick={() => {
                      if (mode === 'edit') {
                        // Double-click in edit mode: switch to editing this zone
                        onZoneSelect?.(zone.id)
                      } else if (isSelected) {
                        // Double-click selected zone: enter edit mode
                        onModeChange?.('edit')
                      }
                    }}
                    onDblTap={() => {
                      if (mode === 'edit') {
                        // Double-tap in edit mode: switch to editing this zone
                        onZoneSelect?.(zone.id)
                      } else if (isSelected) {
                        // Double-tap selected zone: enter edit mode
                        onModeChange?.('edit')
                      }
                    }}
                    dash={isEditing ? [5, 5] : undefined}
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
                  
                  {/* Edit Handles - Show corner circles when editing */}
                  {isEditing && polygonToUse.map((point, index) => {
                    const canvasPoint = toCanvasCoords(point)
                    const isDragging = draggingHandleIndex === index
                    const isSelected = selectedHandleIndex === index
                    const canDelete = polygonToUse.length > 3 // Can't delete if only 3 points remain
                    
                    return (
                      <Group key={`handle-${index}`}>
                        {/* Outer ring for better visibility */}
                        <Circle
                          x={canvasPoint.x}
                          y={canvasPoint.y}
                          radius={isDragging ? 10 : (isSelected ? 9 : 8)}
                          fill={isSelected ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.3)"}
                          stroke={isSelected ? "#ffffff" : zone.color}
                          strokeWidth={isSelected ? 3 : 2}
                          listening={false}
                        />
                        {/* Inner handle */}
                        <Circle
                          x={canvasPoint.x}
                          y={canvasPoint.y}
                          radius={isDragging ? 7 : (isSelected ? 6.5 : 6)}
                          fill={isSelected ? "#ffffff" : zone.color}
                          stroke={isSelected ? zone.color : "#ffffff"}
                          strokeWidth={isSelected ? 2.5 : 2}
                          draggable
                          dragBoundFunc={(pos) => {
                            // Constrain dragging to canvas bounds
                            return {
                              x: Math.max(0, Math.min(dimensions.width, pos.x)),
                              y: Math.max(0, Math.min(dimensions.height, pos.y))
                            }
                          }}
                          onClick={(e) => {
                            e.cancelBubble = true
                            setSelectedHandleIndex(index)
                          }}
                          onTap={(e) => {
                            e.cancelBubble = true
                            setSelectedHandleIndex(index)
                          }}
                          onDragStart={(e) => {
                            // Prevent stage dragging
                            e.cancelBubble = true
                            setDraggingHandleIndex(index)
                            setSelectedHandleIndex(index)
                          }}
                          onDragMove={(e) => {
                            // Prevent stage dragging while dragging handles
                            e.cancelBubble = true
                            
                            // Get the new position of the circle in canvas coordinates
                            // Konva automatically handles stage transforms for draggable shapes
                            const newX = e.target.x()
                            const newY = e.target.y()
                            
                            // Convert from canvas coordinates to normalized coordinates
                            handleHandleDrag(index, { x: newX, y: newY })
                          }}
                          onDragEnd={(e) => {
                            // Prevent stage dragging
                            e.cancelBubble = true
                            handleHandleDragEnd()
                          }}
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container()
                            if (container) container.style.cursor = 'move'
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container()
                            if (container) container.style.cursor = 'default'
                          }}
                          shadowBlur={isDragging ? 10 : (isSelected ? 8 : 5)}
                          shadowColor="rgba(0, 0, 0, 0.5)"
                        />
                        {/* Delete indicator for selected handle */}
                        {isSelected && canDelete && (
                          <Text
                            x={canvasPoint.x}
                            y={canvasPoint.y - 25}
                            text="Press Delete to remove"
                            fontSize={11}
                            fontFamily="system-ui, -apple-system, sans-serif"
                            fill="#ffffff"
                            padding={4}
                            align="center"
                            listening={false}
                            shadowBlur={5}
                            shadowColor="rgba(0, 0, 0, 0.8)"
                          />
                        )}
                      </Group>
                    )
                  })}
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
            const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
            const isSelected = selectedDeviceId === device.id
            const isHovered = hoveredDevice?.id === device.id
            
            return (
              <Group key={device.id}>
                <Circle
                  x={deviceCoords.x}
                  y={deviceCoords.y}
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
                  onMouseMove={(e) => {
                    const stage = e.target.getStage()
                    if (stage) {
                      const pointerPos = stage.getPointerPosition()
                      if (pointerPos) {
                        setTooltipPosition({ x: pointerPos.x, y: pointerPos.y })
                      }
                    }
                  }}
                />
              </Group>
            )
          })}
        </Layer>
        
        {/* Tooltip Layer - Always on top */}
        <Layer>
          {hoveredDevice && hoveredDeviceData && (() => {
            // Calculate tooltip dimensions based on content
            const componentsCount = hoveredDeviceData.components?.length || 0
            const hasComponents = componentsCount > 0
            const tooltipWidth = 300 // Increased width for better text wrapping
            const padding = 16
            const lineHeight = 18
            const sectionSpacing = 8
            
            // Calculate base info height (accounting for text wrapping)
            const deviceInfoLines = [
              `Type: ${hoveredDevice.type}`,
              `Serial: ${hoveredDeviceData.serialNumber || 'N/A'}`,
              `Signal: ${hoveredDevice.signal}%`,
              `Status: ${hoveredDevice.status}`,
              ...(hoveredDevice.location ? [`Location: ${hoveredDevice.location}`] : []),
              ...(hoveredDeviceData.zone ? [`Zone: ${hoveredDeviceData.zone}`] : []),
            ]
            
            // Estimate text wrapping for long strings
            const maxTextWidth = tooltipWidth - (padding * 2)
            const estimateWrappedLines = (text: string, fontSize: number) => {
              // Rough estimate: ~10-12 chars per line at 12px font
              const charsPerLine = Math.floor(maxTextWidth / (fontSize * 0.6))
              return Math.max(1, Math.ceil(text.length / charsPerLine))
            }
            
            let deviceInfoHeight = 0
            deviceInfoLines.forEach(line => {
              const wrappedLines = estimateWrappedLines(line, 12)
              deviceInfoHeight += wrappedLines * lineHeight
            })
            
            // Header + divider + spacing
            const headerHeight = 40
            const dividerHeight = 2
            const baseHeight = headerHeight + dividerHeight + sectionSpacing + deviceInfoHeight + sectionSpacing
            
            // Components section height
            const componentsHeaderHeight = 20
            const componentsListHeight = hasComponents 
              ? Math.min(componentsCount, 5) * 20 + (componentsCount > 5 ? 20 : 0)
              : 0
            const componentsHeight = hasComponents 
              ? componentsHeaderHeight + componentsListHeight + sectionSpacing
              : 0
            
            const totalHeight = baseHeight + componentsHeight + (padding * 2)
            
            // Calculate position to keep tooltip within viewport
            const tooltipX = Math.max(
              padding,
              Math.min(
                tooltipPosition.x + 20,
                dimensions.width - tooltipWidth - padding
              )
            )
            const tooltipY = Math.max(
              padding,
              Math.min(
                tooltipPosition.y - 10,
                dimensions.height - totalHeight - padding
              )
            )
            
            return (
              <Group x={tooltipX} y={tooltipY}>
                {/* Tooltip background - uses theme tokens */}
                <Rect
                  width={tooltipWidth}
                  height={totalHeight}
                  fill={colors.tooltipBg}
                  cornerRadius={10}
                  listening={false}
                  shadowBlur={20}
                  shadowColor={colors.tooltipShadow}
                  shadowOffsetX={0}
                  shadowOffsetY={4}
                  opacity={0.98}
                />
                {/* Border for better visibility - uses theme primary color */}
                <Rect
                  width={tooltipWidth}
                  height={totalHeight}
                  fill="transparent"
                  stroke={colors.tooltipBorder}
                  strokeWidth={2}
                  cornerRadius={10}
                  listening={false}
                />
                
                {/* Header section */}
                <Text
                  x={padding}
                  y={padding}
                  text={hoveredDevice.deviceId}
                  fontSize={16}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontStyle="bold"
                  fill={colors.tooltipText}
                  align="left"
                  listening={false}
                  width={tooltipWidth - (padding * 2)}
                  wrap="word"
                />
                
                {/* Divider line */}
                <Line
                  points={[padding, padding + 24, tooltipWidth - padding, padding + 24]}
                  stroke={colors.tooltipBorder}
                  strokeWidth={1}
                  opacity={0.3}
                  listening={false}
                />
                
                {/* Device info - render each line separately for proper wrapping */}
                {deviceInfoLines.map((line, idx) => {
                  const yPos = padding + headerHeight + dividerHeight + sectionSpacing + (idx * lineHeight)
                  return (
                    <Text
                      key={idx}
                      x={padding}
                      y={yPos}
                      text={line}
                      fontSize={12}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="normal"
                      fill={colors.tooltipText}
                      align="left"
                      listening={false}
                      width={tooltipWidth - (padding * 2)}
                      wrap="word"
                      lineHeight={1.5}
                    />
                  )
                })}
                
                {/* Components section */}
                {hasComponents && (
                  <>
                    <Line
                      points={[padding, baseHeight - sectionSpacing, tooltipWidth - padding, baseHeight - sectionSpacing]}
                      stroke={colors.tooltipBorder}
                      strokeWidth={1}
                      opacity={0.2}
                      listening={false}
                    />
                    <Text
                      x={padding}
                      y={baseHeight}
                      text={`Components (${componentsCount}):`}
                      fontSize={11}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.tooltipText}
                      align="left"
                      listening={false}
                      opacity={0.9}
                    />
                    {hoveredDeviceData.components?.slice(0, 5).map((component: any, idx: number) => (
                      <Text
                        key={component.id}
                        x={padding + 4}
                        y={baseHeight + componentsHeaderHeight + (idx * 20)}
                        text={`• ${component.componentType}`}
                        fontSize={11}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontStyle="normal"
                        fill={colors.muted}
                        align="left"
                        listening={false}
                        width={tooltipWidth - (padding * 2) - 4}
                        wrap="word"
                      />
                    ))}
                    {componentsCount > 5 && (
                      <Text
                        x={padding + 4}
                        y={baseHeight + componentsHeaderHeight + (5 * 20)}
                        text={`...and ${componentsCount - 5} more`}
                        fontSize={10}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontStyle="italic"
                        fill={colors.muted}
                        align="left"
                        listening={false}
                        opacity={0.7}
                      />
                    )}
                  </>
                )}
              </Group>
            )
          })()}
        </Layer>
      </Stage>
    </div>
  )
}

