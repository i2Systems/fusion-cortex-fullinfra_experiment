/**
 * Map Toolbar Component
 * 
 * Top bar with actions for positioning and moving devices on the map.
 * Provides tools for selecting, moving, aligning, and organizing devices.
 * 
 * AI Note: This toolbar replaces the old MapViewsMenu with actionable
 * device positioning tools.
 */

'use client'

import { useState } from 'react'
import { 
  MousePointer2, 
  Move, 
  Grid3x3, 
  AlignLeft, 
  Sparkles, 
  Undo2, 
  Redo2, 
  Lock, 
  Unlock, 
  Copy, 
  RotateCcw,
  Magnet
} from 'lucide-react'

export type MapToolMode = 
  | 'select' 
  | 'move' 
  | 'align-grid' 
  | 'align-aisle' 
  | 'auto-arrange' 
  | 'lock' 
  | 'unlock' 
  | 'copy-position' 
  | 'reset' 
  | 'snap-nearest'

interface MapToolbarProps {
  mode: MapToolMode
  onModeChange: (mode: MapToolMode) => void
  onAction: (action: MapToolMode) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

interface ToolOption {
  id: MapToolMode
  label: string
  icon: any
  description: string
  isToggle?: boolean // If true, clicking toggles the mode on/off
  isAction?: boolean // If true, clicking performs an immediate action
}

const toolOptions: ToolOption[] = [
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    description: 'Click to select devices',
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
    id: 'align-grid',
    label: 'Align Grid',
    icon: Grid3x3,
    description: 'Snap selected devices to grid',
    isAction: true,
  },
  {
    id: 'align-aisle',
    label: 'Align Aisle',
    icon: AlignLeft,
    description: 'Align devices along aisles',
    isAction: true,
  },
  {
    id: 'auto-arrange',
    label: 'Auto Arrange',
    icon: Sparkles,
    description: 'Automatically arrange devices by type',
    isAction: true,
  },
  {
    id: 'snap-nearest',
    label: 'Snap Nearest',
    icon: Magnet,
    description: 'Snap devices to nearest logical position',
    isAction: true,
  },
  {
    id: 'copy-position',
    label: 'Copy Position',
    icon: Copy,
    description: 'Copy position from selected device',
    isAction: true,
  },
  {
    id: 'lock',
    label: 'Lock',
    icon: Lock,
    description: 'Lock selected devices',
    isAction: true,
  },
  {
    id: 'unlock',
    label: 'Unlock',
    icon: Unlock,
    description: 'Unlock selected devices',
    isAction: true,
  },
  {
    id: 'reset',
    label: 'Reset',
    icon: RotateCcw,
    description: 'Reset devices to original positions',
    isAction: true,
  },
]

export function MapToolbar({ 
  mode, 
  onModeChange, 
  onAction, 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo 
}: MapToolbarProps) {
  const handleToolClick = (tool: ToolOption) => {
    if (tool.isToggle) {
      // Toggle mode on/off
      onModeChange(mode === tool.id ? 'select' : tool.id)
    } else if (tool.isAction) {
      // Perform immediate action
      onAction(tool.id)
    }
  }

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-[var(--color-surface)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] p-2 shadow-[var(--shadow-strong)]">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-[var(--color-border-subtle)]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            title="Undo last action"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            title="Redo last action"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Tool Buttons */}
        <div className="flex items-center gap-1">
          {toolOptions.map((tool) => {
            const Icon = tool.icon
            const isActive = mode === tool.id && tool.isToggle

            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]' 
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)]'
                  }
                `}
                title={tool.description}
              >
                <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

