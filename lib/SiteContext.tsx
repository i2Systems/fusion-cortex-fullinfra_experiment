/**
 * Site Context
 * 
 * Manages active site selection and site metadata.
 * All data contexts (Device, Zone, etc.) use this to scope their data.
 * 
 * AI Note: This enables multi-site support with isolated data per site.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from './trpc/client'

// Site interface - matches Site model from database with additional UI fields
export interface Site {
  id: string
  name: string
  siteNumber: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  manager?: string
  squareFootage?: number
  openedDate?: Date
  imageUrl?: string
}

interface SiteContextType {
  sites: Site[]
  activeSiteId: string | null
  activeSite: Site | null
  setActiveSite: (siteId: string) => void
  getSiteById: (siteId: string) => Site | undefined
  addSite: (site: Omit<Site, 'id'>) => Site
  updateSite: (siteId: string, updates: Partial<Omit<Site, 'id'>>) => void
  removeSite: (siteId: string) => void
}

const SiteContext = createContext<SiteContextType | undefined>(undefined)

// Default sites - 5 sites with realistic data
const DEFAULT_SITES: Site[] = [
  {
    id: 'site-1234',
    name: 'Site #1234 - Main St',
    siteNumber: '1234',
    address: '1250 Main Street',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '(217) 555-0123',
    manager: 'Sarah Johnson',
    squareFootage: 180000,
    openedDate: new Date('2018, 3, 15'),
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  },
  {
    id: 'site-2156',
    name: 'Site #2156 - Oak Avenue',
    siteNumber: '2156',
    address: '3420 Oak Avenue',
    city: 'Riverside',
    state: 'CA',
    zipCode: '92501',
    phone: '(951) 555-0456',
    manager: 'Michael Chen',
    squareFootage: 165000,
    openedDate: new Date('2019, 6, 22'),
    imageUrl: 'https://images.unsplash.com/photo-1555529669-2269763671c0?w=800&h=600&fit=crop',
  },
  {
    id: 'site-3089',
    name: 'Site #3089 - Commerce Blvd',
    siteNumber: '3089',
    address: '789 Commerce Boulevard',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    phone: '(512) 555-0789',
    manager: 'Emily Rodriguez',
    squareFootage: 195000,
    openedDate: new Date('2020, 1, 10'),
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  },
  {
    id: 'site-4421',
    name: 'Site #4421 - River Road',
    siteNumber: '4421',
    address: '456 River Road',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    phone: '(503) 555-0321',
    manager: 'David Kim',
    squareFootage: 172000,
    openedDate: new Date('2017, 9, 5'),
    imageUrl: 'https://images.unsplash.com/photo-1555529669-2269763671c0?w=800&h=600&fit=crop',
  },
  {
    id: 'site-5567',
    name: 'Site #5567 - Park Plaza',
    siteNumber: '5567',
    address: '2100 Park Plaza Drive',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    phone: '(303) 555-0567',
    manager: 'Jessica Martinez',
    squareFootage: 188000,
    openedDate: new Date('2021, 4, 18'),
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  },
]

export function SiteProvider({ children }: { children: ReactNode }) {
  // Fetch sites from database
  const { data: sitesData, refetch: refetchSites } = trpc.site.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const utils = trpc.useUtils()

  // No longer auto-creating default sites - users manage their own sites

  // Map database sites to Site interface (no default sites)
  const sites = useMemo<Site[]>(() => {
    if (!sitesData) return []

    // Map database sites to Site interface
    return sitesData.map(site => ({
      id: site.id,
      name: site.name,
      siteNumber: site.storeNumber || '', // Map storeNumber to siteNumber
      address: site.address ?? undefined,
      city: site.city ?? undefined,
      state: site.state ?? undefined,
      zipCode: site.zipCode ?? undefined,
      phone: site.phone ?? undefined,
      manager: site.manager ?? undefined,
      squareFootage: site.squareFootage ?? undefined,
      openedDate: site.openedDate ?? undefined,
      imageUrl: (site as any).imageUrl ?? undefined,
    }))
  }, [sitesData])

  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)

  // Track if we've initialized the active site
  const hasInitializedSite = useRef(false)

  // Load active site from localStorage and validate against database
  useEffect(() => {
    if (typeof window !== 'undefined' && sites.length > 0) {
      const savedSiteId = localStorage.getItem('fusion_active_site_id')

      // If we have a saved site ID, check if it exists
      if (savedSiteId) {
        // Check if the saved site ID exists in database sites
        const siteExists = sites.some(s => s.id === savedSiteId)
        if (siteExists) {
          setActiveSiteId(savedSiteId)
          hasInitializedSite.current = true
        } else {
          // Stored ID is invalid or not yet loaded - site was deleted
          // Fall back to first site if available
          const firstSiteId = sites[0]?.id
          if (firstSiteId) {
            setActiveSiteId(firstSiteId)
            hasInitializedSite.current = true
          } else {
            // No sites available
            setActiveSiteId(null)
            hasInitializedSite.current = true
          }
        }
      } else if (!hasInitializedSite.current) {
        // No saved site and we haven't initialized yet, default to first site
        const firstSiteId = sites[0]?.id
        if (firstSiteId) {
          setActiveSiteId(firstSiteId)
          hasInitializedSite.current = true
        }
      }
    }
  }, [sites])

  // Handle URL-based site switching (deep linking)
  const searchParams = useSearchParams()
  const urlSiteId = searchParams?.get('siteId')

  useEffect(() => {
    if (urlSiteId && urlSiteId !== activeSiteId && sites.some(s => s.id === urlSiteId)) {
      setActiveSiteId(urlSiteId)
    }
  }, [urlSiteId, activeSiteId, sites])

  // Sites are now stored in database, no need to save to localStorage
  // Only save active site ID

  // Save active site to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeSiteId) {
      localStorage.setItem('fusion_active_site_id', activeSiteId)
    } else if (typeof window !== 'undefined' && !activeSiteId) {
      // Clear if no active site
      localStorage.removeItem('fusion_active_site_id')
    }
  }, [activeSiteId])

  const setActiveSite = (siteId: string) => {
    // Allow setting active site without strict validation
    // This handles the case where a new site was just added
    // and the state hasn't updated yet
    setActiveSiteId(siteId)
  }

  const activeSite = activeSiteId
    ? sites.find(s => s.id === activeSiteId) || null
    : null

  const getSiteById = (siteId: string): Site | undefined => {
    return sites.find(s => s.id === siteId)
  }


  // Create site mutation - track pending temp IDs to clean up optimistic updates
  const pendingTempIds = useRef<Set<string>>(new Set())

  const createSiteMutation = trpc.site.create.useMutation({
    onSuccess: (newSite) => {
      console.log(`✅ [SiteContext] Site created in DB with ID: ${newSite.id}`)
      console.log(`   Pending temp IDs to remove: ${Array.from(pendingTempIds.current).join(', ')}`)

      // Remove all optimistic sites (temp IDs) from cache before refetching
      // This prevents duplicate sites appearing
      utils.site.list.setData(undefined, (oldSites) => {
        if (!oldSites) return []
        const filtered = oldSites.filter(site => !pendingTempIds.current.has(site.id))
        console.log(`   Filtered sites: ${oldSites.length} -> ${filtered.length}`)
        return filtered
      })
      pendingTempIds.current.clear()

      // Now refetch to get the real site from the database
      refetchSites()
    },
    onError: (error) => {
      console.error(`❌ [SiteContext] Site creation failed:`, error)
      // On error, also remove optimistic sites
      utils.site.list.setData(undefined, (oldSites) => {
        if (!oldSites) return []
        return oldSites.filter(site => !pendingTempIds.current.has(site.id))
      })
      pendingTempIds.current.clear()
    },
  })

  // Update site mutation
  const updateSiteMutation = trpc.site.update.useMutation({
    onSuccess: () => {
      refetchSites()
    },
  })

  const addSite = (siteData: Omit<Site, 'id'>): Site => {
    // Create optimistically with a temporary ID
    // The actual ID will come from the database when the mutation completes
    const tempId = `site-${Date.now()}`
    const newSite: Site = {
      ...siteData,
      id: tempId,
    }

    // Track the temp ID so we can remove it later
    pendingTempIds.current.add(tempId)

    // Optimistically update the cache
    utils.site.list.setData(undefined, (oldSites) => {
      const optimisticSiteForCache = {
        ...newSite,
        storeNumber: newSite.siteNumber, // Map back for cache consistency
      }
      if (!oldSites) return [optimisticSiteForCache as any]
      return [...oldSites, optimisticSiteForCache as any]
    })

    // Create in database - the mutation will refetch sites and update the site list
    // The database will generate the actual ID (cuid)
    createSiteMutation.mutate({
      name: siteData.name,
      storeNumber: siteData.siteNumber, // Database field is still storeNumber
      address: siteData.address,
      city: siteData.city,
      state: siteData.state,
      zipCode: siteData.zipCode,
      phone: siteData.phone,
      manager: siteData.manager,
      squareFootage: siteData.squareFootage,
      openedDate: siteData.openedDate,
    })

    // Return the temporary site - it will be replaced when sites are refetched
    // Don't save this temp ID to localStorage - wait for the real one
    return newSite
  }

  const updateSite = (siteId: string, updates: Partial<Omit<Site, 'id'>>) => {
    // Update in database (fire and forget for now)
    // Note: imageUrl is stored client-side, not in database
    const { imageUrl, ...dbUpdates } = updates
    updateSiteMutation.mutate({
      id: siteId,
      name: dbUpdates.name,
      storeNumber: dbUpdates.siteNumber, // Database field is still storeNumber
      address: dbUpdates.address,
      city: dbUpdates.city,
      state: dbUpdates.state,
      zipCode: dbUpdates.zipCode,
      phone: dbUpdates.phone,
      manager: dbUpdates.manager,
      squareFootage: dbUpdates.squareFootage,
      openedDate: dbUpdates.openedDate,
      // Don't pass imageUrl - it's stored client-side
    })
  }

  // Delete site mutation
  const deleteSiteMutation = trpc.site.delete.useMutation({
    onSuccess: () => {
      refetchSites()
    },
    onError: (error) => {
      console.error('Failed to delete site:', error)
      alert(`Failed to delete site: ${error.message}`)
    },
  })

  const removeSite = (siteId: string) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete this site? This will also delete all devices, zones, rules, and other data associated with this site.`)) {
      return
    }

    // If removing active site, switch to first remaining site
    if (activeSiteId === siteId) {
      const remainingSites = sites.filter(s => s.id !== siteId)
      if (remainingSites.length > 0) {
        setActiveSiteId(remainingSites[0].id)
      } else {
        setActiveSiteId(null)
      }
    }

    // Delete from database
    deleteSiteMutation.mutate({ id: siteId })
  }

  return (
    <SiteContext.Provider
      value={{
        sites,
        activeSiteId,
        activeSite,
        setActiveSite,
        getSiteById,
        addSite,
        updateSite,
        removeSite,
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  const context = useContext(SiteContext)
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider')
  }
  return context
}

