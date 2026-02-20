/**
 * Filler app shell: sidebar + header + content.
 * Matches the Product Grid UI from the reference (sidebar nav, top bar with breadcrumbs).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, LayoutGrid, BarChart3, ShoppingCart, Users, FileText, PanelLeftClose, PanelLeft, HelpCircle, User, Settings, Bell } from 'lucide-react'
import { AppSwitcher } from '@/components/layout/AppSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useNotifications } from '@/lib/NotificationContext'
import { useAuth } from '@/lib/auth'
import { LoginModal } from '@/components/auth/LoginModal'
import { SettingsModal } from '@/components/settings/SettingsModal'

const SIDEBAR_WIDTH_EXPANDED = 240
const SIDEBAR_WIDTH_COLLAPSED = 80

const NAV_ITEMS = [
  { href: '/filler/products', label: 'Products', icon: LayoutGrid },
  { href: '/filler/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/filler/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/filler/customers', label: 'Customers', icon: Users },
  { href: '/filler/reports', label: 'Reports', icon: FileText },
]

export function FillerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useNotifications()
  const { user, isAuthenticated } = useAuth()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside
        className="flex shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] transition-[width] duration-200 ease-out overflow-hidden"
        style={{ zIndex: 'var(--z-nav)', width: sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
      >
        {/* App Switcher at top */}
        <div className="flex shrink-0 items-center py-3 px-3 border-b border-[var(--color-border-subtle)]">
          <AppSwitcher compact={!sidebarExpanded} />
        </div>
        {sidebarExpanded && (
          <>
            <div className="flex h-14 shrink-0 items-center px-4 border-b border-[var(--color-border-subtle)]">
              <span className="text-lg font-semibold text-[var(--color-text)]">i20S</span>
            </div>
            <div className="p-3 border-b border-[var(--color-border-subtle)]">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </>
        )}
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                  sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
                } ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                }`}
                title={item.label}
              >
                <Icon size={20} strokeWidth={2} />
                {sidebarExpanded && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: Library, Profile, Settings (match Commissioning nav) */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] flex flex-col gap-1 p-3">
          <Link
            href="/library"
            className={`flex items-center rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-colors ${sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}`}
            title="Library / Help"
          >
            <HelpCircle size={20} strokeWidth={2} />
            {sidebarExpanded && <span className="truncate">Library</span>}
          </Link>
          <button
            type="button"
            onClick={() => (isAuthenticated ? setShowSettings(true) : setShowLogin(true))}
            className={`flex items-center rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-colors w-full ${sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}`}
            title={isAuthenticated ? user?.name ?? 'Profile' : 'Sign In'}
          >
            {isAuthenticated && user ? (
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                <span className="text-[var(--color-text-on-primary)] text-sm font-medium">{user.name.charAt(0).toUpperCase()}</span>
              </div>
            ) : (
              <User size={20} strokeWidth={2} />
            )}
            {sidebarExpanded && <span className="truncate">{isAuthenticated ? user?.name ?? 'Profile' : 'Sign In'}</span>}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className={`flex items-center rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-colors w-full ${sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}`}
            title="Settings"
          >
            <Settings size={20} strokeWidth={2} />
            {sidebarExpanded && <span className="truncate">Settings</span>}
          </button>
        </div>

        {/* Open/close at bottom */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-3">
          <button
            type="button"
            onClick={() => setSidebarExpanded((e) => !e)}
            className={`flex items-center w-full rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)] transition-colors ${
              sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
            }`}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarExpanded ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            {sidebarExpanded && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header
          className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 md:px-6"
          style={{ zIndex: 'var(--z-nav)' }}
        >
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-[var(--color-text-muted)] opacity-80">i20S</span>
            <span className="text-[var(--color-text-muted)] opacity-60 hidden sm:inline"> / Products</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs flex items-center justify-center font-semibold shadow-[var(--shadow-glow-primary)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
