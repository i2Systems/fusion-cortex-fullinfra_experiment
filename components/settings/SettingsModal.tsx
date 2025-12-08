/**
 * Settings Modal
 * 
 * Apple-style settings panel with:
 * - Left sidebar navigation
 * - Search bar at top
 * - Main content area
 * 
 * AI Note: Follows Apple's Settings.app design pattern.
 */

'use client'

import { useState } from 'react'
import { X, Search, Settings, User, Bell, Shield, Palette, Database, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useRole } from '@/lib/role'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data & Storage', icon: Database },
  { id: 'about', label: 'About', icon: Info },
]

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState('profile')
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { role, setRole } = useRole()

  if (!isOpen) return null

  const filteredSections = settingsSections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeSectionData = settingsSections.find(s => s.id === activeSection)

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] backdrop-blur-xl rounded-[var(--radius-2xl)] shadow-[var(--shadow-strong)] w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-[var(--color-primary)]/30"
        style={{ boxShadow: 'var(--glow-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shadow-[var(--shadow-glow-primary)]">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Settings</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Fusion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-[var(--color-border-subtle)] overflow-y-auto">
            <nav className="p-2">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
                      ${isActive
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSectionData && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  {(() => {
                    const Icon = activeSectionData.icon
                    return <Icon size={24} className="text-[var(--color-primary)]" />
                  })()}
                  <h3 className="text-xl font-semibold text-[var(--color-text)]">
                    {activeSectionData.label}
                  </h3>
                </div>

                {/* Section Content */}
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.name || ''}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        Role
                      </label>
                      <div className="px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text-muted)]">
                        {user?.role || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'notifications' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[var(--color-surface-subtle)] rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-text)]">Email Notifications</div>
                        <div className="text-xs text-[var(--color-text-muted)]">Receive email updates</div>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[var(--color-surface-subtle)] rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-text)]">Push Notifications</div>
                        <div className="text-xs text-[var(--color-text-muted)]">Browser push notifications</div>
                      </div>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                )}

                {activeSection === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      />
                    </div>
                    <button className="fusion-button fusion-button-primary">
                      Update Password
                    </button>
                  </div>
                )}

                {activeSection === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        Theme
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="dark"
                            checked={theme === 'dark'}
                            onChange={() => setTheme('dark')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Dark</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="light"
                            checked={theme === 'light'}
                            onChange={() => setTheme('light')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Light</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="high-contrast"
                            checked={theme === 'high-contrast'}
                            onChange={() => setTheme('high-contrast')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)] font-semibold">High Contrast</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        Role
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="role"
                            value="Admin"
                            checked={role === 'Admin'}
                            onChange={() => setRole('Admin')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Admin</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="role"
                            value="Manager"
                            checked={role === 'Manager'}
                            onChange={() => setRole('Manager')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Manager</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="role"
                            value="Technician"
                            checked={role === 'Technician'}
                            onChange={() => setRole('Technician')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Technician</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'data' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg">
                      <div className="text-sm font-medium text-[var(--color-text)] mb-1">Storage Used</div>
                      <div className="text-xs text-[var(--color-text-muted)]">2.4 GB of 10 GB</div>
                      <div className="mt-2 h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                    <button className="fusion-button" style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}>
                      Clear Cache
                    </button>
                  </div>
                )}

                {activeSection === 'about' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg">
                      <div className="text-sm font-medium text-[var(--color-text)] mb-1">Fusion / Cortex</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Version 0.1.0</div>
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      Commissioning & Configuration UI for large-scale retail lighting deployments.
                    </div>
                    <button
                      onClick={() => {
                        logout()
                        onClose()
                      }}
                      className="fusion-button mt-6"
                      style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)' }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

