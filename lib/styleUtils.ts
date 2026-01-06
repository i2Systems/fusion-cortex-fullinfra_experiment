/**
 * Shared Style Utilities
 * 
 * Centralized helper functions for design system consistency.
 * Use these instead of duplicating logic across components.
 */

// Status Token Classes
export const getStatusTokenClass = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'online':
        case 'active':
        case 'resolved':
            return 'token token-status-online' // Green/Success

        case 'offline':
        case 'inactive':
            return 'token token-status-offline' // Grey/Muted

        case 'missing':
        case 'error':
        case 'critical':
            return 'token token-status-error' // Red/Danger

        case 'warning':
        case 'expiring':
            return 'token token-status-warning' // Yellow/Warning

        case 'info':
            return 'token token-status-info' // Blue/Info

        default:
            return 'token token-status-offline'
    }
}

// Signal Strength Classes
export const getSignalTokenClass = (signal: number) => {
    if (signal >= 80) return 'token token-data token-data-signal-high'
    if (signal >= 50) return 'token token-data token-data-signal-medium'
    return 'token token-data token-data-signal-low'
}

// Battery Level Classes
export const getBatteryTokenClass = (battery: number) => {
    if (battery >= 80) return 'token token-data token-data-battery-high'
    if (battery >= 20) return 'token token-data token-data-battery-medium'
    return 'token token-data token-data-battery-low'
}

// Health KPI Colors
export const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-success)'
    if (percentage >= 70) return 'var(--color-warning)'
    return 'var(--color-danger)'
}
