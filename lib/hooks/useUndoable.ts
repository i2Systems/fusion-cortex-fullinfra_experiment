'use client'

import { useState, useCallback } from 'react'

/**
 * useUndoable - Generic undo/redo hook
 * 
 * Manages a history stack for any state type, enabling undo/redo operations.
 * 
 * @param initialValue - The initial state value
 * @param maxHistory - Maximum number of history states to keep (default 50)
 */
export interface UndoableState<T> {
    /** Current state value */
    current: T
    /** Set a new state value (adds to history) */
    set: (value: T) => void
    /** Update state without adding to history (for intermediate states like drag) */
    setWithoutHistory: (value: T) => void
    /** Commit the current state to history (call after setWithoutHistory) */
    commit: () => void
    /** Undo to previous state */
    undo: () => void
    /** Redo to next state */
    redo: () => void
    /** Whether undo is possible */
    canUndo: boolean
    /** Whether redo is possible */
    canRedo: boolean
    /** Reset history with a new initial value */
    reset: (value: T) => void
}

export function useUndoable<T>(
    initialValue: T,
    maxHistory: number = 50
): UndoableState<T> {
    const [history, setHistory] = useState<T[]>([initialValue])
    const [historyIndex, setHistoryIndex] = useState(0)

    // Current value is derived from history
    const current = history[historyIndex]

    const set = useCallback((value: T) => {
        setHistory(prev => {
            // Remove any future states if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1)
            // Add new state
            newHistory.push(value)
            // Limit history size
            if (newHistory.length > maxHistory) {
                newHistory.shift()
                // Don't update historyIndex here since we're in the callback
                return newHistory
            }
            return newHistory
        })
        setHistoryIndex(prev => {
            const newLength = Math.min(prev + 2, maxHistory)
            return newLength - 1
        })
    }, [historyIndex, maxHistory])

    const setWithoutHistory = useCallback((value: T) => {
        // Update current position in history without creating new entry
        setHistory(prev => {
            const newHistory = [...prev]
            newHistory[historyIndex] = value
            return newHistory
        })
    }, [historyIndex])

    const commit = useCallback(() => {
        // Take current state and add it as a new history entry
        setHistory(prev => {
            const currentValue = prev[historyIndex]
            const newHistory = prev.slice(0, historyIndex + 1)
            newHistory.push(currentValue)
            if (newHistory.length > maxHistory) {
                newHistory.shift()
                return newHistory
            }
            return newHistory
        })
        setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1))
    }, [historyIndex, maxHistory])

    const undo = useCallback(() => {
        setHistoryIndex(prev => Math.max(0, prev - 1))
    }, [])

    const redo = useCallback(() => {
        setHistoryIndex(prev => Math.min(history.length - 1, prev + 1))
    }, [history.length])

    const reset = useCallback((value: T) => {
        setHistory([value])
        setHistoryIndex(0)
    }, [])

    return {
        current,
        set,
        setWithoutHistory,
        commit,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        reset,
    }
}
