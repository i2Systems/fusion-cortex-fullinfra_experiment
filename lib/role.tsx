/**
 * Role Context
 * 
 * Manages user role state (Admin, Manager, Technician).
 * Roles control what features and pages are accessible.
 * 
 * AI Note: This is a prototype implementation. In production,
 * roles would be managed server-side with proper authentication.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'Admin' | 'Manager' | 'Technician'

interface RoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  // Initialize with Admin role, will be updated from localStorage
  const [role, setRoleState] = useState<UserRole>('Admin')
  const [mounted, setMounted] = useState(false)

  // Load role from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('fusion_role') as UserRole | null
    if (stored && ['Admin', 'Manager', 'Technician'].includes(stored)) {
      setRoleState(stored)
    }
    setMounted(true)
  }, [])

  // Save role to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('fusion_role', role)
    }
  }, [role, mounted])

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
  }

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

