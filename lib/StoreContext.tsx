/**
 * Store Context
 * 
 * Manages active store selection and store metadata.
 * All data contexts (Device, Zone, etc.) use this to scope their data.
 * 
 * AI Note: This enables multi-store support with isolated data per store.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Store {
  id: string
  name: string
  storeNumber: string
  address: string
  city: string
  state: string
  zipCode: string
  phone?: string
  manager?: string
  squareFootage?: number
  openedDate?: Date
}

interface StoreContextType {
  stores: Store[]
  activeStoreId: string | null
  activeStore: Store | null
  setActiveStore: (storeId: string) => void
  getStoreById: (storeId: string) => Store | undefined
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

// Default stores - 5 stores with realistic data
const DEFAULT_STORES: Store[] = [
  {
    id: 'store-1234',
    name: 'Store #1234 - Main St',
    storeNumber: '1234',
    address: '1250 Main Street',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '(217) 555-0123',
    manager: 'Sarah Johnson',
    squareFootage: 180000,
    openedDate: new Date('2018, 3, 15'),
  },
  {
    id: 'store-2156',
    name: 'Store #2156 - Oak Avenue',
    storeNumber: '2156',
    address: '3420 Oak Avenue',
    city: 'Riverside',
    state: 'CA',
    zipCode: '92501',
    phone: '(951) 555-0456',
    manager: 'Michael Chen',
    squareFootage: 165000,
    openedDate: new Date('2019, 6, 22'),
  },
  {
    id: 'store-3089',
    name: 'Store #3089 - Commerce Blvd',
    storeNumber: '3089',
    address: '789 Commerce Boulevard',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    phone: '(512) 555-0789',
    manager: 'Emily Rodriguez',
    squareFootage: 195000,
    openedDate: new Date('2020, 1, 10'),
  },
  {
    id: 'store-4421',
    name: 'Store #4421 - River Road',
    storeNumber: '4421',
    address: '456 River Road',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    phone: '(503) 555-0321',
    manager: 'David Kim',
    squareFootage: 172000,
    openedDate: new Date('2017, 9, 5'),
  },
  {
    id: 'store-5567',
    name: 'Store #5567 - Park Plaza',
    storeNumber: '5567',
    address: '2100 Park Plaza Drive',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    phone: '(303) 555-0567',
    manager: 'Jessica Martinez',
    squareFootage: 188000,
    openedDate: new Date('2021, 4, 18'),
  },
]

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores] = useState<Store[]>(DEFAULT_STORES)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  // Initialize active store from localStorage or default to first store
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStoreId = localStorage.getItem('fusion_active_store_id')
      if (savedStoreId && DEFAULT_STORES.some(s => s.id === savedStoreId)) {
        setActiveStoreId(savedStoreId)
      } else {
        // Default to first store
        const firstStoreId = DEFAULT_STORES[0]?.id
        if (firstStoreId) {
          setActiveStoreId(firstStoreId)
          localStorage.setItem('fusion_active_store_id', firstStoreId)
        }
      }
    }
  }, [])

  // Save active store to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeStoreId) {
      localStorage.setItem('fusion_active_store_id', activeStoreId)
    }
  }, [activeStoreId])

  const setActiveStore = (storeId: string) => {
    if (DEFAULT_STORES.some(s => s.id === storeId)) {
      setActiveStoreId(storeId)
    } else {
      console.warn(`Store ${storeId} not found`)
    }
  }

  const activeStore = activeStoreId 
    ? DEFAULT_STORES.find(s => s.id === activeStoreId) || null
    : null

  const getStoreById = (storeId: string): Store | undefined => {
    return DEFAULT_STORES.find(s => s.id === storeId)
  }

  return (
    <StoreContext.Provider
      value={{
        stores: DEFAULT_STORES,
        activeStoreId,
        activeStore,
        setActiveStore,
        getStoreById,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

