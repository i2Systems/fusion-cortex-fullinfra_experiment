/**
 * Page Title Watermark Component
 * 
 * Subtle title watermark displayed at the top of each page.
 * Provides context without being prominent - like a watermark.
 * 
 * AI Note: This should be placed at the top of page content,
 * styled as a subtle grey watermark that doesn't interfere with content.
 */

'use client'

import { usePathname } from 'next/navigation'
import { useRole } from '@/lib/role'

const pageTitles: Record<string, { primary: string; secondary?: string }> = {
  '/dashboard': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/discovery': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/map': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/zones': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/bacnet': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/rules': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/lookup': { primary: 'Fusion', secondary: 'i2 Cloud' },
  '/faults': { primary: 'Fusion', secondary: 'i2 Cloud' },
}

export function PageTitle() {
  const pathname = usePathname()
  const { role } = useRole()
  const title = pageTitles[pathname || '/dashboard'] || { primary: 'Fusion', secondary: 'i2 Cloud' }

  return (
    <div className="relative pointer-events-none z-0" style={{ background: 'transparent' }}>
      <div className="flex items-center gap-2 px-8 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-[var(--color-text-muted)] opacity-60">
            {title.primary}
          </span>
          {title.secondary && (
            <>
              <span className="text-xs text-[var(--color-text-muted)] opacity-40">/</span>
              <span className="text-sm font-medium text-[var(--color-text-muted)] opacity-60">
                {title.secondary}
              </span>
            </>
          )}
          <span className="text-xs text-[var(--color-text-muted)] opacity-40">/</span>
          <span className="text-sm font-medium text-[var(--color-text-muted)] opacity-60">
            {role}
          </span>
        </div>
      </div>
    </div>
  )
}

