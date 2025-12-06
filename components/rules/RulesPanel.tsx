/**
 * Rules Panel Component
 * 
 * Right-side panel for viewing rule details or creating a new rule.
 * Shows rule details when a rule is selected, or new rule form when nothing is selected.
 * 
 * AI Note: This panel appears on the right side, similar to DeviceTable or ZonesPanel.
 */

'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X, Radio, Clock, Sun, Zap, Calendar, Plus } from 'lucide-react'
import { Rule } from '@/lib/mockRules'
import { useZones } from '@/lib/ZoneContext'

interface RulesPanelProps {
  selectedRule: Rule | null
  onSave: (rule: Partial<Rule>) => void
  onCancel: () => void
  onDelete?: (ruleId: string) => void
}

const triggerOptions: Array<{ value: Rule['trigger']; label: string; icon: any }> = [
  { value: 'motion', label: 'Motion detected', icon: Radio },
  { value: 'no_motion', label: 'No motion for duration', icon: Clock },
  { value: 'daylight', label: 'Daylight level', icon: Sun },
  { value: 'bms', label: 'BMS command', icon: Zap },
  { value: 'schedule', label: 'Time schedule', icon: Calendar },
]

export function RulesPanel({ selectedRule, onSave, onCancel, onDelete }: RulesPanelProps) {
  const { zones } = useZones()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Rule>>({
    name: '',
    description: '',
    trigger: 'motion',
    condition: {},
    action: { zones: [] },
    overrideBMS: false,
    enabled: true,
  })

  // Update form data when selected rule changes
  useEffect(() => {
    if (selectedRule) {
      setFormData({
        name: selectedRule.name,
        description: selectedRule.description,
        trigger: selectedRule.trigger,
        condition: { ...selectedRule.condition },
        action: { ...selectedRule.action },
        overrideBMS: selectedRule.overrideBMS,
        enabled: selectedRule.enabled,
      })
      setIsEditing(false)
    } else {
      // Reset to new rule form
      setFormData({
        name: '',
        description: '',
        trigger: 'motion',
        condition: {},
        action: { zones: [] },
        overrideBMS: false,
        enabled: true,
      })
      setIsEditing(false)
    }
  }, [selectedRule])

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('Please enter a rule name')
      return
    }
    onSave(formData)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (selectedRule) {
      // Reset to selected rule data
      setFormData({
        name: selectedRule.name,
        description: selectedRule.description,
        trigger: selectedRule.trigger,
        condition: { ...selectedRule.condition },
        action: { ...selectedRule.action },
        overrideBMS: selectedRule.overrideBMS,
        enabled: selectedRule.enabled,
      })
    } else {
      // Reset to empty form
      setFormData({
        name: '',
        description: '',
        trigger: 'motion',
        condition: {},
        action: { zones: [] },
        overrideBMS: false,
        enabled: true,
      })
    }
    setIsEditing(false)
  }

  const formatRuleCondition = (rule: Rule) => {
    switch (rule.trigger) {
      case 'motion':
        return `motion detected in ${rule.condition.zone || 'zone'}`
      case 'no_motion':
        return `no motion for ${rule.condition.duration || 0} minutes in ${rule.condition.zone || 'zone'}`
      case 'daylight':
        return `daylight level ${rule.condition.operator || '>'} ${rule.condition.level || 0}fc in ${rule.condition.zone || 'zone'}`
      case 'bms':
        return `BMS command received`
      case 'schedule':
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
    const zones = rule.action.zones.length > 0 ? rule.action.zones.join(', ') : 'zones'
    return `set ${zones} ${parts.join(', ')}`
  }

  const formatLastTriggered = (date?: Date) => {
    if (!date) return 'Never'
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) !== 1 ? 's' : ''} ago`
  }

  return (
    <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {selectedRule ? (isEditing ? 'Edit Rule' : 'Rule Details') : 'Create New Rule'}
          </h3>
          {selectedRule && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEdit}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                title="Edit rule"
              >
                <Edit2 size={16} className="text-[var(--color-text-muted)]" />
              </button>
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this rule?')) {
                      onDelete(selectedRule.id)
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                  title="Delete rule"
                >
                  <X size={16} className="text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
          )}
        </div>
        {selectedRule && !isEditing && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {selectedRule.enabled ? 'Active' : 'Disabled'} • Last triggered: {formatLastTriggered(selectedRule.lastTriggered)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isEditing || !selectedRule ? (
          /* Edit/Create Form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Motion Activation - Clothing"
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of what this rule does"
                rows={2}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Trigger
              </label>
              <select
                value={formData.trigger || 'motion'}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value as Rule['trigger'] })}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
              >
                {triggerOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Fields */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Condition
              </label>
              <div className="space-y-2">
                <select
                  value={formData.condition?.zone || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, zone: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                >
                  <option value="">Select zone...</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.name}>
                      {zone.name}
                    </option>
                  ))}
                </select>
                {(formData.trigger === 'no_motion' || formData.trigger === 'schedule') && (
                  <input
                    type="number"
                    value={formData.condition?.duration || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      condition: { ...formData.condition, duration: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="Duration (minutes)"
                    className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                  />
                )}
                {formData.trigger === 'daylight' && (
                  <div className="flex gap-2">
                    <select
                      value={formData.condition?.operator || '>'}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition: { ...formData.condition, operator: e.target.value as '>' | '<' | '=' | '>=' }
                      })}
                      className="px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value=">">{'>'}</option>
                      <option value="<">{'<'}</option>
                      <option value=">=">{'>='}</option>
                      <option value="=">{'='}</option>
                    </select>
                    <input
                      type="number"
                      value={formData.condition?.level || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition: { ...formData.condition, level: parseInt(e.target.value) || undefined }
                      })}
                      placeholder="Level (fc)"
                      className="flex-1 px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Fields */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Action
              </label>
              <div className="space-y-2">
                <select
                  multiple
                  value={formData.action?.zones || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setFormData({
                      ...formData,
                      action: { 
                        zones: selected,
                        brightness: formData.action?.brightness,
                        duration: formData.action?.duration,
                        returnToBMS: formData.action?.returnToBMS,
                      }
                    })
                  }}
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all min-h-[80px]"
                >
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.name}>
                      {zone.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={formData.action?.brightness || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    action: { 
                      zones: formData.action?.zones || [], 
                      ...formData.action, 
                      brightness: parseInt(e.target.value) || undefined 
                    }
                  })}
                  placeholder="Brightness (%)"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                />
                <input
                  type="number"
                  value={formData.action?.duration || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    action: { 
                      zones: formData.action?.zones || [], 
                      ...formData.action, 
                      duration: parseInt(e.target.value) || undefined 
                    }
                  })}
                  placeholder="Duration (minutes)"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={formData.action?.returnToBMS || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      action: { 
                        zones: formData.action?.zones || [], 
                        ...formData.action, 
                        returnToBMS: e.target.checked 
                      }
                    })}
                    className="fusion-checkbox"
                  />
                  Return to BMS after duration
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="override-bms"
                checked={formData.overrideBMS || false}
                onChange={(e) => setFormData({ ...formData, overrideBMS: e.target.checked })}
                className="fusion-checkbox"
              />
              <label htmlFor="override-bms" className="text-sm text-[var(--color-text-muted)] cursor-pointer">
                Override BMS when triggered
              </label>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Rule Summary */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Rule Summary</h4>
              <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
                <div className="text-sm text-[var(--color-text)] mb-2">
                  <span className="font-medium">IF</span> {formatRuleCondition(selectedRule)}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  <span className="font-medium">THEN</span> {formatRuleAction(selectedRule)}
                </div>
              </div>
            </div>

            {/* Details */}
            {selectedRule.description && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Description</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {selectedRule.description}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Settings</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                  <span className={`text-sm font-medium ${selectedRule.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                    {selectedRule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Override BMS</span>
                  <span className={`text-sm font-medium ${selectedRule.overrideBMS ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>
                    {selectedRule.overrideBMS ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Last Triggered</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {formatLastTriggered(selectedRule.lastTriggered)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Created</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {selectedRule.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2">
        {isEditing || !selectedRule ? (
          <>
            <button
              onClick={handleSave}
              className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {selectedRule ? 'Save Changes' : 'Create Rule'}
            </button>
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] rounded-lg hover:bg-[var(--color-surface)] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Edit Rule
          </button>
        )}
      </div>
    </div>
  )
}

