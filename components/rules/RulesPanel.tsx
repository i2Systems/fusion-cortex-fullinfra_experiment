/**
 * Rules Panel Component
 * 
 * Enhanced right-side panel for viewing rule details or creating new rules/overrides/schedules.
 * Supports both zone and device-level rules, with scheduling capabilities.
 * 
 * AI Note: This panel appears on the right side, similar to DeviceTable or ZonesPanel.
 * Now supports a multi-step creation flow: Target Selection → Type Selection → Configuration
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Edit2, Save, Trash2, Radio, Clock, Sun, Zap, Calendar, Plus, X, Layers, Lightbulb, Workflow, CalendarClock, ArrowLeft } from 'lucide-react'
import { Rule, RuleType, TargetType, TriggerType, ScheduleFrequency } from '@/lib/mockRules'
import { useZones } from '@/lib/ZoneContext'
import { useDevices } from '@/lib/DeviceContext'
import { RuleFlowEditor } from './RuleFlowEditor'
import { RulePreview } from './RulePreview'

interface RulesPanelProps {
  selectedRule: Rule | null
  onSave: (rule: Partial<Rule>) => void
  onCancel: () => void
  onDelete?: (ruleId: string) => void
}

const triggerOptions: Array<{ value: TriggerType; label: string; icon: any; description: string }> = [
  { value: 'motion', label: 'Motion detected', icon: Radio, description: 'Trigger when motion is detected' },
  { value: 'no_motion', label: 'No motion for duration', icon: Clock, description: 'Trigger after period of inactivity' },
  { value: 'daylight', label: 'Daylight level', icon: Sun, description: 'Trigger based on natural light levels' },
  { value: 'bms', label: 'BMS command', icon: Zap, description: 'Trigger on building management system command' },
  { value: 'schedule', label: 'Time schedule', icon: Calendar, description: 'Trigger at specific times' },
]

const ruleTypeOptions: Array<{ value: RuleType; label: string; icon: any; description: string; examples: string[] }> = [
  { 
    value: 'rule', 
    label: 'Rule', 
    icon: Workflow, 
    description: 'Automated logic-based control that responds to conditions',
    examples: ['Motion Activation - Clothing', 'Daylight Harvesting - Grocery', 'Auto-Off After Inactivity']
  },
  { 
    value: 'override', 
    label: 'Override', 
    icon: Zap, 
    description: 'Manual override that takes priority over rules and schedules',
    examples: ['Maintenance Override - Grocery', 'Emergency Lighting Override', 'Device Override - FLX-3158']
  },
  { 
    value: 'schedule', 
    label: 'Schedule', 
    icon: CalendarClock, 
    description: 'Time-based automation that runs at specific times',
    examples: ['Opening Hours - Retail', 'Weekend Schedule - Clothing', 'Closing Time Dimming']
  },
]

type PanelMode = 'create' | 'edit' | 'view'
type CreationStep = 'target' | 'type' | 'configure'

export function RulesPanel({ selectedRule, onSave, onCancel, onDelete }: RulesPanelProps) {
  const { zones } = useZones()
  const { devices } = useDevices()
  const [mode, setMode] = useState<PanelMode>('view')
  const [creationStep, setCreationStep] = useState<CreationStep>('target')
  const [selectedTargetType, setSelectedTargetType] = useState<TargetType | null>(null)
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Rule>>({
    name: '',
    description: '',
    ruleType: 'rule',
    targetType: 'zone',
    trigger: 'motion',
    condition: {},
    action: { zones: [] },
    overrideBMS: false,
    enabled: true,
  })

  // Determine panel mode based on selectedRule
  useEffect(() => {
    if (selectedRule) {
      setMode('view')
      setCreationStep('configure')
      setFormData({
        name: selectedRule.name,
        description: selectedRule.description,
        ruleType: selectedRule.ruleType || 'rule',
        targetType: selectedRule.targetType || 'zone',
        targetId: selectedRule.targetId,
        targetName: selectedRule.targetName,
        trigger: selectedRule.trigger,
        condition: { ...selectedRule.condition },
        action: { ...selectedRule.action },
        overrideBMS: selectedRule.overrideBMS,
        enabled: selectedRule.enabled,
      })
      setSelectedTargetType(selectedRule.targetType || 'zone')
      setSelectedRuleType(selectedRule.ruleType || 'rule')
    } else {
      // Reset to create mode
      setMode('create')
      setCreationStep('target')
      setFormData({
        name: '',
        description: '',
        ruleType: 'rule',
        targetType: 'zone',
        trigger: 'motion',
        condition: {},
        action: { zones: [] },
        overrideBMS: false,
        enabled: true,
      })
      setSelectedTargetType(null)
      setSelectedRuleType(null)
      setSelectedTargetId(null)
    }
  }, [selectedRule])

  const handleCreateNew = () => {
    setMode('create')
    setCreationStep('target')
    setSelectedTargetType(null)
    setSelectedRuleType(null)
    setSelectedTargetId(null)
    setFormData({
      name: '',
      description: '',
      ruleType: 'rule',
      targetType: 'zone',
      trigger: 'motion',
      condition: {},
      action: { zones: [] },
      overrideBMS: false,
      enabled: true,
    })
    onCancel() // Clear selection in parent
  }

  const handleTargetTypeSelect = (targetType: TargetType) => {
    setSelectedTargetType(targetType)
    setFormData({ ...formData, targetType })
    setCreationStep('type')
  }

  const handleRuleTypeSelect = (ruleType: RuleType) => {
    setSelectedRuleType(ruleType)
    setFormData({ 
      ...formData, 
      ruleType,
      trigger: ruleType === 'schedule' ? 'schedule' : formData.trigger || 'motion'
    })
    setCreationStep('configure')
  }

  const handleTargetSelect = (targetId: string, targetName: string) => {
    setSelectedTargetId(targetId)
    setFormData({ 
      ...formData, 
      targetId,
      targetName,
      condition: {
        ...formData.condition,
        [selectedTargetType === 'device' ? 'deviceId' : 'zone']: targetName
      }
    })
  }

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('Please enter a name')
      return
    }
    if (!selectedTargetType || !selectedRuleType) {
      alert('Please complete the setup steps')
      return
    }
    if (!selectedTargetId && creationStep === 'configure') {
      alert('Please select a target')
      return
    }
    onSave(formData)
    handleCreateNew() // Reset to create new state
  }

  const handleEdit = () => {
    setMode('edit')
    setCreationStep('configure')
  }

  const handleCancel = () => {
    if (selectedRule) {
      // Reset to selected rule data
      setFormData({
        name: selectedRule.name,
        description: selectedRule.description,
        ruleType: selectedRule.ruleType || 'rule',
        targetType: selectedRule.targetType || 'zone',
        targetId: selectedRule.targetId,
        targetName: selectedRule.targetName,
        trigger: selectedRule.trigger,
        condition: { ...selectedRule.condition },
        action: { ...selectedRule.action },
        overrideBMS: selectedRule.overrideBMS,
        enabled: selectedRule.enabled,
      })
      setMode('view')
    } else {
      // Reset to create mode
      handleCreateNew()
    }
  }

  const formatRuleCondition = (rule: Rule) => {
    switch (rule.trigger) {
      case 'motion':
        return `motion detected in ${rule.targetName || rule.condition.zone || 'target'}`
      case 'no_motion':
        return `no motion for ${rule.condition.duration || 0} minutes in ${rule.targetName || rule.condition.zone || 'target'}`
      case 'daylight':
        return `daylight level ${rule.condition.operator || '>'} ${rule.condition.level || 0}fc in ${rule.targetName || rule.condition.zone || 'target'}`
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

  const formatLastTriggered = (date?: Date) => {
    if (!date) return 'Never'
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) !== 1 ? 's' : ''} ago`
  }

  const getTriggerIcon = (trigger?: TriggerType) => {
    if (!trigger) return Radio
    const option = triggerOptions.find(opt => opt.value === trigger)
    return option ? option.icon : Radio
  }

  // Available targets based on selected type
  const availableTargets = useMemo(() => {
    if (selectedTargetType === 'device') {
      return devices.map(d => ({
        id: d.id,
        name: d.deviceId,
        label: `${d.deviceId}${d.location ? ` - ${d.location}` : ''}`,
        zone: d.zone
      }))
    } else {
      return zones.map(z => ({
        id: z.id,
        name: z.name,
        label: z.name,
        deviceCount: z.deviceIds?.length || 0
      }))
    }
  }, [selectedTargetType, devices, zones])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)]">
        {selectedRule && mode === 'view' ? (
          /* Data-Dense Header for Selected Rule */
          <div className="bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)] -m-3 md:-m-4 p-3 md:p-4 mb-3 md:mb-4 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
              {/* Rule Icon */}
              {(() => {
                const TriggerIcon = getTriggerIcon(selectedRule?.trigger)
                return (
                  <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)]">
                    <TriggerIcon size={32} className="text-[var(--color-primary)]" />
                  </div>
                )
              })()}
              {/* Meta Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                      {selectedRule.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {(() => {
                        const typeOption = ruleTypeOptions.find(opt => opt.value === selectedRule?.ruleType)
                        const typeLabel = typeOption?.label || selectedRule?.ruleType || 'Rule'
                        const targetLabel = selectedRule?.targetType === 'device' ? 'Device' : 'Zone'
                        const isOverride = selectedRule?.ruleType === 'override'
                        return (
                          <span>
                            <span className={isOverride ? 'text-[var(--color-warning)] font-semibold' : ''}>
                              {typeLabel}
                            </span>
                            {' • '}
                            {targetLabel}
                          </span>
                        )
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={handleEdit}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                      title="Edit rule"
                    >
                      <Edit2 size={14} className="text-[var(--color-text-muted)]" />
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
                        <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={`px-2.5 py-1.5 rounded border ${selectedRule.enabled ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30' : 'bg-[var(--color-surface)]/50 border-[var(--color-border-subtle)]'} min-w-0`}>
                    <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Status</div>
                    <div className={`token token-sm ${selectedRule.enabled ? 'token-status-active' : 'token-status-disabled'}`}>
                      {selectedRule.enabled ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                    <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                      <Clock size={10} />
                      Last Triggered
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-text)] truncate">{formatLastTriggered(selectedRule.lastTriggered)}</div>
                  </div>
                  {selectedRule.targetName && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                      <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Target</div>
                      <div className="text-xs font-semibold text-[var(--color-text)] truncate">{selectedRule.targetName}</div>
                    </div>
                  )}
                  {selectedRule.overrideBMS && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30 min-w-0">
                      <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">BMS Override</div>
                      <div className="token token-sm token-status-warning">Enabled</div>
                    </div>
                  )}
                  {selectedRule.ruleType === 'override' && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30 min-w-0">
                      <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Type</div>
                      <div className="token token-sm token-type-override">Override</div>
                    </div>
                  )}
                  {selectedRule.ruleType === 'schedule' && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30 min-w-0">
                      <div className="text-xs opacity-80 mb-0.5 whitespace-nowrap">Type</div>
                      <div className="token token-sm token-type-schedule">Schedule</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Header for Create/Edit */
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                {mode === 'create' 
                  ? creationStep === 'target' 
                    ? 'Create New'
                    : creationStep === 'type'
                    ? 'Select Type'
                    : 'Configure'
                  : selectedRule 
                  ? 'Edit Rule' 
                  : 'Create New Rule'}
              </h3>
              {mode === 'create' && creationStep !== 'target' && (
                <button
                  onClick={() => {
                    if (creationStep === 'type') {
                      setCreationStep('target')
                      setSelectedTargetType(null)
                    } else if (creationStep === 'configure') {
                      setCreationStep('type')
                      setSelectedRuleType(null)
                      setSelectedTargetId(null)
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                  title="Go back"
                >
                  <ArrowLeft size={16} className="text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
            {selectedRule && mode === 'view' && (
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                {selectedRule.enabled ? 'Active' : 'Disabled'} • Last triggered: {formatLastTriggered(selectedRule.lastTriggered)}
              </p>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 pb-2">
        {mode === 'create' && creationStep === 'target' ? (
          /* Step 1: Target Selection */
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Select Target</h4>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Choose whether this rule applies to a zone or a specific device
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTargetTypeSelect('zone')}
                  className="p-4 rounded-lg border-2 border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all text-left group"
                >
                  <Layers size={24} className="text-[var(--color-primary)] mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-sm text-[var(--color-text)] mb-1">Zone</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Apply to all devices in a zone</div>
                </button>
                <button
                  onClick={() => handleTargetTypeSelect('device')}
                  className="p-4 rounded-lg border-2 border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all text-left group"
                >
                  <Lightbulb size={24} className="text-[var(--color-primary)] mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-sm text-[var(--color-text)] mb-1">Device</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Apply to a specific device</div>
                </button>
              </div>
            </div>
          </div>
        ) : mode === 'create' && creationStep === 'type' ? (
          /* Step 2: Rule Type Selection */
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Select Type</h4>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Choose the type of automation you want to create
              </p>
              <div className="space-y-2">
                {ruleTypeOptions.map(option => {
                  const Icon = option.icon
                  const isOverride = option.value === 'override'
                  const isSchedule = option.value === 'schedule'
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleRuleTypeSelect(option.value)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left group ${
                        isOverride
                          ? 'border-[var(--color-warning)]/50 hover:border-[var(--color-warning)] hover:bg-[var(--color-warning)]/10'
                          : isSchedule
                          ? 'border-[var(--color-primary)]/50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                          : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          isOverride
                            ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                            : isSchedule
                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                            : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                        }`}>
                          <Icon size={18} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[var(--color-text)] mb-1">{option.label}</div>
                          <div className="text-xs text-[var(--color-text-muted)] mb-2">{option.description}</div>
                          <div className="text-xs text-[var(--color-text-soft)]">
                            <span className="font-medium">Examples: </span>
                            {option.examples.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (mode === 'create' && creationStep === 'configure') || mode === 'edit' ? (
          /* Step 3: Visual Rule Flow Editor */
          <div className="space-y-4">
            {/* Name and Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  selectedRuleType === 'schedule' 
                    ? `e.g., Opening Hours, Weekend Schedule, Closing Time Dimming`
                    : selectedRuleType === 'override'
                    ? `e.g., Maintenance Override, Emergency Override, Device Override`
                    : `e.g., Motion Activation, Daylight Harvesting, Auto-Off After Inactivity`
                }
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                Description (optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this rule does..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-primary)] transition-all resize-none"
              />
            </div>

            {/* Visual Flow Editor */}
            <div className="pt-2">
              <RuleFlowEditor
                rule={formData}
                onChange={setFormData}
                ruleType={selectedRuleType || 'rule'}
              />
            </div>

            {/* Additional Settings */}
            <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-2">
              {selectedRuleType !== 'schedule' && (
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
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled !== false}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="fusion-checkbox"
                />
                <label htmlFor="enabled" className="text-sm text-[var(--color-text-muted)] cursor-pointer">
                  Enable immediately
                </label>
              </div>
            </div>
          </div>
        ) : selectedRule ? (
          /* View Mode */
          <div className="space-y-6">
            {/* Visual Rule Flow */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Rule Flow</h4>
              <RuleFlowEditor
                rule={selectedRule}
                onChange={() => {}} // Read-only in view mode
                ruleType={selectedRule.ruleType || 'rule'}
                readOnly={true}
              />
            </div>
            
            {/* Human-Readable Preview */}
            <div>
              <RulePreview rule={selectedRule} />
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
                  <span className="text-sm text-[var(--color-text-muted)]">Type</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {ruleTypeOptions.find(opt => opt.value === selectedRule.ruleType)?.label || selectedRule.ruleType}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Target</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {selectedRule.targetType === 'device' ? 'Device' : 'Zone'}: {selectedRule.targetName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                  <span className={`text-sm font-medium ${selectedRule.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                    {selectedRule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {selectedRule.overrideBMS && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Override BMS</span>
                    <span className="text-sm font-medium text-[var(--color-warning)]">Yes</span>
                </div>
                )}
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
        ) : null}
      </div>

      {/* Action Buttons Footer */}
      <div className="p-3 md:p-4 border-t border-[var(--color-border-subtle)] space-y-2 flex-shrink-0">
        {(mode === 'create' && creationStep === 'configure') || mode === 'edit' ? (
          <>
            <button
              onClick={handleSave}
              className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm"
              title={selectedRule ? 'Save Changes' : 'Create Rule'}
            >
              <Save size={14} className="md:w-4 md:h-4" />
              <span className="hidden md:inline">{selectedRule ? 'Save Changes' : 'Create'}</span>
              <span className="md:hidden">{selectedRule ? 'Save' : 'Create'}</span>
            </button>
            <button
              onClick={handleCancel}
              className="w-full fusion-button flex items-center justify-center text-xs md:text-sm"
              style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}
              title="Cancel"
            >
              <span className="hidden md:inline">Cancel</span>
              <span className="md:hidden">
                <X size={14} className="md:w-4 md:h-4" />
              </span>
            </button>
          </>
        ) : mode === 'view' && selectedRule ? (
          <button
            onClick={handleEdit}
            className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm"
            title="Edit Rule"
          >
            <Edit2 size={14} className="md:w-4 md:h-4" />
            <span className="hidden md:inline">Edit Rule</span>
            <span className="md:hidden">Edit</span>
          </button>
        ) : (
          <button
            onClick={handleCreateNew}
            className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm"
            title="Create New Rule"
          >
            <Plus size={14} className="md:w-4 md:h-4" />
            <span className="hidden md:inline">Create New</span>
            <span className="md:hidden">Create</span>
          </button>
        )}
      </div>
    </div>
  )
}
