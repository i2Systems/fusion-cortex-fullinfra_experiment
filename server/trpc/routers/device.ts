/**
 * Device Router
 * 
 * tRPC procedures for device operations:
 * - List devices (with optional filtering)
 * - Search devices
 * - Get device details (with components)
 * - Create device
 * - Update device properties
 * - Delete device
 * - Get device components
 * 
 * AI Note: Components are stored as child devices in the database.
 * 
 * @see lib/types/device.ts - Single source of truth for device types
 * @see lib/types/schemas/device.ts - Zod schemas for validation
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { DeviceType, DeviceStatus, Prisma } from '@prisma/client'
import type { Device } from '@prisma/client'
import {
  toDisplayType,
  fromDisplayType,
  toDisplayStatus,
  fromDisplayStatus,
  DisplayDeviceTypeSchema,
  DisplayDeviceStatusSchema,
} from '@/lib/types'
import { logger } from '@/lib/logger'
import { withRetry } from '../utils/withRetry'

// Alias conversion functions for backward compatibility within this file
const toFrontendDeviceType = toDisplayType
const toPrismaDeviceType = fromDisplayType
const toFrontendDeviceStatus = toDisplayStatus
const toPrismaDeviceStatus = fromDisplayStatus

// Type for Device with child devices and optional assigned person
type DeviceWithRelations = Device & {
  other_Device?: Device[]
  AssignedToPerson?: { id: string; firstName: string; lastName: string } | null
}

// Helper to transform database device to frontend format
function transformDevice(dbDevice: DeviceWithRelations) {
  const components = dbDevice.other_Device?.map((comp) => ({
    id: comp.id,
    componentType: comp.componentType || '',
    componentSerialNumber: comp.componentSerialNumber || '',
    warrantyStatus: comp.warrantyStatus || undefined,
    warrantyExpiry: comp.warrantyExpiry ? new Date(comp.warrantyExpiry) : undefined,
    buildDate: comp.buildDate ? new Date(comp.buildDate) : undefined,
    status: toFrontendDeviceStatus(comp.status),
    notes: undefined, // Not stored in DB currently
  })) || []

  return {
    id: dbDevice.id,
    deviceId: dbDevice.deviceId,
    serialNumber: dbDevice.serialNumber,
    type: toFrontendDeviceType(dbDevice.type),
    signal: dbDevice.signal || 0,
    battery: dbDevice.battery || undefined,
    status: toFrontendDeviceStatus(dbDevice.status),
    location: 'Unknown', // Not stored in DB currently, could add to schema later
    x: dbDevice.x || undefined,
    y: dbDevice.y || undefined,
    orientation: dbDevice.orientation || undefined,
    locked: undefined, // Not stored in DB currently
    components: components.length > 0 ? components : undefined,
    warrantyStatus: dbDevice.warrantyStatus || undefined,
    warrantyExpiry: dbDevice.warrantyExpiry ? new Date(dbDevice.warrantyExpiry) : undefined,
    firmwareVersion: dbDevice.firmwareVersion || undefined,
    firmwareTarget: dbDevice.firmwareTarget || undefined,
    firmwareStatus: dbDevice.firmwareStatus || undefined,
    lastFirmwareUpdate: dbDevice.lastFirmwareUpdate ? new Date(dbDevice.lastFirmwareUpdate) : undefined,
    assignedToPersonId: dbDevice.assignedToPersonId ?? undefined,
    assignedToPerson: dbDevice.AssignedToPerson
      ? { id: dbDevice.AssignedToPerson.id, firstName: dbDevice.AssignedToPerson.firstName, lastName: dbDevice.AssignedToPerson.lastName }
      : undefined,
  }
}

export const deviceRouter = router({
  list: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
      includeComponents: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      if (!input.siteId) {
        return []
      }

      return withRetry(
        async () => {
          const devices = await prisma.device.findMany({
            where: {
              siteId: input.siteId,
              parentId: null,
            },
            include: {
              other_Device: input.includeComponents ? {
                orderBy: { createdAt: 'asc' },
              } : false,
              AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'asc' },
          })

          return devices.map(device => {
            const transformed = transformDevice(device)
            if (!input.includeComponents) {
              transformed.components = undefined
            }
            return transformed
          })
        },
        { context: 'device.list', fallback: [] }
      )
    }),

  search: publicProcedure
    .input(z.object({
      query: z.string(),
      siteId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!input.siteId) {
        return []
      }

      const searchTerm = input.query.toLowerCase()
      const devices = await prisma.device.findMany({
        where: {
          siteId: input.siteId,
          parentId: null,
          OR: [
            { deviceId: { contains: searchTerm, mode: 'insensitive' } },
            { serialNumber: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          other_Device: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return devices.map(transformDevice)
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      includeComponents: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      const device = await prisma.device.findUnique({
        where: { id: input.id },
        include: {
          ...(input.includeComponents
            ? {
              other_Device: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            }
            : {}),
          AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!device) {
        return null
      }

      return transformDevice(device)
    }),

  create: publicProcedure
    .input(z.object({
      siteId: z.string(),
      deviceId: z.string(),
      serialNumber: z.string(),
      type: DisplayDeviceTypeSchema,
      status: DisplayDeviceStatusSchema.optional().default('offline'),
      signal: z.number().optional(),
      battery: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      orientation: z.number().optional(),
      warrantyStatus: z.string().optional(),
      warrantyExpiry: z.date().optional(),
      assignedToPersonId: z.string().nullable().optional(),
      components: z.array(z.object({
        componentType: z.string(),
        componentSerialNumber: z.string(),
        warrantyStatus: z.string().optional(),
        warrantyExpiry: z.date().optional(),
        buildDate: z.date().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { components, ...deviceData } = input

        // Validate that type is present and is a string
        if (!deviceData.type || typeof deviceData.type !== 'string') {
          console.error('Device type is missing or invalid in input:', JSON.stringify(input, null, 2))
          console.error('deviceData.type value:', deviceData.type, 'type:', typeof deviceData.type)
          throw new Error(`Device type is required. Received: ${deviceData.type}`)
        }


        const prismaType = toPrismaDeviceType(deviceData.type)


        if (!prismaType) {
          console.error('Failed to convert device type:', deviceData.type)
          throw new Error(`Invalid device type: ${deviceData.type}`)
        }

        // Build the data object explicitly to ensure type is included
        const deviceDataForPrisma = {
          id: randomUUID(),
          siteId: deviceData.siteId,
          deviceId: deviceData.deviceId,
          serialNumber: deviceData.serialNumber,
          type: prismaType,
          status: toPrismaDeviceStatus(deviceData.status || 'offline'),
          signal: deviceData.signal,
          battery: deviceData.battery,
          x: deviceData.x,
          y: deviceData.y,
          orientation: deviceData.orientation,
          warrantyStatus: deviceData.warrantyStatus,
          warrantyExpiry: deviceData.warrantyExpiry,
          assignedToPersonId: deviceData.assignedToPersonId ?? null,
          updatedAt: new Date(),
        }

        const device = await prisma.device.create({
          data: {
            ...deviceDataForPrisma,
            other_Device: components
              ? {
                create: components.map((comp, index) => {
                  // Generate unique serial number for component to avoid conflicts
                  // Combine parent device serial with component type and index for uniqueness
                  const uniqueSerialNumber = comp.componentSerialNumber
                    ? `${deviceData.serialNumber}-${comp.componentType}-${comp.componentSerialNumber}-${index}`
                    : `${deviceData.serialNumber}-${comp.componentType}-${Date.now()}-${index}`

                  return {
                    id: randomUUID(),
                    deviceId: `${deviceData.deviceId}-${comp.componentType}`,
                    serialNumber: uniqueSerialNumber,
                    type: DeviceType.FIXTURE_16FT_POWER_ENTRY, // Components are typically fixtures
                    status: DeviceStatus.ONLINE,
                    componentType: comp.componentType,
                    componentSerialNumber: comp.componentSerialNumber, // Keep original for reference
                    warrantyStatus: comp.warrantyStatus,
                    warrantyExpiry: comp.warrantyExpiry,
                    buildDate: comp.buildDate,
                    updatedAt: new Date(),
                    Site: {
                      connect: { id: deviceData.siteId },
                    },
                  }
                }),
              }
              : undefined,
          },
          include: {
            other_Device: true,
            AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
          },
        })

        return transformDevice(device)
      } catch (error: any) {
        console.error('Error in device.create:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          input: input,
        })

        // Handle unique constraint violation (duplicate serial number)
        if (error.code === 'P2002' && error.meta?.target?.includes('serialNumber')) {
          logger.debug('Device with serial number already exists, checking if we should update or return existing...')

          try {
            // Check if device exists with this serial number
            const existingDevice = await prisma.device.findUnique({
              where: { serialNumber: input.serialNumber },
              select: {
                id: true,
                serialNumber: true,
                deviceId: true,
                type: true,
                status: true,
                x: true,
                y: true,
                orientation: true,
                signal: true,
                battery: true,
                buildDate: true,
                cct: true,
                warrantyStatus: true,
                warrantyExpiry: true,
                partsList: true,
                parentId: true,
                componentType: true,
                componentSerialNumber: true,
                siteId: true,
                createdAt: true,
                updatedAt: true,
                other_Device: true,
              },
            })

            if (existingDevice) {
              // If it's in the same site, update it with new data
              if (existingDevice.siteId === input.siteId) {
                logger.debug('Device exists in same site, updating...')

                const prismaType = toPrismaDeviceType(input.type)
                if (!prismaType) {
                  throw new Error(`Invalid device type: ${input.type}`)
                }

                // Update the existing device
                const updatedDevice = await prisma.device.update({
                  where: { id: existingDevice.id },
                  data: {
                    deviceId: input.deviceId,
                    type: prismaType,
                    status: toPrismaDeviceStatus(input.status || 'offline'),
                    signal: input.signal,
                    battery: input.battery,
                    x: input.x,
                    y: input.y,
                    warrantyStatus: input.warrantyStatus,
                    warrantyExpiry: input.warrantyExpiry,
                    assignedToPersonId: input.assignedToPersonId ?? null,
                    // Update components if provided
                    ...(input.components && input.components.length > 0 ? {
                      other_Device: {
                        deleteMany: {}, // Remove old components
                        create: input.components.map((comp, index) => {
                          // Generate unique serial number for component to avoid conflicts
                          // Combine parent device serial with component type and index for uniqueness
                          const uniqueSerialNumber = comp.componentSerialNumber
                            ? `${input.serialNumber}-${comp.componentType}-${comp.componentSerialNumber}-${index}`
                            : `${input.serialNumber}-${comp.componentType}-${Date.now()}-${index}`

                          return {
                            id: randomUUID(),
                            deviceId: `${input.deviceId}-${comp.componentType}`,
                            serialNumber: uniqueSerialNumber,
                            type: DeviceType.FIXTURE_16FT_POWER_ENTRY,
                            status: DeviceStatus.ONLINE,
                            componentType: comp.componentType,
                            componentSerialNumber: comp.componentSerialNumber, // Keep original for reference
                            warrantyStatus: comp.warrantyStatus,
                            warrantyExpiry: comp.warrantyExpiry,
                            buildDate: comp.buildDate,
                            updatedAt: new Date(),
                            Site: {
                              connect: { id: input.siteId },
                            },
                          }
                        }),
                      },
                    } : {}),
                  },
                  include: {
                    other_Device: true,
                    AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
                  },
                })

                return transformDevice(updatedDevice)
              } else {
                // Device exists in a different site
                throw new Error(`Device with serial number ${input.serialNumber} already exists in a different site`)
              }
            }
          } catch (checkError: any) {
            console.error('Error checking for existing device:', checkError)
            throw new Error(`Device with serial number ${input.serialNumber} already exists: ${checkError.message}`)
          }
        }

        // Handle prepared statement conflicts by retrying once
        if (error.code === '42P05' || error.code === '26000' || error.message?.includes('prepared statement')) {
          logger.debug('Retrying device.create after prepared statement conflict...')
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 100))

          try {
            const { components, ...deviceData } = input
            // Ensure type is set in retry as well
            if (!deviceData.type) {
              console.error('Device type is missing in retry input:', deviceData)
              throw new Error('Device type is required')
            }

            const retryPrismaType = toPrismaDeviceType(deviceData.type)
            if (!retryPrismaType) {
              throw new Error(`Invalid device type in retry: ${deviceData.type}`)
            }

            const device = await prisma.device.create({
              data: {
                id: randomUUID(),
                siteId: deviceData.siteId,
                deviceId: deviceData.deviceId,
                serialNumber: deviceData.serialNumber,
                type: retryPrismaType,
                status: toPrismaDeviceStatus(deviceData.status || 'offline'),
                signal: deviceData.signal,
                battery: deviceData.battery,
                x: deviceData.x,
                y: deviceData.y,
                warrantyStatus: deviceData.warrantyStatus,
                warrantyExpiry: deviceData.warrantyExpiry,
                assignedToPersonId: deviceData.assignedToPersonId ?? null,
                updatedAt: new Date(),
                other_Device: components
                  ? {
                    create: components.map(comp => ({
                      id: randomUUID(),
                      deviceId: `${deviceData.deviceId}-${comp.componentType}`,
                      serialNumber: comp.componentSerialNumber,
                      type: DeviceType.FIXTURE_16FT_POWER_ENTRY,
                      status: DeviceStatus.ONLINE,
                      componentType: comp.componentType,
                      componentSerialNumber: comp.componentSerialNumber,
                      warrantyStatus: comp.warrantyStatus,
                      warrantyExpiry: comp.warrantyExpiry,
                      buildDate: comp.buildDate,
                      updatedAt: new Date(),
                      Site: {
                        connect: { id: deviceData.siteId },
                      },
                    })),
                  }
                  : undefined,
              },
              include: {
                other_Device: true,
                AssignedToPerson: { select: { id: true, firstName: true, lastName: true } },
              },
            })
            return transformDevice(device)
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            throw new Error(`Failed to create device: ${retryError.message || 'Unknown error'}`)
          }
        }

        // Re-throw other errors
        throw new Error(`Failed to create device: ${error.message || 'Unknown error'}`)
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      deviceId: z.string().optional(),
      serialNumber: z.string().optional(),
      type: DisplayDeviceTypeSchema.optional(),
      status: DisplayDeviceStatusSchema.optional(),
      signal: z.number().optional(),
      battery: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      orientation: z.number().optional(),
      location: z.string().optional(),
      zone: z.string().optional(),
      warrantyStatus: z.string().optional(),
      warrantyExpiry: z.date().optional(),
      assignedToPersonId: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input

      const performUpdate = async () => {
        // Check if device exists first
        const existingDevice = await prisma.device.findUnique({
          where: { id },
          select: { id: true },
        })

        if (!existingDevice) {
          throw new Error(`Device with ID ${id} not found`)
        }

        const updateData: Prisma.DeviceUpdateInput = {}
        if (updates.deviceId !== undefined) updateData.deviceId = updates.deviceId
        if (updates.serialNumber !== undefined) updateData.serialNumber = updates.serialNumber
        if (updates.type !== undefined) {
          updateData.type = toPrismaDeviceType(updates.type)
        }
        if (updates.status !== undefined) updateData.status = toPrismaDeviceStatus(updates.status)
        if (updates.signal !== undefined) updateData.signal = updates.signal
        if (updates.battery !== undefined) updateData.battery = updates.battery
        if (updates.x !== undefined) updateData.x = updates.x
        if (updates.y !== undefined) updateData.y = updates.y
        if (updates.orientation !== undefined) updateData.orientation = updates.orientation
        if (updates.warrantyStatus !== undefined) updateData.warrantyStatus = updates.warrantyStatus
        if (updates.warrantyExpiry !== undefined) updateData.warrantyExpiry = updates.warrantyExpiry
        if (updates.assignedToPersonId !== undefined) {
          updateData.AssignedToPerson = updates.assignedToPersonId === null ? { disconnect: true } : { connect: { id: updates.assignedToPersonId } }
        }

        const device = await prisma.device.update({
          where: { id },
          data: updateData,
          include: { other_Device: true, AssignedToPerson: { select: { id: true, firstName: true, lastName: true } } },
        })

        return transformDevice(device)
      }

      try {
        return await withRetry(performUpdate, { context: 'device.update' })
      } catch (error: any) {
        // Handle "record not found" errors
        if (error.code === 'P2025' || error.message?.includes('Record to update not found') || error.message?.includes('not found')) {
          throw new Error(`Device with ID ${input.id} not found in database`)
        }
        throw new Error(`Failed to update device: ${error.message || 'Unknown error'}`)
      }
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Cascade delete will handle components automatically
      await prisma.device.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  deleteMany: publicProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      await prisma.device.deleteMany({
        where: {
          id: { in: input.ids },
        },
      })
      return { success: true, deleted: input.ids.length }
    }),

  getComponents: publicProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ input }) => {
      const components = await prisma.device.findMany({
        where: {
          parentId: input.deviceId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return components.map(comp => ({
        id: comp.id,
        componentType: comp.componentType || '',
        componentSerialNumber: comp.componentSerialNumber || '',
        warrantyStatus: comp.warrantyStatus || undefined,
        warrantyExpiry: comp.warrantyExpiry ? new Date(comp.warrantyExpiry) : undefined,
        buildDate: comp.buildDate ? new Date(comp.buildDate) : undefined,
        status: toFrontendDeviceStatus(comp.status),
        notes: undefined,
      }))
    }),
})

