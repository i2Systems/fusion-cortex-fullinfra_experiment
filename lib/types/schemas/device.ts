/**
 * Device Schemas
 * 
 * Zod schemas for device-related API validation.
 * These schemas are derived from the shared types to ensure consistency.
 * 
 * Use these in tRPC routers and form validation.
 * 
 * @module lib/types/schemas/device
 */

import { z } from 'zod'
import {
    DisplayDeviceTypeSchema,
    DisplayDeviceStatusSchema,
    DeviceTypeSchema,
    DeviceStatusSchema
} from '../device'

// ============================================================================
// INPUT SCHEMAS (for API mutations)
// ============================================================================

/**
 * Schema for creating a new device
 */
export const CreateDeviceInputSchema = z.object({
    siteId: z.string().min(1, 'Site ID is required'),
    deviceId: z.string().min(1, 'Device ID is required'),
    serialNumber: z.string().min(1, 'Serial number is required'),
    type: DisplayDeviceTypeSchema,
    status: DisplayDeviceStatusSchema.optional().default('offline'),
    signal: z.number().int().min(0).max(100).optional(),
    battery: z.number().int().min(0).max(100).optional(),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
    orientation: z.number().min(0).max(360).optional(),
    warrantyStatus: z.string().optional(),
    warrantyExpiry: z.date().optional(),
    components: z.array(z.object({
        componentType: z.string().min(1),
        componentSerialNumber: z.string().min(1),
        warrantyStatus: z.string().optional(),
        warrantyExpiry: z.date().optional(),
        buildDate: z.date().optional(),
    })).optional(),
})

export type CreateDeviceInput = z.infer<typeof CreateDeviceInputSchema>

/**
 * Schema for updating an existing device
 */
export const UpdateDeviceInputSchema = z.object({
    id: z.string().min(1, 'Device ID is required'),
    deviceId: z.string().optional(),
    serialNumber: z.string().optional(),
    type: z.enum(['fixture', 'motion', 'light-sensor']).optional(),
    status: DisplayDeviceStatusSchema.optional(),
    signal: z.number().int().min(0).max(100).optional(),
    battery: z.number().int().min(0).max(100).optional(),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
    orientation: z.number().min(0).max(360).optional(),
    warrantyStatus: z.string().optional(),
    warrantyExpiry: z.date().optional(),
})

export type UpdateDeviceInput = z.infer<typeof UpdateDeviceInputSchema>

/**
 * Schema for device list query
 */
export const ListDevicesInputSchema = z.object({
    siteId: z.string().optional(),
    includeComponents: z.boolean().optional().default(true),
})

export type ListDevicesInput = z.infer<typeof ListDevicesInputSchema>

/**
 * Schema for device search query
 */
export const SearchDevicesInputSchema = z.object({
    query: z.string(),
    siteId: z.string().optional(),
})

export type SearchDevicesInput = z.infer<typeof SearchDevicesInputSchema>

// ============================================================================
// OUTPUT SCHEMAS (for API responses)
// ============================================================================

/**
 * Schema for component in API response
 */
export const ComponentOutputSchema = z.object({
    id: z.string(),
    componentType: z.string(),
    componentSerialNumber: z.string(),
    warrantyStatus: z.string().optional(),
    warrantyExpiry: z.date().optional(),
    buildDate: z.date().optional(),
    status: DisplayDeviceStatusSchema,
    notes: z.string().optional(),
})

export type ComponentOutput = z.infer<typeof ComponentOutputSchema>

/**
 * Schema for device in API response
 */
export const DeviceOutputSchema = z.object({
    id: z.string(),
    deviceId: z.string(),
    serialNumber: z.string(),
    type: DisplayDeviceTypeSchema,
    signal: z.number(),
    battery: z.number().optional(),
    status: DisplayDeviceStatusSchema,
    location: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    orientation: z.number().optional(),
    locked: z.boolean().optional(),
    components: z.array(ComponentOutputSchema).optional(),
    warrantyStatus: z.string().optional(),
    warrantyExpiry: z.date().optional(),
})

export type DeviceOutput = z.infer<typeof DeviceOutputSchema>

// ============================================================================
// INTERNAL SCHEMAS (for database operations)
// ============================================================================

/**
 * Schema for device data as stored in database (Prisma format)
 */
export const DeviceDbSchema = z.object({
    id: z.string(),
    deviceId: z.string(),
    serialNumber: z.string(),
    type: DeviceTypeSchema,
    status: DeviceStatusSchema,
    x: z.number().nullable(),
    y: z.number().nullable(),
    orientation: z.number().nullable(),
    signal: z.number().nullable(),
    battery: z.number().nullable(),
    warrantyStatus: z.string().nullable(),
    warrantyExpiry: z.date().nullable(),
    siteId: z.string(),
})

export type DeviceDb = z.infer<typeof DeviceDbSchema>
