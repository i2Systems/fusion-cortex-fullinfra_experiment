/**
 * Focused Modal Tabs Component
 * 
 * Tab navigation for the FocusedObjectModal.
 * Follows the existing ViewToggle pattern with primary accent colors.
 * 
 * AI Note: Supports keyboard navigation with arrow keys.
 */

'use client'

import { useCallback, useRef, useEffect, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

export interface TabDefinition {
  id: string
  label: string
  icon?: LucideIcon
}

interface FocusedModalTabsProps {
  tabs: TabDefinition[]
  activeTab: string
  onTabChange: (tabId: string) => void
  compact?: boolean
}

export function FocusedModalTabs({
  tabs,
  activeTab,
  onTabChange,
  compact = false,
}: FocusedModalTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        newIndex = (currentIndex + 1) % tabs.length
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        newIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        newIndex = tabs.length - 1
      }

      if (newIndex !== currentIndex) {
        onTabChange(tabs[newIndex].id)
        tabRefs.current[newIndex]?.focus()
      }
    },
    [tabs, onTabChange]
  )

  return (
    <div
      className={`
        flex items-center gap-1 p-0.5
        bg-[var(--color-surface-subtle)] rounded-lg
        border border-[var(--color-border-subtle)]
        ${compact ? 'w-full' : ''}
      `}
      role="tablist"
      aria-label="Content sections"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`
              ${compact ? 'flex-1' : ''}
              px-3 py-1.5 rounded-md
              text-xs md:text-sm font-medium
              transition-all duration-150
              flex items-center justify-center gap-1.5
              ${isActive
                ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[var(--shadow-soft)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }
            `}
          >
            {Icon && <Icon size={14} className={compact ? 'md:hidden' : ''} />}
            <span className={compact ? 'hidden sm:inline' : ''}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
