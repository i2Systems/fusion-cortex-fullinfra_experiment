/**
 * Mock Rules Data
 * 
 * Sample automation rules for lighting control.
 * 
 * AI Note: Rules follow Alexa-style plain language format.
 */

export type RuleType = 'rule' | 'override' | 'schedule'
export type TargetType = 'zone' | 'device'
export type TriggerType = 'motion' | 'no_motion' | 'daylight' | 'bms' | 'schedule'
export type ScheduleFrequency = 'daily' | 'weekly' | 'custom'

export interface Rule {
  id: string
  name: string
  description?: string
  ruleType: RuleType // 'rule', 'override', or 'schedule'
  targetType: TargetType // 'zone' or 'device'
  targetId?: string // Zone ID or Device ID
  targetName?: string // Zone name or Device ID for display
  trigger: TriggerType
  condition: {
    zone?: string
    deviceId?: string
    duration?: number // minutes
    level?: number // fc for daylight
    operator?: '>' | '<' | '=' | '>='
    // Scheduling fields
    scheduleTime?: string // HH:mm format
    scheduleDays?: number[] // 0-6 (Sunday-Saturday) for weekly
    scheduleFrequency?: ScheduleFrequency
    scheduleDate?: string // YYYY-MM-DD for one-time schedules
  }
  action: {
    zones?: string[]
    devices?: string[] // Device IDs
    brightness?: number // percentage
    duration?: number // minutes
    returnToBMS?: boolean
  }
  overrideBMS: boolean
  enabled: boolean
  lastTriggered?: Date
  createdAt: Date
  updatedAt: Date
}

export const mockRules: Rule[] = [
  {
    id: 'rule-1',
    name: 'Motion Activation - Clothing',
    description: 'Automatically turn on lights when motion is detected',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-2',
    targetName: 'Zone 2 - Clothing',
    trigger: 'motion',
    condition: {
      zone: 'Zone 2 - Clothing',
    },
    action: {
      zones: ['Zone 2 - Clothing'],
      brightness: 30,
      duration: 15,
      returnToBMS: true,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 12), // 12 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 'rule-2',
    name: 'Daylight Harvesting - Grocery',
    description: 'Dim lights when natural light is sufficient',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-7',
    targetName: 'Zone 7 - Grocery',
    trigger: 'daylight',
    condition: {
      zone: 'Zone 7 - Grocery',
      level: 120,
      operator: '>',
    },
    action: {
      zones: ['Zone 7 - Grocery'],
      brightness: 10,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: 'rule-3',
    name: 'Auto-Off After Inactivity',
    description: 'Return to BMS control after no motion detected',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-1',
    targetName: 'Zone 1 - Electronics',
    trigger: 'no_motion',
    condition: {
      zone: 'Zone 1 - Electronics',
      duration: 30,
    },
    action: {
      zones: ['Zone 1 - Electronics'],
      returnToBMS: true,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
  {
    id: 'rule-4',
    name: 'Evening Dimming - Retail',
    description: 'Reduce brightness during evening hours for energy savings',
    ruleType: 'schedule',
    targetType: 'zone',
    targetId: 'zone-3',
    targetName: 'Zone 3 - Retail',
    trigger: 'schedule',
    condition: {
      zone: 'Zone 3 - Retail',
      scheduleTime: '18:00',
      scheduleFrequency: 'daily',
    },
    action: {
      zones: ['Zone 3 - Retail'],
      brightness: 50,
      duration: 240,
      returnToBMS: false,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: 'rule-5',
    name: 'BMS Override - Electronics',
    description: 'Allow BMS to take control when maintenance mode is activated',
    ruleType: 'override',
    targetType: 'zone',
    targetId: 'zone-1',
    targetName: 'Zone 1 - Electronics',
    trigger: 'bms',
    condition: {
      zone: 'Zone 1 - Electronics',
    },
    action: {
      zones: ['Zone 1 - Electronics'],
      returnToBMS: true,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: 'rule-6',
    name: 'Low Light Boost - Grocery',
    description: 'Increase brightness when daylight levels drop below threshold',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-7',
    targetName: 'Zone 7 - Grocery',
    trigger: 'daylight',
    condition: {
      zone: 'Zone 7 - Grocery',
      level: 80,
      operator: '<',
    },
    action: {
      zones: ['Zone 7 - Grocery'],
      brightness: 75,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    id: 'rule-7',
    name: 'Multi-Zone Motion Response',
    description: 'Activate adjacent zones when motion is detected in primary zone',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-2',
    targetName: 'Zone 2 - Clothing',
    trigger: 'motion',
    condition: {
      zone: 'Zone 2 - Clothing',
    },
    action: {
      zones: ['Zone 2 - Clothing', 'Zone 3 - Retail'],
      brightness: 40,
      duration: 20,
      returnToBMS: true,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 8), // 8 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: 'rule-8',
    name: 'Extended Inactivity - All Zones',
    description: 'Return all zones to BMS after extended period of no activity',
    ruleType: 'rule',
    targetType: 'zone',
    targetId: 'zone-1',
    targetName: 'Zone 1 - Electronics',
    trigger: 'no_motion',
    condition: {
      zone: 'Zone 1 - Electronics',
      duration: 120,
    },
    action: {
      zones: ['Zone 1 - Electronics', 'Zone 2 - Clothing', 'Zone 3 - Retail', 'Zone 7 - Grocery'],
      returnToBMS: true,
    },
    overrideBMS: false,
    enabled: false, // Disabled by default
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
  },
  {
    id: 'override-1',
    name: 'Maintenance Override - Grocery',
    description: 'Manual override to keep lights at full brightness during maintenance',
    ruleType: 'override',
    targetType: 'zone',
    targetId: 'zone-7',
    targetName: 'Zone 7 - Grocery',
    trigger: 'bms',
    condition: {
      zone: 'Zone 7 - Grocery',
    },
    action: {
      zones: ['Zone 7 - Grocery'],
      brightness: 100,
      duration: 120,
      returnToBMS: false,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 'override-2',
    name: 'Emergency Lighting Override',
    description: 'Override all rules to ensure maximum visibility during emergency',
    ruleType: 'override',
    targetType: 'zone',
    targetId: 'zone-1',
    targetName: 'Zone 1 - Electronics',
    trigger: 'bms',
    condition: {
      zone: 'Zone 1 - Electronics',
    },
    action: {
      zones: ['Zone 1 - Electronics', 'Zone 2 - Clothing', 'Zone 3 - Retail'],
      brightness: 100,
      returnToBMS: false,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    id: 'schedule-1',
    name: 'Opening Hours - Retail',
    description: 'Bright lighting during store opening hours',
    ruleType: 'schedule',
    targetType: 'zone',
    targetId: 'zone-3',
    targetName: 'Zone 3 - Retail',
    trigger: 'schedule',
    condition: {
      zone: 'Zone 3 - Retail',
      scheduleTime: '08:00',
      scheduleFrequency: 'daily',
    },
    action: {
      zones: ['Zone 3 - Retail'],
      brightness: 80,
      duration: 600,
      returnToBMS: false,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: 'schedule-2',
    name: 'Weekend Schedule - Clothing',
    description: 'Reduced lighting on weekends for energy savings',
    ruleType: 'schedule',
    targetType: 'zone',
    targetId: 'zone-2',
    targetName: 'Zone 2 - Clothing',
    trigger: 'schedule',
    condition: {
      zone: 'Zone 2 - Clothing',
      scheduleTime: '09:00',
      scheduleFrequency: 'weekly',
      scheduleDays: [0, 6], // Sunday and Saturday
    },
    action: {
      zones: ['Zone 2 - Clothing'],
      brightness: 50,
      duration: 480,
      returnToBMS: false,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  },
  {
    id: 'schedule-3',
    name: 'Closing Time Dimming',
    description: 'Gradual dimming before store closing',
    ruleType: 'schedule',
    targetType: 'zone',
    targetId: 'zone-1',
    targetName: 'Zone 1 - Electronics',
    trigger: 'schedule',
    condition: {
      zone: 'Zone 1 - Electronics',
      scheduleTime: '20:00',
      scheduleFrequency: 'daily',
    },
    action: {
      zones: ['Zone 1 - Electronics', 'Zone 2 - Clothing', 'Zone 3 - Retail'],
      brightness: 30,
      duration: 60,
      returnToBMS: true,
    },
    overrideBMS: false,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: 'override-3',
    name: 'Device Override - FLX-3158',
    description: 'Manual override for specific device during troubleshooting',
    ruleType: 'override',
    targetType: 'device',
    targetId: 'FLX-3158',
    targetName: 'FLX-3158',
    trigger: 'bms',
    condition: {
      deviceId: 'FLX-3158',
    },
    action: {
      devices: ['FLX-3158'],
      brightness: 75,
      duration: 30,
      returnToBMS: false,
    },
    overrideBMS: true,
    enabled: true,
    lastTriggered: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
]

