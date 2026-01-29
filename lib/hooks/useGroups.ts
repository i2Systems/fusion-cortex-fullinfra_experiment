import { useGroupStore } from '@/lib/stores/groupStore'
import { trpc } from '@/lib/trpc/client'

/**
 * useGroups - Consumer hook for group operations.
 * Groups are auto-synced by useGroupSync in StateHydration.
 */
export function useGroups() {
    const store = useGroupStore()
    const utils = trpc.useUtils()

    const createMutation = trpc.group.create.useMutation({
        onSuccess: (newGroup) => {
            queueMicrotask(() => {
                store.addGroup({
                    ...newGroup,
                    description: newGroup.description || undefined,
                    deviceIds: newGroup.deviceIds ?? [],
                    personIds: newGroup.personIds ?? [],
                    createdAt: new Date(newGroup.createdAt),
                    updatedAt: new Date(newGroup.updatedAt)
                })
            })
            utils.group.list.invalidate()
        }
    })

    const updateMutation = trpc.group.update.useMutation({
        onSuccess: (updatedGroup) => {
            queueMicrotask(() => {
                store.updateGroup(updatedGroup.id, {
                    ...updatedGroup,
                    description: updatedGroup.description || undefined,
                    deviceIds: updatedGroup.deviceIds ?? [],
                    personIds: updatedGroup.personIds ?? [],
                    updatedAt: new Date(updatedGroup.updatedAt)
                })
            })
            utils.group.list.invalidate()
        }
    })

    const deleteMutation = trpc.group.delete.useMutation({
        onSuccess: (deletedGroup) => {
            queueMicrotask(() => {
                store.removeGroup(deletedGroup.id)
            })
            utils.group.list.invalidate()
        }
    })

    return {
        groups: store.groups,
        isLoading: store.isLoading,
        error: store.error,
        addGroup: createMutation.mutateAsync,
        updateGroup: updateMutation.mutateAsync,
        deleteGroup: deleteMutation.mutateAsync,
        /** Force refetch groups (normally auto-synced) */
        refetchGroups: () => utils.group.list.invalidate(),
    }
}
