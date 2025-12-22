/**
 * Map Canvas Component
 * 
 * Uses react-konva for canvas-based rendering of:
 * - Blueprint/floor plan (background layer)
 * - Device point cloud (overlay)
 * - Zone boundaries
 * 
 * AI Note: This is a placeholder. Full implementation should:
 * - Load and render blueprint images
 * - Render device points with color coding by type
 * - Support zoom, pan, drag-select
 * - Handle device selection and highlight
 */

'use client'

import { Stage, Layer, Circle, Image as KonvaImage, Group, Text, Rect, Line } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Component, Device as DeviceType } from '@/lib/mockData'
import { VectorFloorPlan } from './VectorFloorPlan'
import { FloorPlanImage, type ImageBounds } from './FloorPlanImage'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import type { Location } from '@/lib/locationStorage'

interface DevicePoint {
  id: string
  x: number
  y: number
  type: 'fixture' | 'motion' | 'light-sensor'
  deviceId: string
  status: string
  signal: number
  location?: string
  locked?: boolean
  orientation?: number // Rotation angle in degrees
  components?: Component[]
}

interface Zone {
  id: string
  name: string
  color: string
  polygon: Array<{ x: number; y: number }> // Normalized coordinates (0-1)
}

interface MapCanvasProps {
  onDeviceSelect?: (deviceId: string | null) => void
  onDevicesSelect?: (deviceIds: string[]) => void
  selectedDeviceId?: string | null
  selectedDeviceIds?: string[]
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  devices?: DevicePoint[]
  zones?: Zone[]
  highlightDeviceId?: string | null
  mode?: 'select' | 'move' | 'rotate'
  onDeviceMove?: (deviceId: string, x: number, y: number) => void
  onDeviceMoveEnd?: (deviceId: string, x: number, y: number) => void
  onDeviceRotate?: (deviceId: string) => void
  onComponentExpand?: (deviceId: string, expanded: boolean) => void
  expandedComponents?: Set<string>
  onComponentClick?: (component: Component, parentDevice: any) => void
  devicesData?: any[]
  onZoneClick?: (zoneId: string) => void
  showWalls?: boolean
  showAnnotations?: boolean
  showText?: boolean
  showZones?: boolean
  currentLocation?: Location | null
  onImageBoundsChange?: (bounds: ImageBounds) => void
  // Shared zoom state props
  externalScale?: number
  externalStagePosition?: { x: number; y: number }
  onScaleChange?: (scale: number) => void
  onStagePositionChange?: (position: { x: number; y: number }) => void
}


export function MapCanvas({ 
  onDeviceSelect, 
  onDevicesSelect,
  selectedDeviceId, 
  selectedDeviceIds = [],
  mapImageUrl, 
  vectorData,
  devices = [], 
  zones = [],
  highlightDeviceId,
  mode = 'select',
  onDeviceMove,
  onDeviceMoveEnd,
  onDeviceRotate,
  onComponentExpand,
  expandedComponents = new Set(),
  onComponentClick,
  devicesData = [],
  onZoneClick,
  showWalls = true,
  showAnnotations = true,
  showText = true,
  showZones = true,
  currentLocation,
  onImageBoundsChange,
  externalScale,
  externalStagePosition,
  onScaleChange,
  onStagePositionChange,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePositionInternal] = useState({ x: 0, y: 0 })
  const [scale, setScaleInternal] = useState(1)
  
  // Use external state if provided, otherwise use internal state
  const effectiveScale = externalScale ?? scale
  const effectiveStagePosition = externalStagePosition ?? stagePosition
  
  // Wrapper functions that update both internal and notify parent
  const setScale = useCallback((newScale: number) => {
    setScaleInternal(newScale)
    onScaleChange?.(newScale)
  }, [onScaleChange])
  
  const setStagePosition = useCallback((newPosition: { x: number; y: number }) => {
    setStagePositionInternal(newPosition)
    onStagePositionChange?.(newPosition)
  }, [onStagePositionChange])
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  
  // Convert normalized coordinates (0-1) to canvas coordinates using actual image bounds
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
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [draggedDevice, setDraggedDevice] = useState<{ id: string; startX: number; startY: number } | null>(null)
  
  // Lasso selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const stageRef = useRef<any>(null)
  
  // Track Shift key state - more robust detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check both key name and shiftKey property for reliability
      if (e.key === 'Shift' || e.shiftKey) {
        setIsShiftHeld(true)
        // Change cursor to indicate lasso mode
        if (stageRef.current) {
          const container = stageRef.current.container()
          if (container) {
            container.style.cursor = 'crosshair'
          }
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Only clear if shift is actually released (not just another key)
      if (e.key === 'Shift' || (!e.shiftKey && isShiftHeld)) {
        setIsShiftHeld(false)
        // Reset cursor
        if (stageRef.current) {
          const container = stageRef.current.container()
          if (container) {
            container.style.cursor = 'default'
          }
        }
        // Don't cancel selection on keyup - let mouseup handle it
      }
    }
    
    // Also check on mouse events to catch cases where shift is pressed outside window
    const handleMouseMove = (e: MouseEvent) => {
      if (e.shiftKey !== isShiftHeld) {
        setIsShiftHeld(e.shiftKey)
        if (stageRef.current) {
          const container = stageRef.current.container()
          if (container) {
            container.style.cursor = e.shiftKey ? 'crosshair' : 'default'
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isSelecting, isShiftHeld])
  
  // Get full device data for hovered device
  const hoveredDeviceData = useMemo(() => {
    if (!hoveredDevice || !devicesData) return null
    return devicesData.find(d => d.id === hoveredDevice.id) || null
  }, [hoveredDevice, devicesData])
  const animationFrameRef = useRef<number | null>(null)
  const [colors, setColors] = useState({
    primary: '#4c7dff',
    accent: '#f97316',
    success: '#22c55e',
    warning: '#ffcc00',
    muted: '#9ca3af',
    text: '#ffffff',
    tooltipBg: 'rgba(17, 24, 39, 0.95)',
    tooltipBorder: '#4c7dff',
    tooltipText: '#ffffff',
    tooltipShadow: 'rgba(0, 0, 0, 0.5)',
  })

  // Sort devices in logical order (by deviceId) for keyboard navigation
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      // Sort by deviceId for consistent logical order
      return a.deviceId.localeCompare(b.deviceId)
    })
  }, [devices])

  // Viewport culling - only render devices visible in current viewport
  const visibleDevices = useMemo(() => {
    // Calculate viewport bounds for culling
    const viewportPadding = 200 // Render devices slightly outside viewport for smooth scrolling
    const viewportMinX = -effectiveStagePosition.x / effectiveScale - viewportPadding
    const viewportMaxX = (-effectiveStagePosition.x + dimensions.width) / effectiveScale + viewportPadding
    const viewportMinY = -effectiveStagePosition.y / effectiveScale - viewportPadding
    const viewportMaxY = (-effectiveStagePosition.y + dimensions.height) / effectiveScale + viewportPadding
    
    // Filter devices to only those in viewport
    return devices.filter(device => {
      const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
      return deviceCoords.x >= viewportMinX && 
             deviceCoords.x <= viewportMaxX && 
             deviceCoords.y >= viewportMinY && 
             deviceCoords.y <= viewportMaxY
    })
  }, [devices, effectiveStagePosition, effectiveScale, dimensions, toCanvasCoords])

  // Keyboard navigation: up/down arrows for device selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if a device is selected and we're not typing in an input
      if (!selectedDeviceId || sortedDevices.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = sortedDevices.findIndex(d => d.id === selectedDeviceId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < sortedDevices.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onDeviceSelect?.(sortedDevices[newIndex].id)
          // Also update multi-select if needed
          if (onDevicesSelect) {
            onDevicesSelect([sortedDevices[newIndex].id])
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeviceId, sortedDevices, onDeviceSelect, onDevicesSelect])

  useEffect(() => {
    // Use ResizeObserver to measure actual container dimensions
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(rect.width, 400),
          height: Math.max(rect.height, 400),
        })
      }
    }

    // Get theme colors from CSS variables
    const updateColors = () => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      setColors({
        primary: computedStyle.getPropertyValue('--color-primary').trim() || '#4c7dff',
        accent: computedStyle.getPropertyValue('--color-accent').trim() || '#f97316',
        success: computedStyle.getPropertyValue('--color-success').trim() || '#22c55e',
        warning: computedStyle.getPropertyValue('--color-warning').trim() || '#ffcc00',
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
    
    // Use ResizeObserver to respond to container size changes (e.g., when panel is resized)
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    // Also listen for window resize as fallback
    window.addEventListener('resize', updateDimensions)
    
    // Watch for theme changes
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

  // Removed auto-centering on device selection - it was distracting
  // Map now stays in place when selecting devices

  // Escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'select') {
        onDevicesSelect?.([])
        onDeviceSelect?.(null)
        setDraggedDevice(null)
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, onDeviceSelect, onDevicesSelect])

  // Devices come from props now, no need for local device array

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

  // Ensure Stage container doesn't interfere with navigation clicks
  useEffect(() => {
    if (!stageRef.current) return
    
    const container = stageRef.current.container()
    if (!container) return
    
    // Ensure container only captures events within its bounds
    container.style.pointerEvents = 'auto'
    container.style.touchAction = 'none'
    
    // Prevent the container from capturing clicks outside its visual bounds
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // If click is outside container bounds, allow it to propagate to navigation
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        e.stopImmediatePropagation()
      }
    }
    
    // Use capture phase to intercept before Konva handles it
    container.addEventListener('click', handleClick, true)
    container.addEventListener('mousedown', handleClick, true)
    
    return () => {
      container.removeEventListener('click', handleClick, true)
      container.removeEventListener('mousedown', handleClick, true)
    }
  }, [dimensions])
  
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <Stage 
        ref={stageRef}
        width={dimensions.width} 
        height={dimensions.height}
        x={effectiveStagePosition.x}
        y={effectiveStagePosition.y}
        scaleX={effectiveScale}
        scaleY={effectiveScale}
        draggable={mode === 'select' && !isSelecting && !isShiftHeld && draggedDevice === null} // Disable stage dragging when Shift is held or selecting
        style={{ touchAction: 'none' }}
        onDblClick={(e) => {
          // Double-click on background, map image, or zones to deselect all devices
          const stage = e.target.getStage()
          if (!stage) return
          
          const target = e.target
          const targetType = target.getType?.() || ''
          
          // Check if clicked on empty stage, layer, map image (Image), or zone (Line/Group)
          // But NOT on a device (Circle or Group containing device elements)
          const isDevice = targetType === 'Circle' || targetType === 'Rect'
          const clickedOnMap = target === stage || 
                              target === stage.findOne('Layer') ||
                              targetType === 'Image' || // Map image
                              targetType === 'Line' || // Zone boundaries
                              (targetType === 'Group' && !isDevice) // Zone groups or map image group
          
          if (clickedOnMap && mode === 'select') {
            onDevicesSelect?.([])
            onDeviceSelect?.(null)
            setDraggedDevice(null)
            setIsSelecting(false)
            setSelectionStart(null)
            setSelectionEnd(null)
          }
        }}
        onMouseDown={(e) => {
          // Only handle clicks within the stage bounds
          const stage = e.target.getStage()
          if (!stage) return
          
          // Check if click is outside stage bounds - if so, don't handle it
          const pointerPos = stage.getPointerPosition()
          if (pointerPos) {
            const stageBox = stage.container().getBoundingClientRect()
            if (pointerPos.x < 0 || pointerPos.x > dimensions.width || 
                pointerPos.y < 0 || pointerPos.y > dimensions.height) {
              // Click outside stage bounds - let it propagate
              return
            }
          }
          
          if (mode === 'select' && e.evt.button === 0 && !draggedDevice) {
            // Check if shift is actually held (use both state and event)
            const shiftHeld = isShiftHeld || e.evt.shiftKey
            const clickedOnEmpty = e.target === stage || e.target === stage.findOne('Layer')
            
            // Start lasso selection if Shift is held
            if (shiftHeld) {
              if (pointerPos) {
                // Convert pointer position to content coordinates
                const transform = stage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(pointerPos)
                
                console.log('Starting selection at:', pos)
                setIsSelecting(true)
                setSelectionStart({ x: pos.x, y: pos.y })
                setSelectionEnd({ x: pos.x, y: pos.y })
              }
            } else if (clickedOnEmpty && !shiftHeld) {
              // Regular click without Shift - clear selection and free mouse
              onDevicesSelect?.([])
              onDeviceSelect?.(null)
              // Reset any dragging state
              setDraggedDevice(null)
              setIsSelecting(false)
              setSelectionStart(null)
              setSelectionEnd(null)
            }
          }
        }}
        onMouseMove={(e) => {
          const stage = e.target.getStage()
          if (!stage) return
          
          // Update selection box if selecting
          if (isSelecting && selectionStart) {
            const pointerPos = stage.getPointerPosition()
            if (pointerPos) {
              // Convert pointer position to content coordinates
              const transform = stage.getAbsoluteTransform().copy().invert()
              const pos = transform.point(pointerPos)
              setSelectionEnd({ x: pos.x, y: pos.y })
            }
          } else {
            // Update shift state from event (more reliable)
            const shiftHeld = e.evt.shiftKey
            if (shiftHeld !== isShiftHeld) {
              setIsShiftHeld(shiftHeld)
            }
            
            // Show crosshair cursor when Shift is held
            if (shiftHeld && mode === 'select' && !draggedDevice) {
              const container = stage.container()
              if (container) {
                container.style.cursor = 'crosshair'
              }
            } else if (!shiftHeld) {
              const container = stage.container()
              if (container) {
                container.style.cursor = 'default'
              }
            }
          }
        }}
        onMouseUp={(e) => {
          if (isSelecting && selectionStart && selectionEnd) {
            // Find devices within selection box
            const minX = Math.min(selectionStart.x, selectionEnd.x)
            const maxX = Math.max(selectionStart.x, selectionEnd.x)
            const minY = Math.min(selectionStart.y, selectionEnd.y)
            const maxY = Math.max(selectionStart.y, selectionEnd.y)
            
            // Only process if selection box has meaningful size
            const width = Math.abs(selectionEnd.x - selectionStart.x)
            const height = Math.abs(selectionEnd.y - selectionStart.y)
            
            if (width > 5 || height > 5) {
              const selectedIds: string[] = []
              // Only check visible devices for selection (performance optimization)
              visibleDevices.forEach(device => {
                // Convert device position from normalized (0-1) to canvas pixels
                const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
                const deviceX = deviceCoords.x
                const deviceY = deviceCoords.y
                
                // Check if device is within selection box bounds
                const tolerance = 5
                if (deviceX >= minX - tolerance && 
                    deviceX <= maxX + tolerance && 
                    deviceY >= minY - tolerance && 
                    deviceY <= maxY + tolerance) {
                  selectedIds.push(device.id)
                }
              })
              
              console.log(`Selection box: (${minX.toFixed(0)}, ${minY.toFixed(0)}) to (${maxX.toFixed(0)}, ${maxY.toFixed(0)})`)
              console.log(`Found ${selectedIds.length} devices in selection`)
              
              if (selectedIds.length > 0) {
                if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
                  // Add to selection
                  const newSelection = [...new Set([...selectedDeviceIds, ...selectedIds])]
                  onDevicesSelect?.(newSelection)
                  if (newSelection.length === 1) {
                    onDeviceSelect?.(newSelection[0])
                  }
                } else {
                  // Replace selection
                  onDevicesSelect?.(selectedIds)
                  if (selectedIds.length === 1) {
                    onDeviceSelect?.(selectedIds[0])
                  } else {
                    onDeviceSelect?.(null)
                  }
                }
              } else {
                // No devices selected - clear if not holding modifier
                if (!e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
                  onDevicesSelect?.([])
                  onDeviceSelect?.(null)
                }
              }
            }
            
            setIsSelecting(false)
            setSelectionStart(null)
            setSelectionEnd(null)
          }
        }}
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
      >
        <Layer>
          {/* Floor Plan Background - Vector-first, fallback to image */}
          {vectorData ? (
            <Group
              onDblClick={(e) => {
                if (mode === 'select') {
                  e.cancelBubble = true
                  onDevicesSelect?.([])
                  onDeviceSelect?.(null)
                  setDraggedDevice(null)
                  setIsSelecting(false)
                  setSelectionStart(null)
                  setSelectionEnd(null)
                }
              }}
            >
              <VectorFloorPlan
                vectorData={vectorData}
                width={dimensions.width}
                height={dimensions.height}
                showWalls={showWalls}
                showAnnotations={showAnnotations}
                showText={showText}
                zoomBounds={currentLocation?.type === 'zoom' ? currentLocation.zoomBounds : null}
              />
            </Group>
          ) : mapImageUrl ? (
            <Group
              onDblClick={(e) => {
                if (mode === 'select') {
                  e.cancelBubble = true
                  onDevicesSelect?.([])
                  onDeviceSelect?.(null)
                  setDraggedDevice(null)
                  setIsSelecting(false)
                  setSelectionStart(null)
                  setSelectionEnd(null)
                }
              }}
            >
              <FloorPlanImage 
                url={mapImageUrl} 
                width={dimensions.width} 
                height={dimensions.height}
                onImageBoundsChange={(bounds) => {
                  setImageBounds(bounds)
                  onImageBoundsChange?.(bounds)
                }}
                zoomBounds={currentLocation?.type === 'zoom' ? currentLocation.zoomBounds : null}
              />
            </Group>
          ) : null}
          
          {/* Zones Background - rendered before devices so they appear behind */}
          {showZones && zones.map((zone) => {
            const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])
            
            const hasSelectedDevices = selectedDeviceIds.length > 0
            const isHovered = hoveredZoneId === zone.id
            
            return (
              <Group
                key={zone.id}
                onClick={() => {
                  if (onZoneClick && mode === 'select') {
                    onZoneClick(zone.id)
                  }
                }}
                onTap={() => {
                  if (onZoneClick && mode === 'select') {
                    onZoneClick(zone.id)
                  }
                }}
                onDblClick={(e) => {
                  // Double-click on zone to deselect
                  if (mode === 'select') {
                    e.cancelBubble = true
                    onDevicesSelect?.([])
                    onDeviceSelect?.(null)
                    setDraggedDevice(null)
                    setIsSelecting(false)
                    setSelectionStart(null)
                    setSelectionEnd(null)
                  }
                }}
                onMouseEnter={() => {
                  setHoveredZoneId(zone.id)
                  if (hasSelectedDevices && mode === 'select') {
                    const container = stageRef.current?.container()
                    if (container) {
                      container.style.cursor = 'pointer'
                    }
                  }
                }}
                onMouseLeave={() => {
                  setHoveredZoneId(null)
                  if (hasSelectedDevices && mode === 'select') {
                    const container = stageRef.current?.container()
                    if (container) {
                      container.style.cursor = isShiftHeld ? 'crosshair' : 'default'
                    }
                  }
                }}
              >
                <Line
                  points={points}
                  fill={hasSelectedDevices && isHovered ? `${zone.color}40` : `${zone.color}20`}
                  stroke={zone.color}
                  strokeWidth={hasSelectedDevices && isHovered ? 2 : 1}
                  closed
                  opacity={hasSelectedDevices && isHovered ? 0.5 : 0.3}
                  listening={true}
                  shadowBlur={hasSelectedDevices && isHovered ? 15 : 0}
                  shadowColor={zone.color}
                />
                <Text
                  x={points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (points.length / 2) - 30}
                  y={points.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (points.length / 2) - 8}
                  text={hasSelectedDevices && isHovered ? `Click to arrange ${selectedDeviceIds.length} device${selectedDeviceIds.length !== 1 ? 's' : ''}` : zone.name}
                  fontSize={hasSelectedDevices && isHovered ? 11 : 12}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fill={zone.color}
                  opacity={hasSelectedDevices && isHovered ? 0.9 : 0.6}
                  listening={false}
                  fontStyle={hasSelectedDevices && isHovered ? 'bold' : 'normal'}
                />
              </Group>
            )
          })}
          
          {/* Device points - with viewport culling for performance */}
          {visibleDevices.map((device) => {
            // Scale device positions to canvas coordinates (respects image bounds)
            const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
            const isSelected = selectedDeviceId === device.id || selectedDeviceIds.includes(device.id)
            const isHovered = hoveredDevice?.id === device.id
            
            return (
              <Group 
                key={device.id}
                x={deviceCoords.x}
                y={deviceCoords.y}
                draggable={mode === 'move'}
                listening={true}
                perfectDrawEnabled={false}
                hitStrokeWidth={0}
                dragBoundFunc={(pos) => {
                  // Constrain dragging to canvas bounds
                  return {
                    x: Math.max(0, Math.min(dimensions.width, pos.x)),
                    y: Math.max(0, Math.min(dimensions.height, pos.y))
                  }
                }}
                onDragStart={(e) => {
                  // Prevent stage dragging when dragging devices
                    e.cancelBubble = true
                  setIsSelecting(false)
                  setSelectionStart(null)
                  setSelectionEnd(null)
                  setDraggedDevice({ id: device.id, startX: device.x || 0, startY: device.y || 0 })
                  if (!selectedDeviceIds.includes(device.id)) {
                    if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
                      // Add to selection
                      onDevicesSelect?.([...selectedDeviceIds, device.id])
                    } else {
                      // Replace selection
                      onDevicesSelect?.([device.id])
                  onDeviceSelect?.(device.id)
                    }
                  }
                }}
                onDragMove={(e) => {
                  // Prevent stage dragging
                  e.cancelBubble = true
                  // Don't update device position during drag - only update on drag end
                  // This prevents feedback loops where position updates cause re-renders
                  // which then recalculate the Group position, causing erratic movement
                }}
                onDragEnd={(e) => {
                  // Prevent stage dragging
                  e.cancelBubble = true
                  
                  if (mode === 'move' && onDeviceMoveEnd) {
                    // Get the final position of the Group (already in canvas coordinates)
                      const pos = e.target.position()
                    // Convert canvas coordinates to normalized 0-1 coordinates
                      const normalizedX = Math.max(0, Math.min(1, pos.x / dimensions.width))
                      const normalizedY = Math.max(0, Math.min(1, pos.y / dimensions.height))
                      onDeviceMoveEnd(device.id, normalizedX, normalizedY)
                  }
                  setDraggedDevice(null)
                }}
              >
                {/* Light Bar for Fixtures */}
                {device.type === 'fixture' && (() => {
                  // Calculate light bar dimensions (6ft x 6inch = 72:6 ratio = 12:1)
                  // Use a reasonable size that scales with canvas
                  const barLength = Math.max(30, dimensions.width * 0.035) // ~3.5% of width, min 30px
                  const barWidth = Math.max(3, barLength / 12) // Maintain 12:1 ratio
                  // Larger invisible hit area for easier clicking
                  const hitAreaRadius = Math.max(20, barLength / 2 + 10) // At least 20px, or bar length/2 + 10px
                  
                  return (
                    <Group rotation={device.orientation || 0}>
                      {/* Large invisible hit area for easier clicking */}
                      <Circle
                        x={0}
                        y={0}
                        radius={hitAreaRadius}
                        fill="transparent"
                        opacity={0}
                        onClick={(e) => {
                          e.cancelBubble = true
                          if (mode === 'rotate') {
                            // Rotate mode: rotate the device
                            if (device.type === 'fixture') {
                              onDeviceRotate?.(device.id)
                            }
                          } else if (mode === 'select') {
                            if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
                              // Toggle selection
                              if (selectedDeviceIds.includes(device.id)) {
                                const newSelection = selectedDeviceIds.filter(id => id !== device.id)
                                onDevicesSelect?.(newSelection)
                                if (newSelection.length === 1) {
                                  onDeviceSelect?.(newSelection[0])
                                } else if (newSelection.length === 0) {
                                  onDeviceSelect?.(null)
                                }
                              } else {
                                const newSelection = [...selectedDeviceIds, device.id]
                                onDevicesSelect?.(newSelection)
                                if (newSelection.length === 1) {
                            onDeviceSelect?.(device.id)
                                }
                              }
                            } else {
                              // Single select
                              onDevicesSelect?.([device.id])
                            onDeviceSelect?.(device.id)
                            }
                          }
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true
                          if (mode === 'rotate') {
                            // Rotate mode: rotate the device
                            if (device.type === 'fixture') {
                              onDeviceRotate?.(device.id)
                            }
                          } else if (mode === 'select') {
                            // For tap events, we don't have modifier keys, so just single select
                            onDevicesSelect?.([device.id])
                            onDeviceSelect?.(device.id)
                          }
                        }}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container()
                          if (container) {
                            if (device.locked) {
                              container.style.cursor = 'not-allowed'
                            } else {
                              container.style.cursor = mode === 'move' ? 'grab' : 'pointer'
                            }
                          }
                          setHoveredDevice(device)
                          // Get mouse position relative to stage
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
                      {/* Light bar rectangle - 6ft x 6inch (12:1 ratio) */}
                      <Rect
                        x={-barLength / 2} // Center the bar
                        y={-barWidth / 2} // Center the bar
                        width={barLength}
                        height={barWidth}
                        fill={getDeviceColor(device.type)}
                        opacity={device.locked ? 0.5 : (isSelected ? 0.9 : (isHovered ? 0.8 : 0.7))}
                        stroke={device.locked ? colors.warning : (isSelected ? colors.text : 'rgba(255,255,255,0.3)')}
                        strokeWidth={device.locked ? 2 : (isSelected ? 2 : 1)}
                        shadowBlur={isSelected ? 10 : (isHovered ? 6 : 2)}
                        shadowColor={isSelected ? colors.primary : 'black'}
                        cornerRadius={1}
                        dash={device.locked ? [4, 4] : undefined}
                        listening={false}
                      />
                      {/* Center dot - visual only */}
                      <Circle
                        x={0}
                        y={0}
                        radius={isSelected ? 6 : (isHovered ? 5 : 4)}
                        fill={getDeviceColor(device.type)}
                        stroke={device.locked ? colors.warning : (isSelected ? colors.text : 'rgba(255,255,255,0.4)')}
                        strokeWidth={device.locked ? 2 : (isSelected ? 2.5 : 1.5)}
                        shadowBlur={isSelected ? 12 : (isHovered ? 8 : 4)}
                        shadowColor={isSelected ? colors.primary : 'black'}
                        opacity={device.locked ? 0.8 : (isSelected ? 1 : (isHovered ? 0.9 : 0.8))}
                        listening={false}
                      />
                    </Group>
                  )
                })()}
                
                {/* Regular dot for non-fixture devices */}
                {device.type !== 'fixture' && (
                  <>
                    {/* Large invisible hit area for easier clicking */}
                  <Circle
                    x={0}
                    y={0}
                      radius={isSelected ? 20 : (isHovered ? 18 : 16)} // Much larger than visual circle
                      fill="transparent"
                      opacity={0}
                      onClick={(e) => {
                        e.cancelBubble = true
                      if (mode === 'select') {
                          if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
                            // Toggle selection
                            if (selectedDeviceIds.includes(device.id)) {
                              const newSelection = selectedDeviceIds.filter(id => id !== device.id)
                              onDevicesSelect?.(newSelection)
                              if (newSelection.length === 1) {
                                onDeviceSelect?.(newSelection[0])
                              } else if (newSelection.length === 0) {
                                onDeviceSelect?.(null)
                              }
                            } else {
                              const newSelection = [...selectedDeviceIds, device.id]
                              onDevicesSelect?.(newSelection)
                              if (newSelection.length === 1) {
                        onDeviceSelect?.(device.id)
                      }
                            }
                          } else {
                            // Single select
                            onDevicesSelect?.([device.id])
                            onDeviceSelect?.(device.id)
                          }
                        }
                    }}
                      onTap={(e) => {
                        e.cancelBubble = true
                      if (mode === 'select') {
                          // For tap events, we don't have modifier keys, so just single select
                          onDevicesSelect?.([device.id])
                        onDeviceSelect?.(device.id)
                      }
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) {
                        if (device.locked) {
                          container.style.cursor = 'not-allowed'
                        } else {
                          container.style.cursor = mode === 'move' ? 'grab' : 'pointer'
                        }
                      }
                      setHoveredDevice(device)
                      // Get mouse position relative to stage
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
                    {/* Visual circle - no interaction */}
                    <Circle
                      x={0}
                      y={0}
                      radius={isSelected ? 8 : (isHovered ? 6 : 4)}
                      fill={getDeviceColor(device.type)}
                      stroke={device.locked ? colors.warning : (isSelected ? colors.text : 'rgba(255,255,255,0.2)')}
                      strokeWidth={device.locked ? 2 : (isSelected ? 3 : 1)}
                      shadowBlur={isSelected ? 15 : (isHovered ? 8 : 3)}
                      shadowColor={isSelected ? colors.primary : 'black'}
                      opacity={device.locked ? 0.7 : (isSelected ? 1 : (isHovered ? 0.8 : 0.6))}
                      dash={device.locked ? [4, 4] : undefined}
                      listening={false}
                    />
                  </>
                )}
                {/* Lock indicator */}
                {device.locked && (
                  <Circle
                    x={6}
                    y={-6}
                    radius={3}
                    fill={colors.warning}
                    stroke={colors.text}
                    strokeWidth={1}
                    listening={false}
                  />
                )}
                {/* Expand button for devices with components */}
                {isSelected && device.components && device.components.length > 0 && (
                  <Group
                    x={12}
                    y={-12}
                    onClick={(e) => {
                      e.cancelBubble = true
                      const isExpanded = expandedComponents.has(device.id)
                      onComponentExpand?.(device.id, !isExpanded)
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true
                      const isExpanded = expandedComponents.has(device.id)
                      onComponentExpand?.(device.id, !isExpanded)
                    }}
                  >
                    <Circle
                      x={0}
                      y={0}
                      radius={10}
                      fill={colors.primary}
                      stroke={colors.text}
                      strokeWidth={2}
                      shadowBlur={5}
                      shadowColor={colors.primary}
                    />
                    <Text
                      x={-4}
                      y={-6}
                      text={expandedComponents.has(device.id) ? '−' : '+'}
                      fontSize={16}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.text}
                      align="center"
                      listening={false}
                    />
                  </Group>
                )}
                {/* Component tree overlay - shown when expanded */}
                {isSelected && device.components && device.components.length > 0 && expandedComponents.has(device.id) && (
                  <Group x={25} y={-40}>
                    <Rect
                      width={280}
                      height={Math.min(300, 60 + device.components.length * 80)}
                      fill={colors.tooltipBg}
                      cornerRadius={8}
                      shadowBlur={15}
                      shadowColor={colors.tooltipShadow}
                      shadowOffsetX={0}
                      shadowOffsetY={2}
                    />
                    <Rect
                      width={280}
                      height={Math.min(300, 60 + device.components.length * 80)}
                      fill="transparent"
                      stroke={colors.tooltipBorder}
                      strokeWidth={2}
                      cornerRadius={8}
                    />
                    <Text
                      x={14}
                      y={14}
                      text="Components"
                      fontSize={14}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.tooltipText}
                      align="left"
                    />
                    <Line
                      points={[14, 32, 266, 32]}
                      stroke={colors.tooltipBorder}
                      strokeWidth={1}
                      opacity={0.3}
                    />
                    {device.components.map((component, idx) => {
                      const yPos = 40 + idx * 70
                      const warrantyColor = component.warrantyStatus === 'Active' 
                        ? colors.success 
                        : component.warrantyStatus === 'Expired'
                        ? '#ef4444'
                        : colors.muted
                      const parentDevice = devicesData.find(d => d.id === device.id)
                      const handleComponentClick = (e: any) => {
                        e.cancelBubble = true
                        if (onComponentClick && parentDevice) {
                          onComponentClick(component, parentDevice)
                        }
                      }
                      return (
                        <Group 
                          key={component.id} 
                          y={yPos}
                          onClick={handleComponentClick}
                          onTap={handleComponentClick}
                        >
                          {/* Clickable background highlight on hover */}
                          <Rect
                            x={0}
                            y={0}
                            width={266}
                            height={65}
                            fill={onComponentClick ? 'rgba(76, 125, 255, 0.05)' : 'transparent'}
                            cornerRadius={4}
                            opacity={0}
                            onMouseEnter={(e) => {
                              if (onComponentClick) {
                                const rect = e.target
                                rect.opacity(0.1)
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (onComponentClick) {
                                const rect = e.target
                                rect.opacity(0)
                              }
                            }}
                          />
                          <Text
                            x={14}
                            y={0}
                            text={component.componentType}
                            fontSize={12}
                            fontFamily="system-ui, -apple-system, sans-serif"
                            fontStyle="bold"
                            fill={colors.tooltipText}
                            align="left"
                          />
                          <Text
                            x={14}
                            y={16}
                            text={component.componentSerialNumber}
                            fontSize={10}
                            fontFamily="monospace"
                            fill={colors.muted}
                            align="left"
                          />
                          {component.warrantyStatus && (
                            <Group x={14} y={32}>
                              <Circle
                                x={6}
                                y={6}
                                radius={4}
                                fill={warrantyColor}
                              />
                              <Text
                                x={16}
                                y={0}
                                text={`Warranty: ${component.warrantyStatus}`}
                                fontSize={10}
                                fontFamily="system-ui, -apple-system, sans-serif"
                                fill={warrantyColor}
                                align="left"
                              />
                            </Group>
                          )}
                          {component.warrantyExpiry && (
                            <Text
                              x={14}
                              y={48}
                              text={`Expires: ${component.warrantyExpiry.toLocaleDateString()}`}
                              fontSize={9}
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fill={colors.muted}
                              align="left"
                            />
                          )}
                        </Group>
                      )
                    })}
                  </Group>
                )}
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
              `Serial: ${hoveredDeviceData.serialNumber}`,
              `Signal: ${hoveredDevice.signal}%`,
              `Status: ${hoveredDevice.status}`,
              ...(hoveredDevice.locked ? ['🔒 Locked'] : []),
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
        
        {/* Selection Box Layer - Always on top */}
        {isSelecting && selectionStart && selectionEnd && (
          <Layer>
            {(() => {
              const minX = Math.min(selectionStart.x, selectionEnd.x)
              const maxX = Math.max(selectionStart.x, selectionEnd.x)
              const minY = Math.min(selectionStart.y, selectionEnd.y)
              const maxY = Math.max(selectionStart.y, selectionEnd.y)
              const width = Math.abs(selectionEnd.x - selectionStart.x)
              const height = Math.abs(selectionEnd.y - selectionStart.y)
              
              // Only render if selection has meaningful size
              if (width < 2 || height < 2) {
                return null
              }
              
              // Calculate safe corner radius (must be less than half the smallest dimension)
              const safeCornerRadius = Math.min(4, Math.min(width, height) / 2 - 1)
              const safeCornerRadiusInner = Math.max(0, Math.min(2, Math.min(width - 6, height - 6) / 2 - 1))
              
              // Find devices within selection box (with tolerance to match selection logic)
              const tolerance = 5
              const devicesInSelection = devices.filter(device => {
                const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
                const deviceX = deviceCoords.x
                const deviceY = deviceCoords.y
                return deviceX >= minX - tolerance && 
                       deviceX <= maxX + tolerance && 
                       deviceY >= minY - tolerance && 
                       deviceY <= maxY + tolerance
              })
              
              // Count by type
              const fixtures = devicesInSelection.filter(d => d.type === 'fixture').length
              const motion = devicesInSelection.filter(d => d.type === 'motion').length
              const sensors = devicesInSelection.filter(d => d.type === 'light-sensor').length
              const totalCount = devicesInSelection.length
              
              return (
                <Group>
                  {/* Selection box with much stronger visual */}
                  {/* Outer glow */}
                  <Rect
                    x={minX - 2}
                    y={minY - 2}
                    width={width + 4}
                    height={height + 4}
                    fill="transparent"
                    stroke="rgba(76, 125, 255, 0.4)"
                    strokeWidth={5}
                    listening={false}
                    shadowBlur={20}
                    shadowColor="rgba(76, 125, 255, 0.9)"
                    cornerRadius={Math.max(0, safeCornerRadius + 1)}
                  />
                  
                  {/* Main selection box */}
                  <Rect
                    x={minX}
                    y={minY}
                    width={width}
                    height={height}
                    fill="rgba(76, 125, 255, 0.25)"
                    stroke="rgba(76, 125, 255, 1)"
                    strokeWidth={4}
                    dash={[12, 6]}
                    listening={false}
                    shadowBlur={25}
                    shadowColor="rgba(76, 125, 255, 1)"
                    cornerRadius={Math.max(0, safeCornerRadius)}
                  />
                  
                  {/* Inner bright border for better definition - only if there's room */}
                  {width > 6 && height > 6 && (
                    <Rect
                      x={minX + 3}
                      y={minY + 3}
                      width={width - 6}
                      height={height - 6}
                      fill="transparent"
                      stroke="rgba(255, 255, 255, 0.8)"
                      strokeWidth={2}
                      dash={[6, 4]}
                      listening={false}
                      cornerRadius={Math.max(0, safeCornerRadiusInner)}
                    />
                  )}
                  
                  {/* Corner indicators for better visibility */}
                  <Group>
                    {/* Top-left corner */}
                    <Line
                      points={[minX, minY, minX + 20, minY]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[minX, minY, minX, minY + 20]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Top-right corner */}
                    <Line
                      points={[maxX, minY, maxX - 20, minY]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[maxX, minY, maxX, minY + 20]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Bottom-left corner */}
                    <Line
                      points={[minX, maxY, minX + 20, maxY]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[minX, maxY, minX, maxY - 20]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Bottom-right corner */}
                    <Line
                      points={[maxX, maxY, maxX - 20, maxY]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[maxX, maxY, maxX, maxY - 20]}
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                  </Group>
                  
                  {/* Device indicators - show prominent highlights for each device in selection */}
                  {devicesInSelection.map((device) => {
                    const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
                    const color = device.type === 'fixture' ? '#4c7dff' : 
                                 device.type === 'motion' ? '#f97316' : 
                                 '#22c55e'
                    
                    return (
                      <Group key={device.id}>
                        {/* Outer glow ring */}
                        <Circle
                          x={deviceCoords.x}
                          y={deviceCoords.y}
                          radius={12}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={3}
                          opacity={0.6}
                          listening={false}
                          shadowBlur={15}
                          shadowColor={color}
                        />
                        {/* Highlight circle around device */}
                        <Circle
                          x={deviceCoords.x}
                          y={deviceCoords.y}
                          radius={10}
                          fill={color}
                          opacity={0.5}
                          listening={false}
                        />
                        {/* Inner bright ring */}
                        <Circle
                          x={deviceCoords.x}
                          y={deviceCoords.y}
                          radius={8}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={3}
                          listening={false}
                        />
                        {/* Center dot */}
                        <Circle
                          x={deviceCoords.x}
                          y={deviceCoords.y}
                          radius={4}
                          fill={color}
                          listening={false}
                        />
              </Group>
            )
          })}
                  
                  {/* Count indicator with breakdown - always show, even when 0 */}
                  <Group
                    x={minX + 10}
                    y={Math.max(10, minY - 60)}
                  >
                    <Rect
                      x={0}
                      y={0}
                      width={Math.max(160, 100 + (totalCount > 9 ? 20 : 0))}
                      height={totalCount > 0 ? 60 : 35}
                      fill="rgba(17, 24, 39, 0.98)"
                      cornerRadius={8}
                      listening={false}
                      shadowBlur={25}
                      shadowColor="rgba(0, 0, 0, 0.7)"
                    />
                    <Rect
                      x={0}
                      y={0}
                      width={Math.max(160, 100 + (totalCount > 9 ? 20 : 0))}
                      height={totalCount > 0 ? 60 : 35}
                      fill="transparent"
                      stroke="rgba(76, 125, 255, 1)"
                      strokeWidth={3}
                      cornerRadius={8}
                      listening={false}
                    />
                    <Text
                      x={10}
                      y={8}
                      text={totalCount > 0 
                        ? `${totalCount} device${totalCount !== 1 ? 's' : ''} selected`
                        : 'Drag to select devices'}
                      fontSize={13}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={totalCount > 0 ? "#ffffff" : "rgba(255, 255, 255, 0.7)"}
                      align="left"
                      listening={false}
                    />
                      {totalCount > 0 && (
                        <Group x={8} y={22}>
                          {fixtures > 0 && (
                            <Text
                              x={0}
                              y={0}
                              text={`• ${fixtures} fixture${fixtures !== 1 ? 's' : ''}`}
                              fontSize={10}
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fill="#4c7dff"
                              align="left"
                              listening={false}
                            />
                          )}
                          {motion > 0 && (
                            <Text
                              x={0}
                              y={fixtures > 0 ? 14 : 0}
                              text={`• ${motion} motion sensor${motion !== 1 ? 's' : ''}`}
                              fontSize={10}
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fill="#f97316"
                              align="left"
                              listening={false}
                            />
                          )}
                          {sensors > 0 && (
                            <Text
                              x={0}
                              y={(fixtures > 0 ? 14 : 0) + (motion > 0 ? 14 : 0)}
                              text={`• ${sensors} light sensor${sensors !== 1 ? 's' : ''}`}
                              fontSize={10}
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fill="#22c55e"
                              align="left"
                              listening={false}
                            />
                          )}
                        </Group>
                      )}
                    </Group>
                </Group>
              )
            })()}
        </Layer>
        )}
        
        {/* Shift hint overlay - more prominent */}
        {isShiftHeld && mode === 'select' && !isSelecting && (
          <Layer>
            <Group>
              {/* Pulsing background */}
              <Rect
                x={dimensions.width / 2 - 150}
                y={20}
                width={300}
                height={50}
                fill="rgba(76, 125, 255, 0.15)"
                cornerRadius={10}
                listening={false}
                shadowBlur={20}
                shadowColor="rgba(76, 125, 255, 0.5)"
              />
              <Rect
                x={dimensions.width / 2 - 150}
                y={20}
                width={300}
                height={50}
                fill="rgba(17, 24, 39, 0.95)"
                cornerRadius={10}
                listening={false}
                shadowBlur={20}
                shadowColor="rgba(0, 0, 0, 0.6)"
              />
              <Rect
                x={dimensions.width / 2 - 150}
                y={20}
                width={300}
                height={50}
                fill="transparent"
                stroke="rgba(76, 125, 255, 1)"
                strokeWidth={3}
                cornerRadius={10}
                listening={false}
                dash={[8, 4]}
              />
              <Text
                x={dimensions.width / 2}
                y={47}
                text="Hold Shift + Drag to select devices"
                fontSize={14}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                listening={false}
              />
            </Group>
          </Layer>
        )}
      </Stage>
    </div>
  )
}

