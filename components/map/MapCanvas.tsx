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
import { useEffect, useState, useRef } from 'react'
import { Component, Device as DeviceType } from '@/lib/mockData'

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
  components?: Component[]
}

interface MapCanvasProps {
  onDeviceSelect?: (deviceId: string | null) => void
  selectedDeviceId?: string | null
  mapImageUrl?: string | null
  devices?: DevicePoint[]
  highlightDeviceId?: string | null
  mode?: 'select' | 'move'
  onDeviceMove?: (deviceId: string, x: number, y: number) => void
  onDeviceMoveEnd?: (deviceId: string, x: number, y: number) => void
  onComponentExpand?: (deviceId: string, expanded: boolean) => void
  expandedComponents?: Set<string>
  onComponentClick?: (component: Component, parentDevice: any) => void
  devicesData?: any[]
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

export function MapCanvas({ 
  onDeviceSelect, 
  selectedDeviceId, 
  mapImageUrl, 
  devices = [], 
  highlightDeviceId,
  mode = 'select',
  onDeviceMove,
  onDeviceMoveEnd,
  onComponentExpand,
  expandedComponents = new Set(),
  onComponentClick,
  devicesData = []
}: MapCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [hoveredDevice, setHoveredDevice] = useState<DevicePoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [draggedDevice, setDraggedDevice] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
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
    // Set initial dimensions
    const updateDimensions = () => {
      // Account for nav width (80px), right panel (448px = 28rem), padding (32px total)
      const availableWidth = window.innerWidth - 80 - 448 - 32
      // Account for bottom drawer, search island, and padding
      const availableHeight = window.innerHeight - 48 - 80 - 32
      setDimensions({
        width: Math.max(availableWidth, 400),
        height: Math.max(availableHeight, 400),
      })
    }

    // Get theme colors from CSS variables
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
    
    window.addEventListener('resize', updateDimensions)
    
    // Watch for theme changes
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

  // Pan to highlighted device when selected from table - optimized for performance
  useEffect(() => {
    if (highlightDeviceId && devices.length > 0) {
      const device = devices.find(d => d.id === highlightDeviceId)
      if (device) {
        // Calculate device position in canvas coordinates
        const deviceX = device.x * dimensions.width
        const deviceY = device.y * dimensions.height
        
        // Center the device in the viewport
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2
        
        // Calculate target position
        const targetX = centerX - deviceX
        const targetY = centerY - deviceY
        
        // Direct update for instant response, no animation to avoid stutter
        setStagePosition({ x: targetX, y: targetY })
        setScale(1) // Keep scale at 1 for performance
      }
    }
  }, [highlightDeviceId, devices, dimensions])

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

  return (
    <div className="w-full h-full overflow-hidden">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={scale}
        scaleY={scale}
        draggable={mode === 'select'} // Only allow stage dragging in select mode
        onDragEnd={(e) => {
          setStagePosition({ x: e.target.x(), y: e.target.y() })
        }}
      >
        <Layer>
          {/* Floor Plan Background */}
          {mapImageUrl && (
            <FloorPlanImage 
              url={mapImageUrl} 
              width={dimensions.width} 
              height={dimensions.height}
            />
          )}
          
          {/* Device points */}
          {devices.map((device) => {
            // Scale device positions to canvas dimensions
            const deviceX = device.x * dimensions.width
            const deviceY = device.y * dimensions.height
            const isSelected = selectedDeviceId === device.id
            const isHovered = hoveredDevice?.id === device.id
            
            return (
              <Group 
                key={device.id}
                x={deviceX}
                y={deviceY}
                draggable={mode === 'move' && !device.locked}
                onDragStart={(e) => {
                  if (device.locked) {
                    e.cancelBubble = true
                    return
                  }
                  setDraggedDevice({ id: device.id, startX: device.x, startY: device.y })
                  onDeviceSelect?.(device.id)
                }}
                onDragMove={(e) => {
                  if (mode === 'move' && onDeviceMove) {
                    // Convert stage coordinates to normalized 0-1 coordinates
                    const stage = e.target.getStage()
                    if (stage) {
                      const pos = e.target.position()
                      const normalizedX = Math.max(0, Math.min(1, pos.x / dimensions.width))
                      const normalizedY = Math.max(0, Math.min(1, pos.y / dimensions.height))
                      onDeviceMove(device.id, normalizedX, normalizedY)
                    }
                  }
                }}
                onDragEnd={(e) => {
                  if (mode === 'move' && onDeviceMoveEnd) {
                    const stage = e.target.getStage()
                    if (stage) {
                      const pos = e.target.position()
                      const normalizedX = Math.max(0, Math.min(1, pos.x / dimensions.width))
                      const normalizedY = Math.max(0, Math.min(1, pos.y / dimensions.height))
                      onDeviceMoveEnd(device.id, normalizedX, normalizedY)
                    }
                  }
                  setDraggedDevice(null)
                }}
              >
                <Circle
                  x={0}
                  y={0}
                  radius={isSelected ? 8 : (isHovered ? 6 : 4)}
                  fill={getDeviceColor(device.type)}
                  stroke={device.locked ? '#fbbf24' : (isSelected ? colors.text : 'rgba(255,255,255,0.2)')}
                  strokeWidth={device.locked ? 2 : (isSelected ? 3 : 1)}
                  shadowBlur={isSelected ? 15 : (isHovered ? 8 : 3)}
                  shadowColor={isSelected ? colors.primary : 'black'}
                  opacity={device.locked ? 0.7 : (isSelected ? 1 : (isHovered ? 0.8 : 0.6))}
                  dash={device.locked ? [4, 4] : undefined}
                  onClick={() => {
                    if (mode === 'select') {
                      onDeviceSelect?.(device.id)
                    }
                  }}
                  onTap={() => {
                    if (mode === 'select') {
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
                {/* Lock indicator */}
                {device.locked && (
                  <Circle
                    x={6}
                    y={-6}
                    radius={3}
                    fill="#fbbf24"
                    stroke="white"
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
                {/* Tooltip - only render when hovered, positioned near cursor */}
                {isHovered && (
                  <Group x={tooltipPosition.x - deviceX + 15} y={tooltipPosition.y - deviceY - 15}>
                    {/* Tooltip background - uses theme tokens */}
                    <Rect
                      width={220}
                      height={device.location ? 110 : 90}
                      fill={colors.tooltipBg}
                      cornerRadius={8}
                      listening={false}
                      shadowBlur={15}
                      shadowColor={colors.tooltipShadow}
                      shadowOffsetX={0}
                      shadowOffsetY={2}
                    />
                    {/* Border for better visibility - uses theme primary color */}
                    <Rect
                      width={220}
                      height={device.location ? 110 : 90}
                      fill="transparent"
                      stroke={colors.tooltipBorder}
                      strokeWidth={2}
                      cornerRadius={8}
                      listening={false}
                    />
                    {/* Tooltip text - uses theme text color */}
                    <Text
                      x={14}
                      y={14}
                      text={`${device.deviceId}\nType: ${device.type}\nSignal: ${device.signal}%\nStatus: ${device.status}${device.locked ? '\n🔒 Locked' : ''}${device.location ? `\nLocation: ${device.location}` : ''}`}
                      fontSize={13}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontStyle="normal"
                      fill={colors.tooltipText}
                      align="left"
                      listening={false}
                      lineHeight={1.5}
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

