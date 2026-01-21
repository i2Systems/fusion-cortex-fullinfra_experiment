/**
 * useErrorHandler Hook
 * 
 * Centralized error handling that converts errors to user-friendly toast notifications.
 * Keeps console logging for debugging while providing user feedback.
 * 
 * AI Note: Use this hook in catch blocks to show consistent error messages.
 */

'use client'

import { useCallback } from 'react'
import { useToast } from '@/lib/ToastContext'

export interface ErrorHandlerOptions {
    /** Title for the toast notification */
    title?: string
    /** Override the error message */
    message?: string
    /** Retry callback to offer recovery */
    retry?: () => void
    /** Whether to also log to console (default: true) */
    logToConsole?: boolean
    /** Toast duration in ms (default: 5000) */
    duration?: number
}

interface ParsedError {
    message: string
    type: 'network' | 'validation' | 'auth' | 'server' | 'unknown'
    originalError: unknown
}

/**
 * Parse an error into a user-friendly message and type
 */
function parseError(error: unknown): ParsedError {
    // Handle null/undefined
    if (!error) {
        return {
            message: 'An unexpected error occurred',
            type: 'unknown',
            originalError: error,
        }
    }

    // Handle Error objects
    if (error instanceof Error) {
        const message = error.message

        // Network errors
        if (
            message.includes('fetch') ||
            message.includes('network') ||
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            message.includes('ECONNREFUSED')
        ) {
            return {
                message: 'Unable to connect. Please check your internet connection.',
                type: 'network',
                originalError: error,
            }
        }

        // Auth errors
        if (
            message.includes('unauthorized') ||
            message.includes('Unauthorized') ||
            message.includes('401') ||
            message.includes('forbidden') ||
            message.includes('403')
        ) {
            return {
                message: 'You don\'t have permission to perform this action.',
                type: 'auth',
                originalError: error,
            }
        }

        // Validation errors (typically from tRPC/Zod)
        if (
            message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('required') ||
            message.includes('ZodError')
        ) {
            return {
                message: 'Please check your input and try again.',
                type: 'validation',
                originalError: error,
            }
        }

        // Server errors
        if (
            message.includes('500') ||
            message.includes('Internal Server Error') ||
            message.includes('server')
        ) {
            return {
                message: 'Something went wrong on our end. Please try again later.',
                type: 'server',
                originalError: error,
            }
        }

        // Return the original message if it's user-friendly (short enough)
        if (message.length < 100 && !message.includes('Error:')) {
            return {
                message,
                type: 'unknown',
                originalError: error,
            }
        }

        return {
            message: 'An unexpected error occurred. Please try again.',
            type: 'unknown',
            originalError: error,
        }
    }

    // Handle tRPC errors (which may have a different structure)
    if (typeof error === 'object' && error !== null) {
        const errObj = error as Record<string, unknown>

        // tRPC error shape
        if ('message' in errObj && typeof errObj.message === 'string') {
            return parseError(new Error(errObj.message))
        }

        // Error with data field
        if ('data' in errObj && typeof errObj.data === 'object') {
            const data = errObj.data as Record<string, unknown>
            if ('message' in data && typeof data.message === 'string') {
                return parseError(new Error(data.message))
            }
        }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return parseError(new Error(error))
    }

    return {
        message: 'An unexpected error occurred',
        type: 'unknown',
        originalError: error,
    }
}

/**
 * Hook for consistent error handling with toast notifications
 * 
 * @example
 * ```tsx
 * const { handleError } = useErrorHandler()
 * 
 * try {
 *   await saveSomething()
 * } catch (error) {
 *   handleError(error, { title: 'Failed to save' })
 * }
 * ```
 */
export function useErrorHandler() {
    const { addToast } = useToast()

    const handleError = useCallback(
        (error: unknown, options: ErrorHandlerOptions = {}) => {
            const {
                title,
                message: customMessage,
                logToConsole = true,
                duration = 5000,
            } = options

            // Parse the error
            const parsed = parseError(error)

            // Log to console for debugging
            if (logToConsole) {
                console.error(title || 'Error:', parsed.originalError)
            }

            // Determine the message to show
            const displayMessage = customMessage || parsed.message

            // Show toast notification
            addToast({
                type: 'error',
                title: title || 'Error',
                message: displayMessage,
                duration,
            })

            // Return parsed error for further handling if needed
            return parsed
        },
        [addToast]
    )

    /**
     * Show a warning toast (less severe than error)
     */
    const handleWarning = useCallback(
        (message: string, title?: string) => {
            addToast({
                type: 'warning',
                title: title || 'Warning',
                message,
                duration: 4000,
            })
        },
        [addToast]
    )

    /**
     * Show a success toast
     */
    const handleSuccess = useCallback(
        (message: string, title?: string) => {
            addToast({
                type: 'success',
                title,
                message,
                duration: 3000,
            })
        },
        [addToast]
    )

    return {
        handleError,
        handleWarning,
        handleSuccess,
        parseError,
    }
}
