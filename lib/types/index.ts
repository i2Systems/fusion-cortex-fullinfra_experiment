/**
 * Shared Type Definitions
 * 
 * Central barrel export for all shared types across the application.
 * Import from '@/lib/types' to access unified type definitions.
 * 
 * @example
 * ```typescript
 * import { 
 *   DeviceType, 
 *   DisplayDeviceType, 
 *   toDisplayType, 
 *   isFixtureType,
 *   DeviceTypeSchema
 * } from '@/lib/types'
 * ```
 * 
 * @module lib/types
 */

// Core device types and utilities
export * from './device'

// Zod schemas for validation
export * from './schemas/device'
