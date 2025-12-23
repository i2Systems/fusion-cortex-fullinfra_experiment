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

// Frontend device type (all fixture variants + sensors)
type FrontendDeviceType = 
  | 'fixture-16ft-power-entry'
  | 'fixture-12ft-power-entry'
  | 'fixture-8ft-power-entry'
  | 'fixture-16ft-follower'
  | 'fixture-12ft-follower'
  | 'fixture-8ft-follower'
  | 'motion'
  | 'light-sensor'

// Helper to convert Prisma DeviceType to frontend type
function toFrontendDeviceType(type: DeviceType): FrontendDeviceType {
  switch (type) {
    case DeviceType.FIXTURE_16FT_POWER_ENTRY:
      return 'fixture-16ft-power-entry'
    case DeviceType.FIXTURE_12FT_POWER_ENTRY:
      return 'fixture-12ft-power-entry'
    case DeviceType.FIXTURE_8FT_POWER_ENTRY:
      return 'fixture-8ft-power-entry'
    case DeviceType.FIXTURE_16FT_FOLLOWER:
      return 'fixture-16ft-follower'
    case DeviceType.FIXTURE_12FT_FOLLOWER:
      return 'fixture-12ft-follower'
    case DeviceType.FIXTURE_8FT_FOLLOWER:
      return 'fixture-8ft-follower'
    case DeviceType.MOTION_SENSOR:
      return 'motion'
    case DeviceType.LIGHT_SENSOR:
      return 'light-sensor'
    default:
      return 'fixture-16ft-power-entry'
  }
}

// Helper to convert frontend DeviceType to Prisma enum
function toPrismaDeviceType(type: FrontendDeviceType): DeviceType {
  switch (type) {
    case 'fixture-16ft-power-entry':
      return DeviceType.FIXTURE_16FT_POWER_ENTRY
    case 'fixture-12ft-power-entry':
      return DeviceType.FIXTURE_12FT_POWER_ENTRY
    case 'fixture-8ft-power-entry':
      return DeviceType.FIXTURE_8FT_POWER_ENTRY
    case 'fixture-16ft-follower':
      return DeviceType.FIXTURE_16FT_FOLLOWER
    case 'fixture-12ft-follower':
      return DeviceType.FIXTURE_12FT_FOLLOWER
    case 'fixture-8ft-follower':
      return DeviceType.FIXTURE_8FT_FOLLOWER
    case 'motion':
      return DeviceType.MOTION_SENSOR
    case 'light-sensor':
      return DeviceType.LIGHT_SENSOR
    default:
      return DeviceType.FIXTURE_16FT_POWER_ENTRY
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
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying device.list after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const devices = await prisma.device.findMany({
              where: {
                siteId: input.siteId,
                parentId: null,
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
              if (!input.includeComponents) {
                transformed.components = undefined
              }
              return transformed
            })
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            return []
          }
        }
        
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
      type: z.enum([
        'fixture-16ft-power-entry',
        'fixture-12ft-power-entry',
        'fixture-8ft-power-entry',
        'fixture-16ft-follower',
        'fixture-12ft-follower',
        'fixture-8ft-follower',
        'motion',
        'light-sensor'
      ]),
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
      try {
        const { components, ...deviceData } = input

        // Validate that type is present and is a string
        if (!deviceData.type || typeof deviceData.type !== 'string') {
          console.error('Device type is missing or invalid in input:', JSON.stringify(input, null, 2))
          console.error('deviceData.type value:', deviceData.type, 'type:', typeof deviceData.type)
          throw new Error(`Device type is required. Received: ${deviceData.type}`)
        }

        console.log('Creating device with type:', deviceData.type, 'Full deviceData keys:', Object.keys(deviceData))
        
        const prismaType = toPrismaDeviceType(deviceData.type as FrontendDeviceType)
        console.log('Converted to Prisma type:', prismaType)
        
        if (!prismaType) {
          console.error('Failed to convert device type:', deviceData.type)
          throw new Error(`Invalid device type: ${deviceData.type}`)
        }

        // Build the data object explicitly to ensure type is included
        const deviceDataForPrisma = {
          siteId: deviceData.siteId,
          deviceId: deviceData.deviceId,
          serialNumber: deviceData.serialNumber,
          type: prismaType,
          status: toPrismaDeviceStatus(deviceData.status || 'offline'),
          signal: deviceData.signal,
          battery: deviceData.battery,
          x: deviceData.x,
          y: deviceData.y,
          warrantyStatus: deviceData.warrantyStatus,
          warrantyExpiry: deviceData.warrantyExpiry,
        }
        
        console.log('Device data for Prisma (with type):', JSON.stringify(deviceDataForPrisma, null, 2))

        const device = await prisma.device.create({
          data: {
            ...deviceDataForPrisma,
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
                    type: DeviceType.FIXTURE_16FT_POWER_ENTRY, // Components are typically fixtures
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
      } catch (error: any) {
        console.error('Error in device.create:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          input: input,
        })
        
        // Handle prepared statement conflicts by retrying once
        if (error.code === '42P05' || error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying device.create after prepared statement conflict...')
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
                components: components
                  ? {
                      create: components.map(comp => ({
                        siteId: deviceData.siteId,
                        deviceId: `${deviceData.deviceId}-${comp.componentType}`,
                        serialNumber: comp.componentSerialNumber,
                        type: DeviceType.FIXTURE_16FT_POWER_ENTRY,
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
      try {
        const { id, ...updates } = input

        // Check if device exists first
        const existingDevice = await prisma.device.findUnique({
          where: { id },
          select: { id: true },
        })

        if (!existingDevice) {
          throw new Error(`Device with ID ${id} not found`)
        }

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
      } catch (error: any) {
        console.error('Error in device.update:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          input: input,
        })
        
        // Handle "record not found" errors
        if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
          throw new Error(`Device with ID ${input.id} not found in database`)
        }
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying device.update after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const { id, ...updates } = input
            
            const existingDevice = await prisma.device.findUnique({
              where: { id },
              select: { id: true },
            })

            if (!existingDevice) {
              throw new Error(`Device with ID ${id} not found`)
            }

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
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            throw new Error(`Failed to update device: ${retryError.message || 'Unknown error'}`)
          }
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

