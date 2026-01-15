/**
 * Faults Map Canvas Component
 * 
 * Extended MapCanvas with fault indicators on devices
 */

'use client'

import { Stage, Layer, Circle, Group, Text, Line } from 'react-konva'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { FaultCategory, faultCategories } from '@/lib/faultDefinitions'
import { FloorPlanImage, type ImageBounds } from '@/components/map/FloorPlanImage'

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
  hasFault?: boolean
  faultCount?: number
  faultType?: FaultCategory
}

interface Zone {
  id: string
  name: string
  color: string
  polygon: Array<{ x: number; y: number }>
}

interface Fault {
  device: { id: string }
  faultType: FaultCategory
  detectedAt: Date
  description: string
}

interface FaultsMapCanvasProps {
  zones: Zone[]
  devices: DevicePoint[]
  faults: Fault[]
  mapImageUrl?: string | null
  vectorData?: ExtractedVectorData | null
  selectedDeviceId?: string | null
  onDeviceSelect?: (deviceId: string | null) => void
  devicesData?: any[]
}


export function FaultsMapCanvas({
  zones,
  devices,
  faults,
  mapImageUrl,
  vectorData,
  selectedDeviceId,
  onDeviceSelect,
  devicesData = []
}: FaultsMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const [colors, setColors] = useState({
    primary: '#4c7dff',
    accent: '#f97316',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#eab308',
    muted: '#9ca3af',
    text: '#ffffff',
  })

  // Sort devices in logical order (by deviceId) for keyboard navigation
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      // Sort by deviceId for consistent logical order
      return a.deviceId.localeCompare(b.deviceId)
    })
  }, [devices])

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
        danger: computedStyle.getPropertyValue('--color-danger').trim() || '#ef4444',
        warning: computedStyle.getPropertyValue('--color-warning').trim() || '#eab308',
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
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeviceId, sortedDevices, onDeviceSelect])

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

  const getFaultColor = (faultType?: FaultCategory) => {
    if (!faultType) return colors.muted
    const categoryInfo = faultCategories[faultType]
    if (!categoryInfo) return colors.muted

    switch (categoryInfo.color) {
      case 'danger':
        return colors.danger
      case 'warning':
        return colors.warning
      case 'info':
        return colors.primary
      default:
        return colors.muted
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
          {/* Image floor plan */}
          {mapImageUrl && (
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
            const points = zone.polygon.map(toCanvasCoords).flatMap(p => [p.x, p.y])

            return (
              <Line
                key={zone.id}
                points={points}
                fill={`${zone.color}30`}
                stroke={zone.color}
                strokeWidth={1}
                closed
                opacity={0.3}
                listening={false}
              />
            )
          })}
        </Layer>

        {/* Devices Layer - Always on top */}
        <Layer>
          {devices.map((device) => {
            const deviceCoords = toCanvasCoords({ x: device.x, y: device.y })
            const deviceX = deviceCoords.x
            const deviceY = deviceCoords.y
            const isSelected = selectedDeviceId === device.id
            const isHovered = hoveredDevice?.id === device.id
            const faultColor = device.hasFault ? getFaultColor(device.faultType) : getDeviceColor(device.type)

            return (
              <Group key={device.id} x={deviceX} y={deviceY}>
                {/* Device circle */}
                <Circle
                  x={0}
                  y={0}
                  radius={isSelected ? 8 : (isHovered ? 6 : (device.hasFault ? 5 : 4))}
                  fill={device.hasFault ? faultColor : getDeviceColor(device.type)}
                  stroke={isSelected ? colors.text : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isSelected ? 3 : (device.hasFault ? 2 : 1)}
                  shadowBlur={isSelected ? 12 : (device.hasFault ? 8 : 4)}
                  shadowColor={device.hasFault ? faultColor : getDeviceColor(device.type)}
                  opacity={device.hasFault ? 0.9 : 0.6}
                  onClick={() => onDeviceSelect?.(device.id)}
                  onTap={() => onDeviceSelect?.(device.id)}
                  onMouseEnter={() => setHoveredDevice(device)}
                  onMouseLeave={() => setHoveredDevice(null)}
                />

                {/* Fault indicator badge */}
                {device.hasFault && device.faultCount && device.faultCount > 0 && (
                  <Group x={8} y={-8}>
                    <Circle
                      x={0}
                      y={0}
                      radius={6}
                      fill={faultColor}
                      stroke={colors.text}
                      strokeWidth={1.5}
                      shadowBlur={4}
                      shadowColor={faultColor}
                    />
                    <Text
                      x={-4}
                      y={-5}
                      text={device.faultCount > 9 ? '9+' : device.faultCount.toString()}
                      fontSize={9}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="bold"
                      fill={colors.text}
                      align="center"
                      listening={false}
                    />
                  </Group>
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

