/**
 * Map Views Menu Component
 * 
 * Horizontal menu bar for selecting map overlay views.
 * Shows different visualization overlays that can be calculated/rendered.
 * 
 * AI Note: This provides overlay options like heat zones, signal strength,
 * device types, occupancy patterns, etc. These are visual overlays that
 * can be calculated from device data.
 */

'use client'

import { useState } from 'react'
import {
  Upload,
  Grid3x3,
  Radio,
  Layers,
  Users,
  Zap,
  Check,
  type LucideIcon
} from 'lucide-react'

export type MapViewType =
  | 'upload'
  | 'heat-zones'
  | 'signal-strength'
  | 'device-types'
  | 'occupancy'
  | 'energy-usage'

interface MapViewOption {
  id: MapViewType
  label: string
  icon: LucideIcon
  description: string
}

const mapViewOptions: MapViewOption[] = [
  {
    id: 'upload',
    label: 'Upload view',
    icon: Upload,
    description: 'Upload a new floor plan'
  },
  {
    id: 'heat-zones',
    label: 'Heat Zones',
    icon: Grid3x3,
    description: 'Temperature and heat distribution zones'
  },
  {
    id: 'signal-strength',
    label: 'Signal Strength',
    icon: Radio,
    description: 'Network signal strength overlay'
  },
  {
    id: 'device-types',
    label: 'Device Types',
    icon: Layers,
    description: 'Filter by device type categories'
  },
  {
    id: 'occupancy',
    label: 'Occupancy',
    icon: Users,
    description: 'Occupancy patterns and activity zones'
  },
  {
    id: 'energy-usage',
    label: 'Energy Usage',
    icon: Zap,
    description: 'Energy consumption overlay'
  },
]

interface MapViewsMenuProps {
  activeView?: MapViewType
  onViewChange?: (view: MapViewType) => void
  onUploadClick?: () => void
  showUpload?: boolean
}

export function MapViewsMenu({
  activeView,
  onViewChange,
  onUploadClick,
  showUpload = true
}: MapViewsMenuProps) {
  const [selectedView, setSelectedView] = useState<MapViewType | null>(activeView || null)

  const handleViewClick = (viewId: MapViewType) => {
    if (viewId === 'upload') {
      // Upload is handled separately
      onUploadClick?.()
      return
    }
    const newView = selectedView === viewId ? null : viewId
    setSelectedView(newView)
    onViewChange?.(newView || 'upload')
  }

  const visibleOptions = showUpload
    ? mapViewOptions
    : mapViewOptions.filter(opt => opt.id !== 'upload')

  return (
    <div className="flex items-center justify-end gap-2 px-2 py-2">
      <div className="flex items-center gap-1 bg-[var(--color-surface-glass)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] p-1 shadow-[var(--shadow-soft)]">
        {visibleOptions.map((option) => {
          const Icon = option.icon
          const isActive = selectedView === option.id
          const isUpload = option.id === 'upload'

          return (
            <button
              key={option.id}
              onClick={() => handleViewClick(option.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                  : isUpload
                    ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)]'
                }
              `}
              title={option.description}
            >
              <Icon size={18} className={isActive ? 'opacity-100' : 'opacity-70'} />
              <span className="text-sm font-medium">{option.label}</span>
              {isActive && !isUpload && (
                <Check size={14} className="ml-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

