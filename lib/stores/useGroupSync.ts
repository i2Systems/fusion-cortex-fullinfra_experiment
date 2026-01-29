/**
 * Group Sync Hook
 *
 * Bridges tRPC data fetching with the Zustand group store.
 * Hydrates groups for the active site so data is available on app start.
 */

'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSite } from '@/lib/SiteContext'
import { useGroupStore, type Group } from '@/lib/stores/groupStore'

export function useGroupSync() {
    const { activeSiteId } = useSite()

    const { data: groupsData, isLoading, error } = trpc.group.list.useQuery(
        { siteId: activeSiteId || '' },
        {
            enabled: !!activeSiteId,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        }
    )

    // Sync loading state
    useEffect(() => {
        queueMicrotask(() => {
            useGroupStore.getState().setLoading(isLoading)
        })
    }, [isLoading])

    // Sync error state
    useEffect(() => {
        queueMicrotask(() => {
            useGroupStore.getState().setError(error ?? null)
        })
    }, [error])

    // Hydrate store from server data
    useEffect(() => {
        if (!groupsData) return
        const mapped: Group[] = groupsData.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description ?? undefined,
            color: g.color,
            siteId: g.siteId,
            deviceIds: g.deviceIds ?? [],
            personIds: g.personIds ?? [],
            createdAt: new Date(g.createdAt),
            updatedAt: new Date(g.updatedAt),
        }))
        queueMicrotask(() => {
            useGroupStore.getState().setGroups(mapped)
        })
    }, [groupsData])

    // Clear groups when site changes and no data yet
    useEffect(() => {
        if (!activeSiteId) {
            queueMicrotask(() => {
                useGroupStore.getState().setGroups([])
            })
        }
    }, [activeSiteId])
}
