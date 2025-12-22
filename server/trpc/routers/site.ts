/**
 * Site Router
 * 
 * tRPC procedures for site/store operations.
 * Maps to the Site model in the database.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'

export const siteRouter = router({
  list: publicProcedure.query(async () => {
    const sites = await prisma.site.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })
    return sites
  }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const site = await prisma.site.findUnique({
        where: { id: input.id },
      })
      return site
    }),

  getByStoreNumber: publicProcedure
    .input(z.object({
      storeNumber: z.string(),
    }))
    .query(async ({ input }) => {
      const site = await prisma.site.findFirst({
        where: { storeNumber: input.storeNumber },
      })
      return site
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      storeNumber: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const site = await prisma.site.create({
        data: {
          name: input.name,
          storeNumber: input.storeNumber,
          address: input.address,
        },
      })
      return site
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      storeNumber: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input
      const site = await prisma.site.update({
        where: { id },
        data: updates,
      })
      return site
    }),

  // Ensure site exists - creates if it doesn't, returns if it does
  ensureExists: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      storeNumber: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await prisma.site.findUnique({
        where: { id: input.id },
      })

      if (existing) {
        return existing
      }

      // Try to find by store number if provided
      if (input.storeNumber) {
        const byStoreNumber = await prisma.site.findFirst({
          where: { storeNumber: input.storeNumber },
        })
        if (byStoreNumber) {
          return byStoreNumber
        }
      }

      // Create new site
      const site = await prisma.site.create({
        data: {
          id: input.id,
          name: input.name,
          storeNumber: input.storeNumber,
          address: input.address,
        },
      })
      return site
    }),

  // Note: Seeding endpoint removed because Next.js cannot resolve TypeScript files
  // in the scripts/ directory at runtime. Use the npm script instead:
  // npm run db:seed
})

