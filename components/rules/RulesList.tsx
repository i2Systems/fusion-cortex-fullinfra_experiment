/**
 * Rules List Component
 * 
 * Main view showing all automation rules.
 * Clickable rows that select a rule for viewing/editing.
 * 
 * AI Note: This is the left-side main view, similar to DeviceTable.
 * 
 * Performance optimized with:
 * - Memoized RuleListItem component
 * - useMemo for filtered and sorted data
 * - Helper functions moved outside
 * - useCallback for handlers
 */

'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Clock, Zap, Sun, Radio, Calendar, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Rule } from '@/lib/mockRules'

interface RulesListProps {
  rules: Rule[]
  selectedRuleId?: string | null
  onRuleSelect?: (ruleId: string | null) => void
  searchQuery?: string
}

const triggerIcons: Record<Rule['trigger'], any> = {
  motion: Radio,
  no_motion: Clock,
  daylight: Sun,
  bms: Zap,
  schedule: Calendar,
  fault: AlertTriangle,
}

// Helper functions moved outside component
const formatLastTriggered = (date?: Date) => {
  if (!date) return 'Never'
  const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const formatRuleCondition = (rule: Rule) => {
  const target = rule.targetName || rule.condition.zone || rule.condition.deviceId || 'target'
  switch (rule.trigger) {
    case 'motion':
      return `motion detected in ${target}`
    case 'no_motion':
      return `no motion for ${rule.condition.duration || 0} minutes in ${target}`
    case 'daylight':
      return `daylight level ${rule.condition.operator || '>'} ${rule.condition.level || 0}fc in ${target}`
    case 'bms':
      return `BMS command received`
    case 'schedule':
      if (rule.condition.scheduleTime) {
        return `scheduled at ${rule.condition.scheduleTime}${rule.condition.scheduleDays ? ` on ${rule.condition.scheduleDays.length} day(s)` : ''}`
      }
      return `scheduled time reached`
    case 'fault':
      return 'a fault is detected'
    default:
      return 'condition met'
  }
}

const formatRuleAction = (rule: Rule) => {
  const lightingParts: string[] = []
  if (rule.action.brightness !== undefined) lightingParts.push(`set to ${rule.action.brightness}%`)
  if (rule.action.duration) lightingParts.push(`for ${rule.action.duration} minutes`)
  if (rule.action.returnToBMS) lightingParts.push('then return to BMS')
  const targets = (rule.action.zones && rule.action.zones.length > 0)
    ? rule.action.zones.join(', ')
    : (rule.action.devices && rule.action.devices.length > 0)
      ? `${rule.action.devices.length} device(s)`
      : 'targets'
  const hasLighting = (rule.action.zones?.length ?? 0) > 0 || (rule.action.devices?.length ?? 0) > 0
  const emailPart = rule.action.emailManager ? 'email store manager' : ''
  if (emailPart && !hasLighting) return emailPart
  if (hasLighting && lightingParts.length > 0) {
    const lightingStr = `set ${targets} ${lightingParts.join(', ')}`
    return emailPart ? `${lightingStr}, and ${emailPart}` : lightingStr
  }
  if (emailPart) return emailPart
  return 'No action set'
}

// Memoized RuleListItem component
interface RuleListItemProps {
  rule: Rule
  isSelected: boolean
  onSelect: () => void
}

const RuleListItem = memo(function RuleListItem({ rule, isSelected, onSelect }: RuleListItemProps) {
  const TriggerIcon = triggerIcons[rule.trigger]

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }, [onSelect])

  return (
    <div
      onClick={handleClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
          : 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <div className={`
            p-2 rounded-lg flex-shrink-0
            ${isSelected
              ? 'bg-[var(--color-primary)]/20'
              : 'bg-[var(--color-surface)]'
            }
          `}>
            <TriggerIcon
              size={18}
              className={isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-[var(--color-text)]">
                {rule.name}
              </h4>
              <span className={`token ${rule.ruleType === 'override'
                ? 'token-type-override'
                : rule.ruleType === 'schedule'
                  ? 'token-type-schedule'
                  : 'token-type-rule'
                }`}>
                {rule.ruleType === 'schedule' ? 'Schedule' : rule.ruleType === 'override' ? 'Override' : 'Rule'}
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mb-1">
              <span className="font-medium">IF</span> {formatRuleCondition(rule)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              <span className="font-medium">THEN</span> {formatRuleAction(rule)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-3">
          {!rule.targetId && rule.trigger !== 'fault' ? (
            <span className="token token-status-warning" title="Target missing - please edit">
              <AlertTriangle size={12} />
              Invalid
            </span>
          ) : rule.enabled ? (
            <span className="token token-status-active">
              <CheckCircle2 size={12} />
              Active
            </span>
          ) : (
            <span className="token token-status-disabled">
              <XCircle size={12} />
              Disabled
            </span>
          )}
          {rule.lastTriggered && (
            <span className="text-xs text-[var(--color-text-soft)]">
              {formatLastTriggered(rule.lastTriggered)}
            </span>
          )}
        </div>
      </div>
      {rule.description && (
        <p className="text-xs text-[var(--color-text-soft)] mt-2">
          {rule.description}
        </p>
      )}
    </div>
  )
})

export function RulesList({ rules, selectedRuleId, onRuleSelect, searchQuery = '' }: RulesListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'lastTriggered' | 'createdAt'>('lastTriggered')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Memoized filter - only recalculate when rules or searchQuery changes
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rules

    const query = searchQuery.toLowerCase()
    return rules.filter(rule => {
      // Build searchable text from all rule fields
      const searchableText = [
        rule.name,
        rule.description,
        rule.ruleType,
        rule.condition.zone,
        rule.condition.deviceId,
        rule.targetName,
        rule.action.zones?.join(' '),
        rule.action.devices?.join(' '),
        rule.trigger,
        rule.enabled ? 'enabled' : 'disabled',
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(query)
    })
  }, [rules, searchQuery])

  // Memoized sort - only recalculate when filtered rules or sort settings change
  const sortedRules = useMemo(() => {
    return [...filteredRules].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'lastTriggered':
          aValue = a.lastTriggered?.getTime() || 0
          bValue = b.lastTriggered?.getTime() || 0
          break
        case 'createdAt':
          aValue = a.createdAt.getTime()
          bValue = b.createdAt.getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [filteredRules, sortBy, sortOrder])

  // Memoized sort handler
  const handleSort = useCallback((field: 'name' | 'lastTriggered' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy])

  // Memoized container click handler
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // If clicking on the container itself (not a rule item), deselect
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('rules-list-container')) {
      onRuleSelect?.(null)
    }
  }, [onRuleSelect])

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedRuleId || sortedRules.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = sortedRules.findIndex(r => r.id === selectedRuleId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < sortedRules.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onRuleSelect?.(sortedRules[newIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRuleId, sortedRules, onRuleSelect])

  return (
    <div className="h-full flex flex-col">
      {/* Rules List */}
      <div
        className="flex-1 overflow-auto pb-2"
        onClick={handleContainerClick}
      >
        {sortedRules.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            {searchQuery ? 'No rules match your search' : 'No rules configured'}
          </div>
        ) : (
          <div
            className="space-y-2 p-2 rules-list-container"
            onClick={handleContainerClick}
          >
            {sortedRules.map((rule) => {
              const isSelected = selectedRuleId === rule.id
              return (
                <RuleListItem
                  key={rule.id}
                  rule={rule}
                  isSelected={isSelected}
                  onSelect={() => onRuleSelect?.(isSelected ? null : rule.id)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

