/**
 * Rule Context
 * 
 * Shared state management for rules across the app.
 * 
 * Refactored: Now uses tRPC to sync rules with the database.
 * Rules are site-scoped and can target both zones and devices.
 * 
 * AI Note: 
 * - Rules are fetched from database via tRPC
 * - Mutations are performed via tRPC with optimistic updates
 * - Automatically reloads when active site changes
 */

'use client'

import { createContext, useContext, ReactNode, useCallback } from 'react'
import { useSite } from './SiteContext'
import { trpc } from './trpc/client'
import { useErrorHandler } from './hooks/useErrorHandler'

// Re-export types from mockRules for compatibility
export type { RuleType, TargetType, TriggerType, ScheduleFrequency, Rule } from './mockRules'
import type { Rule } from './mockRules'

interface RuleContextType {
  rules: Rule[]
  isLoading: boolean
  addRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Rule>
  updateRule: (ruleId: string, updates: Partial<Rule>) => Promise<void>
  deleteRule: (ruleId: string) => Promise<void>
  toggleRule: (ruleId: string) => Promise<void>
  refreshRules: () => void
}

const RuleContext = createContext<RuleContextType | undefined>(undefined)

export function RuleProvider({ children }: { children: ReactNode }) {
  const { activeSiteId } = useSite()
  const { handleError } = useErrorHandler()

  // Fetch rules from database
  const {
    data: rulesData,
    refetch: refetchRules,
    isLoading
  } = trpc.rule.list.useQuery(
    { siteId: activeSiteId || '' },
    {
      enabled: !!activeSiteId,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )

  // Transform database rules to frontend format
  const rules: Rule[] = (rulesData || []).map((rule: any) => ({
    ...rule,
    createdAt: new Date(rule.createdAt),
    updatedAt: new Date(rule.updatedAt),
    lastTriggered: rule.lastTriggered ? new Date(rule.lastTriggered) : undefined,
  }))

  // Mutations
  const createMutation = trpc.rule.create.useMutation({
    onSuccess: () => {
      refetchRules()
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to create rule' })
    },
  })

  const updateMutation = trpc.rule.update.useMutation({
    onSuccess: () => {
      refetchRules()
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to update rule' })
    },
  })

  const toggleMutation = trpc.rule.toggle.useMutation({
    onSuccess: () => {
      refetchRules()
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to toggle rule' })
    },
  })

  const deleteMutation = trpc.rule.delete.useMutation({
    onSuccess: () => {
      refetchRules()
    },
    onError: (error) => {
      handleError(error, { title: 'Failed to delete rule' })
    },
  })

  const addRule = useCallback(async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rule> => {
    if (!activeSiteId) {
      throw new Error('No active site selected')
    }

    const result = await createMutation.mutateAsync({
      name: ruleData.name,
      description: ruleData.description,
      ruleType: ruleData.ruleType || 'rule',
      targetType: ruleData.targetType || 'zone',
      targetId: ruleData.targetId,
      targetName: ruleData.targetName,
      trigger: ruleData.trigger,
      condition: ruleData.condition,
      action: ruleData.action,
      overrideBMS: ruleData.overrideBMS || false,
      duration: ruleData.action?.duration,
      siteId: activeSiteId,
      zoneId: ruleData.targetType === 'zone' ? ruleData.targetId : undefined,
      deviceId: ruleData.targetType === 'device' ? ruleData.targetId : undefined,
      targetZones: ruleData.action?.zones || [],
      enabled: ruleData.enabled ?? true,
    })

    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
      lastTriggered: result.lastTriggered ? new Date(result.lastTriggered) : undefined,
    } as Rule
  }, [activeSiteId, createMutation])

  const updateRule = useCallback(async (ruleId: string, updates: Partial<Rule>) => {
    await updateMutation.mutateAsync({
      id: ruleId,
      name: updates.name,
      description: updates.description,
      ruleType: updates.ruleType,
      targetType: updates.targetType,
      targetId: updates.targetId,
      targetName: updates.targetName,
      trigger: updates.trigger,
      condition: updates.condition,
      action: updates.action,
      overrideBMS: updates.overrideBMS,
      duration: updates.action?.duration,
      zoneId: updates.targetType === 'zone' ? updates.targetId : undefined,
      deviceId: updates.targetType === 'device' ? updates.targetId : (updates.targetType ? null : undefined),
      targetZones: updates.action?.zones,
      enabled: updates.enabled,
    })
  }, [updateMutation])

  const deleteRule = useCallback(async (ruleId: string) => {
    await deleteMutation.mutateAsync({ id: ruleId })
  }, [deleteMutation])

  const toggleRule = useCallback(async (ruleId: string) => {
    await toggleMutation.mutateAsync({ id: ruleId })
  }, [toggleMutation])

  const refreshRules = useCallback(() => {
    refetchRules()
  }, [refetchRules])

  return (
    <RuleContext.Provider
      value={{
        rules,
        isLoading,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        refreshRules,
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
