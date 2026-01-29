/**
 * Trigger Tile Component
 * 
 * Visual tile representing the trigger part of a rule.
 * Click to edit the trigger type.
 */

'use client'

import { Radio, Clock, Sun, Zap, Calendar, AlertTriangle } from 'lucide-react'
import { TriggerType, RuleType } from '@/lib/mockRules'
import { TriggerEditor } from '../editors/TriggerEditor'

interface TriggerTileProps {
  trigger?: TriggerType
  ruleType: RuleType
  isEditing: boolean
  onClick: () => void
  onChange: (trigger: TriggerType) => void
  readOnly?: boolean
}

const triggerIcons: Record<TriggerType, any> = {
  motion: Radio,
  no_motion: Clock,
  daylight: Sun,
  bms: Zap,
  schedule: Calendar,
  fault: AlertTriangle,
}

const triggerLabels: Record<TriggerType, string> = {
  motion: 'Motion Detected',
  no_motion: 'No Motion',
  daylight: 'Daylight Level',
  bms: 'BMS Command',
  schedule: 'Schedule',
  fault: 'Fault Detected',
}

export function TriggerTile({ trigger, ruleType, isEditing, onClick, onChange, readOnly = false }: TriggerTileProps) {
  const Icon = trigger ? triggerIcons[trigger] : Radio

  if (isEditing && !readOnly) {
    return (
      <TriggerEditor
        currentTrigger={trigger}
        ruleType={ruleType}
        onSelect={onChange}
        onCancel={() => onClick()}
      />
    )
  }

  return (
    <button
      onClick={readOnly ? () => {} : onClick}
      disabled={readOnly}
      className={`w-full p-4 rounded-lg border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] transition-all text-left group ${
        readOnly ? 'cursor-default' : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex-shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">TRIGGER</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {trigger ? triggerLabels[trigger] : 'Select Trigger'}
          </div>
          {trigger && (
            <div className="text-xs text-[var(--color-text-soft)] mt-1">
              {ruleType === 'schedule' && trigger !== 'schedule' 
                ? 'Schedules must use schedule trigger'
                : 'Click to change'}
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

