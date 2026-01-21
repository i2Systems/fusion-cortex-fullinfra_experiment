'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    type: ToastType
    title?: string
    message: string
    duration?: number
}

interface ToastContextType {
    toasts: Toast[]
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Deduplication window in milliseconds
const DEDUPE_WINDOW_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    // Track recent toasts to prevent duplicates
    // Key: `${type}:${title}:${message}`, Value: timestamp
    const recentToastsRef = useRef<Map<string, number>>(new Map())

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const addToast = useCallback(({ type, title, message, duration = 5000 }: Omit<Toast, 'id'>) => {
        // Create a key for deduplication
        const dedupeKey = `${type}:${title || ''}:${message}`
        const now = Date.now()

        // Check if we've shown this toast recently
        const lastShown = recentToastsRef.current.get(dedupeKey)
        if (lastShown && (now - lastShown) < DEDUPE_WINDOW_MS) {
            // Skip duplicate toast
            return
        }

        // Record this toast
        recentToastsRef.current.set(dedupeKey, now)

        // Clean up old entries periodically
        if (recentToastsRef.current.size > 50) {
            const cutoff = now - DEDUPE_WINDOW_MS
            for (const [key, timestamp] of recentToastsRef.current.entries()) {
                if (timestamp < cutoff) {
                    recentToastsRef.current.delete(key)
                }
            }
        }

        const id = Math.random().toString(36).substring(2, 9)
        const newToast = { id, type, title, message, duration }

        setToasts((prev) => [...prev, newToast])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

