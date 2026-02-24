/**
 * Main Layout Component
 * 
 * This layout provides the core structure:
 * - Left navigation (persistent, minimal icons)
 * - Top app bar (store selector, breadcrumbs)
 * - Main content area (center)
 * - Right context panel (always visible on relevant pages)
 * - Bottom drawer (collapsible, for status/notifications)
 * 
 * AI Note: This is the primary layout wrapper. All main sections
 * (Dashboard, Map, Zones, Lookup, etc.) are rendered as children here.
 * ErrorBoundary catches rendering errors in page components.
 */

import { MainNav } from '@/components/layout/MainNav'
import { TopBar } from '@/components/layout/TopBar'
import { ContextPanel } from '@/components/layout/ContextPanel'
import { BottomDrawer } from '@/components/layout/BottomDrawer'
import { PageTitle } from '@/components/layout/PageTitle'
import { SiteTransitionOverlay } from '@/components/layout/SiteTransitionOverlay'
import { SearchProvider } from '@/lib/SearchContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SearchProvider>
      {/* Fill viewport / fullscreen: flex-1 min-h-0 so this fills the root wrapper and stays edge-to-edge on iPad fullscreen; safe-area for notches */}
      <div
        className="flex flex-1 min-h-0 w-screen overflow-hidden h-full"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Left Navigation - Persistent, minimal icons */}
        <MainNav />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Main Working Surface + Right Panel */}
          <div className="flex flex-1 min-h-0 relative">
            {/* Primary Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
              <PageTitle />
              <div className="flex-1 min-h-0 overflow-visible">
                <ErrorBoundary section="Page content">
                  {children}
                </ErrorBoundary>
              </div>
            </main>

            {/* Right Context Panel - Slide-in, overlay on mobile/tablet */}
            <ContextPanel />
          </div>

          {/* Bottom Drawer - Status, faults, background tasks (wrapped to prevent full app crash) */}
          <ErrorBoundary section="Bottom drawer" fallback={null}>
            <BottomDrawer />
          </ErrorBoundary>
        </div>
      </div>

      {/* Site Transition Overlay - Shows when switching sites */}
      <SiteTransitionOverlay />
    </SearchProvider>
  )
}

