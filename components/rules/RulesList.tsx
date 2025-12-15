/**
 * Rules List Component
 * 
 * Main view showing all automation rules.
 * Clickable rows that select a rule for viewing/editing.
 * 
 * AI Note: This is the left-side main view, similar to DeviceTable.
 */

'use client'

import { useState, useEffect } from 'react'
import { Clock, Zap, Sun, Radio, Calendar, CheckCircle2, XCircle } from 'lucide-react'
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
}

export function RulesList({ rules, selectedRuleId, onRuleSelect, searchQuery = '' }: RulesListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'lastTriggered' | 'createdAt'>('lastTriggered')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter rules by search query
  const filteredRules = rules.filter(rule => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      rule.name.toLowerCase().includes(query) ||
      rule.description?.toLowerCase().includes(query) ||
      rule.condition.zone?.toLowerCase().includes(query) ||
      rule.condition.deviceId?.toLowerCase().includes(query) ||
      rule.targetName?.toLowerCase().includes(query) ||
      rule.action.zones?.some(z => z.toLowerCase().includes(query)) ||
      rule.action.devices?.some(d => d.toLowerCase().includes(query)) ||
      false
    )
  })

  // Sort rules
  const sortedRules = [...filteredRules].sort((a, b) => {
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
      default:
        return 'condition met'
    }
  }

  const formatRuleAction = (rule: Rule) => {
    const parts: string[] = []
    if (rule.action.brightness !== undefined) {
      parts.push(`set to ${rule.action.brightness}%`)
    }
    if (rule.action.duration) {
      parts.push(`for ${rule.action.duration} minutes`)
    }
    if (rule.action.returnToBMS) {
      parts.push('then return to BMS')
    }
    const targets = (rule.action.zones && rule.action.zones.length > 0)
      ? rule.action.zones.join(', ')
      : (rule.action.devices && rule.action.devices.length > 0)
      ? `${rule.action.devices.length} device(s)`
      : 'targets'
    return `set ${targets} ${parts.join(', ')}`
  }

  const handleSort = (field: 'name' | 'lastTriggered' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

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
        onClick={(e) => {
          // If clicking on the container itself (not a rule item), deselect
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('rules-list-container')) {
            onRuleSelect?.(null)
          }
        }}
      >
        {sortedRules.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            {searchQuery ? 'No rules match your search' : 'No rules configured'}
          </div>
        ) : (
          <div 
            className="space-y-2 p-2 rules-list-container"
            onClick={(e) => {
              // If clicking on empty space in the list container, deselect
              if (e.target === e.currentTarget) {
                onRuleSelect?.(null)
              }
            }}
          >
            {sortedRules.map((rule) => {
              const TriggerIcon = triggerIcons[rule.trigger]
              const isSelected = selectedRuleId === rule.id

              return (
                <div
                  key={rule.id}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent container click handler
                    // Toggle: if already selected, deselect; otherwise select
                    onRuleSelect?.(isSelected ? null : rule.id)
                  }}
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
                          <span className={`token ${
                            rule.ruleType === 'override'
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
                      {rule.enabled ? (
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
            })}
          </div>
        )}
      </div>
    </div>
  )
}

