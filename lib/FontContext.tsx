/**
 * Font Context
 * 
 * Manages font family and size preferences.
 * Applies fonts via CSS custom properties.
 * 
 * AI Note: Fonts are applied globally via CSS variables.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type FontFamily = 'system' | 'syne' | 'ibm-plex' | 'inter' | 'poppins' | 'space-grotesk' | 'work-sans' | 'manrope' | 'outfit' | 'lexend' | 'atkinson-hyperlegible'
export type FontSize = 'normal' | 'medium' | 'large'

interface FontContextType {
  fontFamily: FontFamily
  fontSize: FontSize
  setFontFamily: (font: FontFamily) => void
  setFontSize: (size: FontSize) => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

// Font definitions with fallbacks
const fontFamilies: Record<FontFamily, string> = {
  'system': 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  'syne': '"Syne", system-ui, -apple-system, sans-serif',
  'ibm-plex': '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  'inter': '"Inter", system-ui, -apple-system, sans-serif',
  'poppins': '"Poppins", system-ui, -apple-system, sans-serif',
  'space-grotesk': '"Space Grotesk", system-ui, -apple-system, sans-serif',
  'work-sans': '"Work Sans", system-ui, -apple-system, sans-serif',
  'manrope': '"Manrope", system-ui, -apple-system, sans-serif',
  'outfit': '"Outfit", system-ui, -apple-system, sans-serif',
  'lexend': '"Lexend", system-ui, -apple-system, sans-serif',
  'atkinson-hyperlegible': '"Atkinson Hyperlegible", system-ui, -apple-system, sans-serif',
}

// Font size multipliers
const fontSizeMultipliers: Record<FontSize, number> = {
  'normal': 1.0,   // Base size (16px)
  'medium': 1.125, // 18px - mildly bigger default
  'large': 1.25,   // 20px
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontFamily, setFontFamilyState] = useState<FontFamily>('system')
  const [fontSize, setFontSizeState] = useState<FontSize>('normal') // Default to normal (16px)
  const [mounted, setMounted] = useState(false)

  // Load preferences from localStorage on mount and apply immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      const savedFont = localStorage.getItem('fusion_font_family') as FontFamily | null
      const savedSize = localStorage.getItem('fusion_font_size') as FontSize | null
      
      const initialFont = (savedFont && Object.keys(fontFamilies).includes(savedFont)) ? savedFont : 'system'
      const initialSize = (savedSize && Object.keys(fontSizeMultipliers).includes(savedSize)) ? savedSize : 'normal'
      
      setFontFamilyState(initialFont)
      setFontSizeState(initialSize)
      
      // Apply immediately
      const baseFontSize = fontSizeMultipliers[initialSize] * 16
      root.style.fontSize = `${baseFontSize}px`
      root.style.setProperty('--font-family-primary', fontFamilies[initialFont])
      root.style.setProperty('--font-size-base', `${baseFontSize}px`)
      root.style.setProperty('--font-size-multiplier', String(fontSizeMultipliers[initialSize]))
      document.body.style.fontFamily = fontFamilies[initialFont]
      
      setMounted(true)
    }
  }, [])

  // Apply font to document when it changes
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const root = document.documentElement
      const baseFontSize = fontSizeMultipliers[fontSize] * 16
      
      // Set root font-size so rem units scale automatically
      root.style.fontSize = `${baseFontSize}px`
      
      // Set CSS variables
      root.style.setProperty('--font-family-primary', fontFamilies[fontFamily])
      root.style.setProperty('--font-size-base', `${baseFontSize}px`)
      root.style.setProperty('--font-size-multiplier', String(fontSizeMultipliers[fontSize]))
      
      // Also update body font-family
      document.body.style.fontFamily = fontFamilies[fontFamily]
      
      localStorage.setItem('fusion_font_family', fontFamily)
      localStorage.setItem('fusion_font_size', fontSize)
    }
  }, [fontFamily, fontSize, mounted])

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font)
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  return (
    <FontContext.Provider value={{
      fontFamily,
      fontSize,
      setFontFamily,
      setFontSize,
    }}>
      {children}
    </FontContext.Provider>
  )
}

export function useFont() {
  const context = useContext(FontContext)
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}

