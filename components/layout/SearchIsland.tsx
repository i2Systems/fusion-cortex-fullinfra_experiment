/**
 * Search Island Component
 * 
 * Reusable floating search island with store selector.
 * Can be positioned at top or bottom, full width or centered.
 * 
 * AI Note: Use this component for consistent search islands across pages.
 */

'use client'

import { Search, ChevronDown, Layers } from 'lucide-react'
import { useState } from 'react'

interface SearchIslandProps {
  position?: 'top' | 'bottom'
  fullWidth?: boolean
  showActions?: boolean
  placeholder?: string
  title?: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  onLayersClick?: () => void
  filterCount?: number
}

const STORES = [
  'Store #1234 - Main St',
  'Store #2156 - Oak Avenue',
  'Store #3089 - Commerce Blvd',
  'Store #4421 - River Road',
  'Store #5567 - Park Plaza',
  'Store #6789 - Central Square',
]

export function SearchIsland({ 
  position = 'bottom',
  fullWidth = true,
  showActions = false,
  placeholder = 'Search, input a task, or ask a question...',
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onLayersClick,
  filterCount = 0
}: SearchIslandProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [currentSite, setCurrentSite] = useState(STORES[0])
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  
  // Use controlled value if provided, otherwise use internal state
  const searchQuery = searchValue !== undefined ? searchValue : internalSearchQuery
  const setSearchQuery = onSearchChange || setInternalSearchQuery

  const containerClass = position === 'top' 
    ? 'max-w-3xl mx-auto mb-12'
    : fullWidth
      ? 'w-[calc(100vw-80px)] left-[80px] px-4'
      : 'max-w-4xl left-1/2 -translate-x-1/2 px-4'

  const positionClass = position === 'top'
    ? ''
    : 'fixed bottom-8 z-10'

  return (
    <div className={`${containerClass} ${positionClass}`}>
      <div 
        className="fusion-card backdrop-blur-xl border border-[var(--color-primary)]/20 search-island"
      >
        {/* Top Row: Title + Actions */}
        {(title || showActions) && (
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--color-border-subtle)] mb-3">
            {/* Title Section */}
            {title && (
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-[var(--color-text)] leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {showActions && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto relative">
                <button 
                  onClick={onLayersClick}
                  className="px-4 py-2.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2 relative"
                >
                  <Layers size={16} />
                  Layers
                  {filterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-text)] text-xs flex items-center justify-center font-semibold">
                      {filterCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Row: Store Selector + Search */}
        <div className="flex items-center gap-6">
          {/* Store Selector */}
          <div className="relative flex-shrink-0">
            <button 
              onClick={() => setShowStoreDropdown(!showStoreDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors border border-[var(--color-border-subtle)]"
            >
              <span className="text-sm font-medium text-[var(--color-text)] whitespace-nowrap">
                {currentSite}
              </span>
              <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
            </button>
            
            {/* Dropdown Menu */}
            {showStoreDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setShowStoreDropdown(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--color-surface)] backdrop-blur-xl rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-10">
                  {STORES.map((store) => (
                    <button
                      key={store}
                      onClick={() => {
                        setCurrentSite(store)
                        setShowStoreDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        currentSite === store
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                      }`}
                    >
                      {store}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" 
            />
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

