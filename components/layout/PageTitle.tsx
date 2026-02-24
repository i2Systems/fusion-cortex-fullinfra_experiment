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
import { usePathname, useRouter } from 'next/navigation'
import { useRole } from '@/lib/auth'
import { useSite } from '@/lib/hooks/useSite'
import { useNotifications } from '@/lib/NotificationContext'
import { useDashboardViewStore } from '@/lib/stores/dashboardViewStore'
import { ChevronDown, Bell, Loader2, LayoutGrid, Map } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { FullscreenToggle } from '@/components/layout/FullscreenToggle'

// Keyframes for text shimmer effect
const shimmerKeyframes = `
@keyframes textShimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}
`

const pageTitles: Record<string, { primary: string; secondary?: string }> = {
  '/dashboard': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/map': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/zones': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/bacnet': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/rules': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/lookup': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/faults': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/library': { primary: 'Fusion', secondary: 'i2 Cloud' },
}

export function PageTitle() {
  const pathname = usePathname()
  const router = useRouter()
  const { role } = useRole()
  const { sites, activeSite, setActiveSite, activeSiteId } = useSite()
  const { unreadCount } = useNotifications()
  const title = pageTitles[pathname || '/dashboard'] || { primary: 'Fusion', secondary: 'i2 Cloud' }
  const isDashboard = pathname === '/dashboard'
  const { viewMode: dashboardViewMode, setViewMode: setDashboardViewMode } = useDashboardViewStore()
  const [showSiteDropdown, setShowSiteDropdown] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (showSiteDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
      })
    }
  }, [showSiteDropdown])

  return (
    <>
      {/* Inject shimmer keyframes */}
      <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
      <div className="relative" style={{ background: 'transparent', zIndex: 1 }}>
        <div className="flex items-center justify-between px-4 sm:pl-16 md:pl-6 md:pr-6 lg:pl-8 lg:pr-8 pt-4 md:pt-6 pb-2">
          {/* Left: Title */}
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-none min-w-0 flex-1">
            <span className="text-sm md:text-base font-semibold text-[var(--color-text-muted)] opacity-60 truncate">
              {title.primary}
            </span>
            {title.secondary && (
              <>
                <span className="text-xs text-[var(--color-text-muted)] opacity-40 hidden sm:inline">/</span>
                <span className="text-xs md:text-sm font-medium text-[var(--color-text-muted)] opacity-60 hidden sm:inline truncate">
                  {title.secondary}
                </span>
              </>
            )}
            <span className="text-xs text-[var(--color-text-muted)] opacity-40 hidden md:inline">/</span>
            <span className="text-xs md:text-sm font-medium text-[var(--color-text-muted)] opacity-60 hidden md:inline truncate">
              {role}
            </span>
            {/* Dashboard view toggle - icons next to breadcrumbs */}
            {isDashboard && (
              <div className="flex items-center gap-1 ml-2 md:ml-3 pointer-events-auto">
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                  <button
                    onClick={() => setDashboardViewMode('map')}
                    className={`p-1.5 rounded-md transition-all ${dashboardViewMode === 'map'
                      ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[var(--shadow-glow-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                      }`}
                    title="Map View"
                  >
                    <Map size={16} />
                  </button>
                  <button
                    onClick={() => setDashboardViewMode('cards')}
                    className={`p-1.5 rounded-md transition-all ${dashboardViewMode === 'cards'
                      ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[var(--shadow-glow-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                      }`}
                    title="Cards View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Fullscreen (iPad) + Theme + Notifications + Site Selector */}
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto flex-shrink-0">
            <FullscreenToggle />
            <ThemeToggle />
            {/* Notifications icon */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <>
                  {/* Dot indicator */}
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  {/* Counter badge */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs flex items-center justify-center font-semibold shadow-[var(--shadow-glow-primary)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
            </button>

            {/* Site Selector */}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                disabled={!!switchingSiteId}
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors border border-[var(--color-border-subtle)] disabled:opacity-50 disabled:cursor-wait"
              >
                {switchingSiteId ? (
                  <>
                    <Loader2 size={14} className="animate-spin flex-shrink-0 text-[var(--color-primary)]" />
                    <span
                      className="text-xs md:text-sm font-medium whitespace-nowrap max-w-[120px] sm:max-w-[180px] truncate"
                      style={{
                        background: 'linear-gradient(90deg, var(--color-text-muted) 0%, var(--color-primary) 50%, var(--color-text-muted) 100%)',
                        backgroundSize: '200% 100%',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        animation: 'textShimmer 1.5s infinite ease-in-out',
                      }}
                    >
                      Switching...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs md:text-sm font-medium text-[var(--color-text)] whitespace-nowrap max-w-[120px] sm:max-w-[180px] truncate">
                      {activeSite?.name || 'Select Site'}
                    </span>
                    <ChevronDown size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  </>
                )}
              </button>

              {/* Dropdown Menu - Portal to body to escape all stacking contexts */}
              {showSiteDropdown && mounted && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setShowSiteDropdown(false)}
                  />
                  <div
                    className="fixed w-64 bg-[var(--color-surface)] backdrop-blur-xl rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-[9999]"
                    style={dropdownStyle}
                  >
                    {sites.map((site) => (
                      <button
                        key={site.id}
                        onClick={() => {
                          // Only switch if it's a different site
                          if (site.id !== activeSiteId) {
                            setSwitchingSiteId(site.id)
                            setActiveSite(site.id)
                            setShowSiteDropdown(false)
                            // Clear switching state after a brief delay
                            setTimeout(() => setSwitchingSiteId(null), 500)
                          } else {
                            setShowSiteDropdown(false)
                          }
                        }}
                        disabled={switchingSiteId === site.id}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${activeSite?.id === site.id
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                          } ${switchingSiteId === site.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {switchingSiteId === site.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin flex-shrink-0" />
                            <span
                              style={{
                                background: 'linear-gradient(90deg, var(--color-text-muted) 0%, var(--color-primary) 50%, var(--color-text-muted) 100%)',
                                backgroundSize: '200% 100%',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'textShimmer 1.5s infinite ease-in-out',
                              }}
                            >
                              Switching...
                            </span>
                          </>
                        ) : (
                          site.name
                        )}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

