import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Group {
    id: string
    name: string
    description?: string
    color: string
    siteId: string
    deviceIds: string[]
    personIds: string[]
    createdAt: Date
    updatedAt: Date
}

interface GroupState {
    groups: Group[]
    isLoading: boolean
    error: unknown | null

    // Actions
    setGroups: (groups: Group[]) => void
    setLoading: (loading: boolean) => void
    setError: (error: unknown | null) => void
    addGroup: (group: Group) => void
    updateGroup: (groupId: string, updates: Partial<Group>) => void
    removeGroup: (groupId: string) => void
    /** Remove a person from all groups (call when person deleted) */
    removePersonFromAllGroups: (personId: string) => void
}

export const useGroupStore = create<GroupState>()(
    immer((set) => ({
        groups: [],
        isLoading: false,
        error: null,

        setGroups: (groups) =>
            set((state) => {
                state.groups = groups
                state.error = null
            }),

        setLoading: (loading) =>
            set((state) => {
                state.isLoading = loading
            }),

        setError: (error) =>
            set((state) => {
                state.error = error
            }),

        addGroup: (group) =>
            set((state) => {
                state.groups.push(group)
            }),

        updateGroup: (groupId, updates) =>
            set((state) => {
                const index = state.groups.findIndex((g) => g.id === groupId)
                if (index >= 0) {
                    state.groups[index] = { ...state.groups[index], ...updates, updatedAt: new Date() }
                }
            }),

        removeGroup: (groupId) =>
            set((state) => {
                state.groups = state.groups.filter((g) => g.id !== groupId)
            }),

        removePersonFromAllGroups: (personId) =>
            set((state) => {
                state.groups.forEach((g) => {
                    g.personIds = g.personIds.filter((id) => id !== personId)
                })
            }),
    }))
)

// Selector for groups array (renamed to avoid conflict with hooks/useGroups.ts)
export const useGroupList = () => useGroupStore((s) => s.groups)
