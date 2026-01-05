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

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Settings, User, Bell, Shield, Palette, Database, Info, Type, Wrench, BookOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useRole } from '@/lib/role'
import { useFont, FontFamily, FontSize } from '@/lib/FontContext'
import { useI18n, languageNames, Language } from '@/lib/i18n'
import { useAdvancedSettings } from '@/lib/AdvancedSettingsContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const settingsSections = [
  { id: 'profile', labelKey: 'profile', icon: User },
  { id: 'notifications', labelKey: 'notifications', icon: Bell },
  { id: 'security', labelKey: 'security', icon: Shield },
  { id: 'appearance', labelKey: 'appearance', icon: Palette },
  { id: 'data', labelKey: 'data', icon: Database },
  { id: 'advanced', labelKey: 'advanced', icon: Wrench },
  { id: 'about', labelKey: 'about', icon: Info },
]

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const { theme, setTheme } = useTheme()
  const { role, setRole } = useRole()
  const { fontFamily, fontSize, setFontFamily, setFontSize } = useFont()
  const { language, setLanguage, t } = useI18n()
  const { enableSVGExtraction, setEnableSVGExtraction } = useAdvancedSettings()
  const [activeSection, setActiveSection] = useState(isAuthenticated ? 'profile' : 'appearance')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter sections based on authentication status
  const availableSections = useMemo(() => {
    return settingsSections.filter(section => {
      // Hide Profile and Security when not authenticated
      if (!isAuthenticated && (section.id === 'profile' || section.id === 'security')) {
        return false
      }
      return true
    })
  }, [isAuthenticated])

  // If current section is not available, switch to appearance
  useEffect(() => {
    // Check if current section should be hidden based on auth status
    const shouldHideSection = !isAuthenticated && (activeSection === 'profile' || activeSection === 'security')
    if (shouldHideSection) {
      setActiveSection('appearance')
    }
  }, [isAuthenticated, activeSection])

  if (!isOpen) return null

  const filteredSections = availableSections.filter(section =>
    t(section.labelKey).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeSectionData = availableSections.find(s => s.id === activeSection)

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)]"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
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
              <span className="text-[var(--color-text-on-primary)] font-bold text-xl">F</span>
            </div>
            <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">{t('settings')}</h2>
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
              placeholder={t('search') + '...'}
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
                    <span className="text-sm font-medium">{t(section.labelKey)}</span>
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
                            {t(activeSectionData.labelKey)}
                          </h3>
                </div>

                {/* Section Content */}
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    {isAuthenticated ? (
                      <>
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
                      </>
                    ) : (
                      <div className="p-6 bg-[var(--color-surface-subtle)] rounded-lg text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Please sign in to view your profile
                        </p>
                      </div>
                    )}
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
                    {isAuthenticated ? (
                      <>
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
                      </>
                    ) : (
                      <div className="p-6 bg-[var(--color-surface-subtle)] rounded-lg text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Please sign in to access security settings
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        {t('theme')}
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
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="warm-night"
                            checked={theme === 'warm-night'}
                            onChange={() => setTheme('warm-night')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Warm Night</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="warm-day"
                            checked={theme === 'warm-day'}
                            onChange={() => setTheme('warm-day')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Warm Day</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="glass-neumorphism"
                            checked={theme === 'glass-neumorphism'}
                            onChange={() => setTheme('glass-neumorphism')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Glass Neumorphism</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="business-fluent"
                            checked={theme === 'business-fluent'}
                            onChange={() => setTheme('business-fluent')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">Business Fluent</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="on-brand"
                            checked={theme === 'on-brand'}
                            onChange={() => setTheme('on-brand')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">On Brand</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value="on-brand-glass"
                            checked={theme === 'on-brand-glass'}
                            onChange={() => setTheme('on-brand-glass')}
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--color-text)]">On Brand Glass</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Font Family */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                        <Type size={16} />
                        {t('fontFamily')}
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                        style={{ fontFamily: 'var(--font-family-primary)' }}
                      >
                        <option value="system" style={{ fontFamily: 'system-ui, sans-serif' }}>System (Current)</option>
                        <option value="syne" style={{ fontFamily: '"Syne", sans-serif' }}>Syne</option>
                        <option value="ibm-plex" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>IBM Plex Sans</option>
                        <option value="inter" style={{ fontFamily: '"Inter", sans-serif' }}>Inter</option>
                        <option value="poppins" style={{ fontFamily: '"Poppins", sans-serif' }}>Poppins</option>
                        <option value="space-grotesk" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Space Grotesk</option>
                        <option value="work-sans" style={{ fontFamily: '"Work Sans", sans-serif' }}>Work Sans</option>
                        <option value="manrope" style={{ fontFamily: '"Manrope", sans-serif' }}>Manrope</option>
                        <option value="outfit" style={{ fontFamily: '"Outfit", sans-serif' }}>Outfit</option>
                        <option value="lexend" style={{ fontFamily: '"Lexend", sans-serif' }}>Lexend (Dyslexic-friendly)</option>
                        <option value="atkinson-hyperlegible" style={{ fontFamily: '"Atkinson Hyperlegible", sans-serif' }}>Atkinson Hyperlegible (Dyslexic-friendly)</option>
                      </select>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2" style={{ fontFamily: 'var(--font-family-primary)' }}>
                        Preview: The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                    
                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        {t('fontSize')}
                      </label>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value as FontSize)}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      >
                        <option value="normal">{t('normal')} (16px) - {t('default')}</option>
                        <option value="medium">{t('medium')} (18px)</option>
                        <option value="large">{t('large')} (20px)</option>
                      </select>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        Affects text size and spacing throughout the application
                      </p>
                    </div>
                    
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        {t('language')}
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                      >
                        <option value="en">{languageNames.en}</option>
                        <option value="es">{languageNames.es}</option>
                        <option value="fr">{languageNames.fr}</option>
                      </select>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        Changes the language of the interface
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                        {t('role')}
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

                {activeSection === 'advanced' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg">
                      <p className="text-sm text-[var(--color-text-muted)] mb-2">
                        These settings control experimental features. Change with caution.
                      </p>
                    </div>
                    
                    {/* PDF Processing Section */}
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">PDF Processing</h4>
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-4 bg-[var(--color-surface-subtle)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                          <input
                            type="checkbox"
                            checked={enableSVGExtraction}
                            onChange={(e) => setEnableSVGExtraction(e.target.checked)}
                            className="mt-1 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--color-text)]">
                              Enable SVG Vector Extraction
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">
                              When uploading PDFs, attempt to extract vector graphics (lines, paths) as SVG. 
                              This can provide higher quality floor plans but may be slow or produce incorrect results 
                              for some PDFs. When disabled, PDFs are converted to high-resolution images instead.
                            </div>
                            <div className="text-xs text-[var(--color-warning)] mt-2 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>Experimental feature - disable if you experience issues</span>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'about' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                      <div className="text-lg font-semibold text-[var(--color-text)] mb-1">Fusion / Cortex</div>
                      <div className="text-xs text-[var(--color-text-muted)] mb-2">Version 0.4.0</div>
                      <div className="text-sm text-[var(--color-text-muted)]">
                        Commissioning & Configuration UI for large-scale retail lighting deployments.
                      </div>
                    </div>

                    {/* Component Library / Storybook Link */}
                    <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                      <div className="flex items-center gap-3 mb-3">
                        <BookOpen size={20} className="text-[var(--color-primary)]" />
                        <div className="text-sm font-medium text-[var(--color-text)]">Component Library</div>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">
                        View and inspect all design tokens and atomic components in Storybook.
                      </p>
                      <a
                        href="/storybook"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fusion-button fusion-button-primary inline-flex items-center gap-2"
                        style={{ textDecoration: 'none' }}
                      >
                        <BookOpen size={16} />
                        Open Storybook
                      </a>
                    </div>

                    {/* README Content */}
                    <div className="space-y-6 text-sm text-[var(--color-text)] max-h-[calc(80vh-300px)] overflow-y-auto pr-2">
                      {/* Purpose */}
                      <div>
                        <h4 className="text-base font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2">
                          <span>🎯</span> Purpose
                        </h4>
                        <div className="space-y-2 pl-6">
                          <p className="text-[var(--color-text-muted)]">
                            Fusion/Cortex is a setup, mapping, and rules platform that bridges physical devices (fixtures, motion sensors, light sensors) and BACnet/BMS. Optimized for remote commissioning at scale (thousands of devices, thousands of sites) with multi-site support.
                          </p>
                          <div className="mt-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg border-l-2 border-[var(--color-warning)]">
                            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Not:</p>
                            <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                              <li>A lighting control dashboard</li>
                              <li>An energy analytics/heatmap tool</li>
                              <li>A BMS replacement</li>
                              <li>A site manager operations dashboard</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Tech Stack */}
                      <div>
                        <h4 className="text-base font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2">
                          <span>🏗️</span> Tech Stack
                        </h4>
                        <div className="pl-6 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-[var(--color-surface-subtle)] rounded">
                              <span className="font-medium text-[var(--color-text)]">Frontend:</span>
                              <div className="text-[var(--color-text-muted)] mt-1">Next.js 14, React, Tailwind</div>
                            </div>
                            <div className="p-2 bg-[var(--color-surface-subtle)] rounded">
                              <span className="font-medium text-[var(--color-text)]">API:</span>
                              <div className="text-[var(--color-text-muted)] mt-1">tRPC (type-safe)</div>
                            </div>
                            <div className="p-2 bg-[var(--color-surface-subtle)] rounded">
                              <span className="font-medium text-[var(--color-text)]">Database:</span>
                              <div className="text-[var(--color-text-muted)] mt-1">PostgreSQL + Prisma</div>
                            </div>
                            <div className="p-2 bg-[var(--color-surface-subtle)] rounded">
                              <span className="font-medium text-[var(--color-text)]">Canvas:</span>
                              <div className="text-[var(--color-text-muted)] mt-1">react-konva</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Core Features */}
                      <div>
                        <h4 className="text-base font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2">
                          <span>📋</span> Core Features
                        </h4>
                        <div className="pl-6 space-y-3">
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">1. Multi-Site Dashboard</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Overview of all sites with health metrics, device counts, and critical faults.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">2. Locations & Devices</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Point cloud visualization over blueprints with color-coded device types.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">3. Zones</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Drag-select devices to create zones - the unit of control for BMS + rules.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">4. BACnet Mapping</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Map zones to BACnet Object IDs with inline editing and validation.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">5. Rules & Overrides</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Alexa-style rule builder with triggers, conditions, and actions.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">6. Device Lookup</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Search by ID/serial, view I2QR details, warranty, and parts list.</div>
                          </div>
                          <div className="p-3 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border-subtle)]">
                            <div className="font-medium text-[var(--color-text)] mb-1">7. Faults / Health</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Summary counts and detailed device information for troubleshooting.</div>
                          </div>
                        </div>
                      </div>

                      {/* Multi-Site Architecture */}
                      <div>
                        <h4 className="text-base font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2">
                          <span>🏪</span> Multi-Site Architecture
                        </h4>
                        <div className="pl-6 space-y-2">
                          <p className="text-[var(--color-text-muted)] text-xs">
                            The app supports managing multiple sites with isolated data. All data (devices, zones, rules, maps, BACnet mappings) is namespaced by site ID. Each site has its own device list, zones, rules, and map images.
                          </p>
                        </div>
                      </div>

                      {/* Design System */}
                      <div>
                        <h4 className="text-base font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2">
                          <span>🎨</span> Design System
                        </h4>
                        <div className="pl-6 space-y-2">
                          <p className="text-[var(--color-text-muted)] text-xs">
                            All design values use CSS custom properties (design tokens) in <code className="px-1 py-0.5 bg-[var(--color-bg-elevated)] rounded text-[var(--color-primary)]">app/globals.css</code>. This enables easy theming, consistent spacing, colors, typography, and no hard-coded values.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sign Out Button */}
                    {isAuthenticated && (
                      <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                      <button
                        onClick={() => {
                          logout()
                          onClose()
                        }}
                          className="fusion-button w-full"
                        style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)' }}
                      >
                        Sign Out
                      </button>
                      </div>
                    )}
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

