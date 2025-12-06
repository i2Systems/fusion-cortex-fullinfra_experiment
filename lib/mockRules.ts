/**
 * Mock Rules Data
 * 
 * Sample automation rules for lighting control.
 * 
 * AI Note: Rules follow Alexa-style plain language format.
 */

export interface Rule {
  id: string
  name: string
  description?: string
  trigger: 'motion' | 'no_motion' | 'daylight' | 'bms' | 'schedule'
  condition: {
    zone?: string
    duration?: number // minutes
    level?: number // fc for daylight
    operator?: '>' | '<' | '=' | '>='
  }
  action: {
    zones: string[]
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
    trigger: 'schedule',
    condition: {
      zone: 'Zone 3 - Retail',
      duration: 60,
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
]

