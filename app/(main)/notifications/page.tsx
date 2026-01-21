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
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { AlertTriangle, Layers, Network, Workflow, Search, Home, X, CheckCheck, Mail, ArrowUpDown, Clock, Filter, Sparkles, List, Grid3x3, LayoutGrid, Columns, Rss, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { trpc } from '@/lib/trpc/client'
import { FaultCategory } from '@/lib/faultDefinitions'

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
  const { devices } = useDevices()
  const { zones } = useZones()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fault creation mutation for demo purposes
  const createFaultMutation = trpc.fault.create.useMutation()

  // Initialize filters from URL params
  const [filter, setFilter] = useState<'all' | 'unread' | 'faults'>(
    (searchParams.get('filter') as 'all' | 'unread' | 'faults') || 'all'
  )
  const [siteFilter, setSiteFilter] = useState<string | 'all'>(
    searchParams.get('siteFilter') || 'all'
  )
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [layout, setLayout] = useState<LayoutOption>('grid')
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

  // Generate realistic notifications using actual site/device/zone data
  const handleGenerateRandom = () => {
    const now = new Date()

    // Helper to pick random item from array
    const pickRandom = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)]

    // Helper to derive manufacturer from device type
    const getManufacturer = (type: string | undefined): string => {
      if (!type) return 'Unknown'
      if (type.includes('fixture')) return 'Lutron'
      if (type.includes('motion')) return 'Philips'
      if (type.includes('sensor') || type.includes('light-sensor')) return 'Acuity'
      return 'Generic'
    }

    // Helper to get friendly model name from device type
    const getModelName = (type: string | undefined): string => {
      if (!type) return 'Device'
      if (type === 'fixture-16ft-power-entry') return 'LPSM-16FT'
      if (type === 'fixture-12ft-power-entry') return 'LPSM-12FT'
      if (type === 'fixture-8ft-power-entry') return 'LPSM-8FT'
      if (type === 'fixture-16ft-follower') return 'LPFL-16FT'
      if (type === 'fixture-12ft-follower') return 'LPFL-12FT'
      if (type === 'fixture-8ft-follower') return 'LPFL-8FT'
      if (type === 'motion') return 'MSN-100'
      if (type === 'light-sensor') return 'LSN-200'
      return type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }

    // Get a random site (prefer active site if set, otherwise pick random)
    const targetSite = activeSiteId
      ? sites.find(s => s.id === activeSiteId) || pickRandom(sites)
      : pickRandom(sites)
    const siteId = targetSite?.id
    const siteName = targetSite?.name || 'Unknown Site'

    // Devices come from the active site context, so use them directly
    const randomDevice = pickRandom(devices)

    // Get zones and find which zone the device is in
    const randomZone = pickRandom(zones)
    const deviceZone = randomDevice?.zone
      ? zones.find(z => z.name === randomDevice.zone)
      : randomDevice
        ? zones.find(z => z.deviceIds?.includes(randomDevice.id))
        : undefined

    // Notification types with realistic templates using real data
    const types: NotificationType[] = ['fault', 'zone', 'bacnet', 'rule', 'device', 'system', 'warranty']
    const type = pickRandom(types) || 'device'

    type NotificationTemplate = { title: string; message: string; link: string }

    const generateNotification = (): NotificationTemplate => {
      const deviceIdStr = randomDevice?.deviceId || randomDevice?.serialNumber || 'DEV-XXXX'
      const manufacturer = getManufacturer(randomDevice?.type)
      const model = getModelName(randomDevice?.type)
      const signal = randomDevice?.signal ?? Math.floor(Math.random() * 100)
      const zoneName = deviceZone?.name || randomDevice?.zone || randomZone?.name || 'Unassigned'
      const zoneDeviceCount = randomZone?.deviceIds?.length || 0


      switch (type) {
        case 'fault': {
          const faultScenarios = [
            {
              title: 'Environmental Ingress Detected',
              message: `Water intrusion detected in ${manufacturer} ${model} (${deviceIdStr})${deviceZone ? ` in zone '${deviceZone.name}'` : ''}. Inspect seals and gaskets immediately.`,
              faultCategory: 'environmental-ingress' as FaultCategory,
            },
            {
              title: 'Driver Failure Alert',
              message: `${manufacturer} ${model} driver burnout detected on device ${deviceIdStr}. No power output - requires immediate replacement.`,
              faultCategory: 'electrical-driver' as FaultCategory,
            },
            {
              title: 'Thermal Overheat Warning',
              message: `Device ${deviceIdStr} (${manufacturer}) reporting thermal stress${deviceZone ? ` in '${deviceZone.name}'` : ''}. Current temp exceeds safe threshold.`,
              faultCategory: 'thermal-overheat' as FaultCategory,
            },
            {
              title: 'Wiring Configuration Error',
              message: `Installation issue detected on ${deviceIdStr}: power landed on dim line. Device ${model} requires rewiring.`,
              faultCategory: 'installation-wiring' as FaultCategory,
            },
            {
              title: 'LED Module Failure',
              message: `Single LED out in ${manufacturer} ${model} array (${deviceIdStr}). Visual inspection recommended.`,
              faultCategory: 'optical-output' as FaultCategory,
            },
          ]
          const scenario = pickRandom(faultScenarios)!
          return { ...scenario, link: `/faults?siteId=${siteId}` }
        }

        case 'zone': {
          const zoneScenarios = [
            {
              title: `Zone '${zoneName}' Updated`,
              message: `Zone configuration modified. ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''} assigned. Review zone boundaries on the map.`,
            },
            {
              title: `Device Added to '${zoneName}'`,
              message: `${manufacturer} ${model} (${deviceIdStr}) has been assigned to zone '${zoneName}'. Total devices: ${zoneDeviceCount}.`,
            },
            {
              title: `Zone Boundary Changed`,
              message: `'${zoneName}' polygon updated. ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''} now within zone boundaries.`,
            },
          ]
          const scenario = pickRandom(zoneScenarios)!
          return { ...scenario, link: `/map?siteId=${siteId}` }
        }

        case 'bacnet': {
          const bacnetScenarios = [
            {
              title: 'BACnet Connection Lost',
              message: `Zone '${zoneName}' lost BACnet connection to BMS. ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''} affected. Check network configuration.`,
            },
            {
              title: 'BACnet Sync Complete',
              message: `Successfully synchronized ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''} in '${zoneName}' with Building Management System.`,
            },
            {
              title: 'BMS Integration Alert',
              message: `Device ${deviceIdStr} (${manufacturer}) BACnet object mismatch detected. Verify point mapping configuration.`,
            },
          ]
          const scenario = pickRandom(bacnetScenarios)!
          return { ...scenario, link: '/bacnet' }
        }

        case 'rule': {
          const ruleNames = ['Motion Activation', 'Daylight Harvesting', 'Occupancy Timeout', 'Schedule Override', 'Emergency Mode']
          const ruleName = pickRandom(ruleNames)!
          const ruleScenarios = [
            {
              title: `Rule '${ruleName}' Triggered`,
              message: `Automation rule activated for zone '${zoneName}'. ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''} affected.`,
            },
            {
              title: `Scheduled Rule Executed`,
              message: `'${ruleName}' rule ran successfully at ${new Date().toLocaleTimeString()}. Zone '${zoneName}' updated.`,
            },
            {
              title: `Rule Condition Met`,
              message: `${ruleName} threshold reached in '${zoneName}'. Automatic adjustment applied to ${zoneDeviceCount} device${zoneDeviceCount !== 1 ? 's' : ''}.`,
            },
          ]
          const scenario = pickRandom(ruleScenarios)!
          return { ...scenario, link: '/rules' }
        }

        case 'device': {
          const deviceScenarios = [
            {
              title: `Weak Signal: ${deviceIdStr}`,
              message: `${manufacturer} ${model}${deviceZone ? ` in '${deviceZone.name}'` : ''} has poor signal strength (${signal}%). Consider repositioning or adding repeater.`,
            },
            {
              title: `Device ${deviceIdStr} Offline`,
              message: `${model} by ${manufacturer} not responding${deviceZone ? ` in zone '${deviceZone.name}'` : ''}. Last seen ${Math.floor(Math.random() * 24) + 1} hours ago.`,
            },
            {
              title: `Configuration Changed`,
              message: `Device ${deviceIdStr} settings modified. ${manufacturer} ${model} now operating at ${Math.floor(Math.random() * 100)}% brightness.`,
            },
            {
              title: `Device Recovered`,
              message: `${manufacturer} ${model} (${deviceIdStr}) back online${deviceZone ? ` in '${deviceZone.name}'` : ''}. Signal strength: ${signal}%.`,
            },
          ]
          const scenario = pickRandom(deviceScenarios)!
          return { ...scenario, link: `/lookup?id=${randomDevice?.id || ''}&siteId=${siteId}` }
        }

        case 'system': {
          const deviceCount = devices.length || Math.floor(Math.random() * 50) + 10
          const onlineCount = Math.floor(deviceCount * (0.85 + Math.random() * 0.15))
          const systemScenarios = [
            {
              title: `Health Check: ${siteName}`,
              message: `System scan complete. ${onlineCount}/${deviceCount} devices online. ${deviceCount - onlineCount} require attention.`,
            },
            {
              title: 'Firmware Update Available',
              message: `New firmware v${Math.floor(Math.random() * 3) + 2}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)} available for ${Math.floor(Math.random() * 10) + 1} devices at ${siteName}.`,
            },
            {
              title: 'Maintenance Reminder',
              message: `Scheduled maintenance window approaching for ${siteName}. ${deviceCount} devices will be affected.`,
            },
          ]
          const scenario = pickRandom(systemScenarios)!
          return { ...scenario, link: `/dashboard?siteId=${siteId}` }
        }

        case 'warranty': {
          const daysUntilExpiry = Math.floor(Math.random() * 60) - 30 // -30 to +30 days
          const isExpired = daysUntilExpiry < 0
          const warrantyScenarios = [
            {
              title: isExpired ? 'Warranty Expired' : 'Warranty Expiring Soon',
              message: `${manufacturer} ${model} (${deviceIdStr}) warranty ${isExpired ? `expired ${Math.abs(daysUntilExpiry)} days ago` : `expires in ${daysUntilExpiry} days`}. ${isExpired ? 'Out-of-pocket replacement required.' : 'Schedule replacement before expiry.'}`,
            },
            {
              title: 'Component Warranty Alert',
              message: `Driver component in ${deviceIdStr} (${manufacturer})${deviceZone ? ` - zone '${deviceZone.name}'` : ''} ${isExpired ? 'no longer covered' : 'coverage ending soon'}. Review replacement options.`,
            },
          ]
          const scenario = pickRandom(warrantyScenarios)!
          return { ...scenario, link: `/lookup?id=${randomDevice?.id || ''}&siteId=${siteId}` }
        }

        default:
          return {
            title: 'System Notification',
            message: `Update for ${siteName}. Review system status.`,
            link: '/dashboard',
          }
      }
    }

    const template = generateNotification()

    const newNotification = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: template.title,
      message: template.message,
      timestamp: now,
      read: false,
      link: template.link,
      siteId,
    }

    addNotification(newNotification)

    // If this is a fault notification and we have a valid device, create an actual fault in the database
    if (type === 'fault' && randomDevice && 'faultCategory' in template) {
      createFaultMutation.mutate({
        deviceId: randomDevice.id,
        faultType: template.faultCategory as FaultCategory,
        description: template.message,
        detectedAt: now,
      })
    }
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

  // Determine grouping based on sort mode
  const groupedNotifications = useMemo(() => {
    const groups: { title: string; items: typeof notifications }[] = []

    if (filteredNotifications.length === 0) return groups

    if (sortBy === 'type') {
      const typeMap = new Map<string, typeof notifications>()
      filteredNotifications.forEach(n => {
        const key = n.type
        if (!typeMap.has(key)) typeMap.set(key, [])
        typeMap.get(key)!.push(n)
      })

      const typeLabels: Record<string, string> = {
        fault: 'Fault Alerts',
        system: 'System Updates',
        zone: 'Zone Changes',
        bacnet: 'BMS / BACnet',
        rule: 'Automation Rules',
        device: 'Device Status',
        warranty: 'Warranty Alerts',
      }

      // Sort groups by priority
      const priority = ['fault', 'warranty', 'device', 'system', 'zone', 'rule', 'bacnet']
      Array.from(typeMap.entries())
        .sort((a, b) => {
          const idxA = priority.indexOf(a[0])
          const idxB = priority.indexOf(b[0])
          // Handle unknown types at the end
          const valA = idxA === -1 ? 999 : idxA
          const valB = idxB === -1 ? 999 : idxB
          return valA - valB
        })
        .forEach(([typeKey, items]) => {
          const title = typeLabels[typeKey] || 'Other Notifications'
          groups.push({ title, items })
        })

    } else if (sortBy === 'newest' || sortBy === 'oldest') {
      const dateMap = new Map<string, typeof notifications>()
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()

      filteredNotifications.forEach(n => {
        const dateStr = n.timestamp.toDateString()
        let key = 'Older'
        if (dateStr === today) key = 'Today'
        else if (dateStr === yesterday) key = 'Yesterday'
        else {
          // Check if this week
          const diffTime = Math.abs(Date.now() - n.timestamp.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) key = 'Earlier This Week'
        }

        if (!dateMap.has(key)) dateMap.set(key, [])
        dateMap.get(key)!.push(n)
      })

      // Sort keys: Today -> Yesterday -> This Week -> Older
      const priority = ['Today', 'Yesterday', 'Earlier This Week', 'Older']
      Array.from(dateMap.entries())
        .sort((a, b) => priority.indexOf(a[0]) - priority.indexOf(b[0]))
        .forEach(([title, items]) => groups.push({ title, items }))

    } else if (sortBy === 'unread-first') {
      const statusMap = new Map<string, typeof notifications>()
      filteredNotifications.forEach(n => {
        const key = n.read ? 'Read' : 'Unread'
        if (!statusMap.has(key)) statusMap.set(key, [])
        statusMap.get(key)!.push(n)
      })
      // Ensure Unread comes first
      if (statusMap.has('Unread')) groups.push({ title: 'Unread', items: statusMap.get('Unread')! })
      if (statusMap.has('Read')) groups.push({ title: 'Read', items: statusMap.get('Read')! })
    } else {
      // Fallback (shouldn't happen with current sort options, but good safety)
      groups.push({ title: 'All Notifications', items: filteredNotifications })
    }

    return groups
  }, [filteredNotifications, sortBy])

  // Helper to render a single notification item (preserving logic for different layouts)
  const renderNotificationItem = (notification: any, index: number) => {
    const Icon = typeIcons[notification.type] || AlertTriangle
    const color = typeColors[notification.type] || 'var(--color-text-muted)'

    // Props for different layouts
    const cardSize = layout === 'grid' ? getCardSize(notification, index) : ''
    const cardHeight = layout === 'grid' ? getCardHeight(notification) : (layout === 'mortar' ? 'min-h-[140px]' : '')
    const messageLength = notification.message.length
    const shouldClamp = notification.read && messageLength <= 100

    // Common card classes
    const cardBaseClasses = `
      fusion-card cursor-pointer transition-all duration-300 group
      ${notification.read
        ? 'opacity-75 hover:opacity-100 border-[var(--color-border-subtle)]'
        : 'shadow-[var(--shadow-soft)]'
      }
      hover:shadow-[var(--shadow-soft)] hover:scale-[1.01]
    `

    // Layout specific content structure
    // This is a simplified "universal" renderer to adapt to the layout loop
    // BUT since the layouts have drastically different HTML structures (grid vs list), 
    // it's cleaner to keep the layout specific rendering logic but apply it PER GROUP.
    return null
  }

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Top Search Island */}
      <div className="flex-shrink-0 page-padding-x pt-3 md:pt-4 pb-2 md:pb-3">
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
      <div className="page-padding-x pb-3 md:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {/* Layout Toggle */}
              <div className="flex items-center gap-0.5 md:gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-0.5 md:p-1">
                <Toggle
                  pressed={layout === 'singular'}
                  onPressedChange={() => setLayout('singular')}
                  size="icon"
                  className="w-7 h-7 md:w-8 md:h-8"
                  title="Feed Layout"
                >
                  <Rss size={14} className="md:w-4 md:h-4" />
                </Toggle>
                <Toggle
                  pressed={layout === 'grid'}
                  onPressedChange={() => setLayout('grid')}
                  size="icon"
                  className="w-7 h-7 md:w-8 md:h-8"
                  title="Grid Layout"
                >
                  <LayoutGrid size={14} className="md:w-4 md:h-4" />
                </Toggle>
                <Toggle
                  pressed={layout === 'double-list'}
                  onPressedChange={() => setLayout('double-list')}
                  size="icon"
                  className="w-7 h-7 md:w-8 md:h-8"
                  title="Double List Layout"
                >
                  <Columns size={14} className="md:w-4 md:h-4" />
                </Toggle>
                <Toggle
                  pressed={layout === 'mortar'}
                  onPressedChange={() => setLayout('mortar')}
                  size="icon"
                  className="w-7 h-7 md:w-8 md:h-8"
                  title="Mortar Layout"
                >
                  <Grid3x3 size={14} className="md:w-4 md:h-4" />
                </Toggle>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-0.5 md:gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-0.5 md:p-1">
                <Filter size={12} className="text-[var(--color-text-muted)] ml-0.5 md:ml-1 hidden sm:block" />
                <Toggle
                  pressed={filter === 'all'}
                  onPressedChange={() => setFilter('all')}
                  size="sm"
                  title="Show all notifications"
                >
                  All
                </Toggle>
                <Toggle
                  pressed={filter === 'unread'}
                  onPressedChange={() => setFilter('unread')}
                  size="sm"
                  title="Show unread notifications"
                >
                  Unread
                </Toggle>
                <Toggle
                  pressed={filter === 'faults'}
                  onPressedChange={() => setFilter('faults')}
                  size="sm"
                  title="Show fault notifications only"
                >
                  <span className="hidden sm:inline">All Faults</span>
                  <span className="sm:hidden">Faults</span>
                </Toggle>
              </div>

              {/* Site Filter */}
              <div className="flex items-center gap-0.5 md:gap-1 bg-[var(--color-surface-subtle)] rounded-lg p-0.5 md:p-1 overflow-x-auto scrollbar-hide">
                <Building2 size={12} className="text-[var(--color-text-muted)] ml-0.5 md:ml-1 hidden sm:block flex-shrink-0" />
                <Toggle
                  pressed={siteFilter === 'all'}
                  onPressedChange={() => setSiteFilter('all')}
                  size="sm"
                  className="whitespace-nowrap flex-shrink-0"
                  title="Show all sites"
                >
                  <span className="hidden sm:inline">All Sites</span>
                  <span className="sm:hidden">All</span>
                </Toggle>
                {sites.map((site) => (
                  <Toggle
                    key={site.id}
                    pressed={siteFilter === site.id}
                    onPressedChange={() => setSiteFilter(site.id)}
                    size="sm"
                    className="truncate max-w-[100px] sm:max-w-[120px] flex-shrink-0"
                    title={site.name}
                  >
                    {site.name}
                  </Toggle>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 md:gap-2 bg-[var(--color-surface-subtle)] rounded-lg p-0.5 md:p-1">
                <ArrowUpDown size={12} className="text-[var(--color-text-muted)] ml-0.5 md:ml-1 hidden sm:block flex-shrink-0" />
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  options={[
                    { value: 'newest', label: 'Newest First' },
                    { value: 'oldest', label: 'Oldest First' },
                    { value: 'unread-first', label: 'Unread First' },
                    { value: 'type', label: 'By Type' },
                  ]}
                  className="bg-transparent border-none py-1 md:py-1.5 h-auto text-xs md:text-sm w-32 md:w-36 focus:ring-0"
                />
              </div>

              {/* Generate Random - Surreptitious */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGenerateRandom}
                className="w-7 h-7 md:w-8 md:h-8 rounded-lg text-[var(--color-text-soft)] hover:text-[var(--color-text-muted)] transition-all duration-200 opacity-40 hover:opacity-100 flex-shrink-0"
                title="Generate random notification"
              >
                <Sparkles size={14} className="md:w-4 md:h-4" />
              </Button>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={markAllAsRead}
                  className="px-2 md:px-4 py-1.5 md:py-2 h-auto text-sm transition-all duration-200 flex items-center justify-center gap-1.5 md:gap-2 hover:scale-105 flex-shrink-0"
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={16} />
                  <span className="hidden md:inline">Mark all read</span>
                </Button>
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
          <div className="page-padding-x pb-8">
            {groupedNotifications.map((group) => (
              <div key={group.title} className="mb-8 last:mb-0">
                {/* Group Header - Surreptitious Style */}
                <div className="w-full pl-3 border-l-2 border-[var(--color-text-soft)]/20 mb-4">
                  <span className="text-xs font-medium text-[var(--color-text-soft)] tracking-wider uppercase">
                    {group.title} <span className="opacity-50 text-[10px] ml-1">({group.items.length})</span>
                  </span>
                </div>

                {/* Group Content - Render Layout for this group */}
                {layout === 'singular' && (
                  <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
                    {group.items.map((notification, index) => {
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
                                      <Badge variant="default" className="text-xs">New</Badge>
                                    )}
                                    {notification.siteId && (
                                      <Badge variant="secondary" className="text-xs font-normal gap-1">
                                        <Building2 size={10} />
                                        {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                                      </Badge>
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
                                    className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-all duration-200 hover:scale-110 flex items-center justify-center"
                                    title={notification.read ? 'Mark as unread' : 'Mark as read'}
                                  >
                                    <Mail size={16} className="text-[var(--color-text-muted)]" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      dismissNotification(notification.id)
                                    }}
                                    className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-all duration-200 hover:scale-110 flex items-center justify-center"
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
                  <div className="notifications-grid">
                    {group.items.map((notification, index) => {
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
                              : 'shadow-[var(--shadow-glow-primary)] border-2'
                            }
                          hover:shadow-[var(--shadow-soft)] hover:scale-[1.02] hover:-translate-y-1
                          ${cardSize} ${cardHeight}
                        `}
                          onClick={() => handleNotificationClick(notification)}
                          style={{
                            animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                            borderColor: notification.read ? undefined : color,
                            backgroundColor: notification.read ? undefined : `color-mix(in srgb, ${color}, transparent 95%)`
                          }}
                        >
                          <div className="flex items-start gap-4 flex-1">
                            {/* Icon */}
                            <div
                              className="p-3 rounded-xl flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                              style={{
                                backgroundColor: notification.read ? 'var(--color-surface-subtle)' : `color-mix(in srgb, ${color}, transparent 80%)`,
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
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse flex-shrink-0"
                                        style={{
                                          backgroundColor: `color-mix(in srgb, ${color}, transparent 80%)`,
                                          color: color
                                        }}
                                      >
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
                )}

                {layout === 'double-list' && (
                  <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                    {group.items.map((notification, index) => {
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
                                      <Badge variant="default" className="text-xs">New</Badge>
                                    )}
                                    {notification.siteId && (
                                      <Badge variant="secondary" className="text-xs font-normal gap-1">
                                        <Building2 size={10} />
                                        {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                                      </Badge>
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
                )}

                {layout === 'mortar' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.items.map((notification, index) => {
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
                                  <Badge variant="default" className="w-1.5 h-1.5 p-0 rounded-full animate-pulse" />
                                )}
                                {notification.siteId && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal gap-1">
                                    <Building2 size={8} />
                                    {sites.find(s => s.id === notification.siteId)?.name || 'Site'}
                                  </Badge>
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

