/**
 * Focused Object Modal Component
 * 
 * A reusable modal shell for displaying detailed, tabbed views of entities
 * (devices, zones, faults, sites). Opens as an overlay using portal rendering.
 * 
 * AI Note: This is the "focused view" between panels and edit modals.
 * It shows all information with tabs for Overview, Metrics, History, Related.
 */

'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, Maximize2 } from 'lucide-react'
import { FocusedModalTabs, TabDefinition } from './FocusedModalTabs'

export interface FocusedObjectModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  iconBgClass?: string
  tabs: TabDefinition[]
  children: (activeTab: string) => ReactNode
  footer?: ReactNode
  defaultTab?: string
}

export function FocusedObjectModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgClass = 'bg-[var(--color-primary-soft)]',
  tabs,
  children,
  footer,
  defaultTab,
}: FocusedObjectModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || 'overview')
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle mount state for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Animation state
  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  // Reset to default tab when modal opens
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab)
    } else if (isOpen && tabs.length > 0) {
      setActiveTab(tabs[0].id)
    }
  }, [isOpen, defaultTab, tabs])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4
        transition-opacity duration-200
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`
          relative w-full max-w-4xl h-[85vh] max-h-[900px]
          bg-[var(--color-surface)] backdrop-blur-xl
          rounded-2xl border border-[var(--color-border-subtle)]
          shadow-[var(--shadow-strong)]
          flex flex-col overflow-hidden
          transition-all duration-200 ease-out
          ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        style={{ boxShadow: 'var(--glow-modal), var(--shadow-strong)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-transparent">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Icon */}
            {icon && (
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]`}>
                {icon}
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[var(--color-text)] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs md:text-sm text-[var(--color-text-muted)] truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="hidden md:block">
              <FocusedModalTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors ml-2 flex-shrink-0"
            title="Close (Esc)"
          >
            <X size={20} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
          <FocusedModalTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            compact
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children(activeTab)}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="p-4 md:p-6 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/**
 * Trigger button for opening the focused modal from a panel header.
 * Use this in panel headers to provide consistent UX.
 */
export function FocusedModalTrigger({
  onClick,
  className = '',
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-all ${className}`}
      title="Open focused view"
    >
      <Maximize2 size={16} />
    </button>
  )
}
