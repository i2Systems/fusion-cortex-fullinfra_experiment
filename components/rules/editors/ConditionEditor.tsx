/**
 * Condition Editor Component
 * 
 * Contextual editor for configuring condition parameters based on trigger type.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import { Rule, RuleType, TriggerType, ScheduleFrequency } from '@/lib/mockRules'
import { useZones } from '@/lib/DomainContext'
import { useDevices } from '@/lib/DomainContext'

interface ConditionEditorProps {
  trigger: TriggerType
  condition: Rule['condition']
  ruleType: RuleType
  onChange: (condition: Rule['condition']) => void
  onCancel: () => void
}

export function ConditionEditor({ trigger, condition, ruleType, onChange, onCancel }: ConditionEditorProps) {
  const { zones } = useZones()
  const { devices } = useDevices()
  const [localCondition, setLocalCondition] = useState<Rule['condition']>(condition || {})

  useEffect(() => {
    setLocalCondition(condition || {})
  }, [condition])

  const handleSave = () => {
    onChange(localCondition)
  }

  const renderEditor = () => {
    switch (trigger) {
      case 'motion':
      case 'no_motion':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Target Zone or Device
              </label>
              <select
                value={localCondition.zone || localCondition.deviceId || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.startsWith('zone:')) {
                    setLocalCondition({ ...localCondition, zone: value.replace('zone:', ''), deviceId: undefined })
                  } else if (value.startsWith('device:')) {
                    setLocalCondition({ ...localCondition, deviceId: value.replace('device:', ''), zone: undefined })
                  } else {
                    setLocalCondition({ ...localCondition, zone: undefined, deviceId: undefined })
                  }
                }}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Select target...</option>
                <optgroup label="Zones">
                  {zones.map(zone => (
                    <option key={zone.id} value={`zone:${zone.name}`}>{zone.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Devices">
                  {devices.map(device => (
                    <option key={device.id} value={`device:${device.deviceId}`}>
                      {device.deviceId}{device.location ? ` - ${device.location}` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            {trigger === 'no_motion' && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={localCondition.duration || ''}
                  onChange={(e) => setLocalCondition({ ...localCondition, duration: parseInt(e.target.value) || undefined })}
                  placeholder="30"
                  min="1"
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}
          </div>
        )

      case 'daylight':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Target Zone or Device
              </label>
              <select
                value={localCondition.zone || localCondition.deviceId || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.startsWith('zone:')) {
                    setLocalCondition({ ...localCondition, zone: value.replace('zone:', ''), deviceId: undefined })
                  } else if (value.startsWith('device:')) {
                    setLocalCondition({ ...localCondition, deviceId: value.replace('device:', ''), zone: undefined })
                  } else {
                    setLocalCondition({ ...localCondition, zone: undefined, deviceId: undefined })
                  }
                }}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Select target...</option>
                <optgroup label="Zones">
                  {zones.map(zone => (
                    <option key={zone.id} value={`zone:${zone.name}`}>{zone.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Devices">
                  {devices.map(device => (
                    <option key={device.id} value={`device:${device.deviceId}`}>
                      {device.deviceId}{device.location ? ` - ${device.location}` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            <div className="flex gap-2">
              <select
                value={localCondition.operator || '>'}
                onChange={(e) => setLocalCondition({ ...localCondition, operator: e.target.value as '>' | '<' | '=' | '>=' })}
                className="px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value=">">{'>'}</option>
                <option value="<">{'<'}</option>
                <option value=">=">{'>='}</option>
                <option value="=">{'='}</option>
              </select>
              <input
                type="number"
                value={localCondition.level || ''}
                onChange={(e) => setLocalCondition({ ...localCondition, level: parseInt(e.target.value) || undefined })}
                placeholder="Level (fc)"
                className="flex-1 px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        )

      case 'schedule':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Schedule Time
              </label>
              <input
                type="time"
                value={localCondition.scheduleTime || ''}
                onChange={(e) => setLocalCondition({ ...localCondition, scheduleTime: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Frequency
              </label>
              <select
                value={localCondition.scheduleFrequency || 'daily'}
                onChange={(e) => setLocalCondition({ 
                  ...localCondition, 
                  scheduleFrequency: e.target.value as ScheduleFrequency 
                })}
                className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom (one-time)</option>
              </select>
            </div>

            {localCondition.scheduleFrequency === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                  Days of Week
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={day}
                      onClick={() => {
                        const currentDays = localCondition.scheduleDays || []
                        const newDays = currentDays.includes(index)
                          ? currentDays.filter(d => d !== index)
                          : [...currentDays, index]
                        setLocalCondition({ ...localCondition, scheduleDays: newDays })
                      }}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        localCondition.scheduleDays?.includes(index)
                          ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                          : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {localCondition.scheduleFrequency === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={localCondition.scheduleDate || ''}
                  onChange={(e) => setLocalCondition({ ...localCondition, scheduleDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}
          </div>
        )

      case 'bms':
        return (
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <div className="text-sm text-[var(--color-text-muted)]">
              BMS commands are received automatically from the building management system. No additional configuration needed.
            </div>
          </div>
        )

      case 'fault':
        return (
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <div className="text-sm text-[var(--color-text-muted)]">
              This rule runs when a device or system fault is detected at this site. Configure the action (e.g. email store manager) in the action step.
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-4 rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-[var(--color-text)]">Configure Condition</div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
        >
          <X size={16} className="text-[var(--color-text-muted)]" />
        </button>
      </div>
      
      {renderEditor()}

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] rounded-lg text-sm font-medium hover:bg-[var(--color-surface)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

