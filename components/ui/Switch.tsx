import React from 'react';

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, disabled = false, className = '', id }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            id={id}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={`
                group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
                ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            <span
                className={`
                    pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            >
                <span
                    className={`
                        absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
                        ${checked ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}
                    `}
                    aria-hidden="true"
                >
                    <svg className="h-3 w-3 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 12 12">
                        <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1" y1="11" x2="11" y2="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </span>
                <span
                    className={`
                        absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
                        ${checked ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}
                    `}
                    aria-hidden="true"
                >
                    <svg className="h-3 w-3 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                    </svg>
                </span>
            </span>
        </button>
    );
};
