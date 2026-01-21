/**
 * Root Layout
 * 
 * Next.js root layout that wraps the entire app.
 * Sets up all global providers (tRPC, Auth, Theme, Contexts, etc.)
 * 
 * AI Note: This is the top-level layout. All pages inherit from this.
 * Providers are ordered: TRPC → Auth → Theme → Role → Site → Data Contexts → UI Contexts
 */

import type { Metadata } from 'next'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc/Provider'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { RoleProvider } from '@/lib/role'
import { SiteProvider } from '@/lib/SiteContext'
import { DomainProvider } from '@/lib/DomainContext'
import { NotificationProvider } from '@/lib/NotificationContext'
import { MapProvider } from '@/lib/MapContext'
import { ToastProvider } from '@/lib/ToastContext'
import { ToastContainer } from '@/components/ui/Toast'
import { FontProvider } from '@/lib/FontContext'
import { I18nProvider } from '@/lib/i18n'
import { AdvancedSettingsProvider } from '@/lib/AdvancedSettingsContext'
import { ZoomProvider } from '@/lib/ZoomContext'
// Import exportData to make exportFusionData() available in browser console
import '@/lib/exportData'
import { ComposeProviders } from '@/components/shared/ComposeProviders'

export const metadata: Metadata = {
  title: 'Fusion / Cortex — Commissioning & Configuration',
  description: 'Setup, mapping, and rules platform for large-scale retail lighting deployments',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Atkinson Hyperlegible - self-hosted from Braille Institute */}
        <link href="https://fonts.bunny.net/css?family=atkinson-hyperlegible:400,700" rel="stylesheet" />
      </head>
      <body>
        <ComposeProviders
          components={[
            TRPCProvider,
            ThemeProvider,
            FontProvider,
            I18nProvider,
            AdvancedSettingsProvider,
            RoleProvider,
            AuthProvider,
            SiteProvider,
            MapProvider,
            ZoomProvider,
            ToastProvider,        // Must be before DomainProvider for error handling
            DomainProvider,
            NotificationProvider,
          ]}
        >
          {children}
          <ToastContainer />
        </ComposeProviders>
      </body>
    </html>
  )
}
