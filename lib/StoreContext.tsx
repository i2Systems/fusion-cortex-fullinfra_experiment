/**
 * Store Context
 * 
 * Manages active store selection and store metadata.
 * All data contexts (Device, Zone, etc.) use this to scope their data.
 * 
 * AI Note: This enables multi-store support with isolated data per store.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react'
import { trpc } from './trpc/client'

// Store interface - matches Site model from database with additional UI fields
export interface Store {
  id: string
  name: string
  storeNumber: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
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
  addStore: (store: Omit<Store, 'id'>) => Store
  updateStore: (storeId: string, updates: Partial<Omit<Store, 'id'>>) => void
  removeStore: (storeId: string) => void
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
  // Fetch sites from database
  const { data: sitesData, refetch: refetchSites } = trpc.site.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Ensure default sites exist in database
  const ensureSiteMutations = trpc.site.ensureExists.useMutation({
    onSuccess: () => {
      // Only refetch if we're not already refetching
      setTimeout(() => {
        refetchSites()
      }, 500)
    },
  })

  // Track which sites we've already initiated creation for
  const ensuredSitesRef = useRef<Set<string>>(new Set())

  // Ensure all default sites exist in database on mount
  useEffect(() => {
    if (!sitesData) return

    // Check which default sites are missing
    DEFAULT_STORES.forEach(defaultStore => {
      const exists = sitesData.some(site => site.id === defaultStore.id)
      const alreadyEnsured = ensuredSitesRef.current.has(defaultStore.id)
      
      if (!exists && !alreadyEnsured) {
        // Mark as being ensured to prevent duplicate calls
        ensuredSitesRef.current.add(defaultStore.id)
        
        ensureSiteMutations.mutate({
          id: defaultStore.id,
          name: defaultStore.name,
          storeNumber: defaultStore.storeNumber,
          address: defaultStore.address,
          city: defaultStore.city,
          state: defaultStore.state,
          zipCode: defaultStore.zipCode,
          phone: defaultStore.phone,
          manager: defaultStore.manager,
          squareFootage: defaultStore.squareFootage,
          openedDate: defaultStore.openedDate,
        })
      } else if (exists) {
        // Site exists, mark as ensured
        ensuredSitesRef.current.add(defaultStore.id)
      }
    })
  }, [sitesData]) // Removed ensureSiteMutations from deps - it's stable

  // Merge database sites with default store metadata
  const stores = useMemo<Store[]>(() => {
    if (!sitesData) return DEFAULT_STORES

    // Map database sites to Store interface, merging with default metadata
    return sitesData.map(site => {
      const defaultStore = DEFAULT_STORES.find(ds => ds.id === site.id)
      if (defaultStore) {
        // Merge database data with default metadata (database takes precedence)
        return {
          id: site.id,
          name: site.name,
          storeNumber: site.storeNumber || defaultStore.storeNumber,
          address: site.address ?? defaultStore.address,
          city: site.city ?? defaultStore.city,
          state: site.state ?? defaultStore.state,
          zipCode: site.zipCode ?? defaultStore.zipCode,
          phone: site.phone ?? defaultStore.phone,
          manager: site.manager ?? defaultStore.manager,
          squareFootage: site.squareFootage ?? defaultStore.squareFootage,
          openedDate: site.openedDate ?? defaultStore.openedDate,
        }
      } else {
        // New site from database (not in defaults)
        return {
          id: site.id,
          name: site.name,
          storeNumber: site.storeNumber || '',
          address: site.address ?? undefined,
          city: site.city ?? undefined,
          state: site.state ?? undefined,
          zipCode: site.zipCode ?? undefined,
          phone: site.phone ?? undefined,
          manager: site.manager ?? undefined,
          squareFootage: site.squareFootage ?? undefined,
          openedDate: site.openedDate ?? undefined,
        }
      }
    })
  }, [sitesData])

  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  // Track if we've initialized the active store
  const hasInitializedStore = useRef(false)

  // Load active store from localStorage and validate against database
  useEffect(() => {
    if (typeof window !== 'undefined' && stores.length > 0) {
      const savedStoreId = localStorage.getItem('fusion_active_store_id')
      
      // If we have a saved store ID, check if it exists
      if (savedStoreId) {
        // Check if the saved store ID exists in database sites
        const storeExists = stores.some(s => s.id === savedStoreId)
        if (storeExists) {
          setActiveStoreId(savedStoreId)
          hasInitializedStore.current = true
        } else {
          // Stored ID is invalid or not yet loaded
          // Check if it's a temporary ID (store-timestamp format)
          const isTemporaryId = savedStoreId.startsWith('store-') && /^store-\d+$/.test(savedStoreId)
          
          if (isTemporaryId) {
            // Temporary ID - this means a new store was just created
            // The database will have the real ID, so use the most recently created store
            // (assuming it's the last one in the list, or we can find it by name/storeNumber)
            const mostRecentStore = stores[stores.length - 1]
            if (mostRecentStore) {
              setActiveStoreId(mostRecentStore.id)
              hasInitializedStore.current = true
            }
          } else {
            // Real ID that doesn't exist - site was deleted or ID changed
            // Fall back to first store
            const firstStoreId = stores[0]?.id
            if (firstStoreId) {
              setActiveStoreId(firstStoreId)
              hasInitializedStore.current = true
            }
          }
        }
      } else if (!hasInitializedStore.current) {
        // No saved store and we haven't initialized yet, default to first store
        const firstStoreId = stores[0]?.id
        if (firstStoreId) {
          setActiveStoreId(firstStoreId)
          hasInitializedStore.current = true
        }
      }
    }
  }, [stores])

  // Sites are now stored in database, no need to save to localStorage
  // Only save active store ID

  // Save active store to localStorage when it changes
  // Only save if it's a valid store ID (not a temporary one starting with 'store-' and timestamp)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeStoreId) {
      // Don't save temporary IDs - only save real database IDs
      // Real IDs are either from DEFAULT_STORES or are cuid format (24 chars, starts with 'c')
      // Temporary IDs are like 'store-1234567890' (long numeric timestamp)
      const isTemporaryId = activeStoreId.startsWith('store-') && /^store-\d+$/.test(activeStoreId)
      if (!isTemporaryId) {
        localStorage.setItem('fusion_active_store_id', activeStoreId)
      }
    }
  }, [activeStoreId])

  const setActiveStore = (storeId: string) => {
    // Allow setting active store without strict validation
    // This handles the case where a new store was just added
    // and the state hasn't updated yet
    setActiveStoreId(storeId)
  }

  const activeStore = activeStoreId 
    ? stores.find(s => s.id === activeStoreId) || null
    : null

  const getStoreById = (storeId: string): Store | undefined => {
    return stores.find(s => s.id === storeId)
  }

  // Create site mutation
  const createSiteMutation = trpc.site.create.useMutation({
    onSuccess: (newSite) => {
      refetchSites()
      // If we just created a site and it's not in our stores yet, 
      // wait for refetch to complete, then set it as active
      // The refetch will update the stores list, and we'll handle the active store in the useEffect
    },
  })

  // Update site mutation
  const updateSiteMutation = trpc.site.update.useMutation({
    onSuccess: () => {
      refetchSites()
    },
  })

  const addStore = (storeData: Omit<Store, 'id'>): Store => {
    // Create optimistically with a temporary ID
    // The actual ID will come from the database when the mutation completes
    const tempId = `store-${Date.now()}`
    const newStore: Store = {
      ...storeData,
      id: tempId,
    }
    
    // Create in database - the mutation will refetch sites and update the store list
    // The database will generate the actual ID (cuid)
    createSiteMutation.mutate({
      name: storeData.name,
      storeNumber: storeData.storeNumber,
      address: storeData.address,
      city: storeData.city,
      state: storeData.state,
      zipCode: storeData.zipCode,
      phone: storeData.phone,
      manager: storeData.manager,
      squareFootage: storeData.squareFootage,
      openedDate: storeData.openedDate,
    })
    
    // Return the temporary store - it will be replaced when sites are refetched
    // Don't save this temp ID to localStorage - wait for the real one
    return newStore
  }

  const updateStore = (storeId: string, updates: Partial<Omit<Store, 'id'>>) => {
    // Update in database (fire and forget for now)
    updateSiteMutation.mutate({
      id: storeId,
      name: updates.name,
      storeNumber: updates.storeNumber,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      zipCode: updates.zipCode,
      phone: updates.phone,
      manager: updates.manager,
      squareFootage: updates.squareFootage,
      openedDate: updates.openedDate,
    })
  }

  const removeStore = (storeId: string) => {
    // Note: Site deletion would need to be added to the site router
    // For now, we'll just prevent removal of default stores
    const isDefault = DEFAULT_STORES.some(ds => ds.id === storeId)
    if (isDefault) {
      console.warn('Cannot remove default stores')
      return
    }
    
    // If removing active store, switch to first remaining store
    if (activeStoreId === storeId) {
      const remainingStores = stores.filter(s => s.id !== storeId)
      if (remainingStores.length > 0) {
        setActiveStoreId(remainingStores[0].id)
      }
    }
    
    // TODO: Add delete mutation to site router
    console.warn('Site deletion not yet implemented in database')
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStoreId,
        activeStore,
        setActiveStore,
        getStoreById,
        addStore,
        updateStore,
        removeStore,
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

