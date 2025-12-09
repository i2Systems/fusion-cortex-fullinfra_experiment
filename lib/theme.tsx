/**
 * Theme Context
 * 
 * Manages theme state (dark, light, high contrast, warm-night, warm-day, glass-neumorphism, business-fluent).
 * Themes are applied via CSS custom properties.
 * 
 * AI Note: All components should use design tokens, so theme changes
 * automatically apply everywhere.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'high-contrast' | 'warm-night' | 'warm-day' | 'glass-neumorphism' | 'business-fluent' | 'on-brand' | 'on-brand-glass'

// Define valid themes as a constant for type safety and validation
const VALID_THEMES: Theme[] = ['dark', 'light', 'high-contrast', 'warm-night', 'warm-day', 'glass-neumorphism', 'business-fluent', 'on-brand', 'on-brand-glass']

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with dark theme, will be updated from localStorage
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('fusion_theme') as Theme | null
    if (stored && VALID_THEMES.includes(stored)) {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    setMounted(true)
  }, [])

  // Apply theme to document when it changes
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('fusion_theme', theme)
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

