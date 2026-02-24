/**
 * Root Layout
 * 
 * Next.js root layout that wraps the entire app.
 * Sets up all global providers (tRPC, Auth, Theme, Contexts, etc.)
 * 
 * AI Note: This is the top-level layout. All pages inherit from this.
 * Providers are ordered: TRPC → Appearance → Auth → Site → Map → Toast → Domain → Notification
 * (Reduced from 13 to 8 providers via consolidation)
 */

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc/Provider'
import { AuthProvider } from '@/lib/auth'
import { AppearanceProvider } from '@/lib/AppearanceContext'
import { NotificationProvider } from '@/lib/NotificationContext'
import { ConfirmProvider } from '@/lib/hooks/useConfirm'
import { ToastProvider } from '@/lib/ToastContext'
import { ToastContainer } from '@/components/ui/Toast'
import { ComposeProviders } from '@/components/shared/ComposeProviders'
import { StateHydration } from '@/components/StateHydration'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { InitialLoadOverlay } from '@/components/layout/InitialLoadOverlay'
// Import exportData to make exportFusionData() available in browser console
import '@/lib/exportData'

export const metadata: Metadata = {
  title: 'Fusion / Cortex — Commissioning & Configuration',
  description: 'Setup, mapping, and rules platform for large-scale retail lighting deployments',
  icons: {
    icon: '/icon.svg',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // safe-area-inset-* for notches; better full-screen on iPad
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* iPad / PWA: full-screen capable, safe area for notches */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Fonts: single Google Fonts request (preconnect + one stylesheet) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] h-full">
        <div className="min-h-[100dvh] min-h-full h-full flex flex-col">
          <ErrorBoundary section="App">
            <ComposeProviders
              components={[
                TRPCProvider,
                AppearanceProvider,  // Theme + Font + I18n + AdvancedSettings
                AuthProvider,        // Auth + Role
                ToastProvider,
                NotificationProvider,
                ConfirmProvider,
              ]}
            >
              {process.env.NEXT_PUBLIC_SKIP_HYDRATION === '1' ? (
                <>{children}</>
              ) : (
                <StateHydration>
                  {children}
                </StateHydration>
              )}
              <ToastContainer />
              <InitialLoadOverlay />
            </ComposeProviders>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  )
}

