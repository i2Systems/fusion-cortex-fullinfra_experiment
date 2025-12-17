/**
 * Search Context
 * 
 * Provides page-aware search and action detection.
 * Detects actions from search input and highlights/triggers them.
 * 
 * AI Note: This makes SearchIsland work contextually on each page.
 */

'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export type PageType = 'dashboard' | 'map' | 'zones' | 'lookup' | 'bacnet' | 'rules' | 'faults' | 'notifications'

interface Action {
  id: string
  label: string
  keywords: string[]
  action: () => void
}

interface SearchContextType {
  pageType: PageType
  detectAction: (query: string) => Action | null
  getPageActions: () => Action[]
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

// Action patterns for each page
const pageActions: Record<PageType, (getActions: () => Action[]) => Action[]> = {
  dashboard: () => [
    {
      id: 'view-devices',
      label: 'View all devices',
      keywords: ['devices', 'show devices', 'list devices'],
      action: () => {},
    },
    {
      id: 'view-zones',
      label: 'View zones',
      keywords: ['zones', 'show zones', 'list zones'],
      action: () => {},
    },
  ],
  map: (getActions) => [
    {
      id: 'upload-map',
      label: 'Upload map',
      keywords: ['upload', 'map', 'floor plan', 'add map'],
      action: () => {},
    },
    {
      id: 'filter-devices',
      label: 'Filter devices',
      keywords: ['filter', 'layers', 'show', 'hide'],
      action: () => {},
    },
  ],
  zones: (getActions) => [
    {
      id: 'create-zone',
      label: 'Create new zone',
      keywords: ['create zone', 'new zone', 'add zone', 'make zone'],
      action: () => {},
    },
    {
      id: 'upload-map',
      label: 'Upload map',
      keywords: ['upload', 'map', 'floor plan'],
      action: () => {},
    },
  ],
  lookup: () => [
    {
      id: 'search-device',
      label: 'Search device',
      keywords: ['device', 'find', 'lookup', 'search'],
      action: () => {},
    },
  ],
  bacnet: () => [
    {
      id: 'add-mapping',
      label: 'Add BACnet mapping',
      keywords: ['add mapping', 'new mapping', 'create mapping', 'add bacnet'],
      action: () => {},
    },
  ],
  rules: () => [
    {
      id: 'create-rule',
      label: 'Create new rule',
      keywords: ['create rule', 'new rule', 'add rule', 'make rule'],
      action: () => {},
    },
  ],
  faults: () => [
    {
      id: 'view-faults',
      label: 'View all faults',
      keywords: ['faults', 'errors', 'issues', 'problems'],
      action: () => {},
    },
  ],
  notifications: () => [],
}

function detectPageType(pathname: string): PageType {
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard'
  if (pathname.startsWith('/map')) return 'map'
  if (pathname.startsWith('/zones')) return 'zones'
  if (pathname.startsWith('/lookup')) return 'lookup'
  if (pathname.startsWith('/bacnet')) return 'bacnet'
  if (pathname.startsWith('/rules')) return 'rules'
  if (pathname.startsWith('/faults')) return 'faults'
  if (pathname.startsWith('/notifications')) return 'notifications'
  return 'dashboard'
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const pageType = detectPageType(pathname)

  const getPageActions = (): Action[] => {
    return pageActions[pageType]?.(getPageActions) || []
  }

  const detectAction = (query: string): Action | null => {
    if (!query.trim()) return null
    
    const lowerQuery = query.toLowerCase().trim()
    const availableActions = getPageActions()
    
    // Check for exact matches first
    for (const action of availableActions) {
      for (const keyword of action.keywords) {
        if (lowerQuery === keyword || lowerQuery.startsWith(keyword + ' ') || lowerQuery.endsWith(' ' + keyword)) {
          return action
        }
      }
    }
    
    // Check for partial matches
    for (const action of availableActions) {
      for (const keyword of action.keywords) {
        if (lowerQuery.includes(keyword)) {
          return action
        }
      }
    }
    
    return null
  }

  return (
    <SearchContext.Provider value={{
      pageType,
      detectAction,
      getPageActions,
    }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

