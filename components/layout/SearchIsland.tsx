/**
 * Search Island Component
 * 
 * Reusable floating search island with site selector.
 * Can be positioned at top or bottom, full width or centered.
 * 
 * AI Note: Use this component for consistent search islands across pages.
 */

'use client'

import { Search, Layers, Sparkles, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useSearch } from '@/lib/SearchContext'

interface Metric {
  label: string
  value: string | number
  color?: string
  trend?: 'up' | 'down' | 'stable'
  delta?: number
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
}

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
  onActionDetected?: (action: { id: string; label: string }) => void
  metrics?: Metric[]
}

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
  filterCount = 0,
  onActionDetected,
  metrics = []
}: SearchIslandProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const { detectAction, getPageActions } = useSearch()
  
  // Use controlled value if provided, otherwise use internal state
  const searchQuery = searchValue !== undefined ? searchValue : internalSearchQuery
  const setSearchQuery = onSearchChange || setInternalSearchQuery

  // Detect actions from search query
  const detectedAction = useMemo(() => {
    if (!searchQuery.trim()) return null
    return detectAction(searchQuery)
  }, [searchQuery, detectAction])

  // Notify parent when action is detected
  useEffect(() => {
    if (detectedAction && onActionDetected) {
      onActionDetected(detectedAction)
    }
  }, [detectedAction, onActionDetected])

  const containerClass = position === 'top' 
    ? fullWidth
      ? 'w-full px-4'
      : 'max-w-3xl mx-auto px-4'
    : fullWidth
      ? 'w-full px-4'
      : 'max-w-4xl mx-auto px-4'

  // Position class - pages handle fixed positioning via wrappers
  const positionClass = position === 'top'
    ? ''
    : ''

  return (
    <div className={`${containerClass} ${positionClass}`}>
      <div className="fusion-card backdrop-blur-xl border border-[var(--color-primary)]/20 search-island py-4 px-5">
        {/* Single Row: Title + Metrics + Search + Actions */}
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* Title Section */}
          {title && (
            <div className="flex-shrink-0 pr-2 min-w-0">
              <h1 className="text-lg font-bold text-[var(--color-text)] leading-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] leading-tight mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Metrics - Compact data viz snippets */}
          {metrics.length > 0 && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {metrics.map((metric, index) => (
                <div 
                  key={index}
                  onClick={metric.onClick}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] ${
                    metric.onClick ? 'cursor-pointer hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-all duration-200' : ''
                  }`}
                >
                  {metric.icon && (
                    <div className="flex-shrink-0">
                      {metric.icon}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="text-xs text-[var(--color-text-muted)] leading-tight">
                      {metric.label}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span 
                        className="text-base font-bold leading-tight truncate"
                        style={{ color: metric.color || 'var(--color-text)' }}
                      >
                        {metric.value}
                      </span>
                      {metric.trend && metric.delta !== undefined && metric.delta !== 0 && (
                        <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                          metric.trend === 'up' 
                            ? 'text-[var(--color-success)]' 
                            : metric.trend === 'down'
                            ? 'text-[var(--color-danger)]'
                            : 'text-[var(--color-text-muted)]'
                        }`}>
                          {metric.trend === 'up' ? (
                            <ArrowUp size={8} />
                          ) : metric.trend === 'down' ? (
                            <ArrowDown size={8} />
                          ) : null}
                          {Math.abs(metric.delta)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spacer to push search to the right */}
          <div className="flex-1 hidden md:block" />

          {/* Search - Pushed to the right, responsive width */}
          <div className="relative min-w-0 ml-auto md:ml-0" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="w-full md:w-[400px] lg:w-[500px]">
              <Search 
                size={22} 
                className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" 
              />
              {detectedAction && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--color-primary)] animate-pulse" />
                  <span className="text-xs text-[var(--color-primary)] font-medium bg-[var(--color-primary-soft)] px-2 py-0.5 rounded">
                    {detectedAction.label}
                  </span>
                </div>
              )}
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && detectedAction) {
                    detectedAction.action()
                    setSearchQuery('')
                  }
                }}
                className={`w-full pl-14 pr-4 py-3.5 h-[52px] bg-[var(--color-bg-elevated)] border-2 rounded-xl text-lg font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] placeholder:font-normal focus:outline-none focus:shadow-[var(--shadow-glow-primary)] transition-all ${
                  detectedAction 
                    ? 'border-[var(--color-primary)] pr-32 focus:ring-2 focus:ring-[var(--color-primary)]' 
                    : 'border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]'
                }`}
              />
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex-shrink-0">
              <button 
                onClick={onLayersClick}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2 relative h-[38px]"
              >
                <Layers size={14} />
                <span className="text-sm hidden sm:inline">Layers</span>
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-primary)] text-[var(--color-text)] text-xs flex items-center justify-center font-semibold">
                    {filterCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

