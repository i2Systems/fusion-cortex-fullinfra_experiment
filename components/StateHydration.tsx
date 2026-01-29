'use client'

import { FC, ReactNode, useEffect } from 'react'
import { useSiteSync } from '@/lib/stores/useSiteSync'
import { useMapSync } from '@/lib/stores/useMapSync'
import { useDeviceSync } from '@/lib/stores/useDeviceSync'
import { useZoneSync } from '@/lib/stores/useZoneSync'
import { useRuleSync } from '@/lib/stores/useRuleSync'
import { usePersonSync } from '@/lib/stores/usePersonSync'
import { useGroupSync } from '@/lib/stores/useGroupSync'
import { usePersonStore } from '@/lib/stores/personStore'
import { useGroupStore } from '@/lib/stores/groupStore'

/**
 * StateHydration
 *
 * Invokes all "Sync" hooks to hydrate Zustand stores from the server (tRPC).
 * This replaces top-level Context Providers that were doing data fetching.
 *
 * Must be placed inside TRPCProvider.
 */
export const StateHydration: FC<{ children: ReactNode }> = ({ children }) => {
    // Sync logic for all stores from server (tRPC)
    useSiteSync()
    useMapSync()
    useDeviceSync()
    useZoneSync()
    useRuleSync()
    usePersonSync()
    useGroupSync()

    const people = usePersonStore((s) => s.people)
    const groups = useGroupStore((s) => s.groups)

    // Expose people and groups on window so exportFusionData() in console can include them
    useEffect(() => {
        if (typeof window === 'undefined') return
        const w = window as unknown as { __FUSION_EXPORT_PEOPLE__?: unknown; __FUSION_EXPORT_GROUPS__?: unknown }
        w.__FUSION_EXPORT_PEOPLE__ = people.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            role: p.role,
            imageUrl: p.imageUrl,
            x: p.x,
            y: p.y,
            siteId: p.siteId,
            groupIds: p.groupIds ?? [],
            createdAt: p.createdAt?.toISOString?.(),
            updatedAt: p.updatedAt?.toISOString?.(),
        }))
        w.__FUSION_EXPORT_GROUPS__ = groups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            color: g.color,
            siteId: g.siteId,
            deviceIds: g.deviceIds ?? [],
            personIds: g.personIds ?? [],
            createdAt: g.createdAt?.toISOString?.(),
            updatedAt: g.updatedAt?.toISOString?.(),
        }))
    }, [people, groups])

    return <>{children}</>
}
