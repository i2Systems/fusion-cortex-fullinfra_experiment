/**
 * Site Sync Hook
 * 
 * Bridges tRPC data fetching with the Zustand site store.
 * Handles server data hydration and exposes mutation functions.
 */

'use client'

import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { useSiteStore, Site } from '@/lib/stores/siteStore'
import { useToast } from '@/lib/ToastContext'

export function useSiteSync() {
    // Note: We use useSiteStore.getState() in effects and callbacks for stable references
    const utils = trpc.useUtils()
    const { addToast } = useToast()
    const searchParams = useSearchParams()
    const pendingTempIds = useRef<Set<string>>(new Set())
    const lastSyncedSitesRef = useRef<string>('')

    // Fetch sites from database
    const { data: sitesData, refetch, isLoading, error } = trpc.site.list.useQuery(undefined, {
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        retryDelay: 1000,
    })

    // Sync managers to people mutation
    const syncManagersMutation = trpc.site.syncManagersToPeople.useMutation({
        onError: (error: { message?: string }) => {
            // Log but don't show error toast - this is a background sync
            console.warn('Failed to sync managers to people:', error.message)
        },
        onSuccess: () => {
            // Invalidate people list to refresh with new manager persons
            utils.person.list.invalidate()
        }
    })

    // Mutations
    const createSiteMutation = trpc.site.create.useMutation({
        onSuccess: (newSite) => {
            console.log(`✅ [SiteSync] Site created in DB with ID: ${newSite.id}`)

            // Remove optimistic site if it exists (handled by refetch typically, but good for cleanup)
            pendingTempIds.current.clear()
            refetch()
            // Sync managers after site creation (in case manager was set)
            if (!syncManagersMutation.isPending) {
                syncManagersMutation.mutate()
            }
        },
        onError: (error) => {
            console.error(`❌ [SiteSync] Site creation failed:`, error)
            addToast({
                type: 'error',
                title: 'Creation Failed',
                message: error.message
            })
            // Rollback optimistic update implementation would go here if strict consistency needed
            // Currently simple refetch fits the pattern
            refetch()
        },
    })

    const updateSiteMutation = trpc.site.update.useMutation({
        onSuccess: () => {
            refetch()
            // Sync managers after site update (in case manager changed)
            if (!syncManagersMutation.isPending) {
                syncManagersMutation.mutate()
            }
        },
    })

    const deleteSiteMutation = trpc.site.delete.useMutation({
        onSuccess: () => refetch(),
        onError: (error) => {
            console.error('Failed to delete site:', error)
            addToast({
                type: 'error',
                title: 'Delete Failed',
                message: error.message
            })
        },
    })

    // Sync loading state - use startTransition to avoid render conflicts
    useEffect(() => {
        // Use queueMicrotask to ensure this runs after render
        queueMicrotask(() => {
            useSiteStore.getState().setLoading(isLoading)
        })
    }, [isLoading])

    // Handle errors
    useEffect(() => {
        if (error) {
            console.error('Error loading sites:', error)
            // Use queueMicrotask to ensure updates happen after render
            queueMicrotask(() => {
                addToast({
                    type: 'error',
                    title: 'Failed to load sites',
                    message: error.message || 'Unable to connect to the database. Please check your connection.',
                })
                // Set empty sites array on error to prevent UI from hanging
                useSiteStore.getState().setSites([])
                useSiteStore.getState().setLoading(false)
            })
        }
    }, [error, addToast])

    // Map database sites to Site interface
    const mappedSites = useMemo<Site[]>(() => {
        if (!sitesData) return []
        return sitesData.map(site => ({
            id: site.id,
            name: site.name,
            siteNumber: site.storeNumber || '',
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

    // Hydrate store
    useEffect(() => {
        // Server data wins - overwrite store with server data
        if (mappedSites.length > 0 || !isLoading) {
            // Use queueMicrotask to ensure this runs after render
            queueMicrotask(() => {
                useSiteStore.getState().setSites(mappedSites)
            })

            // Sync managers to people when sites are loaded
            // Create a signature of current sites to detect changes
            const sitesSignature = mappedSites.map(s => `${s.id}:${s.manager || ''}`).join('|')
            if (mappedSites.length > 0 && sitesSignature !== lastSyncedSitesRef.current) {
                lastSyncedSitesRef.current = sitesSignature
                // Debounce sync slightly to avoid multiple rapid calls
                setTimeout(() => {
                    if (!syncManagersMutation.isPending) {
                        syncManagersMutation.mutate()
                    }
                }, 1000)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mappedSites, isLoading])

    // Handle URL deep linking - use selectors for stability
    const activeSiteId = useSiteStore((s) => s.activeSiteId)
    const sites = useSiteStore((s) => s.sites)
    const urlSiteId = searchParams?.get('siteId')
    useEffect(() => {
        if (urlSiteId && urlSiteId !== activeSiteId) {
            // Validate site exists before switching
            const siteExists = sites.some(s => s.id === urlSiteId)
            if (siteExists) {
                queueMicrotask(() => {
                    useSiteStore.getState().setActiveSiteId(urlSiteId)
                })
            }
        }
    }, [urlSiteId, activeSiteId, sites])

    // Wrapper Functions - use getState() for stable callbacks
    const setActiveSite = useCallback((siteId: string) => {
        const currentState = useSiteStore.getState()
        const previousId = currentState.activeSiteId
        if (previousId && previousId !== siteId) {
            const newSite = currentState.sites.find(s => s.id === siteId)
            if (newSite) {
                setTimeout(() => {
                    addToast({
                        type: 'success',
                        title: 'Site Switched',
                        message: `Now viewing ${newSite.name}`,
                        duration: 3000,
                    })
                }, 100)
            }
        }
        // Use queueMicrotask to avoid React error #185
        queueMicrotask(() => {
            useSiteStore.getState().setActiveSiteId(siteId)
        })
    }, [addToast])

    const addSite = useCallback((siteData: Omit<Site, 'id'> & { personRole?: string }) => {
        const tempId = `site-${Date.now()}`
        const { personRole, ...siteDataWithoutRole } = siteData
        const newSite: Site = { ...siteDataWithoutRole, id: tempId }

        pendingTempIds.current.add(tempId)
        useSiteStore.getState().addSite(newSite) // Optimistic update

        createSiteMutation.mutate({
            name: siteData.name,
            storeNumber: siteData.siteNumber,
            address: siteData.address,
            city: siteData.city,
            state: siteData.state,
            zipCode: siteData.zipCode,
            phone: siteData.phone,
            manager: siteData.manager,
            squareFootage: siteData.squareFootage,
            openedDate: siteData.openedDate,
            personRole: personRole,
        })

        return newSite
    }, [createSiteMutation])

    const updateSite = useCallback((id: string, updates: Partial<Site> & { personRole?: string }) => {
        const { personRole, imageUrl, ...siteUpdates } = updates
        useSiteStore.getState().updateSite(id, siteUpdates) // Optimistic

        const { ...dbUpdates } = siteUpdates
        updateSiteMutation.mutate({
            id,
            name: dbUpdates.name,
            storeNumber: dbUpdates.siteNumber,
            address: dbUpdates.address,
            city: dbUpdates.city,
            state: dbUpdates.state,
            zipCode: dbUpdates.zipCode,
            phone: dbUpdates.phone,
            manager: dbUpdates.manager,
            squareFootage: dbUpdates.squareFootage,
            openedDate: dbUpdates.openedDate,
            personRole: personRole, // Pass personRole to mutation
        })
    }, [updateSiteMutation])

    const removeSite = useCallback((id: string) => {
        useSiteStore.getState().removeSite(id) // Optimistic
        deleteSiteMutation.mutate({ id })
    }, [deleteSiteMutation])

    return {
        setActiveSite,
        addSite,
        updateSite,
        removeSite
    }
}
