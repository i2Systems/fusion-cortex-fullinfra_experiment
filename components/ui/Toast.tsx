'use client'

import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Toast, useToast } from '@/lib/ToastContext'

const icons = {
    success: <CheckCircle2 size={20} className="text-[var(--color-success)]" />,
    error: <AlertCircle size={20} className="text-[var(--color-danger)]" />,
    info: <Info size={20} className="text-[var(--color-primary)]" />,
    warning: <AlertTriangle size={20} className="text-[var(--color-warning)]" />,
}

const bgColors = {
    success: 'bg-[var(--color-surface)] border-[var(--color-success)]',
    error: 'bg-[var(--color-surface)] border-[var(--color-danger)]',
    info: 'bg-[var(--color-surface)] border-[var(--color-primary)]',
    warning: 'bg-[var(--color-surface)] border-[var(--color-warning)]',
}

interface ToastItemProps {
    toast: Toast
    onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    return (
        <div
            className={`relative w-80 p-4 rounded-lg shadow-[var(--shadow-strong)] border-l-4 flex gap-3 animate-in slide-in-from-right-full fade-in duration-300 ${bgColors[toast.type]} bg-[var(--color-surface)]`}
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">
                {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <h4 className="font-semibold text-[var(--color-text)] mb-0.5 text-sm">
                        {toast.title}
                    </h4>
                )}
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {toast.message}
                </p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors self-start -mt-1 -mr-1 p-1"
            >
                <X size={16} />
            </button>
        </div>
    )
}

export function ToastContainer() {
    const { toasts, removeToast } = useToast()

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto flex flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </div>
    )
}
