/**
 * People Map Canvas Component
 * 
 * Canvas for rendering people on the map with drag-and-drop placement
 */

'use client'

import { Stage, Layer, Circle, Group, Text, Rect } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useZoomContext } from '@/lib/MapContext'
import { FloorPlanImage, type ImageBounds } from '@/components/map/FloorPlanImage'
import type { ExtractedVectorData } from '@/lib/pdfVectorExtractor'
import type { Location } from '@/lib/locationStorage'
import { getRgbaVariable } from '@/lib/canvasColors'
import { Person } from '@/lib/stores/personStore'
import { MapPersonToken } from '@/components/map/MapPersonToken'
import { getCanvasColors } from '@/lib/canvasColors'

interface PeopleMapCanvasProps {
  onPersonSelect?: (personId: string | null) => void
  selectedPersonId?: string | null
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  people?: Person[]
  mode?: 'select' | 'move'
  onPersonMove?: (personId: string, x: number, y: number) => void
  onPersonMoveEnd?: (personId: string, x: number, y: number) => void
  currentLocation?: Location | null
  onImageBoundsChange?: (bounds: ImageBounds) => void
  externalScale?: number
  externalStagePosition?: { x: number; y: number }
  onScaleChange?: (scale: number) => void
  onStagePositionChange?: (position: { x: number; y: number }) => void
}

export function PeopleMapCanvas({
  onPersonSelect,
  selectedPersonId,
  mapImageUrl,
  vectorData,
  people = [],
  mode = 'select',
  onPersonMove,
  onPersonMoveEnd,
  currentLocation,
  onImageBoundsChange,
  externalScale,
  externalStagePosition,
  onScaleChange,
  onStagePositionChange,
}: PeopleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePositionInternal] = useState({ x: 0, y: 0 })
  const [scale, setScaleInternal] = useState(1)
  const { setZoomLevel, triggerZoomIndicator } = useZoomContext()

  const effectiveScale = externalScale ?? scale
  const effectiveStagePosition = externalStagePosition ?? stagePosition

  const setScale = useCallback((newScale: number) => {
    setScaleInternal(newScale)
    onScaleChange?.(newScale)
    setZoomLevel(newScale)
    triggerZoomIndicator()
  }, [onScaleChange, setZoomLevel, triggerZoomIndicator])

  const setStagePosition = useCallback((newPosition: { x: number; y: number }) => {
    setStagePositionInternal(newPosition)
    onStagePositionChange?.(newPosition)
  }, [onStagePositionChange])

  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const imageBoundsRef = useRef<ImageBounds | null>(null)

  useEffect(() => {
    imageBoundsRef.current = imageBounds
  }, [imageBounds])

  const handleImageBoundsChange = useCallback((bounds: ImageBounds) => {
    setImageBounds(prev => {
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

  const getEffectiveImageBounds = useCallback(() => {
    const rawBounds = imageBoundsRef.current || imageBounds
    if (!rawBounds) return null
    if (!currentLocation?.zoomBounds || !currentLocation?.type || currentLocation.type !== 'zoom') return rawBounds

    const zoomBounds = currentLocation.zoomBounds as { minX: number; minY: number; maxX: number; maxY: number }
    if (!zoomBounds || typeof zoomBounds.minX !== 'number') return rawBounds

    const cropWidth = (zoomBounds.maxX - zoomBounds.minX) * rawBounds.width
    const cropHeight = (zoomBounds.maxY - zoomBounds.minY) * rawBounds.height
    const scaleX = dimensions.width / cropWidth
    const scaleY = dimensions.height / cropHeight
    const scale = Math.min(scaleX, scaleY)
    const scaledWidth = cropWidth * scale
    const scaledHeight = cropHeight * scale
    const cropOffsetX = (dimensions.width - scaledWidth) / 2
    const cropOffsetY = (dimensions.height - scaledHeight) / 2
    const effectiveFullWidth = scaledWidth / (zoomBounds.maxX - zoomBounds.minX)
    const effectiveFullHeight = scaledHeight / (zoomBounds.maxY - zoomBounds.minY)
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

  const toCanvasCoords = useCallback((point: { x: number; y: number }) => {
    const bounds = getEffectiveImageBounds()
    if (bounds) {
      return {
        x: bounds.x + point.x * bounds.width,
        y: bounds.y + point.y * bounds.height,
      }
    } else {
      return {
        x: point.x * dimensions.width,
        y: point.y * dimensions.height,
      }
    }
  }, [getEffectiveImageBounds, dimensions])

  const fromCanvasCoords = useCallback((point: { x: number; y: number }) => {
    const bounds = getEffectiveImageBounds()
    if (bounds) {
      return {
        x: (point.x - bounds.x) / bounds.width,
        y: (point.y - bounds.y) / bounds.height,
      }
    } else {
      return {
        x: point.x / dimensions.width,
        y: point.y / dimensions.height,
      }
    }
  }, [getEffectiveImageBounds, dimensions])

  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null)
  const [personTooltipTier, setPersonTooltipTier] = useState<1 | 2>(1)
  const personTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [personTooltipPosition, setPersonTooltipPosition] = useState({ x: 0, y: 0 })
  const [draggedPerson, setDraggedPerson] = useState<{
    id: string
    startX: number
    startY: number
    startCanvasX: number
    startCanvasY: number
    dragX?: number
    dragY?: number
  } | null>(null)

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Filter people with coordinates
  const peopleWithCoords = useMemo(() => {
    return people.filter(p => p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined)
  }, [people])

  // Handle person drag (match devices MapCanvas: use Group position, not pointer)
  const handlePersonDragStart = useCallback((e: any, person: Person) => {
    if (mode !== 'move') return
    const personCoords = toCanvasCoords({ x: person.x!, y: person.y! })
    setDraggedPerson({
      id: person.id,
      startX: person.x!,
      startY: person.y!,
      startCanvasX: personCoords.x,
      startCanvasY: personCoords.y,
      dragX: personCoords.x,
      dragY: personCoords.y,
    })
    // Prevent stage dragging when dragging people
    e.cancelBubble = true
  }, [mode, toCanvasCoords])

  const handlePersonDrag = useCallback((e: any) => {
    if (!draggedPerson) return
    // Prevent stage dragging
    e.cancelBubble = true
    // Use Group position (canvas coords), like MapCanvas devices - not pointer (wrong when zoomed/panned)
    const pos = e.target.position()
    setDraggedPerson(prev => prev ? {
      ...prev,
      dragX: pos.x,
      dragY: pos.y,
    } : null)
  }, [draggedPerson])

  const handlePersonDragEnd = useCallback((e: any) => {
    if (!draggedPerson) return
    // Prevent stage dragging
    e.cancelBubble = true
    // Use Group position (canvas coords), like MapCanvas devices
    const pos = e.target.position()
    const normalized = fromCanvasCoords({ x: pos.x, y: pos.y })
    const clampedX = Math.max(0, Math.min(1, normalized.x))
    const clampedY = Math.max(0, Math.min(1, normalized.y))
    onPersonMoveEnd?.(draggedPerson.id, clampedX, clampedY)
    setDraggedPerson(null)
  }, [draggedPerson, fromCanvasCoords, onPersonMoveEnd])

  // Two-tier person tooltip: tier 1 (some info) on hover, tier 2 (more info) after ~700ms
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

  // Colors (for tooltip)
  const canvasColors = getCanvasColors()
  const colors = {
    primary: getRgbaVariable('--color-primary', 1),
    text: getRgbaVariable('--color-text', 1),
    muted: getRgbaVariable('--color-text-muted', 0.5),
    border: getRgbaVariable('--color-border-subtle', 0.3),
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={effectiveScale}
        scaleY={effectiveScale}
        x={effectiveStagePosition.x}
        y={effectiveStagePosition.y}
        draggable={mode === 'select' && !draggedPerson}
        onWheel={(e) => {
          e.evt.preventDefault()
          const stage = e.target.getStage()
          if (!stage) return

          const oldScale = effectiveScale
          const pointer = stage.getPointerPosition()
          if (!pointer) return

          const mousePointTo = {
            x: (pointer.x - effectiveStagePosition.x) / oldScale,
            y: (pointer.y - effectiveStagePosition.y) / oldScale,
          }

          const scaleBy = 1.1
          const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
          const clampedScale = Math.max(0.1, Math.min(5, newScale))

          setScale(clampedScale)
          setStagePosition({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
          })
        }}
      >
        {/* Background Layer */}
        <Layer>
          {mapImageUrl && (
            <FloorPlanImage
              url={mapImageUrl}
              width={dimensions.width}
              height={dimensions.height}
              onImageBoundsChange={handleImageBoundsChange}
              zoomBounds={currentLocation?.zoomBounds as any}
            />
          )}
        </Layer>

        {/* People Layer */}
        <Layer>
          {peopleWithCoords.map((person) => {
            const personCoords = toCanvasCoords({ x: person.x!, y: person.y! })
            const isSelected = selectedPersonId === person.id
            const isHovered = hoveredPerson?.id === person.id
            const isDragging = draggedPerson?.id === person.id

            let displayX = personCoords.x
            let displayY = personCoords.y

            if (isDragging && draggedPerson.dragX !== undefined && draggedPerson.dragY !== undefined) {
              displayX = draggedPerson.dragX
              displayY = draggedPerson.dragY
            }

            return (
              <Group
                key={person.id}
                name="person-group"
                x={displayX}
                y={displayY}
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
                onDragStart={(e) => handlePersonDragStart(e, person)}
                onDragMove={handlePersonDrag}
                onDragEnd={handlePersonDragEnd}
                onClick={() => onPersonSelect?.(person.id)}
                onTap={() => onPersonSelect?.(person.id)}
                onMouseEnter={(e) => {
                  setHoveredPerson(person)
                  const stage = e.target.getStage()
                  if (stage) {
                    const pos = stage.getPointerPosition()
                    if (pos) setPersonTooltipPosition({ x: pos.x, y: pos.y })
                  }
                }}
                onMouseLeave={() => setHoveredPerson(null)}
                onMouseMove={(e) => {
                  const stage = e.target.getStage()
                  if (stage) {
                    const pos = stage.getPointerPosition()
                    if (pos) setPersonTooltipPosition({ x: pos.x, y: pos.y })
                  }
                }}
              >
                <MapPersonToken
                  person={person}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  radius={7}
                  scale={1 / effectiveScale}
                />
              </Group>
            )
          })}
        </Layer>

        {/* Person tooltip - tier 1 (some info) immediately, tier 2 (more info) after ~700ms */}
        {hoveredPerson && (() => {
          const tier2 = personTooltipTier === 2
          const pad = 12
          const lineH = 16
          const nameH = 16
          const roleH = (tier2 && hoveredPerson.role) ? lineH : 0
          const emailH = (tier2 && hoveredPerson.email) ? lineH : 0
          const placedH = tier2 && hoveredPerson.x != null && hoveredPerson.y != null ? lineH : 0
          const hintH = 14
          const th = pad * 2 + nameH + (roleH ? roleH + 2 : 0) + (emailH ? emailH + 2 : 0) + (placedH ? placedH + 2 : 0) + 6 + hintH
          const tw = tier2 ? 240 : 200
          const x = Math.max(pad, Math.min(personTooltipPosition.x + 14, dimensions.width - tw - pad))
          const y = Math.max(pad, Math.min(personTooltipPosition.y - 8, dimensions.height - th - pad))
          const name = [hoveredPerson.firstName, hoveredPerson.lastName].filter(Boolean).join(' ') || 'Person'
          const c = canvasColors
          return (
            <Layer key="person-tooltip">
              <Group x={x} y={y}>
                <Rect width={tw} height={th} fill={c.tooltipBg} cornerRadius={10} listening={false} shadowBlur={20} shadowColor={c.tooltipShadow} opacity={0.98} />
                <Rect width={tw} height={th} fill="transparent" stroke={c.tooltipBorder} strokeWidth={1.5} cornerRadius={10} listening={false} />
                <Text x={pad + 32} y={pad} text={name} fontSize={13} fontFamily="system-ui, -apple-system, sans-serif" fontStyle="bold" fill={c.tooltipText} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />
                <Text x={pad + 32} y={th - pad - hintH} text="Click to view profile" fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={c.muted} listening={false} />
                {tier2 && hoveredPerson.role && <Text x={pad + 32} y={pad + nameH + 2} text={hoveredPerson.role} fontSize={11} fontFamily="system-ui, -apple-system, sans-serif" fill={c.muted} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />}
                {tier2 && hoveredPerson.email && <Text x={pad + 32} y={pad + nameH + 2 + roleH + 2} text={hoveredPerson.email} fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={c.muted} width={tw - pad * 2 - 32} wrap="none" ellipsis={true} listening={false} />}
                {tier2 && hoveredPerson.x != null && hoveredPerson.y != null && <Text x={pad + 32} y={pad + nameH + 2 + roleH + 2 + emailH + 2} text="Placed on map" fontSize={10} fontFamily="system-ui, -apple-system, sans-serif" fill={c.muted} listening={false} />}
                <Circle x={pad + 14} y={pad + (tier2 ? 28 : 18)} radius={12} fill={getRgbaVariable('--color-primary', 0.35)} stroke={c.tooltipBorder} strokeWidth={1} listening={false} />
              </Group>
            </Layer>
          )
        })()}
      </Stage>
    </div>
  )
}
