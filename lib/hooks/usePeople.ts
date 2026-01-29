'use client'

import { useCallback, useRef } from 'react'
import { usePersonStore } from '@/lib/stores/personStore'
import { useGroupStore } from '@/lib/stores/groupStore'
import { trpc } from '@/lib/trpc/client'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'

const POSITION_DEBOUNCE_MS = 400

export function usePeople() {
    const store = usePersonStore()
    const groupStore = useGroupStore()
    const utils = trpc.useUtils()
    const { handleError } = useErrorHandler()
    const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const createMutation = trpc.person.create.useMutation({
        onSuccess: (newPerson) => {
            queueMicrotask(() => {
                store.addPerson({
                    ...newPerson,
                    imageUrl: newPerson.imageUrl || undefined,
                    groupIds: [],
                    createdAt: new Date(newPerson.createdAt),
                    updatedAt: new Date(newPerson.updatedAt)
                })
            })
            utils.person.list.invalidate()
            // Person may have been auto-added to role group
            utils.group.list.invalidate()
        }
    })

    const updateMutation = trpc.person.update.useMutation({
        onSuccess: (updatedPerson) => {
            queueMicrotask(() => {
                store.updatePerson(updatedPerson.id, {
                    ...updatedPerson,
                    imageUrl: updatedPerson.imageUrl ?? undefined,
                    createdAt: updatedPerson.createdAt != null ? new Date(updatedPerson.createdAt) : undefined,
                    updatedAt: new Date(updatedPerson.updatedAt)
                })
            })
            utils.person.list.invalidate()
            // Role change may affect groups
            utils.group.list.invalidate()
        }
    })

    const deleteMutation = trpc.person.delete.useMutation({
        onSuccess: (deletedPerson) => {
            queueMicrotask(() => {
                store.removePerson(deletedPerson.id)
                // Remove person from all groups in local store immediately
                groupStore.removePersonFromAllGroups(deletedPerson.id)
            })
            utils.person.list.invalidate()
            // Invalidate groups since person was removed from them
            utils.group.list.invalidate()
        }
    })

    /** Update position (x, y) with debounce for drag performance. Optimistic update + debounced API. */
    const updatePersonPosition = useCallback((personId: string, x: number, y: number) => {
        store.updatePerson(personId, { x, y })

        if (positionUpdateTimeoutRef.current) {
            clearTimeout(positionUpdateTimeoutRef.current)
        }

        positionUpdateTimeoutRef.current = setTimeout(async () => {
            positionUpdateTimeoutRef.current = null
            try {
                await updateMutation.mutateAsync({ id: personId, x, y })
            } catch (error) {
                handleError(error, { title: 'Failed to save position' })
                utils.person.list.invalidate()
            }
        }, POSITION_DEBOUNCE_MS)
    }, [store, updateMutation, utils, handleError])

    const fetchPeople = async (siteId: string) => {
        const people = await utils.person.list.fetch({ siteId })
        const mappedPeople = people.map(p => ({
            ...p,
            imageUrl: p.imageUrl || undefined,
            groupIds: (p as { groupIds?: string[] }).groupIds ?? [],
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt)
        }))
        queueMicrotask(() => {
            store.setPeople(mappedPeople)
        })
    }

    return {
        people: store.people,
        isLoading: store.isLoading,
        error: store.error,
        addPerson: createMutation.mutateAsync,
        updatePerson: updateMutation.mutateAsync,
        updatePersonPosition,
        deletePerson: deleteMutation.mutateAsync,
        fetchPeople
    }
}
