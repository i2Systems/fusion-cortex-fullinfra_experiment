/**
 * Resizable Panel Component
 * 
 * Wraps panel content with a draggable handle for resizing.
 * Features:
 * - Draggable handle between panel and main content
 * - Minimum width threshold - below which panel collapses completely
 * - Collapsed state shows two-line grip that can be pulled to reopen
 * - Smooth spring-like animations
 * - Remembers last open width
 * 
 * AI Note: Use this component to wrap any right-side panel that should be resizable.
 */

'use client'

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { GripVertical, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  collapseThreshold?: number
  storageKey?: string
  className?: string
  showCloseButton?: boolean
  onClose?: () => void
  /** When this value changes (e.g. increment), panel opens. Lets parent open without ref. */
  openTrigger?: number
}

export interface ResizablePanelRef {
  toggle: () => void
  open: () => void
  close: () => void
  isCollapsed: boolean
  panelElement: React.RefObject<HTMLDivElement>
}

export const ResizablePanel = forwardRef<ResizablePanelRef, ResizablePanelProps>(({
  children,
  defaultWidth = 384, // 24rem
  minWidth = 280,
  maxWidth = 600,
  collapseThreshold = 200, // Below this, panel collapses completely
  storageKey,
  className = '',
  showCloseButton = false,
  onClose,
  openTrigger,
}, ref) => {
  const [width, setWidth] = useState(defaultWidth)
  // Always start collapsed to match SSR - will be updated in useEffect
  const [isCollapsed, setIsCollapsed] = useState(true)
  // Delayed panel collapse - controls actual panel width/visibility
  // This lags behind isCollapsed to allow content to fade first when closing
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const [lastOpenWidth, setLastOpenWidth] = useState(defaultWidth)
  const [isMobile, setIsMobile] = useState(false) // Track if we're on mobile/tablet
  // Skip animations on initial hydration to prevent slide-in on page load
  const [hasHydrated, setHasHydrated] = useState(false)
  // Staggered content visibility for smoother animations
  // Content fades out before panel closes, fades in after panel opens
  const [contentVisible, setContentVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  // Double-tap detection
  const lastTapTime = useRef(0)
  const lastTapX = useRef(0)
  const lastTapY = useRef(0)
  const doubleTapTimeout = useRef<NodeJS.Timeout | null>(null)

  // Set mobile state after hydration
  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load saved state from localStorage, but respect screen size
  // This runs after hydration to avoid SSR mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isTabletOrMobile = window.innerWidth < 1024 // lg breakpoint

    if (storageKey) {
      const saved = localStorage.getItem(`panel_${storageKey}`)

      if (saved) {
        try {
          const { width: savedWidth, isCollapsed: savedCollapsed } = JSON.parse(saved)
          if (savedWidth && !savedCollapsed) {
            setWidth(savedWidth)
            setLastOpenWidth(savedWidth)
          }
          // On tablet/mobile, default to collapsed unless explicitly saved as open
          // On desktop, default to open (ignore saved collapsed state on first load)
          if (isTabletOrMobile) {
            setIsCollapsed(savedCollapsed !== false) // Default to collapsed on tablet/mobile
          } else {
            // Desktop: default to open, but respect saved width
            setIsCollapsed(false)
            if (savedWidth) {
              setWidth(savedWidth)
              setLastOpenWidth(savedWidth)
            }
          }
        } catch (e) {
          console.warn('Failed to load panel state:', e)
          // Default based on screen size
          setIsCollapsed(isTabletOrMobile)
        }
      } else {
        // No saved state - default to collapsed on tablet/mobile, open on desktop
        setIsCollapsed(isTabletOrMobile)
      }
    } else {
      // No storage key - default based on screen size
      setIsCollapsed(isTabletOrMobile)
    }

    // Enable animations after initial state is set (next frame)
    // Also set initial content/panel visibility based on collapsed state
    requestAnimationFrame(() => {
      setHasHydrated(true)
      // If panel is open on load, show everything immediately (no animation needed)
      if (!isTabletOrMobile || (storageKey && localStorage.getItem(`panel_${storageKey}`))) {
        const saved = storageKey ? localStorage.getItem(`panel_${storageKey}`) : null
        const savedCollapsed = saved ? JSON.parse(saved).isCollapsed : true
        if (!isTabletOrMobile || savedCollapsed === false) {
          setPanelCollapsed(false)
          setContentVisible(true)
        }
      }
    })
  }, [storageKey])

  // When parent passes openTrigger (e.g. after clicking "add to group"), open the panel
  const prevOpenTrigger = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (openTrigger != null && openTrigger !== prevOpenTrigger.current) {
      prevOpenTrigger.current = openTrigger
      if (openTrigger > 0) {
        setIsCollapsed(false)
        setWidth(lastOpenWidth)
      }
    }
  }, [openTrigger, lastOpenWidth])

  // Staggered animation: content fades out THEN panel closes, panel opens THEN content fades in
  useEffect(() => {
    if (!hasHydrated) return

    if (isCollapsed) {
      // Closing sequence: fade content first, then collapse panel
      setContentVisible(false)
      const timer = setTimeout(() => {
        setPanelCollapsed(true)
      }, 150) // Wait for content fade (150ms) before collapsing panel
      return () => clearTimeout(timer)
    } else {
      // Opening sequence: expand panel first, then fade in content
      setPanelCollapsed(false)
      const timer = setTimeout(() => {
        setContentVisible(true)
      }, 250) // Wait for panel slide before fading in content
      return () => clearTimeout(timer)
    }
  }, [isCollapsed, hasHydrated])

  // Handle window resize - collapse on tablet/mobile, allow open on desktop
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const isTabletOrMobile = window.innerWidth < 1024
      if (isTabletOrMobile && !isCollapsed) {
        // Don't auto-collapse if user has it open, but set as default for next time
        // Only auto-collapse if it was already collapsed
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isCollapsed])

  // Save state to localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`panel_${storageKey}`, JSON.stringify({
        width: isCollapsed ? lastOpenWidth : width,
        isCollapsed,
      }))
    }
  }, [width, isCollapsed, lastOpenWidth, storageKey])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = isCollapsed ? 0 : width

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width, isCollapsed])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    // Calculate new width (dragging left increases width, right decreases)
    const deltaX = dragStartX.current - e.clientX
    let newWidth = dragStartWidth.current + deltaX

    // If starting from collapsed state, expand if dragging left
    if (isCollapsed && deltaX > 20) {
      setIsCollapsed(false)
      newWidth = Math.max(minWidth, deltaX + collapseThreshold)
    }

    // Clamp width
    newWidth = Math.max(0, Math.min(maxWidth, newWidth))

    // Check if should collapse
    if (newWidth < collapseThreshold && !isCollapsed) {
      setIsCollapsed(true)
      setLastOpenWidth(width > collapseThreshold ? width : lastOpenWidth)
    } else if (newWidth >= collapseThreshold) {
      setIsCollapsed(false)
      setWidth(Math.max(minWidth, newWidth))
    }
  }, [isDragging, isCollapsed, width, lastOpenWidth, minWidth, maxWidth, collapseThreshold])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [isDragging])

  // Double-tap detection handler
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    if (!isCollapsed) return false

    const touch = e.touches[0]
    const currentTime = Date.now()
    const timeDiff = currentTime - lastTapTime.current
    const xDiff = Math.abs(touch.clientX - lastTapX.current)
    const yDiff = Math.abs(touch.clientY - lastTapY.current)

    // Check if this is a double-tap (within 300ms and within 50px)
    if (
      timeDiff > 0 && // Not the first tap
      timeDiff < 300 &&
      xDiff < 50 &&
      yDiff < 50
    ) {
      e.preventDefault()
      e.stopPropagation()
      // Clear any pending timeout
      if (doubleTapTimeout.current) {
        clearTimeout(doubleTapTimeout.current)
        doubleTapTimeout.current = null
      }
      // Open the panel
      setIsCollapsed(false)
      setWidth(lastOpenWidth)
      // Reset tap tracking
      lastTapTime.current = 0
      return true
    }

    // Update last tap info for next potential double-tap
    lastTapTime.current = currentTime
    lastTapX.current = touch.clientX
    lastTapY.current = touch.clientY

    // Set timeout to reset if no second tap comes
    if (doubleTapTimeout.current) {
      clearTimeout(doubleTapTimeout.current)
    }
    doubleTapTimeout.current = setTimeout(() => {
      lastTapTime.current = 0
      doubleTapTimeout.current = null
    }, 300)

    return false
  }, [isCollapsed, lastOpenWidth])

  // Touch event handlers for touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]

    // Check for double-tap first (only when collapsed on mobile)
    if (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768) {
      if (handleDoubleTap(e)) {
        return // Double-tap detected, don't proceed with drag
      }
    }

    // Only start drag tracking if not a double-tap
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = Date.now()
    dragStartX.current = touch.clientX
    dragStartWidth.current = isCollapsed ? 0 : width
  }, [width, isCollapsed, handleDoubleTap])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (doubleTapTimeout.current) {
        clearTimeout(doubleTapTimeout.current)
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return
    const touch = e.touches[0]
    const deltaX = dragStartX.current - touch.clientX
    const deltaY = Math.abs(touch.clientY - touchStartY.current)
    const isTabletOrMobile = typeof window !== 'undefined' && window.innerWidth < 1024

    // Only start dragging if horizontal movement is greater than vertical (swipe gesture)
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY) {
      setIsTouchDragging(true)
      e.preventDefault() // Prevent scrolling

      let newWidth = dragStartWidth.current + deltaX

      // If starting from collapsed state, expand if swiping left
      // Lower threshold on tablet for easier opening
      const expandThreshold = isTabletOrMobile ? 20 : 30
      if (isCollapsed && deltaX > expandThreshold) {
        setIsCollapsed(false)
        newWidth = Math.max(minWidth, deltaX + collapseThreshold)
      }

      // Clamp width
      newWidth = Math.max(0, Math.min(maxWidth, newWidth))

      // Check if should collapse
      // On tablet/mobile, use a lower threshold for easier closing
      const collapseThresh = isTabletOrMobile ? 150 : collapseThreshold
      if (newWidth < collapseThresh && !isCollapsed) {
        setIsCollapsed(true)
        setLastOpenWidth(width > collapseThreshold ? width : lastOpenWidth)
      } else if (newWidth >= collapseThresh) {
        setIsCollapsed(false)
        setWidth(Math.max(minWidth, newWidth))
      }
    }
  }, [isCollapsed, width, lastOpenWidth, minWidth, maxWidth, collapseThreshold])

  const handleTouchEnd = useCallback(() => {
    setIsTouchDragging(false)
  }, [])

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Add global touch event listeners for touch dragging
  useEffect(() => {
    if (isTouchDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      return () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isTouchDragging, handleTouchMove, handleTouchEnd])

  // Handle double-click to toggle collapse
  const handleDoubleClick = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false)
      setWidth(lastOpenWidth)
    } else {
      setLastOpenWidth(width)
      setIsCollapsed(true)
    }
  }, [isCollapsed, width, lastOpenWidth])

  // Toggle open from collapsed state
  const handleExpandClick = useCallback(() => {
    setIsCollapsed(false)
    setWidth(lastOpenWidth)
  }, [lastOpenWidth])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (isCollapsed) {
        setIsCollapsed(false)
        setWidth(lastOpenWidth)
      } else {
        setLastOpenWidth(width)
        setIsCollapsed(true)
      }
    },
    open: () => {
      setIsCollapsed(false)
      setWidth(lastOpenWidth)
    },
    close: () => {
      setLastOpenWidth(width)
      setIsCollapsed(true)
      onClose?.()
    },
    isCollapsed,
    panelElement: panelRef,
  }), [isCollapsed, width, lastOpenWidth, onClose])

  const handleClose = useCallback(() => {
    setLastOpenWidth(width)
    setIsCollapsed(true)
    onClose?.()
  }, [width, onClose])

  return (
    <>
      {/* Mobile/Tablet Backdrop - Only show when panel is open on mobile/tablet */}
      {!panelCollapsed && (
        <div
          className={`
            lg:hidden fixed inset-0 backdrop-blur-sm z-[calc(var(--z-panel)-1)]
            transition-opacity duration-200
            ${contentVisible ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ backgroundColor: 'var(--color-backdrop)' }}
          onClick={handleClose}
          onTouchStart={(e) => {
            // Close on backdrop tap
            if (e.target === e.currentTarget) {
              handleClose()
            }
          }}
        />
      )}
      <div className="flex h-full relative">
        {/* Drag Handle - Hidden on mobile, supports touch on tablet */}
        <div
          ref={handleRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          className={`
            group relative flex-shrink-0 w-4 cursor-col-resize
            hidden lg:flex items-center justify-center
            transition-all duration-200 rounded-lg mx-1
            touch-manipulation
            ${isDragging || isTouchDragging
              ? 'bg-[var(--color-primary)]/30'
              : 'bg-[var(--color-surface-subtle)] hover:bg-[var(--color-primary)]/20'
            }
          `}
          title={isCollapsed ? 'Drag or swipe left to expand panel' : 'Drag to resize, double-click to collapse'}
        >
          {/* Handle visual indicator - vertical bar */}
          <div
            className={`
            absolute inset-y-4 left-1/2 -translate-x-1/2 w-1
            rounded-full transition-all duration-200
            ${isDragging
                ? 'bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]'
                : 'bg-[var(--color-border)] group-hover:bg-[var(--color-primary)]'
              }
          `}
          />

          {/* Toggle Button - Surreptitious, only visible on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent drag start
              if (isCollapsed) {
                setIsCollapsed(false)
                setWidth(lastOpenWidth)
              } else {
                setLastOpenWidth(width)
                setIsCollapsed(true)
              }
            }}
            className={`
            absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 
            w-6 h-12 rounded-full cursor-pointer
            bg-[var(--color-surface)] border border-[var(--color-border-subtle)]
            shadow-md z-20
            flex items-center justify-center
            text-[var(--color-text-muted)] hover:text-[var(--color-primary)]
            hover:border-[var(--color-primary)]
            transition-all duration-200
            opacity-0 group-hover:opacity-100
             -ml-[1px]
          `}
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Grip dots - Visually subdued when button appears */}
          <div
            className={`
            flex flex-col items-center justify-center gap-1
            transition-all duration-300 z-10
            group-hover:opacity-0
            ${isCollapsed ? 'opacity-100' : 'opacity-60'}
          `}
          >
            <div className={`
            flex flex-col gap-1 py-3 px-1 rounded-md
            ${isDragging
                ? 'bg-[var(--color-primary)]/30'
                : isCollapsed
                  ? 'bg-[var(--color-primary)]/20'
                  : 'bg-transparent'
              }
          `}>
              <div className={`w-1 h-3 rounded-full transition-colors ${isDragging
                ? 'bg-[var(--color-primary)]'
                : isCollapsed
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-text-muted)]'
                }`} />
              <div className={`w-1 h-3 rounded-full transition-colors ${isDragging
                ? 'bg-[var(--color-primary)]'
                : isCollapsed
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-text-muted)]'
                }`} />
            </div>
          </div>
        </div>

        {/* Panel Content */}
        <div
          ref={panelRef}
          style={{
            width: panelCollapsed ? 0 : width,
            minWidth: panelCollapsed ? 0 : minWidth,
            maxWidth: maxWidth,
          }}
          className={`
          relative overflow-hidden flex-shrink-0
          ${hasHydrated ? 'transition-all duration-300 ease-out' : ''}
          ${isDragging ? 'transition-none' : ''}
          ${panelCollapsed ? 'pointer-events-none' : ''}
          ${className}
        `}
        >
          <div
            className={`
            w-full h-full bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl
            border border-[var(--color-border-subtle)]
            shadow-[var(--shadow-strong)] overflow-hidden
            ${hasHydrated ? 'transition-transform duration-300' : ''}
            ${panelCollapsed ? 'translate-x-full' : 'translate-x-0'}
            flex flex-col
            lg:relative
            ${!panelCollapsed ? 'fixed lg:relative right-0 top-0 bottom-0 z-[var(--z-panel)]' : ''}
          `}
            style={{
              width: panelCollapsed ? undefined : (isMobile ? '100%' : undefined),
              maxWidth: isMobile ? '100%' : undefined,
            }}
          >
            {/* Close button - visible on mobile/tablet */}
            {!panelCollapsed && (
              <div className={`
                lg:hidden flex items-center justify-between p-3 md:p-4 border-b border-[var(--color-border-subtle)] flex-shrink-0
                transition-opacity duration-150
                ${contentVisible ? 'opacity-100' : 'opacity-0'}
              `}>
                <span className="text-sm md:text-base font-semibold text-[var(--color-text)]">Details</span>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] touch-manipulation"
                  title="Close panel"
                >
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
            )}
            {/* Content wrapper with staggered fade animation */}
            <div className={`
              flex-1 overflow-auto
              transition-opacity duration-150
              ${contentVisible ? 'opacity-100' : 'opacity-0'}
            `}>
              {children}
            </div>
          </div>
        </div>

        {/* Collapsed state expand button overlay - Touch-friendly on mobile/tablet */}
        {isCollapsed && (
          <button
            onClick={handleExpandClick}
            onTouchStart={handleTouchStart}
            className="
            absolute right-0 top-1/2 -translate-y-1/2
            w-10 md:w-8 h-40 md:h-32 rounded-l-lg
            bg-[var(--color-surface)] border border-r-0 border-[var(--color-border-subtle)]
            shadow-[var(--shadow-soft)]
            flex items-center justify-center
            hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)]/50
            active:bg-[var(--color-primary)]/20 active:border-[var(--color-primary)]
            transition-all duration-200
            group touch-manipulation
            lg:hidden
            z-[var(--z-panel)]
          "
            title="Tap, double-tap, or swipe left to expand panel"
          >
            <div className="flex flex-col gap-1.5 md:gap-2">
              <div className="w-1 md:w-0.5 h-5 md:h-4 rounded-full bg-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)] group-active:bg-[var(--color-primary)] transition-colors" />
              <div className="w-1 md:w-0.5 h-5 md:h-4 rounded-full bg-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)] group-active:bg-[var(--color-primary)] transition-colors" />
            </div>
            {/* Touch hint text on mobile/tablet */}
            <span className="absolute left-full ml-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap hidden sm:block lg:hidden">
              Tap to open
            </span>
          </button>
        )}

        {/* Double-tap area on mobile/tablet when collapsed - invisible overlay on right edge */}
        {isCollapsed && (
          <div
            onTouchStart={handleTouchStart}
            onClick={handleExpandClick}
            className="
            lg:hidden fixed right-0 top-0 bottom-0 w-24
            touch-manipulation z-[calc(var(--z-panel)-1)]
            cursor-pointer
          "
            title="Tap or double-tap to open panel"
          />
        )}

        {/* Touch drag handle overlay - Visible on touch devices when panel is open */}
        {!isCollapsed && (
          <div
            onTouchStart={handleTouchStart}
            className="
            lg:hidden absolute left-0 top-0 bottom-0 w-10 -ml-10
            flex items-center justify-center
            touch-manipulation z-10
          "
          >
            <div className="w-2 h-24 rounded-r-lg bg-[var(--color-surface-subtle)] border border-l-0 border-[var(--color-border-subtle)] flex items-center justify-center opacity-60">
              <div className="flex flex-col gap-1.5">
                <div className="w-0.5 h-3 rounded-full bg-[var(--color-text-muted)]" />
                <div className="w-0.5 h-3 rounded-full bg-[var(--color-text-muted)]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
})

ResizablePanel.displayName = 'ResizablePanel'

