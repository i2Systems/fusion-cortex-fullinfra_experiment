/**
 * Locations Menu Component
 * 
 * Displays in the lower left corner of the map view.
 * Shows list of locations with ability to:
 * - Switch between locations
 * - Add new locations (upload image/PDF)
 * - Create zoom views of existing locations
 * 
 * AI Note: This menu appears after the first location is uploaded.
 */

'use client'

import { useState } from 'react'
import { Plus, MapPin, ZoomIn, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { Location } from '@/lib/locationStorage'

interface LocationsMenuProps {
  locations: Location[]
  currentLocationId: string | null
  onLocationSelect: (locationId: string) => void
  onAddLocation: () => void
  onCreateZoomView: (parentLocationId: string) => void
  onDeleteLocation?: (locationId: string) => void
}

export function LocationsMenu({
  locations,
  currentLocationId,
  onLocationSelect,
  onAddLocation,
  onCreateZoomView,
  onDeleteLocation,
}: LocationsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const baseLocations = locations.filter(loc => loc.type === 'base')
  const currentLocation = locations.find(loc => loc.id === currentLocationId)
  const zoomViews = currentLocationId
    ? locations.filter(loc => loc.parentLocationId === currentLocationId)
    : []

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
      {/* Main menu button */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {/* Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-all shadow-[var(--shadow-soft)]"
        >
          <MapPin size={18} />
          <span className="text-sm font-medium">
            {currentLocation?.name || 'No location'}
          </span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {/* Expanded menu */}
        {isExpanded && (
          <div className="bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-lg shadow-[var(--shadow-strong)] overflow-hidden min-w-[240px]">
            {/* Location list */}
            <div className="max-h-[300px] overflow-y-auto">
              {/* Base locations */}
              <div className="p-2">
                <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-2 py-1 mb-1">
                  Locations
                </div>
                {baseLocations.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-[var(--color-text-muted)]">
                    No locations yet
                  </div>
                ) : (
                  baseLocations.map(location => {
                    const isActive = location.id === currentLocationId
                    const hasZoomViews = zoomViews.length > 0 && location.id === currentLocationId

                    return (
                      <div key={location.id}>
                        <div
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-all ${isActive
                              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                              : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                            }`}
                        >
                          <button
                            onClick={() => {
                              onLocationSelect(location.id)
                              setIsExpanded(false)
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            <MapPin size={14} className="flex-shrink-0" />
                            <span className="truncate">{location.name}</span>
                          </button>
                          {onDeleteLocation && !isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete location "${location.name}"?`)) {
                                  onDeleteLocation(location.id)
                                }
                              }}
                              className="ml-2 p-1 rounded hover:bg-[var(--color-danger-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                              title="Delete location"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Zoom views for this location */}
                        {hasZoomViews && (
                          <div className="ml-4 mt-1 space-y-1">
                            {zoomViews.map(zoomView => (
                              <button
                                key={zoomView.id}
                                onClick={() => {
                                  onLocationSelect(zoomView.id)
                                  setIsExpanded(false)
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] transition-all"
                              >
                                <ZoomIn size={12} />
                                <span className="truncate">{zoomView.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Add button */}
            <div className="border-t border-[var(--color-border-subtle)] p-2">
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)] transition-all text-sm font-medium"
                >
                  <Plus size={16} />
                  <span>Add Location</span>
                </button>

                {/* Add menu dropdown */}
                {showAddMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg shadow-[var(--shadow-strong)] overflow-hidden">
                    <button
                      onClick={() => {
                        onAddLocation()
                        setShowAddMenu(false)
                        setIsExpanded(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-colors"
                    >
                      <MapPin size={14} />
                      <span>Upload New Image/PDF</span>
                    </button>
                    {currentLocationId && (
                      <button
                        onClick={() => {
                          onCreateZoomView(currentLocationId)
                          setShowAddMenu(false)
                          setIsExpanded(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-colors border-t border-[var(--color-border-subtle)]"
                      >
                        <ZoomIn size={14} />
                        <span>Create Zoom View</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

