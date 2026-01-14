/**
 * Map Toolbar Component
 * 
 * Top bar with actions for positioning and moving devices on the map.
 * Provides tools for selecting, moving, aligning, and organizing devices.
 * 
 * UX Flow:
 * - Align: Click to enter align mode → Lasso devices → They get aligned immediately → Return to select
 * - Arrange: Click to show layout dropdown → Pick layout → Enter lasso mode → Lasso → Arrange → Return to select
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MousePointer2,
  Move,
  RotateCw,
  ArrowRight,
  LayoutGrid,
  Undo2,
  Redo2,
  ChevronDown,
  Square,
  RectangleHorizontal,
  Minus
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type MapToolMode =
  | 'select'
  | 'move'
  | 'rotate'
  | 'align-direction'
  | 'auto-arrange'

export type ArrangeLayout = 'rectangle' | 'square' | 'line'

interface MapToolbarProps {
  mode: MapToolMode
  onModeChange: (mode: MapToolMode) => void
  onAlignDirection: () => void
  onAutoArrange: (layout: ArrangeLayout) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  selectedCount?: number
  pendingArrangeLayout?: ArrangeLayout | null
  onPendingArrangeLayoutChange?: (layout: ArrangeLayout | null) => void
}

interface ToolOption {
  id: MapToolMode
  label: string
  icon: any
  description: string
  isToggle?: boolean
  isLasso?: boolean
  hasDropdown?: boolean
}

const toolOptions: ToolOption[] = [
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    description: 'Click or Shift+drag to select devices',
    isToggle: true,
  },
  {
    id: 'move',
    label: 'Move',
    icon: Move,
    description: 'Drag devices to reposition them',
    isToggle: true,
  },
  {
    id: 'rotate',
    label: 'Rotate',
    icon: RotateCw,
    description: 'Click devices to rotate them 90°',
    isToggle: true,
  },
  {
    id: 'align-direction',
    label: 'Align',
    icon: ArrowRight,
    description: 'Draw a box to toggle device direction (→ ↓)',
    isToggle: true,
    isLasso: true,
  },
  {
    id: 'auto-arrange',
    label: 'Arrange',
    icon: LayoutGrid,
    description: 'Pick a layout, then draw a box to arrange devices',
    isToggle: true,
    isLasso: true,
    hasDropdown: true,
  },
]

const arrangeLayouts: { id: ArrangeLayout; label: string; icon: any; description: string }[] = [
  { id: 'line', label: 'Line', icon: Minus, description: 'Arrange in a row' },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal, description: 'Arrange in 2 rows' },
  { id: 'square', label: 'Square', icon: Square, description: 'Arrange in a grid' },
]

export function MapToolbar({
  mode,
  onModeChange,
  onAlignDirection,
  onAutoArrange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedCount = 0,
  pendingArrangeLayout,
  onPendingArrangeLayoutChange
}: MapToolbarProps) {
  const [showArrangeDropdown, setShowArrangeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowArrangeDropdown(false)
      }
    }
    if (showArrangeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showArrangeDropdown])

  const handleToolClick = (tool: ToolOption) => {
    if (tool.isToggle) {
      if (tool.hasDropdown) {
        // For arrange: show dropdown to pick layout first
        if (mode === tool.id) {
          // Already in arrange mode, toggle dropdown
          setShowArrangeDropdown(!showArrangeDropdown)
        } else {
          // Enter arrange mode and show dropdown
          setShowArrangeDropdown(true)
        }
      } else if (mode === tool.id) {
        // Already in this mode, exit to select
        onModeChange('select')
      } else {
        // Enter new mode
        onModeChange(tool.id)
        setShowArrangeDropdown(false)
      }
    }
  }

  const handleArrangeLayoutSelect = (layout: ArrangeLayout) => {
    // Store the pending layout and enter arrange mode
    onPendingArrangeLayoutChange?.(layout)
    onModeChange('auto-arrange')
    setShowArrangeDropdown(false)
  }

  // Get hint text for current mode
  const getModeHint = () => {
    if (mode === 'align-direction') {
      return 'Draw a box around devices to align'
    }
    if (mode === 'auto-arrange' && pendingArrangeLayout) {
      const layoutLabel = arrangeLayouts.find(l => l.id === pendingArrangeLayout)?.label || ''
      return `Draw a box to arrange in ${layoutLabel.toLowerCase()}`
    }
    return null
  }

  const modeHint = getModeHint()

  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-[var(--color-surface)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] p-2 shadow-[var(--shadow-strong)]">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 pr-2 border-r border-[var(--color-border-subtle)]">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg"
          title="Undo last action"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg"
          title="Redo last action"
        >
          <Redo2 size={16} />
        </Button>
      </div>

      {/* Tool Buttons */}
      <div className="flex items-center gap-1">
        {toolOptions.map((tool) => {
          const Icon = tool.icon
          const isActive = mode === tool.id

          return (
            <div key={tool.id} className="relative">
              <Button
                onClick={() => handleToolClick(tool)}
                variant={isActive ? 'primary' : 'ghost'}
                className={`gap-1.5 px-2 md:px-3 py-2 ${!isActive
                    ? 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                    : ''
                  }`}
                title={tool.description}
              >
                <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span className="hidden md:inline text-sm font-medium whitespace-nowrap">{tool.label}</span>
                {tool.hasDropdown && (
                  <ChevronDown size={14} className={`transition-transform ${showArrangeDropdown ? 'rotate-180' : ''}`} />
                )}
              </Button>

              {/* Arrange Layout Dropdown */}
              {tool.hasDropdown && showArrangeDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 mt-2 py-1 rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] min-w-[160px]"
                  style={{
                    background: 'rgba(9, 11, 17, 0.95)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 100,
                  }}
                >
                  <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] font-medium border-b border-[var(--color-border-subtle)]">
                    Pick layout, then draw
                  </div>
                  {arrangeLayouts.map((layout) => {
                    const LayoutIcon = layout.icon
                    const isSelected = pendingArrangeLayout === layout.id
                    return (
                      <button
                        key={layout.id}
                        onClick={() => handleArrangeLayoutSelect(layout.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isSelected
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-text)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]'
                          }`}
                      >
                        <LayoutIcon size={16} className="text-[var(--color-text-muted)]" />
                        <span>{layout.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mode hint */}
      {modeHint && (
        <div className="pl-2 border-l border-[var(--color-border-subtle)]">
          <span className="text-xs text-[var(--color-primary)] font-medium">
            {modeHint}
          </span>
        </div>
      )}

      {/* Selection indicator */}
      {selectedCount > 0 && !modeHint && (
        <div className="pl-2 border-l border-[var(--color-border-subtle)]">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            {selectedCount} selected
          </span>
        </div>
      )}
    </div>
  )
}
