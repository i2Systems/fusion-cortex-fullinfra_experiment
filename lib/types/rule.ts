/**
 * Rule Type Definitions
 *
 * Type definitions for rule conditions and actions.
 * These are stored as JSON in the database and need proper typing.
 *
 * @module lib/types/rule
 */

import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// ============================================================================
// RULE ENUM TYPES (matching lib/mockRules.ts)
// ============================================================================

export type RuleType = 'rule' | 'override' | 'schedule'
export type TargetType = 'zone' | 'device'
export type TriggerType = 'motion' | 'no_motion' | 'daylight' | 'bms' | 'schedule' | 'fault'
export type ScheduleFrequency = 'daily' | 'weekly' | 'custom'

// ============================================================================
// CONDITION SCHEMA (matching lib/mockRules.ts Rule interface)
// ============================================================================

/**
 * Rule condition schema - matches the existing Rule.condition type
 */
export const RuleConditionSchema = z.object({
  zone: z.string().optional(),
  deviceId: z.string().optional(),
  duration: z.number().optional(), // minutes
  level: z.number().optional(), // fc for daylight
  operator: z.enum(['>', '<', '=', '>=']).optional(),
  // Scheduling fields
  scheduleTime: z.string().optional(), // HH:mm format
  scheduleDays: z.array(z.number()).optional(), // 0-6 (Sunday-Saturday) for weekly
  scheduleFrequency: z.enum(['daily', 'weekly', 'custom']).optional(),
  scheduleDate: z.string().optional(), // YYYY-MM-DD for one-time schedules
})

export type RuleCondition = z.infer<typeof RuleConditionSchema>

// ============================================================================
// ACTION SCHEMA (matching lib/mockRules.ts Rule interface)
// ============================================================================

/**
 * Rule action schema - matches the existing Rule.action type
 */
export const RuleActionSchema = z.object({
  zones: z.array(z.string()).optional(),
  devices: z.array(z.string()).optional(), // Device IDs
  brightness: z.number().optional(), // percentage
  duration: z.number().optional(), // minutes
  returnToBMS: z.boolean().optional(),
  emailManager: z.boolean().optional(), // email store manager (e.g. on fault)
})

export type RuleAction = z.infer<typeof RuleActionSchema>

// ============================================================================
// FLEXIBLE JSON SCHEMAS (for tRPC input validation)
// ============================================================================

// JSON-compatible value type for Prisma (excluding null at top level for InputJsonValue)
const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()])

const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
)

/**
 * Flexible condition schema that accepts any JSON object
 * Use this for tRPC input validation - compatible with Prisma JSON fields
 */
export const FlexibleConditionSchema = z.record(z.string(), JsonValueSchema)

/**
 * Flexible action schema that accepts any JSON object
 * Use this for tRPC input validation - compatible with Prisma JSON fields
 */
export const FlexibleActionSchema = z.record(z.string(), JsonValueSchema)

// ============================================================================
// RULE OUTPUT TYPE (for tRPC responses)
// ============================================================================

/**
 * Rule as returned from the tRPC API
 * Uses undefined instead of null to match frontend Rule interface (lib/mockRules.ts)
 */
export interface RuleOutput {
  id: string
  name: string
  description?: string
  ruleType: RuleType
  targetType: TargetType
  targetId?: string
  targetName?: string
  trigger: TriggerType
  condition: RuleCondition | Record<string, Prisma.JsonValue>
  action: RuleAction | Record<string, Prisma.JsonValue>
  overrideBMS: boolean
  duration?: number
  siteId: string
  zoneId?: string
  zoneName?: string
  deviceId?: string
  deviceName?: string
  targetZones: string[]
  enabled: boolean
  lastTriggered?: Date
  createdAt: Date
  updatedAt: Date
}
