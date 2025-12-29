/**
 * Notifications Page
 * 
 * Full list of all notifications with ability to mark as read,
 * dismiss, and navigate to related pages.
 * 
 * AI Note: Notifications link to various sections of the app.
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useNotifications, NotificationType } from '@/lib/NotificationContext'
import { useSite } from '@/lib/SiteContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { AlertTriangle, Layers, Network, Workflow, Search, Home, X, CheckCheck, Mail, ArrowUpDown, Clock, Filter, Sparkles, List, Grid3x3, LayoutGrid, Columns, Rss, Building2 } from 'lucide-react'
import Link from 'next/link'

const typeIcons: Record<string, any> = {
  fault: AlertTriangle,
  zone: Layers,
  bacnet: Network,
  rule: Workflow,
  device: Search,
  system: Home,
}

const typeColors: Record<string, string> = {
  fault: 'var(--color-danger)',
  zone: 'var(--color-accent)',
  bacnet: 'var(--color-warning)',
  rule: 'var(--color-success)',
  device: 'var(--color-primary)',
  system: 'var(--color-text-muted)',
}

type SortOption = 'newest' | 'oldest' | 'type' | 'unread-first'
type LayoutOption = 'singular' | 'grid' | 'double-list' | 'mortar'

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, dismissNotification, addNotification } = useNotifications()
  const { sites, activeSiteId } = useSite()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize filters from URL params
  const [filter, setFilter] = useState<'all' | 'unread' | 'faults'>(
    (searchParams.get('filter') as 'all' | 'unread' | 'faults') || 'all'
  )
  const [siteFilter, setSiteFilter] = useState<string | 'all'>(
    searchParams.get('siteFilter') || 'all'
  )
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [layout, setLayout] = useState<LayoutOption>('singular')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Update filters when URL params change
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    const siteFilterParam = searchParams.get('siteFilter')
    if (filterParam && ['all', 'unread', 'faults'].includes(filterParam)) {
      setFilter(filterParam as 'all' | 'unread' | 'faults')
    }
    if (siteFilterParam) {
      setSiteFilter(siteFilterParam)
    }
  }, [searchParams])

  // Import generateRandomNotification from context (we'll need to export it)
  const handleGenerateRandom = () => {
    const now = new Date()
    const types: NotificationType[] = ['fault', 'zone', 'bacnet', 'rule', 'device', 'system', 'warranty']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const notifications: Record<NotificationType, { titles: string[], messages: string[], links: string[] }> = {
      fault: {
        titles: [
          'Environmental Ingress Detected',
          'Electrical Driver Failure',
          'Thermal Overheat Warning',
          'Installation Wiring Error',
          'Control System Integration Issue',
          'Manufacturing Defect Found',
          'Mechanical Hardware Problem',
          'Optical Output Abnormality',
        ],
        messages: [
          'Water intrusion detected in fixture housing. Device shows signs of moisture damage. Inspect seals and gaskets.',
          'Legacy 6043 driver burnout - no power output. Device requires driver replacement. Check warranty status.',
          'Input cable melting detected due to excessive current. Device shows thermal stress. Review power distribution.',
          'Power landed on dim line instead of power line. Device miswired during installation. Verify wiring diagram.',
          'GRX-TVI trim level issues causing incorrect dimming. Device not responding to control signals. Check control module.',
          'Loose internal parts causing intermittent connection. Device shows manufacturing defect. Document and contact manufacturer.',
          'Bezel detaching from fixture housing. Device has structural mounting issue. Inspect bracket geometry.',
          'Single LED out in fixture array. Device shows optical output abnormality. Check LED module connections.',
        ],
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
      warranty: {
        titles: ['Warranty Expired', 'Warranty Expiring Soon', 'Component Warranty Expired'],
        messages: ['Device warranty has expired. Consider replacement or extended warranty options.', 'Device warranty expires soon. Review replacement options before expiry.', 'Component warranty expired. Component replacement may be needed.'],
        links: ['/lookup'],
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
    let filtered = notifications
    
    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (filter === 'faults') {
      // Show only fault notifications
      filtered = filtered.filter(n => n.type === 'fault')
    }
    
    // Apply site filter
    if (siteFilter !== 'all') {
      const beforeCount = filtered.length
      filtered = filtered.filter(n => {
        // Only include notifications for the selected site (exclude global notifications when filtering by site)
        const matches = n.siteId === siteFilter
        return matches
      })
      const afterCount = filtered.length
      console.log(`[Notifications] Site filter "${siteFilter}": ${beforeCount} -> ${afterCount} notifications`)
      console.log(`[Notifications] Sample siteIds in notifications:`, notifications.slice(0, 3).map(n => ({ id: n.id, siteId: n.siteId })))
    } else {
      // When showing "All Sites", show all notifications (both site-specific and global)
      // No filtering needed
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(notification => {
        const searchableText = [
          notification.title,
          notification.message,
          notification.type,
        ].filter(Boolean).join(' ').toLowerCase()
        return searchableText.includes(query)
      })
    }
    
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
  }, [notifications, filter, siteFilter, sortBy, searchQuery])

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
      {/* Top Search Island */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          placeholder="Search notifications..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
      
      {/* Header Controls */}
      <div className="px-[20px] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
            {/* Layout Toggle */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-1">
              <button
                onClick={() => setLayout('singular')}
                className={`p-2 rounded transition-all duration-200 ${
                  layout === 'singular'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
                title="Feed Layout"
              >
                <Rss size={16} />
              </button>
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 rounded transition-all duration-200 ${
                  layout === 'grid'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
                title="Grid Layout"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setLayout('double-list')}
                className={`p-2 rounded transition-all duration-200 ${
                  layout === 'double-list'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
                title="Double List Layout"
              >
                <Columns size={16} />
              </button>
              <button
                onClick={() => setLayout('mortar')}
                className={`p-2 rounded transition-all duration-200 ${
                  layout === 'mortar'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
                title="Mortar Layout"
              >
                <Grid3x3 size={16} />
              </button>
            </div>

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
              <button
                onClick={() => setFilter('faults')}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  filter === 'faults'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
              >
                All Faults
              </button>
            </div>
            
            {/* Site Filter */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-1">
              <Building2 size={14} className="text-[var(--color-text-muted)] ml-1" />
              <button
                onClick={() => setSiteFilter('all')}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  siteFilter === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-[var(--shadow-soft)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                }`}
              >
                All Sites
              </button>
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSiteFilter(site.id)}
                  className={`px-3 py-1.5 rounded text-sm transition-all duration-200 truncate max-w-[120px] ${
                    siteFilter === site.id
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium shadow-[var(--shadow-soft)] scale-105'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105'
                  }`}
                  title={site.name}
                >
                  {site.name}
                </button>
              ))}
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
      </div>

      {/* Notifications Content */}
      <div className="flex-1 overflow-auto py-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {filter === 'unread' 
                ? 'No unread notifications' 
                : filter === 'faults'
                ? 'No fault notifications'
                : 'No notifications'}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {filter === 'unread' 
                ? 'You\'re all caught up!' 
                : filter === 'faults'
                ? siteFilter !== 'all'
                  ? `No faults found for ${sites.find(s => s.id === siteFilter)?.name || 'this site'}.`
                  : 'No fault notifications found across all sites.'
                : siteFilter !== 'all'
                ? `No notifications found for ${sites.find(s => s.id === siteFilter)?.name || 'this site'}.`
                : 'Notifications will appear here when events occur.'}
            </p>
          </div>
        ) : (
          <>
            {layout === 'singular' && (
              <div className="max-w-2xl mx-auto px-[20px] space-y-4">
                {filteredNotifications.map((notification, index) => {
                  const Icon = typeIcons[notification.type] || AlertTriangle
                  const color = typeColors[notification.type] || 'var(--color-text-muted)'
                  
                  return (
                    <div
                      key={notification.id}
                      className={`
                        fusion-card p-5 cursor-pointer transition-all duration-200 group
                        ${notification.read 
                          ? 'opacity-75 hover:opacity-100 border-[var(--color-border-subtle)]' 
                          : 'border-l-4 border-l-[var(--color-primary)] shadow-[var(--shadow-soft)]'
                        }
                        hover:shadow-[var(--shadow-soft)] hover:scale-[1.01]
                      `}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`
                      }}
                    >
                      <div className="flex items-start gap-4">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h3 className="text-base font-semibold text-[var(--color-text)]">
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium flex-shrink-0">
                                    New
                                  </span>
                                )}
                                {notification.siteId && (
                                  <span className="text-xs px-2 py-0.5 text-[var(--color-text-soft)] font-normal flex-shrink-0 flex items-center gap-1">
                                    <Building2 size={10} />
                                    {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
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
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
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

            {layout === 'grid' && (
              <div className="px-[20px]">
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
                          : 'border-[var(--color-primary)]/40 shadow-[var(--shadow-glow-primary)]'
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
                                {notification.siteId && (
                                  <span className="text-xs px-2 py-0.5 text-[var(--color-text-soft)] font-normal flex-shrink-0 flex items-center gap-1">
                                    <Building2 size={10} />
                                    {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
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
              </div>
            )}

            {layout === 'double-list' && (
              <div className="px-[20px]">
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {filteredNotifications.map((notification, index) => {
                  const Icon = typeIcons[notification.type] || AlertTriangle
                  const color = typeColors[notification.type] || 'var(--color-text-muted)'
                  
                  return (
                    <div
                      key={notification.id}
                      className={`
                        fusion-card p-4 cursor-pointer transition-all duration-200 group
                        ${notification.read 
                          ? 'opacity-75 hover:opacity-100 border-[var(--color-border-subtle)]' 
                          : 'border-l-4 border-l-[var(--color-primary)] shadow-[var(--shadow-soft)]'
                        }
                        hover:shadow-[var(--shadow-soft)] hover:scale-[1.01]
                      `}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div 
                          className="p-2 rounded-lg flex-shrink-0 transition-all duration-200"
                          style={{ 
                            backgroundColor: notification.read ? 'var(--color-surface-subtle)' : `${color}20`,
                          }}
                        >
                          <Icon 
                            size={18} 
                            style={{ 
                              color: notification.read ? 'var(--color-text-muted)' : color 
                            }} 
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium flex-shrink-0">
                                    New
                                  </span>
                                )}
                                {notification.siteId && (
                                  <span className="text-xs px-1.5 py-0.5 text-[var(--color-text-soft)] font-normal flex-shrink-0 flex items-center gap-1">
                                    <Building2 size={9} />
                                    {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
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
                                className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-all"
                                title={notification.read ? 'Mark as unread' : 'Mark as read'}
                              >
                                <Mail size={14} className="text-[var(--color-text-muted)]" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-all"
                                title="Dismiss"
                              >
                                <X size={14} className="text-[var(--color-text-muted)]" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                            <div className="flex items-center gap-2">
                            <Clock size={11} className="text-[var(--color-text-soft)]" />
                            <span className="text-xs text-[var(--color-text-soft)]">
                              {formatTime(notification.timestamp)}
                            </span>
                            </div>
                            {notification.siteId && (
                              <span className="text-xs text-[var(--color-text-soft)] font-normal flex items-center gap-1">
                                <Building2 size={9} />
                                {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            )}

            {layout === 'mortar' && (
              <div className="px-[20px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredNotifications.map((notification, index) => {
                  const Icon = typeIcons[notification.type] || AlertTriangle
                  const color = typeColors[notification.type] || 'var(--color-text-muted)'
                  
                  return (
                    <div
                      key={notification.id}
                      className={`
                        fusion-card p-4 cursor-pointer transition-all duration-200 group flex flex-col
                        ${notification.read 
                          ? 'opacity-75 hover:opacity-100 border-[var(--color-border-subtle)]' 
                          : 'border-[var(--color-primary)]/30 shadow-[var(--shadow-soft)]'
                        }
                        hover:shadow-[var(--shadow-soft)] hover:scale-[1.02] hover:-translate-y-0.5
                        min-h-[140px]
                      `}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`
                      }}
                    >
                      {/* Icon and Title */}
                      <div className="flex items-start gap-3 mb-2">
                        <div 
                          className="p-2 rounded-lg flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                          style={{ 
                            backgroundColor: notification.read ? 'var(--color-surface-subtle)' : `${color}20`,
                          }}
                        >
                          <Icon 
                            size={16} 
                            style={{ 
                              color: notification.read ? 'var(--color-text-muted)' : color 
                            }} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0 animate-pulse" />
                            )}
                            {notification.siteId && (
                              <span className="text-[10px] px-1.5 py-0.5 text-[var(--color-text-soft)] font-normal flex-shrink-0 flex items-center gap-1">
                                <Building2 size={8} />
                                {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-3 mb-3 flex-1">
                        {notification.message}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-[var(--color-text-soft)]" />
                          <span className="text-xs text-[var(--color-text-soft)]">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        {notification.siteId && (
                          <span className="text-[10px] text-[var(--color-text-soft)] font-normal flex items-center gap-1">
                            <Building2 size={8} />
                            {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (notification.read) {
                                markAsUnread(notification.id)
                              } else {
                                markAsRead(notification.id)
                              }
                            }}
                            className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-all"
                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            <Mail size={12} className="text-[var(--color-text-muted)]" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissNotification(notification.id)
                            }}
                            className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-all"
                            title="Dismiss"
                          >
                            <X size={12} className="text-[var(--color-text-muted)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

