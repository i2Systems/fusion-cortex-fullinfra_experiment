/**
 * Rule Context
 * 
 * Shared state management for rules across the app.
 * Handles rule creation, editing, deletion, and execution.
 * 
 * AI Note: In production, this would sync with tRPC/API and persist to database.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Rule, mockRules } from './mockRules'
import { useStore } from './StoreContext'

interface RuleContextType {
  rules: Rule[]
  addRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => Rule
  updateRule: (ruleId: string, updates: Partial<Rule>) => void
  deleteRule: (ruleId: string) => void
  toggleRule: (ruleId: string) => void
}

const RuleContext = createContext<RuleContextType | undefined>(undefined)

export function RuleProvider({ children }: { children: ReactNode }) {
  const { activeStoreId } = useStore()
  const [rules, setRules] = useState<Rule[]>([])

  // Helper to get store-scoped localStorage keys
  const getStorageKey = (key: string) => {
    return activeStoreId ? `fusion_${key}_${activeStoreId}` : `fusion_${key}`
  }

  // Load rules when store changes or on mount
  useEffect(() => {
    if (!activeStoreId) return // Wait for store to be initialized
    
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey('rules')
      const savedRules = localStorage.getItem(storageKey)
      
      if (savedRules) {
        try {
          const parsed = JSON.parse(savedRules)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Restore Date objects
            const restored = parsed.map((rule: any) => ({
              ...rule,
              createdAt: rule.createdAt ? new Date(rule.createdAt) : new Date(),
              updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : new Date(),
              lastTriggered: rule.lastTriggered ? new Date(rule.lastTriggered) : undefined,
            }))
            setRules(restored)
            console.log(`✅ Loaded ${restored.length} rules from localStorage for ${activeStoreId}`)
            return
          }
        } catch (e) {
          console.error('Failed to parse saved rules:', e)
        }
      }
      
      // Initialize with mock rules (includes new overrides and schedules)
      // Add store prefix to rule IDs to make them unique per store
      const storeRules = mockRules.map(rule => ({
        ...rule,
        id: `${activeStoreId}-${rule.id}`,
        targetId: rule.targetId ? `${activeStoreId}-${rule.targetId}` : undefined,
        action: {
          ...rule.action,
          zones: rule.action.zones?.map(z => z), // Keep zone names as-is (they'll be matched by name)
        },
      }))
      setRules(storeRules)
      console.log(`✅ Loaded ${storeRules.length} rules for ${activeStoreId} (fresh data)`)
    } else {
      // Server-side: initialize with empty array, will be set on client
      setRules([])
    }
  }, [activeStoreId])

  // Save to localStorage whenever rules change (store-scoped)
  useEffect(() => {
    if (typeof window !== 'undefined' && rules.length > 0 && activeStoreId) {
      const storageKey = getStorageKey('rules')
      localStorage.setItem(storageKey, JSON.stringify(rules))
    }
  }, [rules, activeStoreId])

  const addRule = (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Rule => {
    const newRule: Rule = {
      ...ruleData,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setRules(prev => [...prev, newRule])
    return newRule
  }

  const updateRule = (ruleId: string, updates: Partial<Rule>) => {
    setRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, ...updates, updatedAt: new Date() }
          : rule
      )
    )
  }

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId))
  }

  const toggleRule = (ruleId: string) => {
    setRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled, updatedAt: new Date() }
          : rule
      )
    )
  }

  return (
    <RuleContext.Provider
      value={{
        rules,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
      }}
    >
      {children}
    </RuleContext.Provider>
  )
}

export function useRules() {
  const context = useContext(RuleContext)
  if (context === undefined) {
    throw new Error('useRules must be used within a RuleProvider')
  }
  return context
}

