/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI.
 * 
 * AI Note: This is a class component because React Error Boundaries
 * require getDerivedStateFromError and componentDidCatch lifecycle methods.
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
    children: ReactNode
    /** Optional custom fallback UI */
    fallback?: ReactNode
    /** Called when an error is caught */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
    /** Section name for better error messages */
    section?: string
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        this.setState({ errorInfo })

        // Call optional error handler
        this.props.onError?.(error, errorInfo)
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        })
    }

    handleGoHome = () => {
        window.location.href = '/dashboard'
    }

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            const sectionName = this.props.section || 'This section'
            const errorMessage = this.state.error?.message || 'An unexpected error occurred'

            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center">
                        <AlertTriangle size={40} className="text-[var(--color-danger)]" />
                    </div>

                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                        Something went wrong
                    </h3>

                    <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-2">
                        {sectionName} encountered an error and couldn&apos;t load properly.
                    </p>

                    <p className="text-xs text-[var(--color-text-soft)] max-w-md mx-auto mb-6 font-mono bg-[var(--color-surface-subtle)] px-3 py-2 rounded-lg">
                        {errorMessage}
                    </p>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={this.handleRetry}
                            className="gap-2"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={this.handleGoHome}
                            className="gap-2"
                        >
                            <Home size={16} />
                            Go to Dashboard
                        </Button>
                    </div>

                    {/* Show component stack in development */}
                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details className="mt-6 text-left w-full max-w-2xl">
                            <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)]">
                                Show technical details
                            </summary>
                            <pre className="mt-2 text-xs text-[var(--color-text-soft)] bg-[var(--color-surface-subtle)] p-4 rounded-lg overflow-auto max-h-48">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Higher-order component to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    section?: string
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary section={section}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        )
    }
}
