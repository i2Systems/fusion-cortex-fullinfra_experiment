/**
 * Rule Router
 * 
 * tRPC procedures for rules and overrides.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'

export const ruleRouter = router({
  list: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
      zoneId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {}
      if (input.siteId) {
        // Get zones for this site, then get rules for those zones
        const zones = await prisma.zone.findMany({
          where: { siteId: input.siteId },
          select: { id: true },
        })
        where.zoneId = { in: zones.map(z => z.id) }
      }
      if (input.zoneId) {
        where.zoneId = input.zoneId
      }

      const rules = await prisma.rule.findMany({
        where,
        include: {
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        condition: rule.condition as any,
        action: rule.action as any,
        overrideBMS: rule.overrideBMS,
        duration: rule.duration,
        zoneId: rule.zoneId,
        zoneName: rule.zone?.name,
        targetZones: rule.targetZones,
        enabled: rule.enabled,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }))
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const rule = await prisma.rule.findUnique({
        where: { id: input.id },
        include: {
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!rule) {
        return null
      }

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        condition: rule.condition as any,
        action: rule.action as any,
        overrideBMS: rule.overrideBMS,
        duration: rule.duration,
        zoneId: rule.zoneId,
        zoneName: rule.zone?.name,
        targetZones: rule.targetZones,
        enabled: rule.enabled,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      trigger: z.string(),
      condition: z.any(),
      action: z.any(),
      overrideBMS: z.boolean().default(false),
      duration: z.number().optional(),
      zoneId: z.string().optional(),
      targetZones: z.array(z.string()).default([]),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const rule = await prisma.rule.create({
        data: {
          name: input.name,
          description: input.description,
          trigger: input.trigger,
          condition: input.condition,
          action: input.action,
          overrideBMS: input.overrideBMS,
          duration: input.duration,
          zoneId: input.zoneId,
          targetZones: input.targetZones,
          enabled: input.enabled,
        },
        include: {
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        condition: rule.condition as any,
        action: rule.action as any,
        overrideBMS: rule.overrideBMS,
        duration: rule.duration,
        zoneId: rule.zoneId,
        zoneName: rule.zone?.name,
        targetZones: rule.targetZones,
        enabled: rule.enabled,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      trigger: z.string().optional(),
      condition: z.any().optional(),
      action: z.any().optional(),
      overrideBMS: z.boolean().optional(),
      duration: z.number().optional(),
      zoneId: z.string().optional(),
      targetZones: z.array(z.string()).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input

      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.trigger !== undefined) updateData.trigger = updates.trigger
      if (updates.condition !== undefined) updateData.condition = updates.condition
      if (updates.action !== undefined) updateData.action = updates.action
      if (updates.overrideBMS !== undefined) updateData.overrideBMS = updates.overrideBMS
      if (updates.duration !== undefined) updateData.duration = updates.duration
      if (updates.zoneId !== undefined) updateData.zoneId = updates.zoneId
      if (updates.targetZones !== undefined) updateData.targetZones = updates.targetZones
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled

      const rule = await prisma.rule.update({
        where: { id },
        data: updateData,
        include: {
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        condition: rule.condition as any,
        action: rule.action as any,
        overrideBMS: rule.overrideBMS,
        duration: rule.duration,
        zoneId: rule.zoneId,
        zoneName: rule.zone?.name,
        targetZones: rule.targetZones,
        enabled: rule.enabled,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      await prisma.rule.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),
})

