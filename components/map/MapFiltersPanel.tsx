/**
 * Map Filters Panel Component
 * 
 * Panel for filtering and layer visibility controls.
 * Shows/hides layers (map, device types) and filters by zone.
 * 
 * AI Note: This panel appears to the left of action buttons when opened.
 */

'use client'

import { X, Map, Lightbulb, Radio, Eye } from 'lucide-react'
import { useMemo } from 'react'

export interface MapFilters {
  // Layer visibility
  showMap: boolean
  showFixtures: boolean
  showMotion: boolean
  showLightSensors: boolean
  // Zone filter
  selectedZones: string[]
}

interface MapFiltersPanelProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  availableZones: string[]
  isOpen: boolean
  onClose: () => void
}

export function MapFiltersPanel({
  filters,
  onFiltersChange,
  availableZones,
  isOpen,
  onClose
}: MapFiltersPanelProps) {
  const handleToggleLayer = (layer: keyof Pick<MapFilters, 'showMap' | 'showFixtures' | 'showMotion' | 'showLightSensors'>) => {
    onFiltersChange({
      ...filters,
      [layer]: !filters[layer]
    })
  }

  const handleToggleZone = (zone: string) => {
    const newZones = filters.selectedZones.includes(zone)
      ? filters.selectedZones.filter(z => z !== zone)
      : [...filters.selectedZones, zone]
    onFiltersChange({
      ...filters,
      selectedZones: newZones
    })
  }

  const handleSelectAllZones = () => {
    onFiltersChange({
      ...filters,
      selectedZones: availableZones
    })
  }

  const handleClearZones = () => {
    onFiltersChange({
      ...filters,
      selectedZones: []
    })
  }

  if (!isOpen) return null

  return (
    <div className="w-80 bg-[var(--color-surface)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Layers</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Layers Section */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Eye size={16} />
            Layers
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={filters.showMap}
                onChange={() => handleToggleLayer('showMap')}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <Map size={18} className="text-[var(--color-text-muted)]" />
              <span className="text-sm text-[var(--color-text)]">Map</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={filters.showFixtures}
                onChange={() => handleToggleLayer('showFixtures')}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <Lightbulb size={18} className="text-[var(--color-primary)]" />
              <span className="text-sm text-[var(--color-text)]">Fixtures</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={filters.showMotion}
                onChange={() => handleToggleLayer('showMotion')}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <Radio size={18} className="text-[var(--color-accent)]" />
              <span className="text-sm text-[var(--color-text)]">Motion Sensors</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={filters.showLightSensors}
                onChange={() => handleToggleLayer('showLightSensors')}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <Eye size={18} className="text-[var(--color-success)]" />
              <span className="text-sm text-[var(--color-text)]">Light Sensors</span>
            </label>
          </div>
        </div>

        {/* Zone Filters Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">Zones</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllZones}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Select All
              </button>
              <span className="text-[var(--color-text-muted)]">|</span>
              <button
                onClick={handleClearZones}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableZones.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] p-2">No zones available</p>
            ) : (
              availableZones.map((zone) => (
                <label
                  key={zone}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedZones.includes(zone)}
                    onChange={() => handleToggleZone(zone)}
                    className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[var(--color-text)] flex-1">{zone}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

