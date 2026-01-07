/**
 * Select Switcher Component
 * 
 * Reusable dropdown switcher for selecting items (devices, zones, etc.)
 * Similar to the site selector but for contextual selections.
 * 
 * AI Note: Use this component when you need a dropdown to switch between
 * items in a detail panel or similar context.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface SelectSwitcherProps<T> {
  items: T[]
  selectedItem: T | null
  onSelect: (item: T | null) => void
  getLabel: (item: T) => string
  getKey?: (item: T) => string
  placeholder?: string
  className?: string
  maxWidth?: string
}

export function SelectSwitcher<T>({
  items,
  selectedItem,
  onSelect,
  getLabel,
  getKey,
  placeholder = 'Select...',
  className = '',
  maxWidth = '200px',
}: SelectSwitcherProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
      })
    }
  }, [isOpen])

  const getItemKey = (item: T, index: number): string => {
    if (getKey) return getKey(item)
    return String(index)
  }

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--color-surface-subtle)] transition-colors border border-[var(--color-border-subtle)] ${className}`}
        style={{ maxWidth }}
      >
        <span className="text-sm font-medium text-[var(--color-text)] whitespace-nowrap truncate">
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <ChevronDown size={12} className="text-[var(--color-text-muted)] flex-shrink-0" />
      </button>

      {/* Dropdown Menu - Portal to body to escape all stacking contexts */}
      {isOpen && mounted && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed bg-[var(--color-surface)] backdrop-blur-xl rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-[9999] max-h-64 overflow-y-auto"
            style={dropdownStyle}
          >
            {items.map((item, index) => {
              const isSelected = selectedItem === item
              return (
                <button
                  key={getItemKey(item, index)}
                  onClick={() => {
                    onSelect(item)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${isSelected
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                    }`}
                >
                  {getLabel(item)}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

