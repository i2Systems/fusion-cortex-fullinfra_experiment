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

export type NotificationType = 'discovery' | 'zone' | 'fault' | 'bacnet' | 'rule' | 'device' | 'system'

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Generate fake notifications
function generateFakeNotifications(): Notification[] {
  const now = new Date()
  
  return [
    {
      id: '1',
      type: 'discovery',
      title: 'Discovery Scan Completed',
      message: '205 new devices discovered in the network. Review and map devices.',
      timestamp: new Date(now.getTime() - 3 * 60 * 1000), // 3 minutes ago
      read: false,
      link: '/discovery',
    },
    {
      id: '2',
      type: 'fault',
      title: 'Device Offline Detected',
      message: '6 devices are currently offline. Check device health and connectivity.',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
      link: '/faults',
    },
    {
      id: '3',
      type: 'zone',
      title: 'Zone Configuration Updated',
      message: 'Zone "Electronics - Aisle 1" has been modified. Review zone settings.',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
      read: false,
      link: '/zones',
    },
    {
      id: '4',
      type: 'bacnet',
      title: 'BACnet Connection Error',
      message: 'Zone "Grocery" BACnet connection failed. Check BMS integration settings.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      link: '/bacnet',
    },
    {
      id: '5',
      type: 'rule',
      title: 'Rule Triggered',
      message: 'Motion Activation rule activated for Zone 2 - Clothing. View rule details.',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      read: true,
      link: '/rules',
    },
    {
      id: '6',
      type: 'device',
      title: 'Device Signal Weak',
      message: 'FLX-2024 has low signal strength (56%). Consider repositioning or checking network.',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
      link: '/lookup',
    },
    {
      id: '7',
      type: 'system',
      title: 'System Health Check',
      message: 'System health is at 97%. 6 devices require attention.',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
      read: true,
      link: '/dashboard',
    },
    {
      id: '8',
      type: 'discovery',
      title: 'New Devices Detected',
      message: '12 new devices found during background scan. Map them to zones.',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      link: '/map',
    },
  ]
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  // Load notifications from localStorage or generate fake ones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fusion_notifications')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setNotifications(parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          })))
        } catch (e) {
          // If parsing fails, generate new ones
          const fake = generateFakeNotifications()
          setNotifications(fake)
          localStorage.setItem('fusion_notifications', JSON.stringify(fake))
        }
      } else {
        const fake = generateFakeNotifications()
        setNotifications(fake)
        localStorage.setItem('fusion_notifications', JSON.stringify(fake))
      }
    }
  }, [])

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      localStorage.setItem('fusion_notifications', JSON.stringify(notifications))
    }
  }, [notifications])

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

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      dismissNotification,
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

