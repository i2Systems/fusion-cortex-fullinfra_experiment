/**
 * Notifications Page
 * 
 * Full list of all notifications with ability to mark as read,
 * dismiss, and navigate to related pages.
 * 
 * AI Note: Notifications link to various sections of the app.
 */

'use client'

import { useState } from 'react'
import { useNotifications } from '@/lib/NotificationContext'
import { useRouter } from 'next/navigation'
import { Radar, AlertTriangle, Layers, Network, Settings, Search, Home, X, CheckCheck, Mail } from 'lucide-react'
import Link from 'next/link'

const typeIcons: Record<string, any> = {
  discovery: Radar,
  fault: AlertTriangle,
  zone: Layers,
  bacnet: Network,
  rule: Settings,
  device: Search,
  system: Home,
}

const typeColors: Record<string, string> = {
  discovery: 'var(--color-primary)',
  fault: 'var(--color-danger)',
  zone: 'var(--color-accent)',
  bacnet: 'var(--color-warning)',
  rule: 'var(--color-success)',
  device: 'var(--color-primary)',
  system: 'var(--color-text-muted)',
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, dismissNotification } = useNotifications()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    router.push(notification.link)
  }

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Header */}
      <div className="px-[20px] pt-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Notifications</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  filter === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  filter === 'unread'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Unread
              </button>
            </div>
            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] text-sm text-[var(--color-text)] transition-colors flex items-center gap-2"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-auto px-[20px] py-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here when events occur.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filteredNotifications.map((notification) => {
              const Icon = typeIcons[notification.type] || AlertTriangle
              const color = typeColors[notification.type] || 'var(--color-text-muted)'
              
              return (
                <div
                  key={notification.id}
                  className={`
                    fusion-card p-4 cursor-pointer transition-all group
                    ${notification.read 
                      ? 'opacity-75 hover:opacity-100' 
                      : 'border-[var(--color-primary)]/30'
                    }
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div 
                      className="p-2.5 rounded-lg flex-shrink-0"
                      style={{ 
                        backgroundColor: notification.read ? 'var(--color-surface-subtle)' : `${color}20`,
                      }}
                    >
                      <Icon 
                        size={20} 
                        style={{ 
                          color: notification.read ? 'var(--color-text-muted)' : color 
                        }} 
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1">
                          <h3 className={`text-sm font-semibold mb-1 ${notification.read ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (notification.read) {
                                markAsUnread(notification.id)
                              } else {
                                markAsRead(notification.id)
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            <Mail size={16} className="text-[var(--color-text-muted)]" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissNotification(notification.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
                            title="Dismiss"
                          >
                            <X size={16} className="text-[var(--color-text-muted)]" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-[var(--color-text-soft)]">
                          {formatTime(notification.timestamp)}
                        </span>
                        {!notification.read && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

