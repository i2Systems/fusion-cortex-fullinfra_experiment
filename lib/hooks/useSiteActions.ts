/**
 * Site Actions Hook
 * 
 * Provides mutation functions for Sites.
 * Designed to be used by components that need to modify sites.
 */

'use client'

import { useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSiteStore, Site } from '@/lib/stores/siteStore'
import { useToast } from '@/lib/ToastContext'

export function useSiteActions() {
    // Note: We use useSiteStore.getState() in callbacks for stable references
    // instead of subscribing to the full store which can cause re-renders
    const utils = trpc.useUtils()
    const { addToast } = useToast()

    // Track optimistic IDs to clean up later
    const pendingTempIds = useRef<Set<string>>(new Set())

    const createSiteMutation = trpc.site.create.useMutation({
        onSuccess: (newSite) => {
            // Cleanup optimistic IDs or just refetch
            pendingTempIds.current.clear()
            utils.site.list.invalidate()
        },
        onError: (error) => {
            console.error('Failed to create site:', error)
            addToast({
                type: 'error',
                title: 'Creation Failed',
                message: error.message
            })
            utils.site.list.invalidate()
        },
    })

    const updateSiteMutation = trpc.site.update.useMutation({
        onSuccess: () => utils.site.list.invalidate(),
    })

    const deleteSiteMutation = trpc.site.delete.useMutation({
        onSuccess: () => utils.site.list.invalidate(),
        onError: (error) => {
            console.error('Failed to delete site:', error)
            addToast({
                type: 'error',
                title: 'Delete Failed',
                message: error.message
            })
            utils.site.list.invalidate()
        },
    })

    const setActiveSite = useCallback((siteId: string, options?: { skipAnimation?: boolean }) => {
        // Get current state at call time (not at callback creation time)
        const currentState = useSiteStore.getState()
        const previousId = currentState.activeSiteId

        // Skip if switching to same site - STRICT CHECK
        if (previousId === siteId) {
            // Ensure switching state is off just in case
            if (currentState.isSwitching) {
                currentState.setSwitching(false)
            }
            return
        }

        const newSite = currentState.sites.find(s => s.id === siteId)
        if (!newSite) return

        // If skipAnimation is true, just switch immediately without overlay
        if (options?.skipAnimation) {
            currentState.setActiveSiteId(siteId)
            return
        }

        // Show the overlay with site name
        currentState.setSwitching(true, newSite.name)

        // Quick snap to blur, then switch site
        setTimeout(() => {
            useSiteStore.getState().setActiveSiteId(siteId)

            // Hold the blur for a moment, then fade out
            setTimeout(() => {
                useSiteStore.getState().setSwitching(false)
            }, 800)
        }, 200)
    }, []) // No deps needed - using getState() for stable reference

    const addSite = useCallback((siteData: Omit<Site, 'id'>) => {
        const tempId = `site-${Date.now()}`
        const newSite: Site = { ...siteData, id: tempId }

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
        })

        return newSite
    }, [createSiteMutation]) // Remove store from deps

    const updateSite = useCallback((id: string, updates: Partial<Site>) => {
        useSiteStore.getState().updateSite(id, updates) // Optimistic

        const { imageUrl, ...dbUpdates } = updates
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
        })
    }, [updateSiteMutation]) // Remove store from deps

    const removeSite = useCallback((id: string) => {
        useSiteStore.getState().removeSite(id) // Optimistic
        deleteSiteMutation.mutate({ id })
    }, [deleteSiteMutation]) // Remove store from deps

    return {
        setActiveSite,
        addSite,
        updateSite,
        removeSite
    }
}
