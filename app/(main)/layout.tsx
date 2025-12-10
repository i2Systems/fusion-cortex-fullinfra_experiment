/**
 * Main Layout Component
 * 
 * This layout provides the core structure:
 * - Left navigation (persistent, minimal icons)
 * - Top app bar (site selector, user menu, search)
 * - Main content area (center)
 * - Right context panel (slide-in, optional)
 * - Bottom drawer (optional, for status/faults)
 * 
 * AI Note: This is the primary layout wrapper. All main sections
 * (Discovery, Map, Zones, etc.) are rendered as children here.
 */

import { MainNav } from '@/components/layout/MainNav'
import { TopBar } from '@/components/layout/TopBar'
import { ContextPanel } from '@/components/layout/ContextPanel'
import { BottomDrawer } from '@/components/layout/BottomDrawer'
import { PageTitle } from '@/components/layout/PageTitle'
import { SearchProvider } from '@/lib/SearchContext'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SearchProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Left Navigation - Persistent, minimal icons */}
        <MainNav />
        
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Main Working Surface + Right Panel */}
          <div className="flex flex-1 min-h-0 relative">
            {/* Primary Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col">
              <PageTitle />
              <div className="flex-1 min-h-0 overflow-visible">
                {children}
              </div>
            </main>
            
            {/* Right Context Panel - Slide-in */}
            <ContextPanel />
          </div>
          
          {/* Bottom Drawer - Status, faults, background tasks */}
          <BottomDrawer />
        </div>
      </div>
    </SearchProvider>
  )
}

