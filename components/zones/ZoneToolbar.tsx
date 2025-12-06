/**
 * Zone Drawing Toolbar Component
 * 
 * Top toolbar for zone drawing and management tools.
 * Provides tools for drawing zones, selecting, editing, and deleting zones.
 * 
 * AI Note: This toolbar appears at the top of the zones page map.
 */

'use client'

import { useState } from 'react'
import { 
  MousePointer2, 
  Pencil, 
  Trash2,
  Square,
  Circle,
  Move
} from 'lucide-react'

export type ZoneToolMode = 
  | 'select' 
  | 'draw-rectangle'
  | 'draw-polygon'
  | 'edit'
  | 'delete'

interface ZoneToolbarProps {
  mode: ZoneToolMode
  onModeChange: (mode: ZoneToolMode) => void
  onDeleteZone?: () => void
  canDelete?: boolean
}

interface ToolOption {
  id: ZoneToolMode
  label: string
  icon: any
  description: string
  isToggle?: boolean
  isAction?: boolean
}

const toolOptions: ToolOption[] = [
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    description: 'Select zones',
    isToggle: true,
  },
  {
    id: 'draw-rectangle',
    label: 'Rectangle',
    icon: Square,
    description: 'Draw rectangular zones',
    isToggle: true,
  },
  {
    id: 'draw-polygon',
    label: 'Polygon',
    icon: Pencil,
    description: 'Draw polygon zones',
    isToggle: true,
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: Move,
    description: 'Edit zone boundaries',
    isToggle: true,
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    description: 'Delete selected zone',
    isAction: true,
  },
]

export function ZoneToolbar({ 
  mode, 
  onModeChange, 
  onDeleteZone,
  canDelete = false
}: ZoneToolbarProps) {
  const handleToolClick = (tool: ToolOption) => {
    if (tool.isToggle) {
      // Toggle mode on/off
      onModeChange(mode === tool.id ? 'select' : tool.id)
    } else if (tool.isAction) {
      // Perform immediate action
      onDeleteZone?.()
    }
  }

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-[var(--color-surface)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] p-2 shadow-[var(--shadow-strong)]">
        {/* Tool Buttons */}
        <div className="flex items-center gap-1">
          {toolOptions.map((tool) => {
            const Icon = tool.icon
            const isActive = mode === tool.id && tool.isToggle
            const isDisabled = tool.id === 'delete' && !canDelete

            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]' 
                    : isDisabled
                    ? 'text-[var(--color-text-muted)] opacity-30 cursor-not-allowed'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)]'
                  }
                `}
                title={tool.description}
              >
                <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

