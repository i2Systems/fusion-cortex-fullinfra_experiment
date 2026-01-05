import React, { useEffect } from 'react'

type Theme = 'dark' | 'light' | 'high-contrast' | 'warm-night' | 'warm-day' | 'glass-neumorphism' | 'business-fluent' | 'on-brand' | 'on-brand-glass'

export const THEMES: Theme[] = [
  'dark',
  'light',
  'high-contrast',
  'warm-night',
  'warm-day',
  'glass-neumorphism',
  'business-fluent',
  'on-brand',
  'on-brand-glass',
]

export function ThemeDecorator(Story: any, context: any) {
  // Get theme from global args or default to dark
  const theme = (context.globals?.theme as Theme) || 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return React.createElement(
    'div',
    {
      style: {
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      },
    },
    React.createElement(Story)
  )
}

