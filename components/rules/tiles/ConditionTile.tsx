/**
 * Condition Tile Component
 * 
 * Visual tile representing the condition part of a rule.
 * Click to edit condition parameters.
 */

'use client'

import { Settings, MapPin } from 'lucide-react'
import { Rule, RuleType, TriggerType } from '@/lib/mockRules'
import { ConditionEditor } from '../editors/ConditionEditor'

interface ConditionTileProps {
  trigger: TriggerType
  condition: Rule['condition']
  ruleType: RuleType
  isEditing: boolean
  onClick: () => void
  onChange: (condition: Rule['condition']) => void
  readOnly?: boolean
}

export function ConditionTile({ trigger, condition, ruleType, isEditing, onClick, onChange, readOnly = false }: ConditionTileProps) {
  const formatCondition = () => {
    if (!condition || Object.keys(condition).length === 0) {
      return 'No condition set'
    }

    switch (trigger) {
      case 'motion':
        return condition.zone 
          ? `Motion in ${condition.zone}`
          : condition.deviceId
          ? `Motion at ${condition.deviceId}`
          : 'Motion detected'
      case 'no_motion':
        return condition.zone
          ? `No motion in ${condition.zone} for ${condition.duration || 0} min`
          : condition.deviceId
          ? `No motion at ${condition.deviceId} for ${condition.duration || 0} min`
          : `No motion for ${condition.duration || 0} min`
      case 'daylight':
        return condition.zone
          ? `Daylight ${condition.operator || '>'} ${condition.level || 0}fc in ${condition.zone}`
          : condition.deviceId
          ? `Daylight ${condition.operator || '>'} ${condition.level || 0}fc at ${condition.deviceId}`
          : `Daylight ${condition.operator || '>'} ${condition.level || 0}fc`
      case 'bms':
        return 'BMS command received'
      case 'schedule':
        if (condition.scheduleTime) {
          const timeStr = condition.scheduleTime
          const freqStr = condition.scheduleFrequency === 'weekly' 
            ? ` on ${condition.scheduleDays?.length || 0} day(s)`
            : condition.scheduleFrequency === 'custom'
            ? ` on ${condition.scheduleDate}`
            : ' daily'
          return `At ${timeStr}${freqStr}`
        }
        return 'Schedule time'
      default:
        return 'Condition set'
    }
  }

  if (isEditing && !readOnly) {
    return (
      <ConditionEditor
        trigger={trigger}
        condition={condition || {}}
        ruleType={ruleType}
        onChange={onChange}
        onCancel={() => onClick()}
      />
    )
  }

  const hasCondition = condition && Object.keys(condition).length > 0
  const target = condition?.zone || condition?.deviceId

  return (
    <button
      onClick={readOnly ? () => {} : onClick}
      disabled={readOnly}
      className={`w-full p-4 rounded-lg border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] transition-all text-left group ${
        readOnly ? 'cursor-default' : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex-shrink-0">
          <Settings size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">CONDITION</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {formatCondition()}
          </div>
          {target && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-[var(--color-text-soft)]" />
              <div className="text-xs text-[var(--color-text-soft)]">{target}</div>
            </div>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </div>
      </div>
    </button>
  )
}

