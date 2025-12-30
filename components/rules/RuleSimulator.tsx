/**
 * Rule Simulator Component
 * 
 * Simple simulator to test rules against example events.
 * Shows whether the rule would trigger for given scenarios.
 */

'use client'

import { useState } from 'react'
import { Play, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Rule, TriggerType } from '@/lib/mockRules'

interface RuleSimulatorProps {
  rule: Rule
}

interface TestEvent {
  id: string
  name: string
  trigger: TriggerType
  condition: {
    zone?: string
    deviceId?: string
    daylight?: number
    motion?: boolean
    time?: string
  }
}

export function RuleSimulator({ rule }: RuleSimulatorProps) {
  const [selectedEvent, setSelectedEvent] = useState<TestEvent | null>(null)
  const [result, setResult] = useState<{ triggered: boolean; reason: string } | null>(null)

  // Generate example events based on rule trigger
  const exampleEvents: TestEvent[] = (() => {
    const events: TestEvent[] = []
    
    if (rule.trigger === 'motion') {
      events.push(
        {
          id: 'motion-1',
          name: 'Motion detected in target zone',
          trigger: 'motion',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            motion: true,
          }
        },
        {
          id: 'motion-2',
          name: 'Motion detected in different zone',
          trigger: 'motion',
          condition: {
            zone: 'Zone B',
            motion: true,
          }
        },
        {
          id: 'motion-3',
          name: 'No motion',
          trigger: 'motion',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            motion: false,
          }
        }
      )
    } else if (rule.trigger === 'no_motion') {
      events.push(
        {
          id: 'no-motion-1',
          name: `No motion for ${rule.condition?.duration || 30} minutes`,
          trigger: 'no_motion',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            motion: false,
          }
        },
        {
          id: 'no-motion-2',
          name: 'Motion detected (should not trigger)',
          trigger: 'no_motion',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            motion: true,
          }
        }
      )
    } else if (rule.trigger === 'daylight') {
      const threshold = rule.condition?.level || 100
      const operator = rule.condition?.operator || '>'
      events.push(
        {
          id: 'daylight-1',
          name: `Daylight ${operator} ${threshold}fc (would trigger)`,
          trigger: 'daylight',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            daylight: operator === '>' ? threshold + 10 : threshold - 10,
          }
        },
        {
          id: 'daylight-2',
          name: `Daylight ${operator === '>' ? '<' : '>'} ${threshold}fc (would not trigger)`,
          trigger: 'daylight',
          condition: {
            zone: rule.condition?.zone || 'Zone A',
            daylight: operator === '>' ? threshold - 10 : threshold + 10,
          }
        }
      )
    } else if (rule.trigger === 'schedule') {
      events.push(
        {
          id: 'schedule-1',
          name: `At scheduled time ${rule.condition?.scheduleTime || '08:00'}`,
          trigger: 'schedule',
          condition: {
            time: rule.condition?.scheduleTime || '08:00',
          }
        },
        {
          id: 'schedule-2',
          name: 'At different time (would not trigger)',
          trigger: 'schedule',
          condition: {
            time: '12:00',
          }
        }
      )
    } else if (rule.trigger === 'bms') {
      events.push(
        {
          id: 'bms-1',
          name: 'BMS command received',
          trigger: 'bms',
          condition: {}
        }
      )
    }

    return events
  })()

  const testRule = (event: TestEvent) => {
    setSelectedEvent(event)
    
    // Simple rule evaluation logic
    let triggered = false
    let reason = ''

    // Check trigger type matches
    if (event.trigger !== rule.trigger) {
      setResult({ triggered: false, reason: 'Trigger type mismatch' })
      return
    }

    // Evaluate based on trigger type
    switch (rule.trigger) {
      case 'motion':
        if (event.condition.motion && 
            (event.condition.zone === rule.condition?.zone || 
             event.condition.deviceId === rule.condition?.deviceId)) {
          triggered = true
          reason = 'Motion detected in target zone/device'
        } else {
          reason = event.condition.motion 
            ? 'Motion detected but not in target zone/device'
            : 'No motion detected'
        }
        break

      case 'no_motion':
        if (!event.condition.motion && 
            (event.condition.zone === rule.condition?.zone || 
             event.condition.deviceId === rule.condition?.deviceId)) {
          triggered = true
          reason = 'No motion in target zone/device for required duration'
        } else {
          reason = 'Motion still detected or wrong zone/device'
        }
        break

      case 'daylight':
        const eventLevel = event.condition.daylight || 0
        const ruleLevel = rule.condition?.level || 0
        const operator = rule.condition?.operator || '>'
        const zoneMatch = !rule.condition?.zone || event.condition.zone === rule.condition.zone
        
        let levelMatch = false
        if (operator === '>') levelMatch = eventLevel > ruleLevel
        else if (operator === '<') levelMatch = eventLevel < ruleLevel
        else if (operator === '>=') levelMatch = eventLevel >= ruleLevel
        else if (operator === '=') levelMatch = eventLevel === ruleLevel

        if (levelMatch && zoneMatch) {
          triggered = true
          reason = `Daylight level ${eventLevel}fc ${operator} ${ruleLevel}fc in target zone`
        } else {
          reason = levelMatch 
            ? 'Daylight level matches but wrong zone'
            : `Daylight level ${eventLevel}fc does not meet condition ${operator} ${ruleLevel}fc`
        }
        break

      case 'schedule':
        if (event.condition.time === rule.condition?.scheduleTime) {
          triggered = true
          reason = 'Scheduled time reached'
        } else {
          reason = `Time ${event.condition.time} does not match scheduled time ${rule.condition?.scheduleTime}`
        }
        break

      case 'bms':
        triggered = true
        reason = 'BMS command received'
        break
    }

    setResult({ triggered, reason })
  }

  if (exampleEvents.length === 0) {
    return null
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-2 mb-3">
        <Play size={16} className="text-[var(--color-text-muted)]" />
        <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Test Rule
        </div>
      </div>
      
      <div className="text-xs text-[var(--color-text-soft)] mb-3">
        Test your rule against example events to see if it triggers correctly.
      </div>

      <div className="space-y-2 mb-4">
        {exampleEvents.map(event => (
          <button
            key={event.id}
            onClick={() => testRule(event)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selectedEvent?.id === event.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)]'
            }`}
          >
            <div className="text-sm font-medium text-[var(--color-text)]">{event.name}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className={`p-3 rounded-lg border ${
          result.triggered
            ? 'bg-[var(--color-success)]/20 border-[var(--color-success)]/30'
            : 'bg-[var(--color-surface)]/50 border-[var(--color-border-subtle)]'
        }`}>
          <div className="flex items-start gap-2">
            {result.triggered ? (
              <CheckCircle2 size={16} className="text-[var(--color-success)] flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold mb-1 ${
                result.triggered ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
              }`}>
                {result.triggered ? 'Rule would trigger' : 'Rule would not trigger'}
              </div>
              <div className="text-xs text-[var(--color-text-soft)]">
                {result.reason}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

