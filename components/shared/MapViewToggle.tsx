/**
 * Map View Toggle Component
 * 
 * Reusable toggle for switching between List and Map views
 */

'use client'

import { List, Map } from 'lucide-react'

export type MapViewMode = 'list' | 'map'

interface MapViewToggleProps {
  currentView: MapViewMode
  onViewChange: (view: MapViewMode) => void
}

export function MapViewToggle({ currentView, onViewChange }: MapViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-0.5 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
      <button
        onClick={() => onViewChange('list')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${
            currentView === 'list'
              ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }
        `}
      >
        <List size={14} />
        <span>List</span>
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${
            currentView === 'map'
              ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }
        `}
      >
        <Map size={14} />
        <span>Map</span>
      </button>
    </div>
  )
}

