import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PanelEmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: ReactNode
    className?: string
}

export function PanelEmptyState({ icon: Icon, title, description, action, className = '' }: PanelEmptyStateProps) {
    return (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
                <Icon size={40} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {title}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-8">
                {description}
            </p>
            {action}
        </div>
    )
}
