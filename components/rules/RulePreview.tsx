/**
 * Rule Preview Component
 * 
 * Human-readable preview of the rule in plain English.
 * Updates live as the rule is edited.
 */

'use client'

import { Eye } from 'lucide-react'
import { Rule } from '@/lib/mockRules'

interface RulePreviewProps {
  rule: Rule
}

export function RulePreview({ rule }: RulePreviewProps) {
  const formatPreview = (): string => {
    if (!rule.trigger) {
      return 'Start building your rule by selecting a trigger...'
    }

    // Build trigger part
    let triggerText = ''
    switch (rule.trigger) {
      case 'motion':
        triggerText = rule.condition?.zone 
          ? `When motion is detected in ${rule.condition.zone}`
          : rule.condition?.deviceId
          ? `When motion is detected at ${rule.condition.deviceId}`
          : 'When motion is detected'
        break
      case 'no_motion':
        triggerText = rule.condition?.zone
          ? `When no motion is detected in ${rule.condition.zone} for ${rule.condition.duration || 0} minutes`
          : rule.condition?.deviceId
          ? `When no motion is detected at ${rule.condition.deviceId} for ${rule.condition.duration || 0} minutes`
          : `When no motion is detected for ${rule.condition.duration || 0} minutes`
        break
      case 'daylight':
        triggerText = rule.condition?.zone
          ? `When daylight level is ${rule.condition.operator || '>'} ${rule.condition.level || 0} fc in ${rule.condition.zone}`
          : rule.condition?.deviceId
          ? `When daylight level is ${rule.condition.operator || '>'} ${rule.condition.level || 0} fc at ${rule.condition.deviceId}`
          : `When daylight level is ${rule.condition.operator || '>'} ${rule.condition.level || 0} fc`
        break
      case 'bms':
        triggerText = 'When a BMS command is received'
        break
      case 'schedule':
        if (rule.condition?.scheduleTime) {
          const timeStr = rule.condition.scheduleTime
          const freqStr = rule.condition.scheduleFrequency === 'weekly'
            ? ` on ${rule.condition.scheduleDays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') || 'selected days'}`
            : rule.condition.scheduleFrequency === 'custom'
            ? ` on ${rule.condition.scheduleDate}`
            : ' daily'
          triggerText = `At ${timeStr}${freqStr}`
        } else {
          triggerText = 'At scheduled time'
        }
        break
      case 'fault':
        triggerText = 'When a fault is detected'
        break
    }

    // Build action part
    let actionText = ''
    if (rule.action) {
      const parts: string[] = []
      if (rule.action.emailManager) {
        parts.push('email the store manager')
      }
      const hasLighting = (rule.action.zones?.length ?? 0) > 0 || (rule.action.devices?.length ?? 0) > 0
      if (hasLighting) {
        if (rule.action.zones?.length) {
          parts.push(`set ${rule.action.zones.length === 1 ? rule.action.zones[0] : `${rule.action.zones.length} zones (${rule.action.zones.slice(0, 2).join(', ')}${rule.action.zones.length > 2 ? '...' : ''})`}`)
        } else if (rule.action.devices?.length) {
          parts.push(`set ${rule.action.devices.length} device(s)`)
        } else {
          parts.push('set targets')
        }
        if (rule.action.brightness !== undefined) parts.push(`to ${rule.action.brightness}% brightness`)
        if (rule.action.duration) parts.push(`for ${rule.action.duration} minutes`)
        if (rule.action.returnToBMS) parts.push('then return control to BMS')
      }
      actionText = parts.join(' ')
    }

    if (!actionText) {
      return `${triggerText} → [configure action]`
    }

    return `${triggerText} → ${actionText}`
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={16} className="text-[var(--color-text-muted)]" />
        <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Rule Preview
        </div>
      </div>
      <div className="text-sm text-[var(--color-text)] leading-relaxed">
        {formatPreview()}
      </div>
    </div>
  )
}

