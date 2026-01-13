/**
 * BACnet Mapping Router
 * 
 * tRPC procedures for BACnet mapping operations.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { BACnetStatus } from '@prisma/client'
import { randomUUID } from 'crypto'

export const bacnetRouter = router({
  list: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!input.siteId) {
        return []
      }

      // Get all zones for this site, then get their BACnet mappings
      const zones = await prisma.zone.findMany({
        where: { siteId: input.siteId },
        include: {
          BACnetMapping: true,
        },
      })

      return zones
        .filter(zone => zone.BACnetMapping)
        .map(zone => ({
          zoneId: zone.id,
          zoneName: zone.name,
          bacnetObjectId: zone.BACnetMapping?.bacnetObjectId || null,
          status: zone.BACnetMapping?.status || 'NOT_ASSIGNED',
          lastConnected: zone.BACnetMapping?.lastConnected || null,
        }))
    }),

  getByZone: publicProcedure
    .input(z.object({
      zoneId: z.string(),
    }))
    .query(async ({ input }) => {
      const mapping = await prisma.bACnetMapping.findUnique({
        where: { zoneId: input.zoneId },
        include: {
          Zone: true,
        },
      })

      if (!mapping) {
        return null
      }

      return {
        id: mapping.id,
        zoneId: mapping.zoneId,
        zoneName: mapping.Zone.name,
        bacnetObjectId: mapping.bacnetObjectId,
        status: mapping.status,
        lastConnected: mapping.lastConnected,
      }
    }),

  create: publicProcedure
    .input(z.object({
      zoneId: z.string(),
      bacnetObjectId: z.string().optional(),
      status: z.enum(['CONNECTED', 'ERROR', 'NOT_ASSIGNED']).optional().default('NOT_ASSIGNED'),
    }))
    .mutation(async ({ input }) => {
      const mapping = await prisma.bACnetMapping.create({
        data: {
          id: randomUUID(),
          zoneId: input.zoneId,
          bacnetObjectId: input.bacnetObjectId || null,
          status: input.status as BACnetStatus,
          updatedAt: new Date(),
        },
        include: {
          Zone: true,
        },
      })

      return {
        id: mapping.id,
        zoneId: mapping.zoneId,
        zoneName: mapping.Zone.name,
        bacnetObjectId: mapping.bacnetObjectId,
        status: mapping.status,
        lastConnected: mapping.lastConnected,
      }
    }),

  update: publicProcedure
    .input(z.object({
      zoneId: z.string(),
      bacnetObjectId: z.string().optional(),
      status: z.enum(['CONNECTED', 'ERROR', 'NOT_ASSIGNED']).optional(),
      lastConnected: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { zoneId, ...updates } = input

      const updateData: any = {}
      if (updates.bacnetObjectId !== undefined) updateData.bacnetObjectId = updates.bacnetObjectId
      if (updates.status !== undefined) updateData.status = updates.status as BACnetStatus
      if (updates.lastConnected !== undefined) updateData.lastConnected = updates.lastConnected

      updateData.updatedAt = new Date()
      const mapping = await prisma.bACnetMapping.upsert({
        where: { zoneId },
        update: updateData,
        create: {
          id: randomUUID(),
          zoneId,
          bacnetObjectId: updates.bacnetObjectId || null,
          status: (updates.status as BACnetStatus) || BACnetStatus.NOT_ASSIGNED,
          lastConnected: updates.lastConnected || null,
          updatedAt: new Date(),
        },
        include: {
          Zone: true,
        },
      })

      return {
        id: mapping.id,
        zoneId: mapping.zoneId,
        zoneName: mapping.Zone.name,
        bacnetObjectId: mapping.bacnetObjectId,
        status: mapping.status,
        lastConnected: mapping.lastConnected,
      }
    }),

  delete: publicProcedure
    .input(z.object({
      zoneId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await prisma.bACnetMapping.delete({
        where: { zoneId: input.zoneId },
      })
      return { success: true }
    }),
})

