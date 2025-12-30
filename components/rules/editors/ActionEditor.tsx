/**
 * Action Editor Component
 * 
 * Contextual editor for configuring action parameters (targets, brightness, duration, etc.).
 * Uses custom multi-select for zones/devices instead of native select.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Check, ChevronDown, Target } from 'lucide-react'
import { Rule, RuleType } from '@/lib/mockRules'
import { useZones } from '@/lib/ZoneContext'
import { useDevices } from '@/lib/DeviceContext'
import { createPortal } from 'react-dom'

interface ActionEditorProps {
  action: Rule['action']
  ruleType: RuleType
  onChange: (action: Rule['action']) => void
  onCancel: () => void
}

export function ActionEditor({ action, ruleType, onChange, onCancel }: ActionEditorProps) {
  const { zones } = useZones()
  const { devices } = useDevices()
  const [localAction, setLocalAction] = useState<Rule['action']>(action || { zones: [] })
  const [targetType, setTargetType] = useState<'zone' | 'device'>(
    (action?.zones && action.zones.length > 0) ? 'zone' : 'device'
  )
  const [showTargetSelect, setShowTargetSelect] = useState(false)
  const targetButtonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (showTargetSelect && targetButtonRef.current) {
      const rect = targetButtonRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
        maxHeight: '200px',
      })
    }
  }, [showTargetSelect])

  const handleSave = () => {
    onChange(localAction)
  }

  const toggleTarget = (id: string, name: string) => {
    if (targetType === 'zone') {
      const currentZones = localAction.zones || []
      const newZones = currentZones.includes(name)
        ? currentZones.filter(z => z !== name)
        : [...currentZones, name]
      setLocalAction({ ...localAction, zones: newZones, devices: undefined })
    } else {
      const currentDevices = localAction.devices || []
      const newDevices = currentDevices.includes(id)
        ? currentDevices.filter(d => d !== id)
        : [...currentDevices, id]
      setLocalAction({ ...localAction, devices: newDevices, zones: undefined })
    }
  }

  const selectedTargets = targetType === 'zone' 
    ? (localAction.zones || [])
    : (localAction.devices || [])

  const availableTargets = targetType === 'zone'
    ? zones.map(z => ({ id: z.id, name: z.name, label: z.name }))
    : devices.map(d => ({ id: d.id, name: d.deviceId, label: `${d.deviceId}${d.location ? ` - ${d.location}` : ''}` }))

  return (
    <div className="p-4 rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-[var(--color-text)]">Configure Action</div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
        >
          <X size={16} className="text-[var(--color-text-muted)]" />
        </button>
      </div>
      
      <div className="space-y-3">
        {/* Target Type Selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
            Target Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTargetType('zone')
                setLocalAction({ ...localAction, devices: undefined })
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                targetType === 'zone'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
              }`}
            >
              Zones
            </button>
            <button
              onClick={() => {
                setTargetType('device')
                setLocalAction({ ...localAction, zones: undefined })
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                targetType === 'device'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
              }`}
            >
              Devices
            </button>
          </div>
        </div>

        {/* Multi-Select for Targets */}
        <div className="relative">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
            Select {targetType === 'zone' ? 'Zones' : 'Devices'}
          </label>
          <button
            ref={targetButtonRef}
            onClick={() => setShowTargetSelect(!showTargetSelect)}
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] flex items-center justify-between"
          >
            <span className="text-sm text-[var(--color-text)]">
              {selectedTargets.length > 0 
                ? `${selectedTargets.length} ${targetType}(s) selected`
                : `Select ${targetType === 'zone' ? 'zones' : 'devices'}...`
              }
            </span>
            <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
          </button>

          {/* Dropdown */}
          {showTargetSelect && mounted && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowTargetSelect(false)}
              />
              <div
                className="fixed bg-[var(--color-surface)] backdrop-blur-xl rounded-lg border border-[var(--color-border-subtle)] shadow-[var(--shadow-strong)] overflow-hidden z-[9999] overflow-y-auto"
                style={dropdownStyle}
              >
                {availableTargets.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--color-text-muted)] text-center">
                    No {targetType === 'zone' ? 'zones' : 'devices'} available
                  </div>
                ) : (
                  availableTargets.map(target => {
                    const isSelected = targetType === 'zone'
                      ? (localAction.zones || []).includes(target.name)
                      : (localAction.devices || []).includes(target.id)
                    
                    return (
                      <button
                        key={target.id}
                        onClick={() => toggleTarget(target.id, target.name)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-[var(--color-border-subtle)]'
                        }`}>
                          {isSelected && <Check size={12} className="text-[var(--color-text-on-primary)]" />}
                        </div>
                        <span>{target.label}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </>,
            document.body
          )}
        </div>

        {/* Selected Targets Display */}
        {selectedTargets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTargets.slice(0, 3).map(target => (
              <div
                key={target}
                className="px-2 py-1 rounded bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs font-medium flex items-center gap-1"
              >
                <Target size={12} />
                {target}
              </div>
            ))}
            {selectedTargets.length > 3 && (
              <div className="px-2 py-1 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] text-xs">
                +{selectedTargets.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Brightness */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
            Brightness (%)
          </label>
          <input
            type="number"
            value={localAction.brightness || ''}
            onChange={(e) => setLocalAction({ ...localAction, brightness: parseInt(e.target.value) || undefined })}
            placeholder="0-100"
            min="0"
            max="100"
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Duration (not for schedules) */}
        {ruleType !== 'schedule' && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={localAction.duration || ''}
              onChange={(e) => setLocalAction({ ...localAction, duration: parseInt(e.target.value) || undefined })}
              placeholder="Optional"
              min="1"
              className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        )}

        {/* Return to BMS (not for schedules) */}
        {ruleType !== 'schedule' && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={localAction.returnToBMS || false}
              onChange={(e) => setLocalAction({ ...localAction, returnToBMS: e.target.checked })}
              className="fusion-checkbox"
            />
            Return to BMS after duration
          </label>
        )}
      </div>

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

