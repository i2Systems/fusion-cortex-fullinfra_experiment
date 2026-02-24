/**
 * Main Navigation Component
 * 
 * Left-side persistent navigation with minimal icons.
 * Clean, modern, lots of space for main content.
 * 
 * AI Note: Navigation items are defined here. To add new sections,
 * update the navItems array and ensure corresponding routes exist.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home,
  Map,
  Layers,
  Network,
  Settings,
  Search,
  AlertTriangle,
  User,
  Workflow,
  HelpCircle,
  Menu,
  X,
  Download,
  Users,
  Boxes,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRole } from '@/lib/auth'
import { LoginModal } from '@/components/auth/LoginModal'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { AppSwitcher } from '@/components/layout/AppSwitcher'

const NAV_STORAGE_KEY = 'fusion-nav-expanded'
const NAV_WIDTH_COLLAPSED = 80   // px — icons only
const NAV_WIDTH_EXPANDED = 240  // px — icons + labels
const ICON_SIZE_COLLAPSED = 20
const ICON_SIZE_EXPANDED = 22
const MOTION_DURATION_MS = 280

// Navigation groups with subtle gestalt grouping with subtle gestalt grouping
const navGroups = [
  // Group 1: Overview
  [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
  ],
  // Group 2: Mapping & Organization
  [
    { href: '/lookup', label: 'Device Lookup', icon: Search },
    { href: '/map', label: 'Locations & Devices', icon: Map },
    { href: '/zones', label: 'Zones', icon: Layers },
    { href: '/groups', label: 'Groups', icon: Boxes },
  ],
  // Group 3: Configuration & Management
  [
    { href: '/people', label: 'People', icon: Users },
    { href: '/bacnet', label: 'BACnet Mapping', icon: Network },
    { href: '/rules', label: 'Rules & Overrides', icon: Workflow },
    { href: '/firmware', label: 'Firmware Updates', icon: Download },
    { href: '/faults', label: 'Faults / Health', icon: AlertTriangle },
  ],
]

export function MainNav() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const { role } = useRole()
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Left nav open/closed (desktop): persist in localStorage
  const [navExpanded, setNavExpanded] = useState(true)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_STORAGE_KEY)
      if (raw !== null) setNavExpanded(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(navExpanded))
    } catch {
      /* ignore */
    }
  }, [navExpanded])

  // Sync nav width to CSS variable so fixed elements (e.g. BottomDrawer) align with panel
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty(
      '--fusion-nav-width',
      navExpanded ? `${NAV_WIDTH_EXPANDED}px` : `${NAV_WIDTH_COLLAPSED}px`
    )
  }, [navExpanded])

  // Filter nav items based on role
  const filterNavItems = (items: typeof navGroups[0]) => {
    return items.filter(item => {
      // Technician cannot see BACnet Mapping, Rules & Overrides, and Firmware Updates
      if (role === 'Technician') {
        return item.href !== '/bacnet' && item.href !== '/rules' && item.href !== '/firmware'
      }
      return true
    })
  }

  const visibleNavGroups = navGroups.map(group => filterNavItems(group)).filter(group => group.length > 0)

  const motionClass = `transition-all ease-out`
  const motionStyle = { transitionDuration: `${MOTION_DURATION_MS}ms` }

  const NavContent = ({ expanded, setExpanded }: { expanded: boolean; setExpanded: (fn: (e: boolean) => boolean) => void }) => (
    <>
      {/* App Switcher at top */}
      <div className="hidden md:flex shrink-0 items-center py-3 px-3 border-b border-[var(--color-border-subtle)]">
        <AppSwitcher compact={!expanded} />
      </div>

      {/* Navigation Items with Gestalt Grouping - scrollable when viewport is short (e.g. iPad) */}
      <div className="flex-1 min-h-0 flex flex-col py-4 overflow-y-auto overflow-x-hidden">
        {visibleNavGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={`flex flex-col gap-1 ${expanded ? 'items-stretch px-3' : 'items-center'}`}
          >
            {group.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center rounded-lg min-h-[44px]
                    ${expanded ? 'gap-3 px-3' : 'justify-center w-12 h-11'}
                    ${motionClass}
                    ${isActive
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)]'
                    }
                  `}
                  style={motionStyle}
                  title={item.label}
                >
                  <Icon
                    size={expanded ? ICON_SIZE_EXPANDED : ICON_SIZE_COLLAPSED}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="shrink-0"
                    style={motionStyle}
                  />
                  <span
                    className={`
                      text-sm font-medium truncate whitespace-nowrap
                      ${expanded ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0 overflow-hidden'}
                    `}
                    style={{ ...motionStyle, transitionProperty: 'opacity, max-width' }}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
            {groupIndex < visibleNavGroups.length - 1 && (
              <div
                className={`h-px bg-[var(--color-border-subtle)] my-1 opacity-30 ${expanded ? 'mx-2' : 'w-8 mx-auto'}`}
                style={motionStyle}
              />
            )}
          </div>
        ))}
      </div>

      {/* Bottom: Library, Profile, Settings, then open/close - shrink-0 so never pushed off */}
      <div
        className={`shrink-0 flex border-t border-[var(--color-border-subtle)] ${expanded ? 'flex-col gap-1 p-3' : 'flex-col items-center gap-2 p-4'}`}
        style={motionStyle}
      >
        <Link
          href="/library"
          onClick={() => setMobileMenuOpen(false)}
          className={`
            flex items-center rounded-lg min-h-[44px]
            ${expanded ? 'gap-3 px-3' : 'justify-center w-12 h-11'}
            ${motionClass}
            ${pathname === '/library' || pathname?.startsWith('/library')
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)]'
            }
          `}
          style={motionStyle}
          title="Library"
        >
          <HelpCircle
            size={expanded ? ICON_SIZE_EXPANDED : ICON_SIZE_COLLAPSED}
            strokeWidth={pathname === '/library' || pathname?.startsWith('/library') ? 2.5 : 2}
            className="shrink-0"
            style={motionStyle}
          />
          <span
            className={`text-sm font-medium truncate whitespace-nowrap ${expanded ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0 overflow-hidden'}`}
            style={{ ...motionStyle, transitionProperty: 'opacity, max-width' }}
          >
            Library
          </span>
        </Link>

        <div className={`h-px bg-[var(--color-border-subtle)] opacity-30 ${expanded ? 'mx-2' : 'w-8'}`} style={motionStyle} />

        <button
          onClick={() => {
            setMobileMenuOpen(false)
            isAuthenticated ? setShowSettings(true) : setShowLogin(true)
          }}
          className={`
            flex items-center rounded-lg min-h-[44px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]
            ${expanded ? 'gap-3 px-3 w-full' : 'justify-center w-12 h-11'}
            ${motionClass}
          `}
          style={motionStyle}
          title={isAuthenticated ? user?.name || 'Profile' : 'Sign In'}
        >
          {isAuthenticated && user ? (
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span className="text-[var(--color-text-on-primary)] text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <User size={expanded ? ICON_SIZE_EXPANDED : ICON_SIZE_COLLAPSED} className="shrink-0" style={motionStyle} />
          )}
          <span
            className={`text-sm font-medium truncate whitespace-nowrap ${expanded ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0 overflow-hidden'}`}
            style={{ ...motionStyle, transitionProperty: 'opacity, max-width' }}
          >
            {isAuthenticated ? user?.name ?? 'Profile' : 'Sign In'}
          </span>
        </button>

        <button
          onClick={() => {
            setMobileMenuOpen(false)
            setShowSettings(true)
          }}
          className={`
            flex items-center rounded-lg min-h-[44px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]
            ${expanded ? 'gap-3 px-3 w-full' : 'justify-center w-12 h-11'}
            ${motionClass}
          `}
          style={motionStyle}
          title="Settings"
        >
          <Settings size={expanded ? ICON_SIZE_EXPANDED : ICON_SIZE_COLLAPSED} className="shrink-0" style={motionStyle} />
          <span
            className={`text-sm font-medium truncate whitespace-nowrap ${expanded ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0 overflow-hidden'}`}
            style={{ ...motionStyle, transitionProperty: 'opacity, max-width' }}
          >
            Settings
          </span>
        </button>

        {/* Open/close at bottom (desktop only) */}
        <div className={`h-px bg-[var(--color-border-subtle)] opacity-30 ${expanded ? 'mx-2' : 'w-8 mx-auto'}`} style={motionStyle} />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`
            flex items-center rounded-lg min-h-[44px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)]
            ${expanded ? 'gap-3 px-3 w-full' : 'justify-center w-12 h-11'}
            ${motionClass}
          `}
          style={motionStyle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          <span
            className={`text-sm font-medium truncate whitespace-nowrap ${expanded ? 'opacity-100 max-w-[10rem]' : 'opacity-0 max-w-0 overflow-hidden'}`}
            style={{ ...motionStyle, transitionProperty: 'opacity, max-width' }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Navigation - Collapsible; min-h-0 so flex-1 middle scrolls and bottom (open/close) stays visible on iPad */}
      <nav
        className="hidden md:flex flex-col shrink-0 min-h-0 h-full max-h-[100dvh] bg-[var(--color-bg-elevated)] backdrop-blur-xl border-r border-[var(--color-border-subtle)] overflow-hidden"
        style={{
          zIndex: 'var(--z-nav)',
          width: navExpanded ? NAV_WIDTH_EXPANDED : NAV_WIDTH_COLLAPSED,
          transition: `width ${MOTION_DURATION_MS}ms ease-out`,
        }}
      >
        <NavContent expanded={navExpanded} setExpanded={setNavExpanded} />
      </nav>

      {/* Mobile Hamburger Button - Visible on mobile */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-[var(--z-nav)] w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-all shadow-[var(--shadow-soft)]"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay - Always expanded when open so labels are visible */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 backdrop-blur-sm z-[calc(var(--z-nav)-1)]"
            style={{ backgroundColor: 'var(--color-backdrop)' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="md:hidden flex flex-col fixed top-0 left-0 h-full max-h-screen bg-[var(--color-bg-elevated)] backdrop-blur-xl border-r border-[var(--color-border-subtle)] z-[var(--z-nav)] overflow-hidden"
            style={{ width: NAV_WIDTH_EXPANDED }}
          >
            <NavContent expanded={true} setExpanded={setNavExpanded} />
          </nav>
        </>
      )}

      {/* Modals */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

