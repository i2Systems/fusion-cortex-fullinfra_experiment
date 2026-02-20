/**
 * Day/Night mode toggle — sun/moon icon.
 * Toggles between day and night; each mode uses the theme chosen in Settings (Day design language / Night design language).
 */

'use client'

import { Sun, Moon } from 'lucide-react'
import { useAppearance } from '@/lib/AppearanceContext'

export function ThemeToggle() {
  const { themeMode, setThemeMode } = useAppearance()
  const isDay = themeMode === 'day'

  return (
    <button
      type="button"
      onClick={() => setThemeMode(isDay ? 'night' : 'day')}
      className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-colors"
      title={isDay ? 'Switch to night mode' : 'Switch to day mode'}
      aria-label={isDay ? 'Switch to night mode' : 'Switch to day mode'}
    >
      {isDay ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
