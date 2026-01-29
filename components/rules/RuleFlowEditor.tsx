/**
 * Rule Flow Editor Component
 * 
 * Visual rule builder with rearrangeable tiles representing trigger → condition → action.
 * Each tile opens a contextual editor when clicked.
 * 
 * AI Note: Alexa-style rule builder with visual flow representation.
 */

'use client'

import { useState } from 'react'
import { ArrowRight, Plus, GripVertical } from 'lucide-react'
import { Rule, TriggerType, RuleType } from '@/lib/mockRules'
import { TriggerTile } from './tiles/TriggerTile'
import { ConditionTile } from './tiles/ConditionTile'
import { ActionTile } from './tiles/ActionTile'
import { RulePreview } from './RulePreview'
import { RuleSimulator } from './RuleSimulator'

interface RuleFlowEditorProps {
  rule: Partial<Rule>
  onChange: (rule: Partial<Rule>) => void
  ruleType: RuleType
  readOnly?: boolean
}

export function RuleFlowEditor({ rule, onChange, ruleType, readOnly = false }: RuleFlowEditorProps) {
  const [editingTile, setEditingTile] = useState<'trigger' | 'condition' | 'action' | null>(null)

  const handleTriggerChange = (trigger: TriggerType) => {
    onChange({
      ...rule,
      trigger,
      condition: rule.condition || {},
    })
    setEditingTile(null)
  }

  const handleConditionChange = (condition: Rule['condition']) => {
    onChange({
      ...rule,
      condition: { ...rule.condition, ...condition },
    })
    setEditingTile(null)
  }

  const handleActionChange = (action: Rule['action']) => {
    onChange({
      ...rule,
      action: { ...rule.action, ...action },
    })
    setEditingTile(null)
  }

  return (
    <div className="space-y-6">
      {/* Visual Flow */}
      <div className="space-y-4">
        {/* Trigger Tile */}
        <div className="relative">
          <TriggerTile
            trigger={rule.trigger}
            ruleType={ruleType}
            isEditing={!readOnly && editingTile === 'trigger'}
            onClick={() => !readOnly && setEditingTile(editingTile === 'trigger' ? null : 'trigger')}
            onChange={handleTriggerChange}
            readOnly={readOnly}
          />
        </div>

        {/* Arrow */}
        {rule.trigger && (
          <div className="flex items-center justify-center py-2">
            <ArrowRight size={20} className="text-[var(--color-text-muted)]" />
          </div>
        )}

        {/* Condition Tile */}
        {rule.trigger && (
          <div className="relative">
            <ConditionTile
              trigger={rule.trigger}
              condition={rule.condition || {}}
              ruleType={ruleType}
              isEditing={!readOnly && editingTile === 'condition'}
              onClick={() => !readOnly && setEditingTile(editingTile === 'condition' ? null : 'condition')}
              onChange={handleConditionChange}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Arrow: show for fault even with empty condition */}
        {rule.trigger && rule.condition && (Object.keys(rule.condition).length > 0 || rule.trigger === 'fault') && (
          <div className="flex items-center justify-center py-2">
            <ArrowRight size={20} className="text-[var(--color-text-muted)]" />
          </div>
        )}

        {/* Action Tile: show for fault even with empty condition */}
        {rule.trigger && rule.condition && (Object.keys(rule.condition).length > 0 || rule.trigger === 'fault') && (
          <div className="relative">
            <ActionTile
              action={rule.action || {}}
              ruleType={ruleType}
              isEditing={!readOnly && editingTile === 'action'}
              onClick={() => !readOnly && setEditingTile(editingTile === 'action' ? null : 'action')}
              onChange={handleActionChange}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Live Preview */}
      {rule.trigger && (
        <div className="mt-6">
          <RulePreview rule={rule as Rule} />
        </div>
      )}

      {/* Simulator */}
      {rule.trigger && rule.condition && rule.action && (
        <div className="mt-6">
          <RuleSimulator rule={rule as Rule} />
        </div>
      )}
    </div>
  )
}

