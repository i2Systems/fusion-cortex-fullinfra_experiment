/**
 * Rule Router
 * 
 * tRPC procedures for rules and overrides.
 * Supports site-scoped rules that can target both zones and devices.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// Helper to transform database rule to frontend format
function transformRule(rule: any) {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    ruleType: rule.ruleType,
    targetType: rule.targetType,
    targetId: rule.targetId,
    targetName: rule.targetName,
    trigger: rule.trigger,
    condition: rule.condition as any,
    action: rule.action as any,
    overrideBMS: rule.overrideBMS,
    duration: rule.duration,
    siteId: rule.siteId,
    zoneId: rule.zoneId,
    zoneName: rule.Zone?.name,
    targetZones: rule.targetZones,
    enabled: rule.enabled,
    lastTriggered: rule.lastTriggered,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

export const ruleRouter = router({
  list: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
      zoneId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {}

      // Primary filter: by siteId
      if (input.siteId) {
        where.siteId = input.siteId
      }

      // Optional additional filter: by zoneId
      if (input.zoneId) {
        where.zoneId = input.zoneId
      }

      try {
        const rules = await prisma.rule.findMany({
          where,
          include: {
            Zone: {
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

        return rules.map(transformRule)
      } catch (error: any) {
        console.error('Error in rule.list:', error.message)
        return []
      }
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

      return transformRule(rule)
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      ruleType: z.string().default('rule'),
      targetType: z.string().default('zone'),
      targetId: z.string().optional(),
      targetName: z.string().optional(),
      trigger: z.string(),
      condition: z.any(),
      action: z.any(),
      overrideBMS: z.boolean().default(false),
      duration: z.number().optional(),
      siteId: z.string(),
      zoneId: z.string().optional(),
      targetZones: z.array(z.string()).default([]),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      try {
        const rule = await prisma.rule.create({
          data: {
            id: randomUUID(),
            name: input.name,
            description: input.description,
            ruleType: input.ruleType,
            targetType: input.targetType,
            targetId: input.targetId,
            targetName: input.targetName,
            trigger: input.trigger,
            condition: input.condition,
            action: input.action,
            overrideBMS: input.overrideBMS,
            duration: input.duration,
            siteId: input.siteId,
            zoneId: input.zoneId,
            targetZones: input.targetZones,
            enabled: input.enabled,
            updatedAt: new Date(),
          },
          include: {
            Zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return transformRule(rule)
      } catch (error: any) {
        console.error('Error in rule.create:', error.message)
        throw new Error(`Failed to create rule: ${error.message}`)
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      ruleType: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      targetName: z.string().optional(),
      trigger: z.string().optional(),
      condition: z.any().optional(),
      action: z.any().optional(),
      overrideBMS: z.boolean().optional(),
      duration: z.number().optional(),
      zoneId: z.string().optional(),
      targetZones: z.array(z.string()).optional(),
      enabled: z.boolean().optional(),
      lastTriggered: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input

      // Build update data object with only defined fields
      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.ruleType !== undefined) updateData.ruleType = updates.ruleType
      if (updates.targetType !== undefined) updateData.targetType = updates.targetType
      if (updates.targetId !== undefined) updateData.targetId = updates.targetId
      if (updates.targetName !== undefined) updateData.targetName = updates.targetName
      if (updates.trigger !== undefined) updateData.trigger = updates.trigger
      if (updates.condition !== undefined) updateData.condition = updates.condition
      if (updates.action !== undefined) updateData.action = updates.action
      if (updates.overrideBMS !== undefined) updateData.overrideBMS = updates.overrideBMS
      if (updates.duration !== undefined) updateData.duration = updates.duration
      if (updates.zoneId !== undefined) updateData.zoneId = updates.zoneId
      if (updates.targetZones !== undefined) updateData.targetZones = updates.targetZones
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled
      if (updates.lastTriggered !== undefined) updateData.lastTriggered = updates.lastTriggered

      try {
        const rule = await prisma.rule.update({
          where: { id },
          data: updateData,
          include: {
            Zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return transformRule(rule)
      } catch (error: any) {
        console.error('Error in rule.update:', error.message)
        throw new Error(`Failed to update rule: ${error.message}`)
      }
    }),

  // Toggle rule enabled/disabled - optimized for quick toggling
  toggle: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Get current state
        const current = await prisma.rule.findUnique({
          where: { id: input.id },
          select: { enabled: true },
        })

        if (!current) {
          throw new Error('Rule not found')
        }

        // Toggle
        const rule = await prisma.rule.update({
          where: { id: input.id },
          data: { enabled: !current.enabled },
          include: {
            Zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return transformRule(rule)
      } catch (error: any) {
        console.error('Error in rule.toggle:', error.message)
        throw new Error(`Failed to toggle rule: ${error.message}`)
      }
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        await prisma.rule.delete({
          where: { id: input.id },
        })
        return { success: true }
      } catch (error: any) {
        console.error('Error in rule.delete:', error.message)
        throw new Error(`Failed to delete rule: ${error.message}`)
      }
    }),
})
