/**
 * Zone Router
 * 
 * tRPC procedures for zone operations.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

const polygonPointSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const zoneRouter = router({
  list: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!input.siteId) {
        return []
      }
      
      try {
        const zones = await prisma.zone.findMany({
          where: {
            siteId: input.siteId,
          },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        })
        
        return zones.map(zone => ({
          id: zone.id,
          name: zone.name,
          color: zone.color,
          description: zone.description,
          polygon: zone.polygon as Array<{ x: number; y: number }> | null,
          deviceIds: zone.ZoneDevice.map((zd: any) => zd.deviceId),
          daylightEnabled: zone.daylightEnabled,
          minDaylight: zone.minDaylight,
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
        }))
      } catch (error: any) {
        console.error('Error in zone.list:', {
          message: error.message,
          code: error.code,
          siteId: input.siteId,
        })
        
        // Handle database connection/permission errors in development
        if (error.code === 'P1010' || error.code === 'P1001' || error.message?.includes('denied access') || error.message?.includes('Authentication failed')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Database connection/permission error in development. Returning empty array.')
            console.warn('   To fix: Run ./scripts/fix-local-db.sh or check your DATABASE_URL')
            return []
          }
          throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
        }
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying zone.list after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const zones = await prisma.zone.findMany({
              where: {
                siteId: input.siteId,
              },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
              orderBy: {
                createdAt: 'asc',
              },
            })
            
            return zones.map(zone => ({
              id: zone.id,
              name: zone.name,
              color: zone.color,
              description: zone.description,
              polygon: zone.polygon as Array<{ x: number; y: number }> | null,
              deviceIds: zone.ZoneDevice.map((zd: any) => zd.deviceId),
              daylightEnabled: zone.daylightEnabled,
              minDaylight: zone.minDaylight,
              createdAt: zone.createdAt,
              updatedAt: zone.updatedAt,
            }))
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            return []
          }
        }
        
        // Return empty array on error to prevent UI crashes
        return []
      }
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      siteId: z.string(),
      color: z.string().optional(),
      description: z.string().optional(),
      polygon: z.array(polygonPointSchema).optional(),
      deviceIds: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      try {
        // Filter out device IDs that don't exist in the database
        // This allows zones to be created even if some devices haven't been saved yet
        let validDeviceIds: string[] = []
        if (input.deviceIds.length > 0) {
          const existingDevices = await prisma.device.findMany({
            where: {
              id: { in: input.deviceIds },
              siteId: input.siteId,
            },
            select: { id: true },
          })
          
          const existingDeviceIds = new Set(existingDevices.map(d => d.id))
          validDeviceIds = input.deviceIds.filter(id => existingDeviceIds.has(id))
          
          const invalidDeviceIds = input.deviceIds.filter(id => !existingDeviceIds.has(id))
          if (invalidDeviceIds.length > 0) {
            console.warn(`Zone creation: Skipping ${invalidDeviceIds.length} device IDs that don't exist: ${invalidDeviceIds.slice(0, 5).join(', ')}${invalidDeviceIds.length > 5 ? '...' : ''}`)
          }
        }

        const zone = await prisma.zone.create({
          data: {
            id: randomUUID(),
            name: input.name,
            siteId: input.siteId,
            color: input.color || '#4c7dff',
            description: input.description,
            polygon: input.polygon ? (input.polygon as any) : null,
            updatedAt: new Date(),
            ZoneDevice: validDeviceIds.length > 0 ? {
              create: validDeviceIds.map(deviceId => ({
                id: randomUUID(),
                deviceId,
              })),
            } : undefined,
          },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
        })
        
        return {
          id: zone.id,
          name: zone.name,
          color: zone.color,
          description: zone.description,
          polygon: zone.polygon as Array<{ x: number; y: number }> | null,
          deviceIds: zone.ZoneDevice.map((zd: any) => zd.deviceId),
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
        }
      } catch (error: any) {
        console.error('Error in zone.create:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          input: input,
        })
        
        // Handle database connection/permission errors in development
        if (error.code === 'P1010' || error.code === 'P1001' || error.message?.includes('denied access') || error.message?.includes('Authentication failed')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Database connection/permission error in development.')
            console.warn('   To fix: Run ./scripts/fix-local-db.sh or check your DATABASE_URL')
            throw new Error('Database connection failed. Please fix your local database setup.')
          }
          throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
        }
        
        // Handle foreign key constraint violations
        if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
          throw new Error(`Cannot create zone: One or more device IDs do not exist in the database.`)
        }
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying zone.create after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            // Retry the same operation
            let retryValidDeviceIds: string[] = []
            if (input.deviceIds.length > 0) {
              const existingDevices = await prisma.device.findMany({
                where: {
                  id: { in: input.deviceIds },
                  siteId: input.siteId,
                },
                select: { id: true },
              })
              
              const existingDeviceIds = new Set(existingDevices.map(d => d.id))
              retryValidDeviceIds = input.deviceIds.filter(id => existingDeviceIds.has(id))
            }

            const zone = await prisma.zone.create({
              data: {
                id: randomUUID(),
                name: input.name,
                siteId: input.siteId,
                color: input.color || '#4c7dff',
                description: input.description,
                polygon: input.polygon ? (input.polygon as any) : null,
                updatedAt: new Date(),
                ZoneDevice: retryValidDeviceIds.length > 0 ? {
                  create: retryValidDeviceIds.map(deviceId => ({
                    id: randomUUID(),
                    deviceId,
                  })),
                } : undefined,
              },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
            })
            
            return {
              id: zone.id,
              name: zone.name,
              color: zone.color,
              description: zone.description,
              polygon: zone.polygon as Array<{ x: number; y: number }> | null,
              deviceIds: zone.ZoneDevice.map((zd: any) => zd.deviceId),
              createdAt: zone.createdAt,
              updatedAt: zone.updatedAt,
            }
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            throw new Error(`Failed to create zone: ${retryError.message || 'Unknown error'}`)
          }
        }
        
        throw new Error(`Failed to create zone: ${error.message || 'Unknown error'}`)
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      polygon: z.array(polygonPointSchema).optional(),
      deviceIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { id, deviceIds, ...updates } = input
        
        // Get the zone to find its siteId for validation
        const zone = await prisma.zone.findUnique({
          where: { id },
          select: { siteId: true },
        })
        
        if (!zone) {
          throw new Error(`Zone with ID ${id} not found`)
        }
        
        // If deviceIds is provided, validate they exist before updating
        if (deviceIds !== undefined) {
          if (deviceIds.length > 0) {
            // Validate that all deviceIds exist in the database
            const existingDevices = await prisma.device.findMany({
              where: {
                id: { in: deviceIds },
                siteId: zone.siteId,
              },
              select: { id: true },
            })
            
            const existingDeviceIds = new Set(existingDevices.map(d => d.id))
            const invalidDeviceIds = deviceIds.filter(deviceId => !existingDeviceIds.has(deviceId))
            
            if (invalidDeviceIds.length > 0) {
              throw new Error(`The following device IDs do not exist: ${invalidDeviceIds.join(', ')}`)
            }
          }
          
          // Delete existing relationships
          await prisma.zoneDevice.deleteMany({
            where: { zoneId: id },
          })
          
          // Create new relationships
          if (deviceIds.length > 0) {
            await prisma.zoneDevice.createMany({
              data: deviceIds.map(deviceId => ({
                id: randomUUID(),
                zoneId: id,
                deviceId,
              })),
            })
          }
        }
        
        const updatedZone = await prisma.zone.update({
          where: { id },
          data: {
            ...updates,
            polygon: input.polygon ? (input.polygon as any) : undefined,
          },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
        })
      
        return {
          id: updatedZone.id,
          name: updatedZone.name,
          color: updatedZone.color,
          description: updatedZone.description,
          polygon: updatedZone.polygon as Array<{ x: number; y: number }> | null,
          deviceIds: updatedZone.ZoneDevice.map((zd: any) => zd.deviceId),
          createdAt: updatedZone.createdAt,
          updatedAt: updatedZone.updatedAt,
        }
      } catch (error: any) {
        console.error('Error in zone.update:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          input: input,
        })
        
        // Handle database connection/permission errors in development
        if (error.code === 'P1010' || error.code === 'P1001' || error.message?.includes('denied access') || error.message?.includes('Authentication failed')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Database connection/permission error in development.')
            console.warn('   To fix: Run ./scripts/fix-local-db.sh or check your DATABASE_URL')
            throw new Error('Database connection failed. Please fix your local database setup.')
          }
          throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
        }
        
        // Handle foreign key constraint violations
        if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
          throw new Error(`Cannot update zone: One or more device IDs do not exist in the database.`)
        }
        
        // Handle "record not found" errors
        if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
          throw new Error(`Zone with ID ${input.id} not found in database`)
        }
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying zone.update after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const { id, deviceIds, ...updates } = input
            
            const zone = await prisma.zone.findUnique({
              where: { id },
              select: { siteId: true },
            })
            
            if (!zone) {
              throw new Error(`Zone with ID ${id} not found`)
            }
            
            if (deviceIds !== undefined && deviceIds.length > 0) {
              const existingDevices = await prisma.device.findMany({
                where: {
                  id: { in: deviceIds },
                  siteId: zone.siteId,
                },
                select: { id: true },
              })
              
              const existingDeviceIds = new Set(existingDevices.map(d => d.id))
              const invalidDeviceIds = deviceIds.filter(deviceId => !existingDeviceIds.has(deviceId))
              
              if (invalidDeviceIds.length > 0) {
                throw new Error(`The following device IDs do not exist: ${invalidDeviceIds.join(', ')}`)
              }
              
              await prisma.zoneDevice.deleteMany({
                where: { zoneId: id },
              })
              
              if (deviceIds.length > 0) {
                await prisma.zoneDevice.createMany({
                  data: deviceIds.map(deviceId => ({
                    zoneId: id,
                    deviceId,
                  })),
                })
              }
            }
            
            const updatedZone = await prisma.zone.update({
              where: { id },
              data: {
                ...updates,
                polygon: input.polygon ? (input.polygon as any) : undefined,
              },
          include: {
            ZoneDevice: {
              include: {
                Device: true,
              },
            },
          },
            })
            
            return {
              id: updatedZone.id,
              name: updatedZone.name,
              color: updatedZone.color,
              description: updatedZone.description,
              polygon: updatedZone.polygon as Array<{ x: number; y: number }> | null,
              deviceIds: updatedZone.ZoneDevice.map((zd: any) => zd.deviceId),
              createdAt: updatedZone.createdAt,
              updatedAt: updatedZone.updatedAt,
            }
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            throw new Error(`Failed to update zone: ${retryError.message || 'Unknown error'}`)
          }
        }
        
        throw new Error(`Failed to update zone: ${error.message || 'Unknown error'}`)
      }
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      await prisma.zone.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  saveAll: publicProcedure
    .input(z.object({
      siteId: z.string(),
      zones: z.array(z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        description: z.string().optional(),
        polygon: z.array(polygonPointSchema).optional(),
        deviceIds: z.array(z.string()).optional().default([]),
      })),
    }))
    .mutation(async ({ input }) => {
      // Get existing zones for this site
      const existingZones = await prisma.zone.findMany({
        where: { siteId: input.siteId },
      })
      const existingZoneIds = new Set(existingZones.map(z => z.id))
      const inputZoneIds = new Set(input.zones.map(z => z.id))
      
      // Delete zones that are no longer in the input
      const zonesToDelete = existingZones.filter(z => !inputZoneIds.has(z.id))
      if (zonesToDelete.length > 0) {
        await prisma.zone.deleteMany({
          where: {
            id: { in: zonesToDelete.map(z => z.id) },
          },
        })
      }
      
      // Update or create zones
      for (const zoneData of input.zones) {
        if (existingZoneIds.has(zoneData.id)) {
          // Update existing zone
          await prisma.zone.update({
            where: { id: zoneData.id },
            data: {
              name: zoneData.name,
              color: zoneData.color,
              description: zoneData.description,
              polygon: zoneData.polygon ? (zoneData.polygon as any) : null,
            },
          })
          
          // Update device relationships
          await prisma.zoneDevice.deleteMany({
            where: { zoneId: zoneData.id },
          })
          if (zoneData.deviceIds && zoneData.deviceIds.length > 0) {
            await prisma.zoneDevice.createMany({
              data: zoneData.deviceIds.map(deviceId => ({
                zoneId: zoneData.id,
                deviceId,
              })),
            })
          }
        } else {
          // Create new zone
          await prisma.zone.create({
            data: {
              id: zoneData.id,
              name: zoneData.name,
              siteId: input.siteId,
              color: zoneData.color,
              description: zoneData.description,
              polygon: zoneData.polygon ? (zoneData.polygon as any) : null,
              devices: {
                create: (zoneData.deviceIds || []).map(deviceId => ({
                  id: randomUUID(),
                  deviceId,
                })),
              },
            },
          })
        }
      }
      
      return { success: true, saved: input.zones.length }
    }),
})

