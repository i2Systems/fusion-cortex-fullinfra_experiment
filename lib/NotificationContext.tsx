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
function generateFakeNotifications(): Notification[] {
  const now = new Date()
  
  return [
    {
      id: '2',
      type: 'fault',
      title: 'Environmental Ingress Detected',
      message: 'Water intrusion detected. Device FLX-2041 shows signs of moisture damage. Inspect seals and gaskets.',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
      read: false,
      link: '/faults',
    },
    {
      id: '3',
      type: 'warranty',
      title: 'Warranty Expired',
      message: 'Device FLX-2156 warranty has expired. Consider replacement or extended warranty options.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      link: '/lookup',
    },
    {
      id: '4',
      type: 'warranty',
      title: 'Warranty Expiring Soon',
      message: 'Device FLX-2088 warranty expires in 15 days. Review replacement options before expiry.',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
      link: '/lookup',
    },
    {
      id: '5',
      type: 'rule',
      title: 'Rule Triggered',
      message: 'Motion Activation rule activated for Clothing zone. View rule details.',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      read: false,
      link: '/rules',
    },
    {
      id: '6',
      type: 'warranty',
      title: 'Component Warranty Expired',
      message: 'LED Module component warranty expired for device FLX-2125. Component replacement may be needed.',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      link: '/lookup',
    },
    {
      id: '7',
      type: 'bacnet',
      title: 'BACnet Connection Error',
      message: 'Grocery zone BACnet connection failed. Check BMS integration settings.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      link: '/bacnet',
    },
    {
      id: '8',
      type: 'device',
      title: 'Device Signal Weak',
      message: 'FLX-2024 has low signal strength (56%). Consider repositioning or checking network.',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      read: true,
      link: '/lookup',
    },
  ]
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  // Load notifications from localStorage or generate fake ones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear old notifications to load updated examples
      localStorage.removeItem('fusion_notifications')
      
      const fake = generateFakeNotifications()
      setNotifications(fake)
      localStorage.setItem('fusion_notifications', JSON.stringify(fake))
    }
  }, [])

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      localStorage.setItem('fusion_notifications', JSON.stringify(notifications))
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
    setNotifications(prev => [notification, ...prev])
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

