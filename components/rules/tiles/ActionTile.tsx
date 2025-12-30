/**
 * Action Tile Component
 * 
 * Visual tile representing the action part of a rule.
 * Click to edit action parameters.
 */

'use client'

import { Zap, Target } from 'lucide-react'
import { Rule, RuleType } from '@/lib/mockRules'
import { ActionEditor } from '../editors/ActionEditor'

interface ActionTileProps {
  action: Rule['action']
  ruleType: RuleType
  isEditing: boolean
  onClick: () => void
  onChange: (action: Rule['action']) => void
  readOnly?: boolean
}

export function ActionTile({ action, ruleType, isEditing, onClick, onChange, readOnly = false }: ActionTileProps) {
  const formatAction = () => {
    if (!action || (!action.zones?.length && !action.devices?.length)) {
      return 'No action set'
    }

    const parts: string[] = []
    
    if (action.brightness !== undefined) {
      parts.push(`set to ${action.brightness}%`)
    }
    
    if (action.duration) {
      parts.push(`for ${action.duration} min`)
    }
    
    if (action.returnToBMS) {
      parts.push('then return to BMS')
    }

    const targets = action.zones?.length 
      ? `${action.zones.length} zone(s): ${action.zones.slice(0, 2).join(', ')}${action.zones.length > 2 ? '...' : ''}`
      : action.devices?.length
      ? `${action.devices.length} device(s)`
      : 'targets'

    return `Set ${targets} ${parts.join(', ')}`
  }

  if (isEditing && !readOnly) {
    return (
      <ActionEditor
        action={action || {}}
        ruleType={ruleType}
        onChange={onChange}
        onCancel={() => onClick()}
      />
    )
  }

  const hasAction = action && ((action.zones?.length || 0) > 0 || (action.devices?.length || 0) > 0)

  return (
    <button
      onClick={readOnly ? () => {} : onClick}
      disabled={readOnly}
      className={`w-full p-4 rounded-lg border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] transition-all text-left group ${
        readOnly ? 'cursor-default' : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--color-success)]/20 text-[var(--color-success)] flex-shrink-0">
          <Zap size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">ACTION</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {formatAction()}
          </div>
          {hasAction && (
            <div className="flex items-center gap-1 mt-1">
              <Target size={12} className="text-[var(--color-text-soft)]" />
              <div className="text-xs text-[var(--color-text-soft)]">
                {action.zones?.length ? `${action.zones.length} zone(s)` : ''}
                {action.devices?.length ? `${action.devices.length} device(s)` : ''}
              </div>
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

