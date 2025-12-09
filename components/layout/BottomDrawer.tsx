/**
 * Bottom Drawer Component
 * 
 * Slide-up drawer for:
 * - Discovery status (last run, issues)
 * - Fault summary
 * - Background tasks (exports, syncs)
 * 
 * AI Note: This should be collapsible and show summary info
 * when collapsed, full details when expanded.
 */

'use client'

import { ChevronUp, ChevronDown, Radar, AlertTriangle, Layers, Network, Workflow, Search, Home, X } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '@/lib/NotificationContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BottomDrawerProps {
  children?: React.ReactNode
}

const typeIcons: Record<string, any> = {
  discovery: Radar,
  fault: AlertTriangle,
  zone: Layers,
  bacnet: Network,
  rule: Workflow,
  device: Search,
  system: Home,
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { notifications, unreadCount, markAsRead, dismissNotification } = useNotifications()
  const router = useRouter()
  
  // Get recent notifications (show more for horizontal scroll)
  const recentNotifications = notifications.slice(0, 10)

  return (
    <div
      className={`
        fixed bottom-0 left-20 right-0
        bg-[var(--color-surface)] backdrop-blur-xl border-t border-[var(--color-border-subtle)] 
        transition-all duration-300 ease-out
        ${isExpanded ? 'h-64' : 'h-12'}
      `}
      style={{ zIndex: 'var(--z-drawer)' }}
    >
      {/* Drawer Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-12 flex items-center justify-between px-6 hover:bg-[var(--color-surface-subtle)] transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--color-text)]">
            Status
          </span>
          {/* Summary info */}
          <span className="text-xs text-[var(--color-text-muted)]">
            Discovery: 1,998 devices found — 2 missing
            {unreadCount > 0 && (
              <span className="ml-2 text-[var(--color-primary)]">
                • {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronUp size={18} className="text-[var(--color-text-muted)]" />
        )}
      </button>

      {/* Drawer Content - Visible when expanded */}
      {isExpanded && (
        <div className="h-[calc(16rem-3rem)] overflow-hidden p-3 flex flex-col">
          {children || (
            <div className="flex flex-col h-full">
              {/* Horizontal scrolling cards */}
              {recentNotifications.length > 0 ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                  <div className="flex gap-3 h-full items-stretch">
                    {recentNotifications.map((notification) => {
                      const Icon = typeIcons[notification.type] || AlertTriangle
                      const timeAgo = Math.floor((Date.now() - notification.timestamp.getTime()) / (1000 * 60))
                      const timeText = timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m` : `${Math.floor(timeAgo / 60)}h`
                      
                      return (
                        <div
                          key={notification.id}
                          className={`
                            w-64 flex-shrink-0 p-3 rounded-lg border transition-all cursor-pointer group
                            ${notification.read 
                              ? 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)]' 
                              : 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]/40'
                            }
                            hover:shadow-[var(--shadow-soft)] hover:border-[var(--color-primary)]/50
                          `}
                          onClick={() => {
                            markAsRead(notification.id)
                            router.push(notification.link)
                            setIsExpanded(false)
                          }}
                        >
                          <div className="flex flex-col h-full">
                            {/* Header with icon and dismiss */}
                            <div className="flex items-start justify-between mb-2">
                              <div className={`p-1.5 rounded-lg flex-shrink-0 ${notification.read ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-primary)]/20'}`}>
                                <Icon size={14} className={notification.read ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'} />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="p-1 rounded-md hover:bg-[var(--color-surface)] transition-colors opacity-0 group-hover:opacity-100"
                                title="Dismiss"
                              >
                                <X size={12} className="text-[var(--color-text-muted)]" />
                              </button>
                            </div>
                            
                            {/* Title */}
                            <h4 className={`text-xs font-semibold mb-1.5 line-clamp-2 leading-snug ${notification.read ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                              {notification.title}
                            </h4>
                            
                            {/* Message */}
                            <p className="text-xs text-[var(--color-text-muted)] line-clamp-3 mb-2 flex-1 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            {/* Footer with time and unread indicator */}
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-border-subtle)]">
                              <span className="text-xs text-[var(--color-text-soft)]">
                                {timeText}
                              </span>
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* View All link as last card */}
                    <Link
                      href="/notifications"
                      className="w-64 flex-shrink-0 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-all flex items-center justify-center group"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(false)
                      }}
                    >
                      <span className="text-xs font-medium text-[var(--color-primary)] group-hover:underline">
                        View All →
                      </span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--color-text-muted)] text-center py-4">
                  No notifications
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

