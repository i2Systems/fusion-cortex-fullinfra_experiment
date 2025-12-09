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
import { useState } from 'react'
import { 
  Home,
  Radar, 
  Map, 
  Layers, 
  Network, 
  Settings, 
  Search,
  AlertTriangle,
  User,
  Bell
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRole } from '@/lib/role'
import { LoginModal } from '@/components/auth/LoginModal'
import { SettingsModal } from '@/components/settings/SettingsModal'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/discovery', label: 'Discovery', icon: Radar },
  { href: '/map', label: 'Map & Devices', icon: Map },
  { href: '/zones', label: 'Zones', icon: Layers },
  { href: '/bacnet', label: 'BACnet Mapping', icon: Network },
  { href: '/rules', label: 'Rules & Overrides', icon: Settings },
  { href: '/lookup', label: 'Device Lookup', icon: Search },
  { href: '/faults', label: 'Faults / Health', icon: AlertTriangle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

export function MainNav() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const { role } = useRole()
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    // Technician cannot see BACnet Mapping and Rules & Overrides
    if (role === 'Technician') {
      return item.href !== '/bacnet' && item.href !== '/rules'
    }
    // Admin and Manager see everything
    return true
  })

  return (
    <>
    <nav 
      className="flex flex-col w-20 bg-[var(--color-bg-elevated)] backdrop-blur-xl border-r border-[var(--color-border-subtle)]"
      style={{ zIndex: 'var(--z-nav)' }}
    >
        {/* Navigation Items */}
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.href}
                href={item.href}
              className={`
                w-14 h-14 flex items-center justify-center rounded-lg
                transition-all duration-200
                ${isActive 
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-primary)] hover:shadow-[0_0_15px_rgba(0,217,255,0.3)]'
                }
              `}
                title={item.label}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            )
          })}
        </div>

        {/* Bottom: Profile & Settings */}
        <div className="p-4 flex flex-col items-center gap-2 border-t border-[var(--color-border-subtle)]">
          {/* Profile Icon */}
          <button
            onClick={() => isAuthenticated ? setShowSettings(true) : setShowLogin(true)}
            className="w-14 h-14 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-all duration-200"
            title={isAuthenticated ? user?.name || 'Profile' : 'Sign In'}
          >
            {isAuthenticated && user ? (
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : (
              <User size={22} />
            )}
          </button>

          {/* Settings Icon */}
          {isAuthenticated && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-14 h-14 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-all duration-200"
              title="Settings"
            >
              <Settings size={22} />
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

