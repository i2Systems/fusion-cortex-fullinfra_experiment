/**
 * Device Type Definitions
 * 
 * SINGLE SOURCE OF TRUTH for device types across the entire application.
 * Derived from Prisma schema to ensure database and frontend are always in sync.
 * 
 * ## Architecture
 * 
 * ```
 * Prisma Schema (DeviceType enum)
 *        ↓ prisma generate
 * @prisma/client (PrismaDeviceType)
 *        ↓ re-export
 * This file (DeviceType, DisplayDeviceType, schemas, guards)
 *        ↓ import
 * All app code
 * ```
 * 
 * ## Adding a New Device Type
 * 
 * 1. Add to `prisma/schema.prisma`:
 *    ```prisma
 *    enum DeviceType {
 *      // ...existing
 *      NEW_DEVICE_TYPE
 *    }
 *    ```
 * 
 * 2. Run `npx prisma generate`
 * 
 * 3. Add mappings below:
 *    - DEVICE_TYPE_DISPLAY
 *    - DEVICE_TYPE_FROM_DISPLAY  
 *    - ALL_DISPLAY_DEVICE_TYPES
 *    - (if fixture) ALL_DISPLAY_FIXTURE_TYPES
 * 
 * That's it! TypeScript will error on any missing cases.
 * 
 * @module lib/types/device
 */

import { z } from 'zod'
import { DeviceType as PrismaDeviceType, DeviceStatus as PrismaDeviceStatus } from '@prisma/client'

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Database device type - matches Prisma enum exactly.
 * Use for database operations and API boundaries.
 */
export type DeviceType = PrismaDeviceType

/**
 * Database device status - matches Prisma enum exactly.
 * Use for database operations and API boundaries.
 */
export type DeviceStatus = PrismaDeviceStatus

// Re-export enums for switch statement exhaustiveness checking
export { DeviceType as DeviceTypeEnum, DeviceStatus as DeviceStatusEnum } from '@prisma/client'

// ============================================================================
// DISPLAY TYPES (Frontend)
// ============================================================================

/**
 * Human-readable device type for UI display.
 * Uses kebab-case format matching legacy frontend conventions.
 * 
 * @example
 * ```typescript
 * const type: DisplayDeviceType = 'fixture-16ft-power-entry'
 * ```
 */
export type DisplayDeviceType =
    | 'fixture-16ft-power-entry'
    | 'fixture-12ft-power-entry'
    | 'fixture-8ft-power-entry'
    | 'fixture-16ft-follower'
    | 'fixture-12ft-follower'
    | 'fixture-8ft-follower'
    | 'motion'
    | 'light-sensor'

/**
 * Human-readable device status for UI display.
 * Note: DUPLICATE status from Prisma is mapped to 'offline' for UI.
 */
export type DisplayDeviceStatus = 'online' | 'offline' | 'missing'

/**
 * Fixture-only device types (subset for type-safe fixture operations)
 */
export type DisplayFixtureType = Extract<DisplayDeviceType,
    | 'fixture-16ft-power-entry'
    | 'fixture-12ft-power-entry'
    | 'fixture-8ft-power-entry'
    | 'fixture-16ft-follower'
    | 'fixture-12ft-follower'
    | 'fixture-8ft-follower'
>

/**
 * Sensor-only device types
 */
export type DisplaySensorType = Extract<DisplayDeviceType, 'motion' | 'light-sensor'>

// ============================================================================
// BRANDED TYPES (for type-safe IDs)
// ============================================================================

/**
 * Branded type for Device IDs - prevents mixing up with other string IDs
 * 
 * @example
 * ```typescript
 * function getDevice(id: DeviceId): Device { ... }
 * 
 * const deviceId = 'device-123' as DeviceId
 * const siteId = 'site-456' as SiteId
 * 
 * getDevice(deviceId) // ✅ OK
 * getDevice(siteId)   // ❌ TypeScript error!
 * ```
 */
export type DeviceId = string & { readonly __brand: 'DeviceId' }

/**
 * Branded type for Site IDs
 */
export type SiteId = string & { readonly __brand: 'SiteId' }

/**
 * Branded type for Zone IDs
 */
export type ZoneId = string & { readonly __brand: 'ZoneId' }

/**
 * Create a branded DeviceId from a string
 */
export const deviceId = (id: string): DeviceId => id as DeviceId

/**
 * Create a branded SiteId from a string
 */
export const siteId = (id: string): SiteId => id as SiteId

/**
 * Create a branded ZoneId from a string
 */
export const zoneId = (id: string): ZoneId => id as ZoneId

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Bidirectional mapping: Prisma DeviceType ↔ Display string
 */
export const DEVICE_TYPE_DISPLAY = {
    FIXTURE_16FT_POWER_ENTRY: 'fixture-16ft-power-entry',
    FIXTURE_12FT_POWER_ENTRY: 'fixture-12ft-power-entry',
    FIXTURE_8FT_POWER_ENTRY: 'fixture-8ft-power-entry',
    FIXTURE_16FT_FOLLOWER: 'fixture-16ft-follower',
    FIXTURE_12FT_FOLLOWER: 'fixture-12ft-follower',
    FIXTURE_8FT_FOLLOWER: 'fixture-8ft-follower',
    MOTION_SENSOR: 'motion',
    LIGHT_SENSOR: 'light-sensor',
} as const satisfies Record<DeviceType, DisplayDeviceType>

/**
 * Reverse mapping: Display string → Prisma DeviceType
 */
export const DEVICE_TYPE_FROM_DISPLAY = {
    'fixture-16ft-power-entry': 'FIXTURE_16FT_POWER_ENTRY',
    'fixture-12ft-power-entry': 'FIXTURE_12FT_POWER_ENTRY',
    'fixture-8ft-power-entry': 'FIXTURE_8FT_POWER_ENTRY',
    'fixture-16ft-follower': 'FIXTURE_16FT_FOLLOWER',
    'fixture-12ft-follower': 'FIXTURE_12FT_FOLLOWER',
    'fixture-8ft-follower': 'FIXTURE_8FT_FOLLOWER',
    'motion': 'MOTION_SENSOR',
    'light-sensor': 'LIGHT_SENSOR',
} as const satisfies Record<DisplayDeviceType, DeviceType>

/**
 * Bidirectional mapping: Prisma DeviceStatus ↔ Display string
 */
export const DEVICE_STATUS_DISPLAY = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MISSING: 'missing',
    DUPLICATE: 'offline', // DUPLICATE maps to 'offline' for display
} as const satisfies Record<DeviceStatus, DisplayDeviceStatus>

/**
 * Reverse mapping: Display string → Prisma DeviceStatus
 */
export const DEVICE_STATUS_FROM_DISPLAY = {
    'online': 'ONLINE',
    'offline': 'OFFLINE',
    'missing': 'MISSING',
} as const satisfies Record<DisplayDeviceStatus, DeviceStatus>

/**
 * Human-readable labels for device types
 */
export const DEVICE_TYPE_LABELS = {
    FIXTURE_16FT_POWER_ENTRY: '16ft Power Entry',
    FIXTURE_12FT_POWER_ENTRY: '12ft Power Entry',
    FIXTURE_8FT_POWER_ENTRY: '8ft Power Entry',
    FIXTURE_16FT_FOLLOWER: '16ft Follower',
    FIXTURE_12FT_FOLLOWER: '12ft Follower',
    FIXTURE_8FT_FOLLOWER: '8ft Follower',
    MOTION_SENSOR: 'Motion Sensor',
    LIGHT_SENSOR: 'Light Sensor',
} as const satisfies Record<DeviceType, string>

/**
 * Human-readable labels for device statuses
 */
export const DEVICE_STATUS_LABELS = {
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    MISSING: 'Missing',
    DUPLICATE: 'Duplicate',
} as const satisfies Record<DeviceStatus, string>

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for Prisma DeviceType validation
 */
export const DeviceTypeSchema = z.enum([
    'FIXTURE_16FT_POWER_ENTRY',
    'FIXTURE_12FT_POWER_ENTRY',
    'FIXTURE_8FT_POWER_ENTRY',
    'FIXTURE_16FT_FOLLOWER',
    'FIXTURE_12FT_FOLLOWER',
    'FIXTURE_8FT_FOLLOWER',
    'MOTION_SENSOR',
    'LIGHT_SENSOR',
])

/**
 * Zod schema for Prisma DeviceStatus validation
 */
export const DeviceStatusSchema = z.enum([
    'ONLINE',
    'OFFLINE',
    'MISSING',
    'DUPLICATE',
])

/**
 * Zod schema for display device type validation
 */
export const DisplayDeviceTypeSchema = z.enum([
    'fixture-16ft-power-entry',
    'fixture-12ft-power-entry',
    'fixture-8ft-power-entry',
    'fixture-16ft-follower',
    'fixture-12ft-follower',
    'fixture-8ft-follower',
    'motion',
    'light-sensor',
])

/**
 * Zod schema for display device status validation
 */
export const DisplayDeviceStatusSchema = z.enum([
    'online',
    'offline',
    'missing',
])

/**
 * Zod schema for display fixture type validation (subset)
 */
export const DisplayFixtureTypeSchema = z.enum([
    'fixture-16ft-power-entry',
    'fixture-12ft-power-entry',
    'fixture-8ft-power-entry',
    'fixture-16ft-follower',
    'fixture-12ft-follower',
    'fixture-8ft-follower',
])

// ============================================================================
// TYPE ARRAYS (for iteration)
// ============================================================================

/** All Prisma device types */
export const ALL_DEVICE_TYPES: readonly DeviceType[] = Object.keys(DEVICE_TYPE_DISPLAY) as DeviceType[]

/** All Prisma device statuses */
export const ALL_DEVICE_STATUSES: readonly DeviceStatus[] = Object.keys(DEVICE_STATUS_DISPLAY) as DeviceStatus[]

/** All display device types */
export const ALL_DISPLAY_DEVICE_TYPES: readonly DisplayDeviceType[] = Object.values(DEVICE_TYPE_DISPLAY)

/** All display device statuses */
export const ALL_DISPLAY_DEVICE_STATUSES: readonly DisplayDeviceStatus[] = ['online', 'offline', 'missing']

/** All display fixture types */
export const ALL_DISPLAY_FIXTURE_TYPES: readonly DisplayFixtureType[] = [
    'fixture-16ft-power-entry',
    'fixture-12ft-power-entry',
    'fixture-8ft-power-entry',
    'fixture-16ft-follower',
    'fixture-12ft-follower',
    'fixture-8ft-follower',
]

/** All display sensor types */
export const ALL_DISPLAY_SENSOR_TYPES: readonly DisplaySensorType[] = ['motion', 'light-sensor']

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard: Check if a string is a valid Prisma DeviceType
 * 
 * @example
 * ```typescript
 * const input = getFromAPI()
 * if (isDeviceType(input)) {
 *   // input is now narrowed to DeviceType
 *   console.log(input) // 'FIXTURE_16FT_POWER_ENTRY' | ...
 * }
 * ```
 */
export function isDeviceType(value: unknown): value is DeviceType {
    return typeof value === 'string' && value in DEVICE_TYPE_DISPLAY
}

/**
 * Type guard: Check if a string is a valid Prisma DeviceStatus
 */
export function isDeviceStatus(value: unknown): value is DeviceStatus {
    return typeof value === 'string' && value in DEVICE_STATUS_DISPLAY
}

/**
 * Type guard: Check if a string is a valid DisplayDeviceType
 */
export function isDisplayDeviceType(value: unknown): value is DisplayDeviceType {
    return typeof value === 'string' && value in DEVICE_TYPE_FROM_DISPLAY
}

/**
 * Type guard: Check if a string is a valid DisplayDeviceStatus
 */
export function isDisplayDeviceStatus(value: unknown): value is DisplayDeviceStatus {
    return typeof value === 'string' && value in DEVICE_STATUS_FROM_DISPLAY
}

/**
 * Type guard: Check if a device type (either format) is a fixture
 */
export function isFixtureType(type: DeviceType | DisplayDeviceType | string): boolean {
    return typeof type === 'string' && (
        type.startsWith('FIXTURE_') || type.startsWith('fixture-')
    )
}

/**
 * Type guard: Check if a display type is a fixture (with type narrowing)
 */
export function isDisplayFixtureType(type: DisplayDeviceType): type is DisplayFixtureType {
    return type.startsWith('fixture-')
}

/**
 * Type guard: Check if a display type is a sensor (with type narrowing)
 */
export function isDisplaySensorType(type: DisplayDeviceType): type is DisplaySensorType {
    return type === 'motion' || type === 'light-sensor'
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert Prisma DeviceType → Display format
 * 
 * @example
 * ```typescript
 * toDisplayType('FIXTURE_16FT_POWER_ENTRY') // 'fixture-16ft-power-entry'
 * toDisplayType('MOTION_SENSOR')            // 'motion'
 * ```
 */
export function toDisplayType(type: DeviceType): DisplayDeviceType {
    return DEVICE_TYPE_DISPLAY[type]
}

/**
 * Convert Display format → Prisma DeviceType
 * 
 * @example
 * ```typescript
 * fromDisplayType('fixture-16ft-power-entry') // 'FIXTURE_16FT_POWER_ENTRY'
 * fromDisplayType('motion')                   // 'MOTION_SENSOR'
 * ```
 */
export function fromDisplayType(displayType: DisplayDeviceType): DeviceType
export function fromDisplayType(displayType: string): DeviceType
export function fromDisplayType(displayType: string): DeviceType {
    if (isDisplayDeviceType(displayType)) {
        return DEVICE_TYPE_FROM_DISPLAY[displayType]
    }
    // Fallback for invalid input
    return 'FIXTURE_16FT_POWER_ENTRY' as DeviceType
}

/**
 * Convert Prisma DeviceStatus → Display format
 */
export function toDisplayStatus(status: DeviceStatus): DisplayDeviceStatus {
    return DEVICE_STATUS_DISPLAY[status]
}

/**
 * Convert Display format → Prisma DeviceStatus
 */
export function fromDisplayStatus(displayStatus: DisplayDeviceStatus): DeviceStatus
export function fromDisplayStatus(displayStatus: string): DeviceStatus
export function fromDisplayStatus(displayStatus: string): DeviceStatus {
    if (isDisplayDeviceStatus(displayStatus)) {
        return DEVICE_STATUS_FROM_DISPLAY[displayStatus]
    }
    return 'OFFLINE' as DeviceStatus
}

// ============================================================================
// LABEL UTILITIES
// ============================================================================

/**
 * Get human-readable label for a Prisma DeviceType
 * 
 * @example
 * ```typescript
 * getDeviceTypeLabel('FIXTURE_16FT_POWER_ENTRY') // '16ft Power Entry'
 * getDeviceTypeLabel('MOTION_SENSOR')            // 'Motion Sensor'
 * ```
 */
export function getDeviceTypeLabel(type: DeviceType): string {
    return DEVICE_TYPE_LABELS[type]
}

/**
 * Get human-readable label for a Prisma DeviceStatus
 */
export function getDeviceStatusLabel(status: DeviceStatus): string {
    return DEVICE_STATUS_LABELS[status]
}

/**
 * Get human-readable label from a display type
 */
export function getDisplayTypeLabel(type: DisplayDeviceType): string {
    return DEVICE_TYPE_LABELS[DEVICE_TYPE_FROM_DISPLAY[type]]
}

// ============================================================================
// EXHAUSTIVENESS UTILITIES
// ============================================================================

/**
 * Exhaustiveness check helper - use in switch default cases
 * 
 * @example
 * ```typescript
 * function getIcon(type: DeviceType): string {
 *   switch (type) {
 *     case 'FIXTURE_16FT_POWER_ENTRY': return '💡'
 *     case 'MOTION_SENSOR': return '👁️'
 *     // ... all other cases
 *     default:
 *       // If we add a new type and forget to handle it,
 *       // TypeScript will error here!
 *       return assertNever(type)
 *   }
 * }
 * ```
 */
export function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}

/**
 * Exhaustiveness check that returns a default value instead of throwing
 */
export function exhaustiveDefault<T>(value: never, defaultValue: T): T {
    console.warn(`Unhandled value: ${JSON.stringify(value)}, using default`)
    return defaultValue
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Parse and validate a device type string, returning the Prisma type
 * 
 * @throws {z.ZodError} if validation fails
 */
export function parseDeviceType(input: unknown): DeviceType {
    return DeviceTypeSchema.parse(input)
}

/**
 * Parse and validate a device type string, returning null if invalid
 */
export function safeParseDeviceType(input: unknown): DeviceType | null {
    const result = DeviceTypeSchema.safeParse(input)
    return result.success ? result.data : null
}

/**
 * Parse and validate a display device type string
 * 
 * @throws {z.ZodError} if validation fails
 */
export function parseDisplayDeviceType(input: unknown): DisplayDeviceType {
    return DisplayDeviceTypeSchema.parse(input)
}

/**
 * Parse and validate a display device type string, returning null if invalid
 */
export function safeParseDisplayDeviceType(input: unknown): DisplayDeviceType | null {
    const result = DisplayDeviceTypeSchema.safeParse(input)
    return result.success ? result.data : null
}

// ============================================================================
// FIXTURE LENGTH UTILITIES
// ============================================================================

/**
 * Extract fixture length from device type (in feet)
 * Returns null for non-fixture types
 */
export function getFixtureLength(type: DisplayDeviceType | DeviceType): number | null {
    const displayType = isDeviceType(type) ? toDisplayType(type) : type as DisplayDeviceType

    if (!isFixtureType(displayType)) return null

    if (displayType.includes('16ft')) return 16
    if (displayType.includes('12ft')) return 12
    if (displayType.includes('8ft')) return 8

    return null
}

/**
 * Check if a fixture is a power entry type
 */
export function isPowerEntry(type: DisplayDeviceType | DeviceType): boolean {
    const displayType = isDeviceType(type) ? toDisplayType(type) : type as DisplayDeviceType
    return displayType.includes('power-entry')
}

/**
 * Check if a fixture is a follower type
 */
export function isFollower(type: DisplayDeviceType | DeviceType): boolean {
    const displayType = isDeviceType(type) ? toDisplayType(type) : type as DisplayDeviceType
    return displayType.includes('follower')
}
