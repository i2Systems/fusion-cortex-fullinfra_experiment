/**
 * App Switcher — style controlled by Settings (Appearance → App menu style):
 * - dropdown: click to open menu
 * - tabs: icon per app with hover tooltip
 * - inline: icon + label always visible, no menu
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Map, Package, Monitor, MoreHorizontal } from 'lucide-react'
import { useAppearance } from '@/lib/AppearanceContext'
import { useRole } from '@/lib/auth'

const RECENT_STORAGE_KEY = 'fusion_app_switcher_recent'
const PRIMARY_APP_ID = 'commissioning' // main product; others are "other apps"

export interface AppSwitcherProps {
  /** When true, show only icons (e.g. when sidebar is collapsed). */
  compact?: boolean
}

const APPS = [
  {
    id: 'commissioning',
    label: 'Commissioning',
    href: '/dashboard',
    icon: Map,
    description: 'Locations, zones, rules, BACnet',
  },
  {
    id: 'products',
    label: 'Products',
    href: '/filler/products',
    icon: Package,
    description: 'Product grid & catalog',
  },
  {
    id: 'sign',
    label: 'izOS Sign',
    href: '/sign',
    icon: Monitor,
    description: 'TV displays, playlists, deployments',
  },
] as const

function getCurrentApp(pathname: string | null): string {
  if (!pathname) return 'commissioning'
  if (pathname.startsWith('/sign')) return 'sign'
  if (pathname.startsWith('/filler')) return 'products'
  return 'commissioning'
}

const DROPDOWN_Z = 100000

export function AppSwitcher({ compact = false }: AppSwitcherProps) {
  const pathname = usePathname()
  const { appSwitcherStyle } = useAppearance()
  const { role } = useRole()
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentApp = getCurrentApp(pathname)
  const current = APPS.find((a) => a.id === currentApp)

  // Role-based list: only when app menu style is "role". Technician sees Commissioning + Sign (no Products).
  const appsByRole = role === 'Technician'
    ? APPS.filter((a) => a.id !== 'products')
    : APPS
  const appList = appSwitcherStyle === 'role' ? appsByRole : APPS

  // Recent: persist last-visited app for "recent first" ordering
  useEffect(() => {
    if (typeof window === 'undefined' || !currentApp) return
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, currentApp)
    } catch {
      /* ignore */
    }
  }, [currentApp])

  const [lastUsedAppId, setLastUsedAppId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const v = localStorage.getItem(RECENT_STORAGE_KEY)
      setLastUsedAppId(v && APPS.some((a) => a.id === v) ? v : null)
    } catch {
      setLastUsedAppId(null)
    }
  }, [currentApp])
  const recentFirstApps = lastUsedAppId
    ? [...appList].sort((a, b) => (a.id === lastUsedAppId ? -1 : b.id === lastUsedAppId ? 1 : 0))
    : appList

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      zIndex: DROPDOWN_Z,
    })
  }, [open])

  // Tabs: icon per app with hover tooltip
  if (appSwitcherStyle === 'tabs') {
    return (
      <div className="relative flex-1 min-w-0 flex flex-col gap-1.5" ref={ref}>
        {!compact && (
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)] px-1">
            Apps
          </span>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          {appList.map((app) => {
            const Icon = app.icon
            const isActive = currentApp === app.id
            return (
              <Link
                key={app.id}
                href={app.href}
                title={`${app.label} — ${app.description}`}
                className={`flex shrink-0 items-center justify-center rounded-md transition-colors ${
                  compact ? 'w-9 h-9' : 'w-9 h-9'
                } ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                }`}
                aria-label={app.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={2} />
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Inline: icon + label (when expanded), no dropdown
  if (appSwitcherStyle === 'inline') {
    return (
      <div className="relative flex-1 min-w-0 flex flex-col gap-1.5" ref={ref}>
        {!compact && (
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)] px-1">
            Apps
          </span>
        )}
        <div className={`flex flex-col gap-0.5 ${compact ? 'items-center' : ''}`}>
          {appList.map((app) => {
            const Icon = app.icon
            const isActive = currentApp === app.id
            return (
              <Link
                key={app.id}
                href={app.href}
                title={`${app.label} — ${app.description}`}
                className={`flex items-center rounded-md transition-colors ${
                  compact ? 'justify-center w-9 h-9' : 'gap-2 px-3 py-2 min-w-0'
                } ${
                  isActive
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                }`}
                aria-label={app.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                {!compact && (
                  <span className="text-sm font-medium truncate min-w-0">{app.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Primary + overflow: one main app prominent; others under "Other apps". Use case: main product vs satellite tools.
  if (appSwitcherStyle === 'primary') {
    const primaryApp = appList.find((a) => a.id === PRIMARY_APP_ID) ?? appList[0]
    const otherApps = appList.filter((a) => a.id !== primaryApp.id)
    const isOnPrimary = currentApp === primaryApp.id
    return (
      <div className="relative flex-1 min-w-0 flex flex-col gap-1.5" ref={ref}>
        {!compact && (
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)] px-1">
            Apps
          </span>
        )}
        <div className="flex flex-col gap-1">
          <Link
            href={primaryApp.href}
            title={primaryApp.description}
            className={`flex items-center rounded-md transition-colors ${
              compact ? 'justify-center p-2' : 'gap-2 px-3 py-2 min-w-0'
            } ${
              isOnPrimary
                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
            }`}
            aria-current={isOnPrimary ? 'page' : undefined}
          >
            <primaryApp.icon size={18} strokeWidth={2} className="shrink-0" />
            {!compact && <span className="text-sm font-medium truncate">{primaryApp.label}</span>}
          </Link>
          {otherApps.length > 0 && (
            <div className="relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex w-full items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] transition-colors ${
                  compact ? 'justify-center p-2' : 'gap-2 px-3 py-2'
                }`}
                aria-label="Other apps"
                aria-expanded={open}
              >
                <MoreHorizontal size={18} className="shrink-0" />
                {!compact && <span className="text-sm font-medium truncate">Other apps</span>}
              </button>
              {open &&
                typeof document !== 'undefined' &&
                createPortal(
                  <>
                    <div className="fixed inset-0" style={{ zIndex: DROPDOWN_Z - 1 }} aria-hidden onClick={() => setOpen(false)} />
                    <div
                      className="fixed w-64 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-strong)] overflow-hidden py-2"
                      style={{ ...dropdownStyle, width: 256 }}
                      role="menu"
                    >
                      {otherApps.map((app) => {
                        const Icon = app.icon
                        const isActive = currentApp === app.id
                        return (
                          <Link
                            key={app.id}
                            href={app.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-subtle)] ${
                              isActive ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                            }`}
                            role="menuitem"
                          >
                            <Icon size={18} strokeWidth={2} />
                            <span className="text-sm font-medium truncate">{app.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </>,
                  document.body
                )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Recent first: last-used app at top for faster switching. Use case: repeat workflows, muscle memory.
  if (appSwitcherStyle === 'recent') {
    return (
      <div className="relative flex-1 min-w-0 flex" ref={ref}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center w-full min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text)] transition-colors ${
            compact ? 'p-2 justify-center' : 'gap-2 px-3 py-2'
          }`}
          aria-label="Switch application"
          aria-expanded={open}
        >
          <LayoutGrid size={18} className="text-[var(--color-text-muted)] shrink-0" />
          {!compact && (
            <span className="text-sm font-medium truncate min-w-0">
              {current?.label ?? 'App'}
            </span>
          )}
        </button>
        {open &&
          typeof document !== 'undefined' &&
          createPortal(
            <>
              <div className="fixed inset-0" style={{ zIndex: DROPDOWN_Z - 1 }} aria-hidden onClick={() => setOpen(false)} />
              <div
                className="fixed w-72 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-strong)] overflow-hidden z-[9999]"
                style={dropdownStyle}
                role="menu"
              >
                <div className="px-4 pt-3 pb-2 border-b border-[var(--color-border-subtle)]">
                  <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)]">
                    Switch app {lastUsedAppId && lastUsedAppId !== currentApp ? '· Recent first' : ''}
                  </span>
                </div>
                <div className="px-2 py-2 flex flex-col gap-0.5">
                  {recentFirstApps.map((app) => {
                    const Icon = app.icon
                    const isActive = currentApp === app.id
                    const isRecent = app.id === lastUsedAppId
                    return (
                      <Link
                        key={app.id}
                        href={app.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          isActive ? 'bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/40' : 'border border-transparent hover:bg-[var(--color-surface-subtle)]'
                        }`}
                        role="menuitem"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-elevated)]/80 text-[var(--color-text-muted)]'
                          }`}
                        >
                          <Icon size={18} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                              {app.label}
                            </span>
                            {isRecent && !isActive && (
                              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-soft)] shrink-0">Recent</span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--color-text-soft)] truncate">{app.description}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </>,
            document.body
          )}
      </div>
    )
  }

  // Role-based: show only apps for current role (e.g. Technician skips Products). Use case: compliance, task-focused UI.
  if (appSwitcherStyle === 'role') {
    return (
      <div className="relative flex-1 min-w-0 flex flex-col gap-1.5" ref={ref}>
        {!compact && (
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)] px-1">
            Apps
          </span>
        )}
        <div className={`flex flex-col gap-0.5 ${compact ? 'items-center' : ''}`}>
          {appList.map((app) => {
            const Icon = app.icon
            const isActive = currentApp === app.id
            return (
              <Link
                key={app.id}
                href={app.href}
                title={`${app.label} — ${app.description}`}
                className={`flex items-center rounded-md transition-colors ${
                  compact ? 'justify-center w-9 h-9' : 'gap-2 px-3 py-2 min-w-0'
                } ${
                  isActive
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                }`}
                aria-label={app.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                {!compact && <span className="text-sm font-medium truncate min-w-0">{app.label}</span>}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Dropdown: click to open menu
  return (
    <div className="relative flex-1 min-w-0 flex" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center w-full min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text)] transition-colors ${
          compact ? 'p-2 justify-center' : 'gap-2 px-3 py-2'
        }`}
        aria-label="Switch application"
        aria-expanded={open}
      >
        <LayoutGrid size={18} className="text-[var(--color-text-muted)] shrink-0" />
        {!compact && (
          <span className="text-sm font-medium truncate min-w-0">
            {current?.label ?? 'App'}
          </span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: DROPDOWN_Z - 1 }}
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed w-72 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-strong)] overflow-hidden"
              style={dropdownStyle}
              role="menu"
            >
            <div className="px-4 pt-3 pb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-soft)]">
                Switch app
              </span>
            </div>
            <div className="px-2 pb-3 flex flex-col gap-0.5">
              {appList.map((app) => {
                const Icon = app.icon
                const isActive = currentApp === app.id
                return (
                  <Link
                    key={app.id}
                    href={app.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${
                      isActive
                        ? 'bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/40'
                        : 'border border-transparent hover:bg-[var(--color-surface-subtle)]'
                    }`}
                    role="menuitem"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                          : 'bg-[var(--color-bg-elevated)]/80 text-[var(--color-text-muted)]'
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div
                        className={`text-sm font-medium truncate ${
                          isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                        }`}
                      >
                        {app.label}
                      </div>
                      <div className="text-xs text-[var(--color-text-soft)] truncate mt-0.5">
                        {app.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  )
}
