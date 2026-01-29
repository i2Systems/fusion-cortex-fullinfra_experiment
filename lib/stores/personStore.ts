import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Person {
    id: string
    firstName: string
    lastName: string
    email?: string | null
    role?: string | null
    imageUrl?: string | null
    x?: number | null
    y?: number | null
    siteId: string
    groupIds?: string[]
    createdAt: Date
    updatedAt: Date
}

interface PersonState {
    people: Person[]
    isLoading: boolean
    error: unknown | null

    // Actions
    setPeople: (people: Person[]) => void
    setLoading: (loading: boolean) => void
    setError: (error: unknown | null) => void
    addPerson: (person: Person) => void
    updatePerson: (personId: string, updates: Partial<Person>) => void
    removePerson: (personId: string) => void
}

export const usePersonStore = create<PersonState>()(
    immer((set) => ({
        people: [],
        isLoading: false,
        error: null,

        setPeople: (people) =>
            set((state) => {
                state.people = people
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

        addPerson: (person) =>
            set((state) => {
                state.people.push(person)
            }),

        updatePerson: (personId, updates) =>
            set((state) => {
                const index = state.people.findIndex((p) => p.id === personId)
                if (index >= 0) {
                    state.people[index] = { ...state.people[index], ...updates, updatedAt: new Date() }
                }
            }),

        removePerson: (personId) =>
            set((state) => {
                state.people = state.people.filter((p) => p.id !== personId)
            }),
    }))
)

// Selector for people array (renamed to avoid conflict with hooks/usePeople.ts)
export const usePersonList = () => usePersonStore((s) => s.people)
