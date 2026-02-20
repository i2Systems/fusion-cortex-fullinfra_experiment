import React, { HTMLAttributes, forwardRef } from 'react';

// --- Card Root ---
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'default', ...props }, ref) => {
        // Reusing the existing .fusion-card class for the main style
        const baseClass = 'fusion-card';
        return (
            <div
                ref={ref}
                className={`${baseClass} ${className}`}
                {...props}
            />
        );
    }
);
Card.displayName = 'Card';

// --- Card Header ---
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`flex flex-col ${className}`}
            style={{ 
                gap: 'var(--space-2)', 
                padding: 'var(--space-6)', 
                paddingBottom: 'var(--space-2)',
                ...props.style 
            }}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

// --- Card Title ---
export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className = '', ...props }, ref) => (
        <h3
            ref={ref}
            className={`text-2xl font-semibold leading-none tracking-tight text-[var(--color-text)] ${className}`}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

// --- Card Description ---
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className = '', ...props }, ref) => (
        <p
            ref={ref}
            className={`text-sm text-[var(--color-text-muted)] ${className}`}
            {...props}
        />
    )
);
CardDescription.displayName = 'CardDescription';

// --- Card Content ---
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div 
            ref={ref} 
            className={className}
            style={{ 
                padding: 'var(--space-6)', 
                paddingTop: 'var(--space-0)',
                ...props.style 
            }}
            {...props} 
        />
    )
);
CardContent.displayName = 'CardContent';

// --- Card Footer ---
// For panel-style action bars, use fusion-panel-footer and fusion-panel-footer-actions (see components.css).
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`flex items-center gap-2 ${className}`}
            style={{ 
                padding: 'var(--space-6)', 
                paddingTop: 'var(--space-0)',
                ...props.style 
            }}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';
