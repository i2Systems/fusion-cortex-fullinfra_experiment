/**
 * Person Token Component
 * 
 * A subtle, compact person representation with hover tooltip and click-to-profile.
 * Used across the app for consistent person display.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Mail, Shield, MapPin } from 'lucide-react'
import { Person } from '@/lib/stores/personStore'

interface PersonTokenProps {
    person: Person
    size?: 'sm' | 'md' | 'lg'
    showName?: boolean
    /** When 'chip', avatar + name are one clickable pill; when 'avatar', only the circle (name can show beside as sibling) */
    layout?: 'avatar' | 'chip'
    onClick?: (personId: string) => void
    className?: string
    variant?: 'default' | 'subtle' | 'elevated'
    /** Minimal = name + avatar + "Click to view profile"; detailed = full role, email, etc.; none = no hover tooltip */
    tooltipDetailLevel?: 'minimal' | 'detailed' | 'none'
    /** Match MapPersonToken: show selection ring/border */
    isSelected?: boolean
    /** Match MapPersonToken: show hover state */
    isHovered?: boolean
}

export function PersonToken({
    person,
    size = 'md',
    showName = false,
    layout = 'avatar',
    onClick,
    className = '',
    variant = 'default',
    tooltipDetailLevel = 'detailed',
    isSelected = false,
    isHovered = false,
}: PersonTokenProps) {
    const [showTooltip, setShowTooltip] = useState(false)
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
    const tokenRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    }

    const variantClasses = {
        default: 'border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]',
        subtle: 'border-[var(--color-border-subtle)]/50 bg-[var(--color-surface-subtle)]/50',
        elevated: 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]'
    }

    // Calculate tooltip position
    useEffect(() => {
        if (showTooltip && tokenRef.current && tooltipRef.current) {
            const rect = tokenRef.current.getBoundingClientRect()
            const tooltipRect = tooltipRef.current.getBoundingClientRect()
            
            // Position above the token, centered
            setTooltipPosition({
                x: rect.left + (rect.width / 2) - (tooltipRect.width / 2),
                y: rect.top - tooltipRect.height - 8
            })
        }
    }, [showTooltip])

    const handleClick = () => {
        if (onClick) {
            onClick(person.id)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault()
            onClick(person.id)
        }
    }

    const showHoverTooltip = tooltipDetailLevel !== 'none'
    const handleMouseEnter = () => {
        if (showHoverTooltip) setShowTooltip(true)
    }

    const handleMouseLeave = () => {
        setShowTooltip(false)
    }

    const isChip = layout === 'chip'

    const avatarContent = (
        <div
            className={`
                relative ${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
                ${isChip ? 'border border-[var(--color-border-subtle)]/50' : `border ${variantClasses[variant]}`}
            `}
        >
            {person.imageUrl ? (
                <img 
                    src={person.imageUrl} 
                    alt={`${person.firstName} ${person.lastName}`}
                    className="w-full h-full object-cover"
                />
            ) : (
                <User 
                    size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} 
                    className="text-[var(--color-text-muted)]" 
                />
            )}
        </div>
    )

    const nameEl = (showName || isChip) && (
        <span className="text-sm text-[var(--color-text-muted)] truncate">
            {person.firstName} {person.lastName}
        </span>
    )

    // Only show ring on chip (pill) so it follows the rounded shape; avatar uses border-only to avoid square ring
    const selectionRing = isChip && isSelected ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg)]' : ''
    const hoverBorder = isHovered && !isSelected ? 'border-[var(--color-primary)]/50' : ''
    const wrapperClass = isChip
        ? `relative inline-flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-2.5 ${variantClasses[variant]} max-w-full ${selectionRing} ${hoverBorder} ${onClick ? 'cursor-pointer hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-soft)] transition-all' : ''} ${className}`
        : `relative inline-flex items-center gap-2 ${hoverBorder} ${className}`

    const innerAvatarOnlyClass = `
        ${sizeClasses[size]} rounded-full border flex items-center justify-center flex-shrink-0 overflow-hidden
        ${variantClasses[variant]}
        ${isSelected ? 'border-2 border-[var(--color-primary)]' : ''}
        ${onClick ? 'cursor-pointer hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-soft)] transition-all' : ''}
    `

    return (
        <>
            <div
                ref={tokenRef}
                onClick={onClick ? handleClick : undefined}
                onKeyDown={onClick ? handleKeyDown : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                tabIndex={onClick ? 0 : undefined}
                className={wrapperClass}
                title={!isChip && !showName ? `${person.firstName} ${person.lastName}` : undefined}
                role={onClick ? 'button' : undefined}
                aria-label={onClick ? `${person.firstName} ${person.lastName}` : undefined}
            >
                {isChip ? (
                    <>
                        {avatarContent}
                        {nameEl}
                    </>
                ) : (
                    <>
                        <div
                            className={innerAvatarOnlyClass}
                            title={showName ? undefined : `${person.firstName} ${person.lastName}`}
                        >
                            {person.imageUrl ? (
                                <img 
                                    src={person.imageUrl} 
                                    alt={`${person.firstName} ${person.lastName}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User 
                                    size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} 
                                    className="text-[var(--color-text-muted)]" 
                                />
                            )}
                        </div>
                        {showName && nameEl}
                    </>
                )}
            </div>

            {/* Tooltip - only when not 'none' */}
            {showTooltip && showHoverTooltip && (
                <div
                    ref={tooltipRef}
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                    }}
                >
                    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-lg shadow-[var(--shadow-strong)] p-2.5 min-w-[200px] max-w-[280px]">
                        {/* Header: avatar + name */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {person.imageUrl ? (
                                    <img 
                                        src={person.imageUrl} 
                                        alt={`${person.firstName} ${person.lastName}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User size={14} className="text-[var(--color-text-muted)]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sm text-[var(--color-text)] truncate">
                                    {person.firstName} {person.lastName}
                                </div>
                                {tooltipDetailLevel === 'detailed' && person.role && (
                                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                        <Shield size={10} />
                                        <span>{person.role}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details - only when detailed */}
                        {tooltipDetailLevel === 'detailed' && (
                            <div className="space-y-1.5 text-xs">
                                {person.email && (
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-soft)]">
                                        <Mail size={11} className="flex-shrink-0 text-[var(--color-text-muted)]" />
                                        <span className="truncate">{person.email}</span>
                                    </div>
                                )}
                                {(person.x !== null && person.x !== undefined && person.y !== null && person.y !== undefined) && (
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-soft)]">
                                        <MapPin size={11} className="flex-shrink-0 text-[var(--color-text-muted)]" />
                                        <span>Placed on map</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Click hint */}
                        {onClick && (
                            <div className={tooltipDetailLevel === 'detailed' ? 'mt-2 pt-2 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] text-center' : 'text-[10px] text-[var(--color-text-muted)] text-center'}>
                                Click to view profile
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
