/**
 * Fault Router
 * 
 * Handles CRUD operations for device faults.
 * 
 * AI Note: Faults can be manually created or auto-generated from device status.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { FaultCategory } from '@/lib/faultDefinitions'

export const faultRouter = router({
  // List all faults for a site
  list: publicProcedure
    .input(z.object({
      siteId: z.string(),
      includeResolved: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      const faults = await prisma.fault.findMany({
        where: {
          device: {
            siteId: input.siteId,
          },
          ...(input.includeResolved ? {} : { resolved: false }),
        },
        include: {
          device: {
            include: {
              components: true,
            },
          },
        },
        orderBy: {
          detectedAt: 'desc',
        },
      })
      
      return faults
    }),

  // Get fault by ID
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const fault = await prisma.fault.findUnique({
        where: { id: input.id },
        include: {
          device: {
            include: {
              components: true,
            },
          },
        },
      })
      
      return fault
    }),

  // Create a new fault
  create: publicProcedure
    .input(z.object({
      deviceId: z.string(),
      faultType: z.string(), // FaultCategory as string
      description: z.string(),
      detectedAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      // Verify device exists
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
      })
      
      if (!device) {
        throw new Error('Device not found')
      }
      
      // Verify fault type is valid
      const validTypes: string[] = [
        'environmental-ingress',
        'electrical-driver',
        'thermal-overheat',
        'installation-wiring',
        'control-integration',
        'manufacturing-defect',
        'mechanical-structural',
        'optical-output',
      ]
      
      if (!validTypes.includes(input.faultType)) {
        throw new Error('Invalid fault type')
      }
      
      const fault = await prisma.fault.create({
        data: {
          deviceId: input.deviceId,
          faultType: input.faultType,
          description: input.description,
          detectedAt: input.detectedAt || new Date(),
          resolved: false,
        },
        include: {
          device: {
            include: {
              components: true,
            },
          },
        },
      })
      
      return fault
    }),

  // Update fault (e.g., mark as resolved)
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      resolved: z.boolean().optional(),
      resolvedAt: z.date().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input
      
      const fault = await prisma.fault.update({
        where: { id },
        data: {
          ...updates,
          // Auto-set resolvedAt when marking as resolved
          resolvedAt: input.resolved === true 
            ? (input.resolvedAt || new Date())
            : input.resolved === false
            ? null
            : input.resolvedAt,
        },
        include: {
          device: {
            include: {
              components: true,
            },
          },
        },
      })
      
      return fault
    }),

  // Delete fault
  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      await prisma.fault.delete({
        where: { id: input.id },
      })
      
      return { success: true }
    }),
})

