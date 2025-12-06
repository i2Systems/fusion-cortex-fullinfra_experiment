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

interface RuleContextType {
  rules: Rule[]
  addRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => Rule
  updateRule: (ruleId: string, updates: Partial<Rule>) => void
  deleteRule: (ruleId: string) => void
  toggleRule: (ruleId: string) => void
}

const RuleContext = createContext<RuleContextType | undefined>(undefined)

export function RuleProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<Rule[]>([])

  // Load rules from localStorage on mount, or initialize with mock rules
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRules = localStorage.getItem('fusion_rules')
      if (savedRules) {
        try {
          const parsed = JSON.parse(savedRules)
          // If saved rules array is empty, use mock rules instead
          if (Array.isArray(parsed) && parsed.length === 0) {
            setRules(mockRules)
            return
          }
          // Convert date strings back to Date objects
          const rulesWithDates = parsed.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            lastTriggered: r.lastTriggered ? new Date(r.lastTriggered) : undefined,
          }))
          setRules(rulesWithDates)
        } catch (e) {
          console.error('Failed to parse saved rules:', e)
          // Initialize with mock rules if parsing fails
          setRules(mockRules)
        }
      } else {
        // No saved rules, initialize with mock rules
        setRules(mockRules)
      }
    } else {
      // Server-side: initialize with empty array, will be set on client
      setRules([])
    }
  }, [])

  // Save to localStorage whenever rules change (but not on initial mount with empty array)
  useEffect(() => {
    if (typeof window !== 'undefined' && rules.length > 0) {
      localStorage.setItem('fusion_rules', JSON.stringify(rules))
    }
  }, [rules])

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

