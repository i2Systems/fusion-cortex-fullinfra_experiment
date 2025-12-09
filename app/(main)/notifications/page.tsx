/**
 * Notifications Page
 * 
 * Full list of all notifications with ability to mark as read,
 * dismiss, and navigate to related pages.
 * 
 * AI Note: Notifications link to various sections of the app.
 */

'use client'

import { useState, useMemo } from 'react'
import { useNotifications, NotificationType } from '@/lib/NotificationContext'
import { useRouter } from 'next/navigation'
import { Radar, AlertTriangle, Layers, Network, Workflow, Search, Home, X, CheckCheck, Mail, ArrowUpDown, Clock, Filter, Sparkles } from 'lucide-react'
import Link from 'next/link'

const typeIcons: Record<string, any> = {
  discovery: Radar,
  fault: AlertTriangle,
  zone: Layers,
  bacnet: Network,
  rule: Workflow,
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

type SortOption = 'newest' | 'oldest' | 'type' | 'unread-first'

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, dismissNotification, addNotification } = useNotifications()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Import generateRandomNotification from context (we'll need to export it)
  const handleGenerateRandom = () => {
    const now = new Date()
    const types: NotificationType[] = ['discovery', 'fault', 'zone', 'bacnet', 'rule', 'device', 'system']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const notifications: Record<NotificationType, { titles: string[], messages: string[], links: string[] }> = {
      discovery: {
        titles: ['Discovery Scan Completed', 'New Devices Detected', 'Background Scan Finished', 'Network Discovery Update'],
        messages: ['New devices discovered in the network. Review and map devices.', 'Devices found during background scan. Map them to zones.', 'Network scan completed. Review discovered devices.', 'Additional devices detected. Update device inventory.'],
        links: ['/discovery', '/map'],
      },
      fault: {
        titles: ['Device Offline Detected', 'Device Signal Weak', 'Battery Low Warning', 'Connection Issue Detected'],
        messages: ['Devices are currently offline. Check device health and connectivity.', 'Device has low signal strength. Consider repositioning or checking network.', 'Device battery is below 20%. Schedule replacement soon.', 'Device connection unstable. Review network settings.'],
        links: ['/faults', '/lookup'],
      },
      zone: {
        titles: ['Zone Configuration Updated', 'Zone Devices Changed', 'Zone Mapping Modified'],
        messages: ['Zone has been modified. Review zone settings.', 'Devices in zone have changed. Update zone configuration.', 'Zone boundaries updated. Verify device assignments.'],
        links: ['/zones', '/map'],
      },
      bacnet: {
        titles: ['BACnet Connection Error', 'BACnet Sync Completed', 'BMS Integration Update'],
        messages: ['Zone BACnet connection failed. Check BMS integration settings.', 'BACnet synchronization completed successfully.', 'Building Management System integration updated.'],
        links: ['/bacnet'],
      },
      rule: {
        titles: ['Rule Triggered', 'Rule Condition Met', 'Automation Activated'],
        messages: ['Motion Activation rule activated. View rule details.', 'Rule condition satisfied. Automation executed.', 'Scheduled rule triggered. Check zone status.'],
        links: ['/rules'],
      },
      device: {
        titles: ['Device Signal Weak', 'Device Status Changed', 'Device Configuration Updated'],
        messages: ['Device has low signal strength. Consider repositioning.', 'Device status has changed. Review device details.', 'Device configuration modified. Verify settings.'],
        links: ['/lookup', '/map'],
      },
      system: {
        titles: ['System Health Check', 'System Update Available', 'Maintenance Reminder'],
        messages: ['System health check completed. Some devices require attention.', 'System update available. Review changelog.', 'Scheduled maintenance window approaching.'],
        links: ['/dashboard'],
      },
    }
    
    const templates = notifications[type]
    const titleIndex = Math.floor(Math.random() * templates.titles.length)
    const linkIndex = Math.floor(Math.random() * templates.links.length)
    
    const newNotification = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: templates.titles[titleIndex],
      message: templates.messages[titleIndex],
      timestamp: now,
      read: false,
      link: templates.links[linkIndex],
    }
    
    addNotification(newNotification)
  }

  const filteredNotifications = useMemo(() => {
    let filtered = filter === 'unread' 
      ? notifications.filter(n => !n.read)
      : notifications
    
    // Sort notifications
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp.getTime() - a.timestamp.getTime()
        case 'oldest':
          return a.timestamp.getTime() - b.timestamp.getTime()
        case 'type':
          return a.type.localeCompare(b.type) || b.timestamp.getTime() - a.timestamp.getTime()
        case 'unread-first':
          if (a.read !== b.read) return a.read ? 1 : -1
          return b.timestamp.getTime() - a.timestamp.getTime()
        default:
          return 0
      }
    })
    
    return sorted
  }, [notifications, filter, sortBy])

  // Determine card size and styling based on content and position
  const getCardSize = (notification: any, index: number) => {
    // Make some unread notifications span 2 columns for visual interest
    if (!notification.read && index % 4 === 0) {
      return 'md:col-span-2'
    }
    return ''
  }
  
  const getCardHeight = (notification: any) => {
    const messageLength = notification.message.length
    // Unread notifications or long messages get more height
    if (!notification.read) {
      return messageLength > 120 ? 'min-h-[200px]' : 'min-h-[170px]'
    }
    return messageLength > 100 ? 'min-h-[160px]' : 'min-h-[140px]'
  }

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
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-1">
              <Filter size={14} className="text-[var(--color-text-muted)] ml-1" />
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  filter === 'unread'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
              >
                Unread
              </button>
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2 bg-[var(--color-surface-subtle)] rounded-lg p-1">
              <ArrowUpDown size={14} className="text-[var(--color-text-muted)] ml-1" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 rounded text-sm bg-transparent text-[var(--color-text)] border-none outline-none cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="unread-first">Unread First</option>
                <option value="type">By Type</option>
              </select>
            </div>

            {/* Generate Random - Surreptitious */}
            <button
              onClick={handleGenerateRandom}
              className="p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-soft)] hover:text-[var(--color-text-muted)] transition-all duration-200 opacity-40 hover:opacity-100"
              title="Generate random notification"
            >
              <Sparkles size={16} />
            </button>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] text-sm text-[var(--color-text)] transition-all duration-200 flex items-center gap-2 hover:scale-105"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Grid/Masonry */}
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
          <div className="notifications-grid">
            {filteredNotifications.map((notification, index) => {
              const Icon = typeIcons[notification.type] || AlertTriangle
              const color = typeColors[notification.type] || 'var(--color-text-muted)'
              const cardSize = getCardSize(notification, index)
              const cardHeight = getCardHeight(notification)
              const messageLength = notification.message.length
              const shouldClamp = notification.read && messageLength <= 100
              
              return (
                <div
                  key={notification.id}
                  className={`
                    fusion-card p-5 cursor-pointer transition-all duration-300 group h-full flex flex-col
                    ${notification.read 
                      ? 'opacity-75 hover:opacity-100 border-[var(--color-border-subtle)]' 
                      : 'border-[var(--color-primary)]/40 shadow-[var(--shadow-glow-primary)]/30'
                    }
                    hover:shadow-[var(--shadow-soft)] hover:scale-[1.02] hover:-translate-y-1
                    ${cardSize} ${cardHeight}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div 
                      className="p-3 rounded-xl flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                      style={{ 
                        backgroundColor: notification.read ? 'var(--color-surface-subtle)' : `${color}20`,
                      }}
                    >
                      <Icon 
                        size={22} 
                        style={{ 
                          color: notification.read ? 'var(--color-text-muted)' : color 
                        }} 
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-2 flex-shrink-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className={`text-base font-semibold ${notification.read ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium animate-pulse flex-shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          <p className={`text-sm text-[var(--color-text-muted)] leading-relaxed ${shouldClamp ? 'line-clamp-2' : ''}`}>
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (notification.read) {
                                markAsUnread(notification.id)
                              } else {
                                markAsRead(notification.id)
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-all duration-200 hover:scale-110"
                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            <Mail size={16} className="text-[var(--color-text-muted)]" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissNotification(notification.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-all duration-200 hover:scale-110"
                            title="Dismiss"
                          >
                            <X size={16} className="text-[var(--color-text-muted)]" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[var(--color-border-subtle)] flex-shrink-0">
                        <Clock size={12} className="text-[var(--color-text-soft)]" />
                        <span className="text-xs text-[var(--color-text-soft)]">
                          {formatTime(notification.timestamp)}
                        </span>
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

