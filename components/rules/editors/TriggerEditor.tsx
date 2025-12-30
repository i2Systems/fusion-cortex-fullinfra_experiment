/**
 * Trigger Editor Component
 * 
 * Contextual editor for selecting and configuring the trigger type.
 */

'use client'

import { Radio, Clock, Sun, Zap, Calendar, X } from 'lucide-react'
import { TriggerType, RuleType } from '@/lib/mockRules'

interface TriggerEditorProps {
  currentTrigger?: TriggerType
  ruleType: RuleType
  onSelect: (trigger: TriggerType) => void
  onCancel: () => void
}

const triggerOptions: Array<{ value: TriggerType; label: string; icon: any; description: string }> = [
  { value: 'motion', label: 'Motion detected', icon: Radio, description: 'Trigger when motion is detected' },
  { value: 'no_motion', label: 'No motion for duration', icon: Clock, description: 'Trigger after period of inactivity' },
  { value: 'daylight', label: 'Daylight level', icon: Sun, description: 'Trigger based on natural light levels' },
  { value: 'bms', label: 'BMS command', icon: Zap, description: 'Trigger on building management system command' },
  { value: 'schedule', label: 'Time schedule', icon: Calendar, description: 'Trigger at specific times' },
]

export function TriggerEditor({ currentTrigger, ruleType, onSelect, onCancel }: TriggerEditorProps) {
  // Filter options based on rule type
  const availableOptions = triggerOptions.filter(option => {
    if (ruleType === 'schedule') {
      return option.value === 'schedule'
    }
    if (ruleType === 'override') {
      // Overrides typically use BMS but allow others
      return true
    }
    // Rules can use any trigger except schedule (schedules use schedule trigger)
    return option.value !== 'schedule'
  })

  return (
    <div className="p-4 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-[var(--color-text)]">Select Trigger</div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
        >
          <X size={16} className="text-[var(--color-text-muted)]" />
        </button>
      </div>
      
      <div className="space-y-2">
        {availableOptions.map(option => {
          const Icon = option.icon
          const isSelected = currentTrigger === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                  : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{option.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{option.description}</div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

