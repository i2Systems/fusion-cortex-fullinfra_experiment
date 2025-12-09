/**
 * Zones Panel Component
 * 
 * Right-side panel for zone management.
 * Shows zone list and properties.
 * 
 * AI Note: This panel displays zones and allows editing zone properties.
 */

'use client'

import { useState, useEffect } from 'react'
import { Layers, Edit2, Trash2, MapPin } from 'lucide-react'

interface Zone {
  id: string
  name: string
  deviceCount: number
  description: string
  colorVar?: string // CSS variable name like '--color-primary'
  color?: string // Hex color (alternative to colorVar)
}

interface ZonesPanelProps {
  zones: Zone[]
  selectedZoneId?: string | null
  onZoneSelect?: (zoneId: string | null) => void
}

export function ZonesPanel({ zones, selectedZoneId, onZoneSelect }: ZonesPanelProps) {
  const [colors, setColors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Get CSS variable values or use direct color
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    const colorMap: Record<string, string> = {}
    
    zones.forEach(zone => {
      if (zone.color) {
        colorMap[zone.id] = zone.color
      } else if (zone.colorVar) {
        const colorValue = computedStyle.getPropertyValue(zone.colorVar).trim()
        if (colorValue) {
          colorMap[zone.id] = colorValue
        }
      }
    })
    
    setColors(colorMap)
  }, [zones])

  const selectedZone = zones.find(z => z.id === selectedZoneId)

  return (
    <div className="h-full flex flex-col">
      {/* Data-Dense Header for Selected Zone */}
      {selectedZone && (
        <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
          <div className="flex items-start gap-3 mb-3">
            {/* Zone Image/Icon */}
            <div 
              className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]"
              style={{ backgroundColor: colors[selectedZone.id] ? `${colors[selectedZone.id]}20` : 'var(--color-primary-soft)' }}
            >
              <Layers size={32} style={{ color: colors[selectedZone.id] || 'var(--color-primary)' }} />
            </div>
            {/* Meta Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                    {selectedZone.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Control Zone
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle edit
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    title="Edit zone"
                  >
                    <Edit2 size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle delete
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    title="Delete zone"
                  >
                    <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Devices</div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{selectedZone.deviceCount}</div>
                </div>
                <div 
                  className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0"
                  style={{ borderColor: colors[selectedZone.id] ? `${colors[selectedZone.id]}40` : undefined }}
                >
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Color</div>
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[selectedZone.id] || 'var(--color-primary)' }}
                    />
                    <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                      {colors[selectedZone.id] || 'Default'}
                    </div>
                  </div>
                </div>
                {selectedZone.description && (
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] col-span-2 min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Description</div>
                    <div className="text-xs font-semibold text-[var(--color-text)] line-clamp-2">{selectedZone.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Zones
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {zones.length} zones configured
        </p>
          </div>
        </div>
        {/* Create Zone Button - Moved to top */}
        <button className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2 mt-3">
          <Layers size={16} />
          Create New Zone
        </button>
      </div>

      {/* Zone List */}
      <div className="flex-1 overflow-auto pb-4">
        <div className="space-y-2 p-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              onClick={() => onZoneSelect?.(zone.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${selectedZoneId === zone.id
                  ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                  : 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[zone.id] || 'var(--color-primary)' }}
                  />
                  <h4 className="font-semibold text-sm text-[var(--color-text)]">
                    {zone.name}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle edit
                    }}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Edit2 size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle delete
                    }}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                {zone.deviceCount} devices
              </p>
              <p className="text-xs text-[var(--color-text-soft)]">
                {zone.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

