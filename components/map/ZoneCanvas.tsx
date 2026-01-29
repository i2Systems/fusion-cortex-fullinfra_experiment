/**
 * Zone Canvas Component
 * 
 * Extended MapCanvas with zone drawing capabilities.
 * Supports drawing rectangles and polygons for zones.
 * 
 * AI Note: This component extends MapCanvas with zone drawing functionality.
 */

'use client'

import { Stage, Layer, Circle, Group, Text, Rect, Line } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'

import { FloorPlanImage, type ImageBounds } from './FloorPlanImage'
import { MapPersonToken } from './MapPersonToken'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import { DeviceType } from '@/lib/mockData'
import { getCanvasColors, getRgbaVariable } from '@/lib/canvasColors'

interface DevicePoint {
  id: string
  x: number
  y: number
  type: DeviceType
  deviceId: string
  status: string
  signal: number
  location?: string
  orientation?: number
  inSelectedZone?: boolean // Whether device is in the currently selected zone
}

interface PersonPoint {
  id: string
  firstName: string
  lastName: string
  x: number
  y: number
  imageUrl?: string | null
  role?: string | null
  email?: string | null
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
  people?: PersonPoint[]
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
  showPeople?: boolean
  /** When minimal, person/device tooltips show basic info only; detailed = full info */
  tooltipDetailLevel?: 'minimal' | 'detailed'
  /** Called when a person token is clicked (e.g. navigate to People page) */
  onPersonSelect?: (personId: string | null) => void
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
  people = [],
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
  showPeople = true,
  tooltipDetailLevel = 'detailed',
  onPersonSelect,
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
  const [hoveredPerson, setHoveredPerson] = useState<PersonPoint | null>(null)
  const [personTooltipTier, setPersonTooltipTier] = useState<1 | 2>(1)
  const personTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [personTooltipPosition, setPersonTooltipPosition] = useState({ x: 0, y: 0 })
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)

  // Two-tier person tooltip: tier 1 on hover, tier 2 after sustained hover
  useEffect(() => {
    if (!hoveredPerson) {
      setPersonTooltipTier(1)
      if (personTooltipTimerRef.current) {
        clearTimeout(personTooltipTimerRef.current)
        personTooltipTimerRef.current = null
      }
      return
    }
    setPersonTooltipTier(1)
    personTooltipTimerRef.current = setTimeout(() => {
      setPersonTooltipTier(2)
      personTooltipTimerRef.current = null
    }, 700)
    return () => {
      if (personTooltipTimerRef.current) {
        clearTimeout(personTooltipTimerRef.current)
        personTooltipTimerRef.current = null
      }
    }
  }, [hoveredPerson])

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
  const [colors, setColors] = useState<ReturnType<typeof getCanvasColors>>(getCanvasColors())

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
      setColors(getCanvasColors())
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

  const getDeviceColor = (type: DeviceType) => {
    if (type.startsWith('fixture-')) {
      return colors.fixture
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

  // Helper to check if device is a fixture type
  const isFixtureType = (type: DeviceType) => {
    return type.startsWith('fixture-')
  }

  // Helper to get fixture size multiplier based on type
  const getFixtureSizeMultiplier = (type: DeviceType) => {
    const typeStr = type as string
    if (typeStr.includes('16ft')) return 1.5
    if (typeStr.includes('12ft')) return 1.25
    return 1 // Default for 8ft and other fixtures
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

    // Account for stage position and scale first
    // This gives us canvas coordinates (relative to stage origin, but in canvas units)
    // Actually, stage transforms handle zoom/pan. We want local coordinates relative to the stage container?
    // The previous logic did this manually:
    const stageX = (pointerPos.x - effectiveStagePosition.x) / effectiveScale
    const stageY = (pointerPos.y - effectiveStagePosition.y) / effectiveScale

    // Now convert these canvas coordinates to normalized coordinates (0-1)
    // This helper handles image boundsOffset and scaling correctly
    const { x: normalizedX, y: normalizedY } = toNormalizedCoords({ x: stageX, y: stageY })

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

      // Convert to normalized coordinates (0-1) using consistent helper
      const { x: normalizedX, y: normalizedY } = toNormalizedCoords({ x: stageX, y: stageY })

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

  // Convert canvas coordinates to normalized coordinates (0-1) using actual image bounds
  const toNormalizedCoords = useCallback((point: { x: number; y: number }) => {
    if (imageBounds) {
      // Convert from canvas coordinates to normalized coordinates within image bounds
      const normalizedX = (point.x - imageBounds.x) / imageBounds.width
      const normalizedY = (point.y - imageBounds.y) / imageBounds.height
      return {
        x: Math.max(0, Math.min(1, normalizedX)),
        y: Math.max(0, Math.min(1, normalizedY)),
      }
    } else {
      // Fallback to canvas dimensions if image bounds not available
      return {
        x: Math.max(0, Math.min(1, point.x / dimensions.width)),
        y: Math.max(0, Math.min(1, point.y / dimensions.height)),
      }
    }
  }, [imageBounds, dimensions])

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
          {/* Floor Plan Background - Image-based rendering */}
          {mapImageUrl ? (
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
                          fill={isSelected ? getRgbaVariable('--color-text', 0.5) : getRgbaVariable('--color-text', 0.3)}
                          stroke={isSelected ? colors.text : zone.color}
                          strokeWidth={isSelected ? 3 : 2}
                          listening={false}
                        />
                        {/* Inner handle */}
                        <Circle
                          x={canvasPoint.x}
                          y={canvasPoint.y}
                          radius={isDragging ? 7 : (isSelected ? 6.5 : 6)}
                          fill={isSelected ? colors.text : zone.color}
                          stroke={isSelected ? zone.color : colors.text}
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
                            fill={colors.text}
                            padding={4}
                            align="center"
                            listening={false}
                            shadowBlur={5}
                            shadowColor={getRgbaVariable('--color-tooltip-shadow', 0.8) || 'rgba(0, 0, 0, 0.8)'}
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
            const inSelectedZone = device.inSelectedZone !== false // Default to true if not specified
            // Apply reduced opacity if a zone is selected and this device is not in it
            const zoneOpacity = selectedZoneId && !inSelectedZone ? 0.3 : 1

            // Common event handlers
            const handleClick = () => onDeviceSelect?.(device.id)
            const handleMouseEnter = (e: any) => {
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
            }
            const handleMouseLeave = () => setHoveredDevice(null)
            const handleMouseMove = (e: any) => {
              const stage = e.target.getStage()
              if (stage) {
                const pointerPos = stage.getPointerPosition()
                if (pointerPos) {
                  setTooltipPosition({ x: pointerPos.x, y: pointerPos.y })
                }
              }
            }

            // Render fixtures as rectangles
            if (isFixtureType(device.type)) {
              const sizeMultiplier = getFixtureSizeMultiplier(device.type)
              const barLength = 12 * sizeMultiplier
              const barWidth = 3 * sizeMultiplier

              return (
                <Group key={device.id} x={deviceCoords.x} y={deviceCoords.y} rotation={device.orientation || 0}>
                  {/* Dark outline for contrast */}
                  <Rect
                    x={-barLength / 2 - 0.5}
                    y={-barWidth / 2 - 0.5}
                    width={barLength + 1}
                    height={barWidth + 1}
                    fill="transparent"
                    stroke={colors.border}
                    strokeWidth={1}
                    cornerRadius={2}
                    listening={false}
                  />
                  {/* Fixture rectangle */}
                  <Rect
                    x={-barLength / 2}
                    y={-barWidth / 2}
                    width={barLength}
                    height={barWidth}
                    fill={getDeviceColor(device.type)}
                    opacity={(isSelected ? 1 : (isHovered ? 0.95 : 0.9)) * zoneOpacity}
                    stroke={colors.border}
                    strokeWidth={0.5}
                    shadowBlur={isSelected ? 4 : (isHovered ? 2 : 1)}
                    shadowColor={isSelected ? colors.fixture : colors.muted}
                    shadowOpacity={0.3 * zoneOpacity}
                    cornerRadius={1}
                    onClick={handleClick}
                    onTap={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                  />
                  {/* Center dot */}
                  <Circle
                    x={0}
                    y={0}
                    radius={isSelected ? (2 * sizeMultiplier) : (isHovered ? (1.5 * sizeMultiplier) : (1 * sizeMultiplier))}
                    fill={isSelected ? colors.fixture : colors.text}
                    stroke={colors.border}
                    strokeWidth={0.5}
                    shadowBlur={isSelected ? 3 : 1}
                    shadowColor={colors.muted}
                    opacity={(isSelected ? 1 : 0.85) * zoneOpacity}
                    listening={false}
                  />
                </Group>
              )
            }

            // Render sensors as circles
            const radius = isSelected ? 5 : (isHovered ? 4.5 : 4)
            const outerRingRadius = radius + 2

            return (
              <Group key={device.id}>
                {/* Dark outer contrast ring for visibility */}
                <Circle
                  x={deviceCoords.x}
                  y={deviceCoords.y}
                  radius={outerRingRadius}
                  fill="transparent"
                  stroke={colors.muted}
                  strokeWidth={0.5}
                  shadowBlur={isSelected ? 4 : (isHovered ? 2 : 1)}
                  shadowColor={colors.muted}
                  opacity={zoneOpacity}
                  listening={false}
                />
                {/* Main device marker */}
                <Circle
                  x={deviceCoords.x}
                  y={deviceCoords.y}
                  radius={radius}
                  fill={getDeviceColor(device.type)}
                  stroke={isSelected ? colors.primary : colors.muted}
                  strokeWidth={isSelected ? 1 : 0.5}
                  shadowBlur={isSelected ? 4 : (isHovered ? 2 : 1)}
                  shadowColor={isSelected ? colors.primary : colors.muted}
                  opacity={(isSelected ? 1 : (isHovered ? 0.95 : 0.9)) * zoneOpacity}
                  onClick={handleClick}
                  onTap={handleClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={handleMouseMove}
                />
                {/* Center highlight for selected devices */}
                {isSelected && (
                  <Circle
                    x={deviceCoords.x}
                    y={deviceCoords.y}
                    radius={2}
                    fill={colors.text}
                    opacity={0.8}
                    listening={false}
                  />
                )}
              </Group>
            )
          })}
        </Layer>

        {/* People Layer - token style (pill + icon + name) */}
        {showPeople && imageBounds && (
          <Layer>
            {people
              .filter(person => person.x !== null && person.x !== undefined && person.y !== null && person.y !== undefined)
              .map((person) => {
                const personCoords = toCanvasCoords({ x: person.x, y: person.y })
                const isHovered = hoveredPerson?.id === person.id
                const handlePersonMouseEnter = (e: any) => {
                  const container = e.target.getStage()?.container()
                  if (container) container.style.cursor = onPersonSelect ? 'pointer' : 'default'
                  setHoveredPerson(person)
                  const stage = e.target.getStage()
                  if (stage) {
                    const pointerPos = stage.getPointerPosition()
                    if (pointerPos) setPersonTooltipPosition({ x: pointerPos.x, y: pointerPos.y })
                  }
                }
                const handlePersonMouseLeave = () => {
                  setHoveredPerson(null)
                }
                const handlePersonMouseMove = (e: any) => {
                  const stage = e.target.getStage()
                  if (stage) {
                    const pointerPos = stage.getPointerPosition()
                    if (pointerPos) setPersonTooltipPosition({ x: pointerPos.x, y: pointerPos.y })
                  }
                }
                const handlePersonClick = () => onPersonSelect?.(person.id)
                return (
                  <Group
                    key={person.id}
                    x={personCoords.x}
                    y={personCoords.y}
                    listening={true}
                    onClick={handlePersonClick}
                    onTap={handlePersonClick}
                    onMouseEnter={handlePersonMouseEnter}
                    onMouseLeave={handlePersonMouseLeave}
                    onMouseMove={handlePersonMouseMove}
                  >
                    <MapPersonToken
                      person={person}
                      isHovered={isHovered}
                      radius={7}
                      scale={1 / effectiveScale}
                    />
                  </Group>
                )
              })}
          </Layer>
        )}

        {/* Tooltip Layer - Always on top */}
        <Layer>
          {/* Person tooltip - tier 1 (some info) immediately, tier 2 (more info) after ~700ms */}
          {hoveredPerson && (() => {
            const tier2 = personTooltipTier === 2
            const pad = 12
            const lineH = 16
            const nameH = 16
            const roleH = (tier2 && hoveredPerson.role) ? lineH : 0
            const emailH = (tier2 && hoveredPerson.email) ? lineH : 0
            const placedH = tier2 ? lineH : 0
            const hintH = 14
            const th = pad * 2 + nameH + (roleH ? roleH + 2 : 0) + (emailH ? emailH + 2 : 0) + (placedH ? placedH + 2 : 0) + 6 + hintH
            const tw = tier2 ? 240 : 200
            const x = Math.max(pad, Math.min(personTooltipPosition.x + 14, dimensions.width - tw - pad))
            const y = Math.max(pad, Math.min(personTooltipPosition.y - 8, dimensions.height - th - pad))
            const name = [hoveredPerson.firstName, hoveredPerson.lastName].filter(Boolean).join(' ') || 'Person'
            return (
              <Group key="person-tooltip" x={x} y={y}>
                <Rect width={tw} height={th} fill={colors.tooltipBg} cornerRadius={10} listening={false} shadowBlur={20} shadowColor={colors.tooltipShadow} opacity={0.98} />
                <Rect width={tw} height={th} fill="transparent" stroke={colors.tooltipBorder} strokeWidth={1.5} cornerRadius={10} listening={false} />
                <Text x={pad + 32} y={pad} text={name} fontSize={13} fontFamily="system-ui, -apple-system, sans-serif" fontStyle="bold" fill={colors.tooltipText} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />
                <Text x={pad + 32} y={th - pad - hintH} text="Click to view profile" fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={colors.muted} listening={false} />
                {tier2 && hoveredPerson.role && <Text x={pad + 32} y={pad + nameH + 2} text={hoveredPerson.role} fontSize={11} fontFamily="system-ui, -apple-system, sans-serif" fill={colors.muted} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />}
                {tier2 && hoveredPerson.email && <Text x={pad + 32} y={pad + nameH + 2 + roleH + 2} text={hoveredPerson.email} fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={colors.muted} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />}
                {tier2 && <Text x={pad + 32} y={pad + nameH + 2 + roleH + 2 + emailH + 2} text="Placed on map" fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={colors.muted} listening={false} />}
                <Circle x={pad + 14} y={pad + (tier2 ? 28 : 18)} radius={12} fill={getRgbaVariable('--color-primary', 0.35)} stroke={colors.tooltipBorder} strokeWidth={1} listening={false} />
              </Group>
            )
          })()}
          {hoveredDevice && hoveredDeviceData && (() => {
            const tooltipWidth = tooltipDetailLevel === 'minimal' ? 220 : 300
            const padding = 16
            const lineHeight = 18
            const sectionSpacing = 8

            if (tooltipDetailLevel === 'minimal') {
              const minHeight = 56
              const tooltipX = Math.max(padding, Math.min(tooltipPosition.x + 20, dimensions.width - tooltipWidth - padding))
              const tooltipY = Math.max(padding, Math.min(tooltipPosition.y - 8, dimensions.height - minHeight - padding))
              return (
                <Group x={tooltipX} y={tooltipY}>
                  <Rect width={tooltipWidth} height={minHeight} fill={colors.tooltipBg} cornerRadius={10} listening={false} shadowBlur={20} shadowColor={colors.tooltipShadow} opacity={0.98} />
                  <Rect width={tooltipWidth} height={minHeight} fill="transparent" stroke={colors.tooltipBorder} strokeWidth={2} cornerRadius={10} listening={false} />
                  <Text x={padding} y={padding} text={hoveredDevice.deviceId} fontSize={14} fontFamily="system-ui, -apple-system, sans-serif" fontStyle="bold" fill={colors.tooltipText} width={tooltipWidth - padding * 2} wrap="none" ellipsis={true} listening={false} />
                  <Text x={padding} y={padding + 22} text="Click for details" fontSize={11} fontFamily="system-ui, -apple-system, sans-serif" fill={colors.muted} listening={false} />
                </Group>
              )
            }

            // Full device tooltip
            const componentsCount = hoveredDeviceData.components?.length || 0
            const hasComponents = componentsCount > 0
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

