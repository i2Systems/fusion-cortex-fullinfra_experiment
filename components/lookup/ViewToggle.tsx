/**
 * View Toggle Component
 * 
 * Toggle menu for switching between Table, Devices Map, and Zones Map views
 */

'use client'

import { Table2, Map, Layers } from 'lucide-react'

export type ViewMode = 'table' | 'devices-map' | 'zones-map'

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  const views: { id: ViewMode; label: string; icon: typeof Table2 }[] = [
    { id: 'table', label: 'Table', icon: Table2 },
    { id: 'devices-map', label: 'Devices Map', icon: Map },
    { id: 'zones-map', label: 'Zones Map', icon: Layers },
  ]

  return (
    <div className="flex items-center gap-1 p-0.5 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
      {views.map((view) => {
        const Icon = view.icon
        const isActive = currentView === view.id
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
              ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }
            `}
          >
            <Icon size={14} />
            <span>{view.label}</span>
          </button>
        )
      })}
    </div>
  )
}

