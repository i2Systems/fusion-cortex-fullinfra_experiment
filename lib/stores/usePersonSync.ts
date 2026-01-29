/**
 * Person Sync Hook
 *
 * Bridges tRPC data fetching with the Zustand person store.
 * Hydrates people for the active site so data is available on app start.
 */

'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSite } from '@/lib/SiteContext'
import { usePersonStore, type Person } from '@/lib/stores/personStore'

export function usePersonSync() {
    const { activeSiteId } = useSite()

    const { data: peopleData, isLoading, error } = trpc.person.list.useQuery(
        { siteId: activeSiteId || '' },
        {
            enabled: !!activeSiteId,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        }
    )

    // Sync loading and error state
    useEffect(() => {
        queueMicrotask(() => {
            usePersonStore.getState().setLoading(isLoading)
        })
    }, [isLoading])

    useEffect(() => {
        if (error) {
            queueMicrotask(() => {
                usePersonStore.getState().setError(error)
            })
        } else {
            queueMicrotask(() => {
                usePersonStore.getState().setError(null)
            })
        }
    }, [error])

    // Hydrate store from server data
    useEffect(() => {
        if (!peopleData) return
        const mapped: Person[] = peopleData.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email ?? undefined,
            role: p.role ?? undefined,
            imageUrl: p.imageUrl ?? undefined,
            x: p.x ?? undefined,
            y: p.y ?? undefined,
            siteId: p.siteId,
            groupIds: p.groupIds ?? [],
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
        }))
        queueMicrotask(() => {
            usePersonStore.getState().setPeople(mapped)
        })
    }, [peopleData])

    // Clear people when site changes and no data yet
    useEffect(() => {
        if (!activeSiteId) {
            queueMicrotask(() => {
                usePersonStore.getState().setPeople([])
            })
        }
    }, [activeSiteId])
}
