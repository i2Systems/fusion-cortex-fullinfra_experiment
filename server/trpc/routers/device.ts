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
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { DeviceType, DeviceStatus } from '@prisma/client'

// Helper to convert Prisma DeviceType to frontend type
function toFrontendDeviceType(type: DeviceType): 'fixture' | 'motion' | 'light-sensor' {
  switch (type) {
    case DeviceType.FIXTURE:
      return 'fixture'
    case DeviceType.MOTION_SENSOR:
      return 'motion'
    case DeviceType.LIGHT_SENSOR:
      return 'light-sensor'
    default:
      return 'fixture'
  }
}

// Helper to convert frontend DeviceType to Prisma enum
function toPrismaDeviceType(type: 'fixture' | 'motion' | 'light-sensor'): DeviceType {
  switch (type) {
    case 'fixture':
      return DeviceType.FIXTURE
    case 'motion':
      return DeviceType.MOTION_SENSOR
    case 'light-sensor':
      return DeviceType.LIGHT_SENSOR
    default:
      return DeviceType.FIXTURE
  }
}

// Helper to convert Prisma DeviceStatus to frontend type
function toFrontendDeviceStatus(status: DeviceStatus): 'online' | 'offline' | 'missing' {
  switch (status) {
    case DeviceStatus.ONLINE:
      return 'online'
    case DeviceStatus.OFFLINE:
      return 'offline'
    case DeviceStatus.MISSING:
      return 'missing'
    case DeviceStatus.DUPLICATE:
      return 'offline' // Map duplicate to offline for frontend
    default:
      return 'offline'
  }
}

// Helper to convert frontend DeviceStatus to Prisma enum
function toPrismaDeviceStatus(status: 'online' | 'offline' | 'missing'): DeviceStatus {
  switch (status) {
    case 'online':
      return DeviceStatus.ONLINE
    case 'offline':
      return DeviceStatus.OFFLINE
    case 'missing':
      return DeviceStatus.MISSING
    default:
      return DeviceStatus.OFFLINE
  }
}

// Helper to transform database device to frontend format
function transformDevice(dbDevice: any) {
  const components = dbDevice.components?.map((comp: any) => ({
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
    orientation: undefined, // Not stored in DB currently
    locked: undefined, // Not stored in DB currently
    components: components.length > 0 ? components : undefined,
    warrantyStatus: dbDevice.warrantyStatus || undefined,
    warrantyExpiry: dbDevice.warrantyExpiry ? new Date(dbDevice.warrantyExpiry) : undefined,
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

      try {
        // Always include components relation to avoid prepared statement parameter mismatch
        // We'll filter them out in transformDevice if needed
        const devices = await prisma.device.findMany({
          where: {
            siteId: input.siteId,
            parentId: null, // Only get top-level devices (not components)
          },
          include: {
            components: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        return devices.map(device => {
          const transformed = transformDevice(device)
          // If components weren't requested, remove them from the response
          if (!input.includeComponents) {
            transformed.components = undefined
          }
          return transformed
        })
      } catch (error: any) {
        console.error('Error in device.list:', {
          message: error.message,
          code: error.code,
          siteId: input.siteId,
        })
        // Return empty array on error to prevent UI crashes
        return []
      }
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
          components: {
            orderBy: {
              createdAt: 'asc',
            },
          },
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
        include: input.includeComponents
          ? {
              components: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            }
          : undefined,
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
      type: z.enum(['fixture', 'motion', 'light-sensor']),
      status: z.enum(['online', 'offline', 'missing']).optional().default('offline'),
      signal: z.number().optional(),
      battery: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      warrantyStatus: z.string().optional(),
      warrantyExpiry: z.date().optional(),
      components: z.array(z.object({
        componentType: z.string(),
        componentSerialNumber: z.string(),
        warrantyStatus: z.string().optional(),
        warrantyExpiry: z.date().optional(),
        buildDate: z.date().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { components, ...deviceData } = input

      const device = await prisma.device.create({
        data: {
          siteId: deviceData.siteId,
          deviceId: deviceData.deviceId,
          serialNumber: deviceData.serialNumber,
          type: toPrismaDeviceType(deviceData.type),
          status: toPrismaDeviceStatus(deviceData.status || 'offline'),
          signal: deviceData.signal,
          battery: deviceData.battery,
          x: deviceData.x,
          y: deviceData.y,
          warrantyStatus: deviceData.warrantyStatus,
          warrantyExpiry: deviceData.warrantyExpiry,
          components: components
            ? {
                create: components.map(comp => ({
                  siteId: deviceData.siteId,
                  deviceId: `${deviceData.deviceId}-${comp.componentType}`,
                  serialNumber: comp.componentSerialNumber,
                  type: DeviceType.FIXTURE, // Components are typically fixtures
                  status: DeviceStatus.ONLINE,
                  componentType: comp.componentType,
                  componentSerialNumber: comp.componentSerialNumber,
                  warrantyStatus: comp.warrantyStatus,
                  warrantyExpiry: comp.warrantyExpiry,
                  buildDate: comp.buildDate,
                })),
              }
            : undefined,
        },
        include: {
          components: true,
        },
      })

      return transformDevice(device)
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      deviceId: z.string().optional(),
      serialNumber: z.string().optional(),
      type: z.enum(['fixture', 'motion', 'light-sensor']).optional(),
      status: z.enum(['online', 'offline', 'missing']).optional(),
      signal: z.number().optional(),
      battery: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      warrantyStatus: z.string().optional(),
      warrantyExpiry: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input

      const updateData: any = {}
      if (updates.deviceId !== undefined) updateData.deviceId = updates.deviceId
      if (updates.serialNumber !== undefined) updateData.serialNumber = updates.serialNumber
      if (updates.type !== undefined) updateData.type = toPrismaDeviceType(updates.type)
      if (updates.status !== undefined) updateData.status = toPrismaDeviceStatus(updates.status)
      if (updates.signal !== undefined) updateData.signal = updates.signal
      if (updates.battery !== undefined) updateData.battery = updates.battery
      if (updates.x !== undefined) updateData.x = updates.x
      if (updates.y !== undefined) updateData.y = updates.y
      if (updates.warrantyStatus !== undefined) updateData.warrantyStatus = updates.warrantyStatus
      if (updates.warrantyExpiry !== undefined) updateData.warrantyExpiry = updates.warrantyExpiry

      const device = await prisma.device.update({
        where: { id },
        data: updateData,
        include: {
          components: true,
        },
      })

      return transformDevice(device)
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

