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
import { useEffect, useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
import { Component, Device as DeviceType, DeviceType as DeviceTypeEnum } from '@/lib/mockData'
import { useZoomContext } from '@/lib/MapContext'

import { FloorPlanImage, type ImageBounds } from './FloorPlanImage'
import { MapPersonToken } from './MapPersonToken'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import type { Location } from '@/lib/locationStorage'
import { isFixtureType } from '@/lib/deviceUtils'
import { getCanvasColors, getRgbaVariable } from '@/lib/canvasColors'

/**
 * Get fixture size multiplier based on fixture type
 * 8ft = 1x (base size)
 * 12ft = 1.5x
 * 16ft = 2x
 */
function getFixtureSizeMultiplier(fixtureType: string): number {
  if (fixtureType.includes('16ft')) return 2.0
  if (fixtureType.includes('12ft')) return 1.5
  if (fixtureType.includes('8ft')) return 1.0
  return 1.0 // Default to 8ft size
}

export interface DevicePoint {
  id: string
  x: number
  y: number
  type: DeviceTypeEnum
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

interface MapCanvasProps {
  onDeviceSelect?: (deviceId: string | null) => void
  onDevicesSelect?: (deviceIds: string[]) => void
  selectedDeviceId?: string | null
  selectedDeviceIds?: string[]
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  devices?: DevicePoint[]
  zones?: Zone[]
  people?: PersonPoint[]
  highlightDeviceId?: string | null
  mode?: 'select' | 'move' | 'rotate' | 'align-direction' | 'auto-arrange'
  onDeviceMove?: (deviceId: string, x: number, y: number) => void
  onDeviceMoveEnd?: (deviceId: string, x: number, y: number) => void
  onDevicesMoveEnd?: (updates: { deviceId: string; x: number; y: number }[]) => void
  onDeviceRotate?: (deviceId: string) => void
  onLassoAlign?: (deviceIds: string[]) => void
  onLassoArrange?: (deviceIds: string[]) => void
  onComponentExpand?: (deviceId: string, expanded: boolean) => void
  expandedComponents?: Set<string>
  onComponentClick?: (component: Component, parentDevice: any) => void
  devicesData?: any[]
  onZoneClick?: (zoneId: string) => void
  showWalls?: boolean
  showAnnotations?: boolean
  showText?: boolean
  showZones?: boolean
  showPeople?: boolean
  /** When minimal, person tooltip shows basic info only; detailed = full info */
  tooltipDetailLevel?: 'minimal' | 'detailed'
  /** Called when a person token is clicked (e.g. navigate to People page) */
  onPersonSelect?: (personId: string | null) => void
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
  people = [],
  highlightDeviceId,
  mode = 'select',
  onDeviceMove,
  onDeviceMoveEnd,
  onDevicesMoveEnd,
  onDeviceRotate,
  onLassoAlign,
  onLassoArrange,
  onComponentExpand,
  expandedComponents = new Set(),
  onComponentClick,
  devicesData = [],
  onZoneClick,
  showWalls = true,
  showAnnotations = true,
  showText = true,
  showZones = true,
  showPeople = true,
  tooltipDetailLevel = 'detailed',
  onPersonSelect,
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
  const { setZoomLevel, triggerZoomIndicator, setInteractionHint } = useZoomContext()

  // Use external state if provided, otherwise use internal state
  const effectiveScale = externalScale ?? scale
  const effectiveStagePosition = externalStagePosition ?? stagePosition

  // Wrapper functions that update both internal and notify parent
  const setScale = useCallback((newScale: number) => {
    setScaleInternal(newScale)
    onScaleChange?.(newScale)

    // Update global zoom context
    setZoomLevel(newScale)
    triggerZoomIndicator()
  }, [onScaleChange, setZoomLevel, triggerZoomIndicator])

  const setStagePosition = useCallback((newPosition: { x: number; y: number }) => {
    setStagePositionInternal(newPosition)
    onStagePositionChange?.(newPosition)
  }, [onStagePositionChange])
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const imageBoundsRef = useRef<ImageBounds | null>(null)

  // Keep ref in sync with state to avoid re-renders
  useEffect(() => {
    imageBoundsRef.current = imageBounds
  }, [imageBounds])

  // Stable callback for image bounds change - only update if bounds actually changed
  const handleImageBoundsChange = useCallback((bounds: ImageBounds) => {
    setImageBounds(prev => {
      // Only update if bounds actually changed (prevent unnecessary re-renders)
      if (!prev ||
        prev.x !== bounds.x ||
        prev.y !== bounds.y ||
        prev.width !== bounds.width ||
        prev.height !== bounds.height ||
        prev.naturalWidth !== bounds.naturalWidth ||
        prev.naturalHeight !== bounds.naturalHeight) {
        return bounds
      }
      return prev
    })
    onImageBoundsChange?.(bounds)
  }, [onImageBoundsChange])

  // Convert normalized coordinates (0-1) to canvas coordinates using actual image bounds
  // Calculate effective image bounds that account for zoom/crop
  // This logic mirrors FloorPlanImage's zoom rendering to ensure devices align with the zoomed map
  const getEffectiveImageBounds = useCallback(() => {
    const rawBounds = imageBoundsRef.current || imageBounds

    // If no raw bounds or no zoom bounds, just use the raw bounds (normal behavior)
    if (!rawBounds) return null
    if (!currentLocation?.zoomBounds || !currentLocation?.type || currentLocation.type !== 'zoom') return rawBounds

    // Check if zoomBounds is valid object
    const zoomBounds = currentLocation.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
    if (!zoomBounds || typeof zoomBounds.minX !== 'number') return rawBounds

    // We have a Zoom View. We need to calculate where the "Full Image" would be
    // if it were drawn such that the "Zoom Crop" fits perfectly in the canvas.

    // 1. Calculate dimensions of the crop in the original image coordinate space
    const cropWidth = (zoomBounds.maxX - zoomBounds.minX) * rawBounds.width
    const cropHeight = (zoomBounds.maxY - zoomBounds.minY) * rawBounds.height

    // 2. Calculate scale to fit the crop into the canvas
    // Note: FloorPlanImage uses the same logic (aspect fit)
    const scaleX = dimensions.width / cropWidth
    const scaleY = dimensions.height / cropHeight
    const scale = Math.min(scaleX, scaleY)

    // 3. Calculate dimension of the *cropped area* as rendered on canvas
    const scaledWidth = cropWidth * scale
    const scaledHeight = cropHeight * scale

    // 4. Calculate offset to center the cropped area in the canvas
    const cropOffsetX = (dimensions.width - scaledWidth) / 2
    const cropOffsetY = (dimensions.height - scaledHeight) / 2

    // 5. Calculate the effective width/height of the FULL image if it were rendered at this scale
    const effectiveFullWidth = scaledWidth / (zoomBounds.maxX - zoomBounds.minX)
    const effectiveFullHeight = scaledHeight / (zoomBounds.maxY - zoomBounds.minY)

    // 6. Calculate the effective X/Y origin of the FULL image
    // The crop starts at `canvasX = cropOffsetX`
    // The crop starts at `normalizedX = minX` in the image
    // So `cropOffsetX = effectiveX + minX * effectiveFullWidth`
    const effectiveX = cropOffsetX - (zoomBounds.minX * effectiveFullWidth)
    const effectiveY = cropOffsetY - (zoomBounds.minY * effectiveFullHeight)

    return {
      x: effectiveX,
      y: effectiveY,
      width: effectiveFullWidth,
      height: effectiveFullHeight,
      naturalWidth: rawBounds.naturalWidth,
      naturalHeight: rawBounds.naturalHeight
    }
  }, [imageBounds, dimensions, currentLocation])

  // Convert normalized coordinates (0-1) to canvas coordinates using actual image bounds
  const toCanvasCoords = useCallback((point: { x: number; y: number }) => {
    const bounds = getEffectiveImageBounds()
    if (bounds) {
      // Use actual image bounds for coordinate conversion
      return {
        x: bounds.x + point.x * bounds.width,
        y: bounds.y + point.y * bounds.height,
      }
    } else {
      // Fallback to canvas dimensions if image bounds not available
      return {
        x: point.x * dimensions.width,
        y: point.y * dimensions.height,
      }
    }
  }, [getEffectiveImageBounds, dimensions])

  // Convert canvas coordinates back to normalized coordinates (0-1) using actual image bounds
  const fromCanvasCoords = useCallback((point: { x: number; y: number }) => {
    const bounds = getEffectiveImageBounds()
    if (bounds) {
      // Use actual image bounds for coordinate conversion
      return {
        x: (point.x - bounds.x) / bounds.width,
        y: (point.y - bounds.y) / bounds.height,
      }
    } else {
      // Fallback to canvas dimensions if image bounds not available
      return {
        x: point.x / dimensions.width,
        y: point.y / dimensions.height,
      }
    }
  }, [getEffectiveImageBounds, dimensions])
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [hoveredPerson, setHoveredPerson] = useState<PersonPoint | null>(null)
  const [personTooltipTier, setPersonTooltipTier] = useState<1 | 2>(1)
  const personTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [personTooltipPosition, setPersonTooltipPosition] = useState({ x: 0, y: 0 })
  const tooltipPositionRef = useRef({ x: 0, y: 0 })
  const tooltipUpdateFrameRef = useRef<number | null>(null)

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
  const [draggedDevice, setDraggedDevice] = useState<{
    id: string;
    startX: number;
    startY: number;
    startCanvasX: number;
    startCanvasY: number;
    dragX?: number;
    dragY?: number;
  } | null>(null)

  // Throttled tooltip position update to prevent excessive re-renders
  const updateTooltipPosition = useCallback((x: number, y: number) => {
    tooltipPositionRef.current = { x, y }
    if (tooltipUpdateFrameRef.current === null) {
      tooltipUpdateFrameRef.current = requestAnimationFrame(() => {
        setTooltipPosition(tooltipPositionRef.current)
        tooltipUpdateFrameRef.current = null
      })
    }
  }, [])

  // Lasso selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)

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
  const [colors, setColors] = useState<ReturnType<typeof getCanvasColors>>(getCanvasColors())

  // Sort devices in logical order (by deviceId) for keyboard navigation
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      // Sort by deviceId for consistent logical order
      return a.deviceId.localeCompare(b.deviceId)
    })
  }, [devices])

  // Viewport culling - only render devices visible in current viewport
  // Use refs to avoid recreating on every pan/zoom update
  const stagePositionRef = useRef(effectiveStagePosition)
  const scaleRef = useRef(effectiveScale)

  useEffect(() => {
    stagePositionRef.current = effectiveStagePosition
    scaleRef.current = effectiveScale
  }, [effectiveStagePosition, effectiveScale])

  const visibleDevices = useMemo(() => {
    // Calculate viewport bounds for culling
    const viewportPadding = 200 // Render devices slightly outside viewport for smooth scrolling
    const viewportMinX = -stagePositionRef.current.x / scaleRef.current - viewportPadding
    const viewportMaxX = (-stagePositionRef.current.x + dimensions.width) / scaleRef.current + viewportPadding
    const viewportMinY = -stagePositionRef.current.y / scaleRef.current - viewportPadding
    const viewportMaxY = (-stagePositionRef.current.y + dimensions.height) / scaleRef.current + viewportPadding

    // Filter devices to only those in viewport
    return devices.filter(device => {
      const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
      return deviceCoords.x >= viewportMinX &&
        deviceCoords.x <= viewportMaxX &&
        deviceCoords.y >= viewportMinY &&
        deviceCoords.y <= viewportMaxY
    })
  }, [devices, dimensions, toCanvasCoords])

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

    // Get theme colors from CSS variables using utility
    const updateColors = () => {
      setColors(getCanvasColors())
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

  // Keyboard shortcuts: Escape to deselect, Space+drag to pan, +/- to zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'Escape' && mode === 'select') {
        onDevicesSelect?.([])
        onDeviceSelect?.(null)
        setDraggedDevice(null)
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
      }

      // Zoom with +/- keys
      if ((e.key === '+' || e.key === '=') && !e.shiftKey) {
        e.preventDefault()
        const newScale = Math.min(10, effectiveScale * 1.2)
        setScale(newScale)
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        const newScale = Math.max(0.1, effectiveScale * 0.8)
        setScale(newScale)
      }

      // Space key for panning
      if (e.key === ' ' && mode === 'select' && !isSpaceHeld) {
        e.preventDefault()
        setIsSpaceHeld(true)
        if (stageRef.current) {
          const container = stageRef.current.container()
          if (container) {
            container.style.cursor = 'grab'
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release Space key
      if (e.key === ' ' && isSpaceHeld) {
        e.preventDefault()
        setIsSpaceHeld(false)
        if (stageRef.current) {
          const container = stageRef.current.container()
          if (container) {
            container.style.cursor = isShiftHeld ? 'crosshair' : 'default'
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)

    }
  }, [mode, onDeviceSelect, onDevicesSelect, effectiveScale, setScale, isSpaceHeld, isShiftHeld])

  // Update interaction hint based on held keys
  useEffect(() => {
    if (isSpaceHeld && mode === 'select') {
      setInteractionHint("Hold key + Drag to pan • Scroll or +/- to zoom")
    } else if (isShiftHeld && mode === 'select' && !isSelecting) {
      setInteractionHint("Drag to select multiple devices")
    } else {
      setInteractionHint(null)
    }
  }, [isSpaceHeld, isShiftHeld, mode, isSelecting, setInteractionHint])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (tooltipUpdateFrameRef.current !== null) {
        cancelAnimationFrame(tooltipUpdateFrameRef.current)
      }
    }
  }, [])

  // Devices come from props now, no need for local device array

  const getDeviceColor = (type: string) => {
    // Use darker fixture color for all fixture types
    if (type.startsWith('fixture-')) {
      return colors.fixture
    }
    switch (type) {
      case 'fixture':
        return colors.fixture
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
        draggable={mode === 'select' && !isSelecting && !isShiftHeld && draggedDevice === null && isSpaceHeld} // Pan with Space+drag
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

          // Check Space key state from event (more reliable than checking code)
          // Note: MouseEvent doesn't have code/key, so we rely on isSpaceHeld state
          const spaceHeld = isSpaceHeld
          if (spaceHeld && !isSpaceHeld) {
            setIsSpaceHeld(true)
            const container = stage.container()
            if (container) {
              container.style.cursor = 'grab'
            }
            // Don't return - allow normal drag behavior
          }

          // Check for lasso modes (align, arrange, or simple move) - these allow lasso drawing
          const isLassoMode = mode === 'align-direction' || mode === 'auto-arrange' || mode === 'move'
          // Standard Select mode also allows it
          const canSelect = mode === 'select' || isLassoMode

          if (canSelect && e.evt.button === 0 && !draggedDevice && !spaceHeld) {
            // Check if shift is actually held (use both state and event) - OR if we're in lasso mode
            const shiftHeld = isShiftHeld || e.evt.shiftKey
            const clickedOnEmpty = e.target === stage || e.target === stage.findOne('Layer')

            // Start lasso selection if Shift is held OR we're in a lasso mode
            if (shiftHeld || isLassoMode) {
              if (pointerPos) {
                // Convert pointer position to content coordinates
                const transform = stage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(pointerPos)

                // logger.debug('Starting selection at:', pos, 'mode:', mode)
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
          // Release Space key (MouseEvent doesn't have code/key, so just check button)
          if (isSpaceHeld && e.evt.button === 0) {
            setIsSpaceHeld(false)
            const container = stageRef.current?.container()
            if (container) {
              container.style.cursor = isShiftHeld ? 'crosshair' : 'default'
            }
          }

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
              console.log(`Found ${selectedIds.length} devices in selection, mode: ${mode}`)

              if (selectedIds.length > 0) {
                // Check if we're in a lasso action mode
                if (mode === 'align-direction') {
                  // Call the align callback with lassoed device IDs
                  onLassoAlign?.(selectedIds)
                } else if (mode === 'auto-arrange') {
                  // Call the arrange callback with lassoed device IDs
                  onLassoArrange?.(selectedIds)
                } else if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
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
          // Use requestAnimationFrame to batch position updates and prevent flickering
          requestAnimationFrame(() => {
            setStagePosition({ x: e.target.x(), y: e.target.y() })
          })
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

          // Batch scale and position updates to prevent flickering
          requestAnimationFrame(() => {
            setScale(newScale)
            setStagePosition({ x: newX, y: newY })
          })
        }}
      >
        <Layer>
          {/* Floor Plan Background - Image-based rendering */}
          {mapImageUrl ? (
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
                onImageBoundsChange={handleImageBoundsChange}
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
          {/* Only render devices when imageBounds is ready to prevent position jumping */}
          {imageBounds && visibleDevices.map((device) => {
            // Scale device positions to canvas coordinates (respects image bounds)
            const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
            const isSelected = selectedDeviceId === device.id || selectedDeviceIds.includes(device.id)
            const isHovered = hoveredDevice?.id === device.id

            // Use drag position if device is being dragged, otherwise use device coordinates
            const isDragging = draggedDevice?.id === device.id
            // Check if this device is part of a multi-selection group being dragged
            const isGroupDragging = draggedDevice &&
              selectedDeviceIds.includes(draggedDevice.id) &&
              selectedDeviceIds.includes(device.id) &&
              !isDragging

            let groupX = deviceCoords.x
            let groupY = deviceCoords.y

            if (isDragging && draggedDevice.dragX !== undefined && draggedDevice.dragY !== undefined) {
              groupX = draggedDevice.dragX
              groupY = draggedDevice.dragY
            } else if (isGroupDragging && draggedDevice.dragX !== undefined && draggedDevice.dragY !== undefined && draggedDevice.startCanvasX !== undefined) {
              // Calculate delta from the dragged device
              const deltaX = draggedDevice.dragX - draggedDevice.startCanvasX
              const deltaY = draggedDevice.dragY - draggedDevice.startCanvasY
              groupX = deviceCoords.x + deltaX
              groupY = deviceCoords.y + deltaY
            }

            return (
              <Group
                key={device.id}
                x={groupX}
                y={groupY}
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
                  // Store the initial device coordinates
                  setDraggedDevice({
                    id: device.id,
                    startX: device.x || 0,
                    startY: device.y || 0,
                    startCanvasX: deviceCoords.x,
                    startCanvasY: deviceCoords.y
                  })
                  // Clear hover state when starting to drag to hide tooltip
                  setHoveredDevice(null)
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
                  // Update drag position in state to prevent jumping
                  // Use Group position directly - it accounts for rotation automatically
                  const pos = e.target.position()
                  setDraggedDevice(prev => prev ? {
                    ...prev,
                    dragX: pos.x,
                    dragY: pos.y
                  } : null)
                  // Don't update device position during drag - only update on drag end
                  // This prevents feedback loops where position updates cause re-renders
                  // which then recalculate the Group position, causing erratic movement
                }}
                onDragEnd={(e) => {
                  // Prevent stage dragging
                  e.cancelBubble = true

                  if (mode === 'move') {
                    // Check if we are moving a group
                    if (selectedDeviceIds.includes(device.id) && selectedDeviceIds.length > 1) {
                      const pos = e.target.position()
                      const deviceStartCanvasX = draggedDevice?.startCanvasX || deviceCoords.x
                      const deviceStartCanvasY = draggedDevice?.startCanvasY || deviceCoords.y

                      // Calculate visual delta
                      const deltaX = pos.x - deviceStartCanvasX
                      const deltaY = pos.y - deviceStartCanvasY

                      // Apply to all selected devices
                      const updates: { deviceId: string; x: number; y: number }[] = []

                      selectedDeviceIds.forEach(id => {
                        const d = devices.find(dev => dev.id === id)
                        if (d) {
                          // Get device's canvas start position
                          const dCanvas = toCanvasCoords({ x: d.x || 0, y: d.y || 0 })
                          const newCanvasX = dCanvas.x + deltaX
                          const newCanvasY = dCanvas.y + deltaY

                          // Convert back to normalized
                          const normalized = fromCanvasCoords({ x: newCanvasX, y: newCanvasY })

                          updates.push({
                            deviceId: id,
                            x: Math.max(0, Math.min(1, normalized.x)),
                            y: Math.max(0, Math.min(1, normalized.y))
                          })
                        }
                      })

                      if (updates.length > 0) {
                        onDevicesMoveEnd?.(updates)
                      }
                    } else if (onDeviceMoveEnd) {
                      // Single device move
                      // Use Group position directly - it's already in canvas coordinates
                      // and accounts for rotation properly
                      const pos = e.target.position()
                      // Convert canvas coordinates to normalized 0-1 coordinates using image bounds
                      const normalized = fromCanvasCoords({ x: pos.x, y: pos.y })
                      // Clamp to valid range
                      const normalizedX = Math.max(0, Math.min(1, normalized.x))
                      const normalizedY = Math.max(0, Math.min(1, normalized.y))
                      onDeviceMoveEnd(device.id, normalizedX, normalizedY)
                    }
                  }
                  setDraggedDevice(null)
                }}
              >
                {/* Light Bar for Fixtures */}
                {isFixtureType(device.type) && (() => {
                  // Get size multiplier based on fixture type (8ft, 12ft, 16ft)
                  const sizeMultiplier = getFixtureSizeMultiplier(device.type)

                  // Base size for 8ft fixture: small rectangle matching the blueprint
                  // Base rectangle: width ~12px, height ~3px (4:1 ratio for a small rectangle)
                  const baseWidth = 12
                  const baseHeight = 3

                  // Apply size multiplier
                  const barLength = baseWidth * sizeMultiplier
                  const barWidth = baseHeight * sizeMultiplier

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
                            if (isFixtureType(device.type)) {
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
                            if (isFixtureType(device.type)) {
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
                              updateTooltipPosition(pointerPos.x, pointerPos.y)
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
                              updateTooltipPosition(pointerPos.x, pointerPos.y)
                            }
                          }
                        }}
                      />
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
                        opacity={device.locked ? 0.6 : (isSelected ? 1 : (isHovered ? 0.95 : 0.9))}
                        stroke={colors.border}
                        strokeWidth={0.5}
                        shadowBlur={isSelected ? 4 : (isHovered ? 2 : 1)}
                        shadowColor={isSelected ? colors.fixture : colors.muted}
                        shadowOpacity={0.3}
                        cornerRadius={1}
                        dash={device.locked ? [4, 4] : undefined}
                        listening={false}
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
                        opacity={device.locked ? 0.7 : (isSelected ? 1 : 0.85)}
                        listening={false}
                      />
                    </Group>
                  )
                })()}

                {/* Regular dot for non-fixture devices */}
                {!isFixtureType(device.type) && (
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
                            updateTooltipPosition(pointerPos.x, pointerPos.y)
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
                            updateTooltipPosition(pointerPos.x, pointerPos.y)
                          }
                        }
                      }}
                    />
                    {/* Dark outer contrast ring for visibility */}
                    <Circle
                      x={0}
                      y={0}
                      radius={isSelected ? 7 : (isHovered ? 6.5 : 6)}
                      fill="transparent"
                      stroke={colors.muted}
                      strokeWidth={0.5}
                      shadowBlur={isSelected ? 6 : (isHovered ? 4 : 2)}
                      shadowColor={colors.muted}
                      listening={false}
                    />
                    {/* Main visual circle */}
                    <Circle
                      x={0}
                      y={0}
                      radius={isSelected ? 5 : (isHovered ? 4.5 : 4)}
                      fill={getDeviceColor(device.type)}
                      stroke={device.locked ? colors.warning : (isSelected ? colors.primary : colors.muted)}
                      strokeWidth={device.locked ? 1 : (isSelected ? 1 : 0.5)}
                      shadowBlur={isSelected ? 8 : (isHovered ? 5 : 2)}
                      shadowColor={isSelected ? colors.primary : colors.muted}
                      opacity={device.locked ? 0.7 : (isSelected ? 1 : (isHovered ? 0.95 : 0.9))}
                      dash={device.locked ? [4, 4] : undefined}
                      listening={false}
                    />
                    {/* Center highlight for selected */}
                    {isSelected && (
                      <Circle
                        x={0}
                        y={0}
                        radius={2}
                        fill={colors.text}
                        opacity={0.8}
                        listening={false}
                      />
                    )}
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
                    x={8}
                    y={-8}
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
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'pointer'
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) container.style.cursor = 'default'
                    }}
                  >
                    <Circle
                      x={0}
                      y={0}
                      radius={3.5}
                      fill={colors.primary}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={0.5}
                      opacity={0.9}
                    />
                    <Text
                      x={0}
                      y={0}
                      offsetX={3}
                      offsetY={4}
                      text={expandedComponents.has(device.id) ? '−' : '+'}
                      fontSize={8}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.text}
                      width={6}
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
                          ? colors.danger || '#ef4444'
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
                            fill={onComponentClick ? getRgbaVariable('--color-primary', 0.05) : 'transparent'}
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
                const handlePersonMouseLeave = () => setHoveredPerson(null)
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
          {hoveredDevice && hoveredDeviceData && !draggedDevice && mode !== 'move' && (() => {
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
              const fixtures = devicesInSelection.filter(d => isFixtureType(d.type)).length
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
                    stroke={getRgbaVariable('--color-primary', 0.4)}
                    strokeWidth={5}
                    listening={false}
                    shadowBlur={20}
                    shadowColor={colors.selectionShadow || getRgbaVariable('--color-primary', 0.9)}
                    cornerRadius={Math.max(0, safeCornerRadius + 1)}
                  />

                  {/* Main selection box */}
                  <Rect
                    x={minX}
                    y={minY}
                    width={width}
                    height={height}
                    fill={colors.selectionFill || getRgbaVariable('--color-primary', 0.25)}
                    stroke={colors.selectionStroke || colors.primary}
                    strokeWidth={4}
                    dash={[12, 6]}
                    listening={false}
                    shadowBlur={25}
                    shadowColor={colors.selectionShadow || colors.primary}
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
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[minX, minY, minX, minY + 20]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Top-right corner */}
                    <Line
                      points={[maxX, minY, maxX - 20, minY]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[maxX, minY, maxX, minY + 20]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Bottom-left corner */}
                    <Line
                      points={[minX, maxY, minX + 20, maxY]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[minX, maxY, minX, maxY - 20]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    {/* Bottom-right corner */}
                    <Line
                      points={[maxX, maxY, maxX - 20, maxY]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={[maxX, maxY, maxX, maxY - 20]}
                      stroke={colors.selectionStroke || colors.primary}
                      strokeWidth={4}
                      lineCap="round"
                      listening={false}
                    />
                  </Group>

                  {/* Device indicators - show prominent highlights for each device in selection */}
                  {devicesInSelection.map((device) => {
                    const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
                    const color = isFixtureType(device.type) ? colors.fixture || colors.primary :
                      device.type === 'motion' ? colors.accent :
                        colors.success

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
                      fill={colors.tooltipBg || 'rgba(17, 24, 39, 0.98)'}
                      cornerRadius={8}
                      listening={false}
                      shadowBlur={25}
                      shadowColor={getRgbaVariable('--color-tooltip-shadow', 0.7) || 'rgba(0, 0, 0, 0.7)'}
                    />
                    <Rect
                      x={0}
                      y={0}
                      width={Math.max(160, 100 + (totalCount > 9 ? 20 : 0))}
                      height={totalCount > 0 ? 60 : 35}
                      fill="transparent"
                      stroke={colors.selectionStroke || colors.primary}
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
                      fill={totalCount > 0 ? colors.text : getRgbaVariable('--color-text', 0.7)}
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
                            fill={colors.fixture || colors.primary}
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
                            fill={colors.accent}
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
                            fill={colors.success}
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


      </Stage>
    </div>
  )
}

