import { LucideIcon, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface PanelEmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: ReactNode
    className?: string
    /** Variant for styling: 'default' or 'error' */
    variant?: 'default' | 'error'
    /** Retry callback - shows a retry button when provided */
    onRetry?: () => void
}

export function PanelEmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
    variant = 'default',
    onRetry,
}: PanelEmptyStateProps) {
    const isError = variant === 'error'

    return (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isError
                    ? 'bg-[var(--color-danger)]/10'
                    : 'bg-[var(--color-surface-subtle)]'
                }`}>
                <Icon size={40} className={
                    isError
                        ? 'text-[var(--color-danger)]'
                        : 'text-[var(--color-text-muted)]'
                } />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {title}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-8">
                {description}
            </p>
            {onRetry && (
                <Button
                    variant={isError ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={onRetry}
                    className="gap-2 mb-4"
                >
                    <RefreshCw size={16} />
                    Try Again
                </Button>
            )}
            {action}
        </div>
    )
}
