/**
 * Page Title Watermark Component
 * 
 * Subtle title watermark displayed at the top of each page.
 * Provides context without being prominent - like a watermark.
 * 
 * AI Note: This should be placed at the top of page content,
 * styled as a subtle grey watermark that doesn't interfere with content.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useRole } from '@/lib/role'
import { useStore } from '@/lib/StoreContext'
import { ChevronDown } from 'lucide-react'

const pageTitles: Record<string, { primary: string; secondary?: string }> = {
  '/dashboard': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/map': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/zones': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/bacnet': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/rules': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/lookup': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/faults': { primary: 'Fusion', secondary: 'i2 Cloud' },
}

export function PageTitle() {
  const pathname = usePathname()
  const { role } = useRole()
  const { stores, activeStore, setActiveStore } = useStore()
  const title = pageTitles[pathname || '/dashboard'] || { primary: 'Fusion', secondary: 'i2 Cloud' }
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (showStoreDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
      })
    }
  }, [showStoreDropdown])

  return (
    <div className="relative z-0" style={{ background: 'transparent' }}>
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        {/* Left: Title */}
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="text-base font-semibold text-[var(--color-text-muted)] opacity-60">
            {title.primary}
          </span>
          {title.secondary && (
            <>
              <span className="text-xs text-[var(--color-text-muted)] opacity-40">/</span>
              <span className="text-sm font-medium text-[var(--color-text-muted)] opacity-60">
                {title.secondary}
              </span>
            </>
          )}
          <span className="text-xs text-[var(--color-text-muted)] opacity-40">/</span>
          <span className="text-sm font-medium text-[var(--color-text-muted)] opacity-60">
            {role}
          </span>
        </div>

        {/* Right: Store Selector */}
        <div className="relative pointer-events-auto">
          <button 
            ref={buttonRef}
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors border border-[var(--color-border-subtle)]"
          >
            <span className="text-sm font-medium text-[var(--color-text)] whitespace-nowrap max-w-[180px] truncate">
              {activeStore?.name || 'Select Store'}
            </span>
            <ChevronDown size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
          </button>
          
          {/* Dropdown Menu - Portal to body to escape all stacking contexts */}
          {showStoreDropdown && mounted && createPortal(
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setShowStoreDropdown(false)}
              />
              <div 
                className="fixed w-64 bg-[var(--color-surface)] backdrop-blur-xl rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-[9999]"
                style={dropdownStyle}
              >
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      setActiveStore(store.id)
                      setShowStoreDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      activeStore?.id === store.id
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    {store.name}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </div>
  )
}

