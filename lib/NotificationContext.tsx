/**
 * Notification Context
 * 
 * Manages notifications system with fake notifications that link to
 * various parts of the app (discovery, zones, faults, BACnet, etc.)
 * 
 * AI Note: Notifications appear in the footer/BottomDrawer and link
 * to relevant pages in the app.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { faultCategories, FaultCategory } from '@/lib/faultDefinitions'
import { trpc } from './trpc/client'

export type NotificationType = 'zone' | 'fault' | 'bacnet' | 'rule' | 'device' | 'system' | 'warranty'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  link: string
  icon?: string
  siteId?: string // Optional - if not provided, notification is global/all-sites
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  addNotification: (notification: Notification) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Generate a fault notification with realistic category examples
function generateFaultNotification(): Notification {
  const categories: FaultCategory[] = [
    'environmental-ingress',
    'electrical-driver',
    'thermal-overheat',
    'installation-wiring',
    'control-integration',
    'manufacturing-defect',
    'mechanical-structural',
    'optical-output',
  ]
  
  const category = categories[Math.floor(Math.random() * categories.length)]
  const categoryInfo = faultCategories[category]
  const example = categoryInfo.examples[Math.floor(Math.random() * categoryInfo.examples.length)]
  
  // Generate a device ID for the notification
  const deviceId = `FLX-${String(Math.floor(Math.random() * 2000) + 2000).padStart(4, '0')}`
  
  // Create realistic notification message
  const messages = [
    `${example}. Device ${deviceId} requires attention. ${categoryInfo.description.split('.')[0]}.`,
    `Device ${deviceId} shows ${categoryInfo.shortLabel.toLowerCase()} fault. ${example}.`,
    `${categoryInfo.label} detected on ${deviceId}. ${example}. Review troubleshooting steps.`,
    `Multiple devices showing ${categoryInfo.shortLabel.toLowerCase()} issues. ${deviceId} affected. ${example}.`,
  ]
  
  const titles = [
    `${categoryInfo.label} Detected`,
    `${categoryInfo.shortLabel} Fault`,
    `Device ${categoryInfo.shortLabel} Issue`,
    `${categoryInfo.shortLabel} Warning`,
  ]
  
  return {
    id: `fault-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'fault',
    title: titles[Math.floor(Math.random() * titles.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(),
    read: false,
    link: '/faults',
  }
}

// Generate a warranty notification
function generateWarrantyNotification(): Notification {
  const now = new Date()
  const deviceId = `FLX-${String(Math.floor(Math.random() * 2000) + 2000).padStart(4, '0')}`
  
  const warrantyTypes = [
    {
      title: 'Warranty Expired',
      message: `Device ${deviceId} warranty has expired. Consider replacement or extended warranty options.`,
      link: '/lookup',
    },
    {
      title: 'Warranty Expiring Soon',
      message: `Device ${deviceId} warranty expires in ${Math.floor(Math.random() * 30) + 1} days. Review replacement options before expiry.`,
      link: '/lookup',
    },
    {
      title: 'Component Warranty Expired',
      message: `Component warranty expired for device ${deviceId}. Component replacement may be needed.`,
      link: '/lookup',
    },
  ]
  
  const selected = warrantyTypes[Math.floor(Math.random() * warrantyTypes.length)]
  
  return {
    id: `warranty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'warranty',
    title: selected.title,
    message: selected.message,
    timestamp: now,
    read: false,
    link: selected.link,
  }
}

// Generate a single random notification
function generateRandomNotification(): Notification {
  const now = new Date()
  const types: NotificationType[] = ['fault', 'zone', 'bacnet', 'rule', 'device', 'system', 'warranty']
  const type = types[Math.floor(Math.random() * types.length)]
  
  // Use specialized notification generators
  if (type === 'fault') {
    return generateFaultNotification()
  }
  
  if (type === 'warranty') {
    return generateWarrantyNotification()
  }
  
  const notifications: Record<NotificationType, { titles: string[], messages: string[], links: string[] }> = {
    fault: {
      titles: [
        'Environmental Ingress Detected',
        'Electrical Driver Failure',
        'Thermal Overheat Warning',
        'Installation Wiring Error',
        'Control System Integration Issue',
      ],
      messages: [
        'Water intrusion detected in fixture housing. Device shows signs of moisture damage. Inspect seals and gaskets.',
        'Driver burnout - no power output. Device requires driver replacement. Check warranty status.',
        'Input cable melting detected due to excessive current. Device shows thermal stress. Review power distribution.',
        'Power landed on dim line instead of power line. Device miswired during installation. Verify wiring diagram.',
        'Trim level issues causing incorrect dimming. Device not responding to control signals. Check control module.',
      ],
      links: ['/faults', '/lookup'],
    },
    zone: {
      titles: [
        'Zone Configuration Updated',
        'Zone Devices Changed',
      ],
      messages: [
        'Zone has been modified. Review zone settings and device assignments.',
        'Devices in zone have changed. Update zone configuration.',
      ],
      links: ['/zones', '/map'],
    },
    bacnet: {
      titles: [
        'BACnet Connection Error',
        'BACnet Sync Completed',
      ],
      messages: [
        'Zone BACnet connection failed. Check BMS integration settings.',
        'BACnet synchronization completed successfully.',
      ],
      links: ['/bacnet'],
    },
    rule: {
      titles: [
        'Rule Triggered',
        'Schedule Activated',
        'Override Applied',
      ],
      messages: [
        'Motion Activation rule activated. View rule details.',
        'Scheduled rule triggered. Check zone status.',
        'Override rule applied. Review override settings.',
      ],
      links: ['/rules'],
    },
    device: {
      titles: [
        'Device Signal Weak',
        'Device Status Changed',
      ],
      messages: [
        'Device has low signal strength. Consider repositioning or checking network.',
        'Device status has changed. Review device details.',
      ],
      links: ['/lookup', '/map'],
    },
    system: {
      titles: [
        'System Health Check',
      ],
      messages: [
        'System health check completed. Some devices require attention.',
      ],
      links: ['/dashboard'],
    },
    warranty: {
      titles: [
        'Warranty Expired',
        'Warranty Expiring Soon',
        'Component Warranty Expired',
      ],
      messages: [
        'Device warranty has expired. Consider replacement or extended warranty options.',
        'Device warranty expires soon. Review replacement options before expiry.',
        'Component warranty expired. Component replacement may be needed.',
      ],
      links: ['/lookup'],
    },
  }
  
  const templates = notifications[type]
  const titleIndex = Math.floor(Math.random() * templates.titles.length)
  const linkIndex = Math.floor(Math.random() * templates.links.length)
  
  return {
    id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title: templates.titles[titleIndex],
    message: templates.messages[titleIndex],
    timestamp: now,
    read: false,
    link: templates.links[linkIndex],
  }
}

// Generate fake notifications - reduced and more relevant to current app state
// Creates a narrative across multiple sites with various fault types
function generateFakeNotifications(availableSiteIds: string[] = []): Notification[] {
  const now = new Date()
  
  // Use actual site IDs if available, otherwise use default patterns
  // Default site IDs match the DEFAULT_SITES in SiteContext
  const defaultSiteIds = ['site-1234', 'site-2156', 'site-3089', 'site-4421', 'site-5567']
  const siteIds = availableSiteIds.length > 0 ? availableSiteIds : defaultSiteIds
  
  // Ensure we have at least some site IDs to work with
  if (siteIds.length === 0) {
    console.warn('No site IDs available for notifications')
    return []
  }
  
  return [
    // Recent critical faults across different sites
    {
      id: '2',
      type: 'fault',
      title: 'Environmental Ingress Detected',
      message: 'Water intrusion detected in Grocery zone. Device FLX-3158 shows signs of moisture damage. Multiple fixtures affected. Inspect seals and gaskets immediately.',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
      read: false,
      link: '/faults',
      siteId: siteIds[0], // Site #1234 - Main St
    },
    {
      id: '3',
      type: 'fault',
      title: 'Electrical Driver Failure',
      message: 'Legacy 6043 driver burnout detected. Device FLX-2041 requires immediate driver replacement. No power output. Check warranty status before replacement.',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
      read: false,
      link: '/faults',
      siteId: siteIds[1], // Site #2156 - Oak Avenue
    },
    {
      id: '4',
      type: 'fault',
      title: 'Thermal Overheat Warning',
      message: 'Input cable melting detected due to excessive current. Device FLX-2125 shows thermal stress in Electronics zone. Review power distribution immediately.',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      read: false,
      link: '/faults',
      siteId: siteIds[2], // Site #3089 - Commerce Blvd
    },
    {
      id: '5',
      type: 'fault',
      title: 'Installation Wiring Error',
      message: 'Power landed on dim line instead of power line. Device FLX-2063 miswired during recent installation. Verify wiring diagram and correct installation.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      link: '/faults',
      siteId: siteIds[3], // Site #4421 - River Road
    },
    {
      id: '6',
      type: 'fault',
      title: 'Control Integration Issue',
      message: 'GRX-TVI trim level issues causing incorrect dimming. Device FLX-2088 not responding to control signals in Apparel zone. Check control module configuration.',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      read: false,
      link: '/faults',
      siteId: siteIds[0], // Site #1234 - Main St
    },
    {
      id: '7',
      type: 'fault',
      title: 'Manufacturing Defect Found',
      message: 'Loose internal parts causing intermittent connection. Device FLX-2078 shows manufacturing defect in Home Goods zone. Document and contact manufacturer for replacement.',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
      link: '/faults',
      siteId: siteIds[4], // Site #5678 - Park Plaza
    },
    {
      id: '8',
      type: 'fault',
      title: 'Mechanical Hardware Problem',
      message: 'Bezel detaching from fixture housing. Device FLX-2092 has structural mounting issue in Apparel zone. Inspect bracket geometry and mounting hardware.',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
      read: false,
      link: '/faults',
      siteId: siteIds[1], // Site #2156 - Oak Avenue
    },
    {
      id: '9',
      type: 'fault',
      title: 'Optical Output Abnormality',
      message: 'Single LED out in fixture array. Device FLX-2105 shows optical output abnormality in Grocery zone. Check LED module connections and consider module replacement.',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: false,
      link: '/faults',
      siteId: siteIds[2], // Site #3089 - Commerce Blvd
    },
    {
      id: '10',
      type: 'fault',
      title: 'Environmental Ingress Detected',
      message: 'Moisture detected in Electronics zone. Device FLX-2118 shows early signs of water intrusion. Inspect before damage spreads to other fixtures.',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
      read: true,
      link: '/faults',
      siteId: siteIds[3], // Site #4421 - River Road
    },
    {
      id: '11',
      type: 'fault',
      title: 'Electrical Driver Failure',
      message: 'Driver burnout on device FLX-2134. No power output detected. Replacement driver needed. Check if under warranty before ordering replacement.',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
      read: true,
      link: '/faults',
      siteId: siteIds[4], // Site #5678 - Park Plaza
    },
    // Warranty notifications
    {
      id: '12',
      type: 'warranty',
      title: 'Warranty Expired',
      message: 'Device FLX-2156 warranty has expired. Consider replacement or extended warranty options. Located in Electronics zone.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      link: '/lookup',
      siteId: siteIds[1], // Site #2156 - Oak Avenue
    },
    {
      id: '13',
      type: 'warranty',
      title: 'Warranty Expiring Soon',
      message: 'Device FLX-2088 warranty expires in 15 days. Review replacement options before expiry. Located in Apparel zone.',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
      link: '/lookup',
      siteId: siteIds[0], // Site #1234 - Main St
    },
    {
      id: '14',
      type: 'warranty',
      title: 'Component Warranty Expired',
      message: 'LED Module component warranty expired for device FLX-2125. Component replacement may be needed. Check availability of replacement parts.',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      link: '/lookup',
      siteId: siteIds[2], // Site #3089 - Commerce Blvd
    },
    // Zone and system notifications
    {
      id: '15',
      type: 'rule',
      title: 'Rule Triggered',
      message: 'Motion Activation rule activated for Clothing zone. View rule details and verify zone status.',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      read: false,
      link: '/rules',
      siteId: siteIds[0], // Site #1234 - Main St
    },
    {
      id: '16',
      type: 'bacnet',
      title: 'BACnet Connection Error',
      message: 'Grocery zone BACnet connection failed. Check BMS integration settings and network connectivity.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      link: '/bacnet',
      siteId: siteIds[1], // Site #2156 - Oak Avenue
    },
    {
      id: '17',
      type: 'device',
      title: 'Device Signal Weak',
      message: 'FLX-2024 has low signal strength (56%). Consider repositioning or checking network. Located in Home Goods zone.',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      read: true,
      link: '/lookup',
      siteId: siteIds[3], // Site #4421 - River Road
    },
    {
      id: '18',
      type: 'zone',
      title: 'Zone Configuration Updated',
      message: 'Electronics zone configuration has been modified. Review zone settings and device assignments.',
      timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000), // 7 hours ago
      read: true,
      link: '/zones',
      siteId: siteIds[2], // Site #3089 - Commerce Blvd
    },
    // System-level notification (no site)
    {
      id: '19',
      type: 'system',
      title: 'System Health Check',
      message: 'System health check completed. Multiple sites require attention. Review dashboard for details.',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      read: false,
      link: '/dashboard',
      // No siteId - this is a global/system notification
    },
  ]
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()
  const { data: sitesData } = trpc.site.list.useQuery(undefined, { 
    enabled: typeof window !== 'undefined',
    refetchOnWindowFocus: false 
  })

  // Load notifications from localStorage or generate fake ones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get actual site IDs from database
      const availableSiteIds = sitesData?.map(s => s.id) || []
      
      // Try to load existing notifications first
      const saved = localStorage.getItem('fusion_notifications')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Restore Date objects and ensure siteId is preserved
            const restored = parsed.map((n: any) => ({
              ...n,
              timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
              siteId: n.siteId || undefined, // Preserve siteId if it exists
            }))
            // Check if restored notifications have siteIds (new format)
            const hasSiteIds = restored.some((n: any) => n.siteId)
            if (hasSiteIds && restored.length > 0) {
              // Verify siteIds still exist in database
              const validNotifications = restored.filter((n: any) => 
                !n.siteId || availableSiteIds.length === 0 || availableSiteIds.includes(n.siteId)
              )
              if (validNotifications.length > 0) {
                setNotifications(validNotifications)
                return
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse saved notifications:', e)
        }
      }
      
      // Generate new notifications with siteIds
      // Use actual site IDs if available, otherwise use defaults
      const fake = generateFakeNotifications(availableSiteIds)
      if (fake.length > 0) {
        console.log(`[Notifications] Generated ${fake.length} notifications. Available sites:`, availableSiteIds)
        console.log(`[Notifications] Sample notifications with siteIds:`, fake.slice(0, 5).map(n => ({ id: n.id, title: n.title, siteId: n.siteId })))
      setNotifications(fake)
        // Save with proper serialization
        const serialized = fake.map(n => ({
          ...n,
          timestamp: n.timestamp.toISOString(),
          siteId: n.siteId || undefined,
        }))
        localStorage.setItem('fusion_notifications', JSON.stringify(serialized))
      }
    }
  }, [sitesData])

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      // Serialize with proper handling of Date objects and siteId
      const serialized = notifications.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString(), // Convert Date to ISO string
        siteId: n.siteId || undefined, // Preserve siteId
      }))
      localStorage.setItem('fusion_notifications', JSON.stringify(serialized))
    }
  }, [notifications])

  // Auto-generate notifications periodically (every 30-60 seconds)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const interval = setInterval(() => {
      // 30% chance to generate a new notification each interval
      if (Math.random() < 0.3) {
        const newNotification = generateRandomNotification()
        setNotifications(prev => [newNotification, ...prev])
      }
    }, 30000 + Math.random() * 30000) // 30-60 seconds

    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: false } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Check if notification with this ID already exists to prevent duplicates
      const exists = prev.some(n => n.id === notification.id)
      if (exists) {
        console.warn(`[Notifications] Duplicate notification prevented: ${notification.id}`)
        return prev
      }
      return [notification, ...prev]
    })
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      dismissNotification,
      addNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}


