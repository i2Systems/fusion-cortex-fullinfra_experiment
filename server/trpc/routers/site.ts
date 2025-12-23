/**
 * Site Router
 * 
 * tRPC procedures for site/store operations.
 * Maps to the Site model in the database.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'

// In-memory lock to prevent concurrent ensureExists calls for the same site
// This handles cases where multiple calls arrive simultaneously (even if not batched)
const ensuringSites = new Map<string, Promise<any>>()

export const siteRouter = router({
  list: publicProcedure.query(async () => {
    try {
      const sites = await prisma.site.findMany({
        orderBy: {
          createdAt: 'asc',
        },
      })
      return sites
    } catch (error: any) {
      console.error('Error in site.list:', {
        message: error.message,
        code: error.code,
      })
      // Return empty array on error to prevent UI crashes
      return []
    }
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
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      manager: z.string().optional(),
      squareFootage: z.number().optional(),
      openedDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const site = await prisma.site.create({
        data: {
          name: input.name,
          storeNumber: input.storeNumber,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          phone: input.phone,
          manager: input.manager,
          squareFootage: input.squareFootage,
          openedDate: input.openedDate,
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
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      manager: z.string().optional(),
      squareFootage: z.number().optional(),
      openedDate: z.date().optional(),
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
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      manager: z.string().optional(),
      squareFootage: z.number().optional(),
      openedDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const siteId = input.id
      
      // Check if this site is already being ensured by another concurrent call
      const existingPromise = ensuringSites.get(siteId)
      if (existingPromise) {
        console.log(`[ensureExists] Site ${siteId} already being ensured, waiting for existing promise`)
        try {
          return await existingPromise
        } catch (error) {
          // If the existing promise failed, continue with our own attempt
          console.log(`[ensureExists] Existing promise failed for ${siteId}, retrying`)
        }
      }
      
      // Create a promise for this ensure operation
      const ensurePromise = (async () => {
        try {
          // Check if site exists first
          const existing = await prisma.site.findUnique({
            where: { id: siteId },
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

        // Create new site - filter out undefined values
        const siteData: any = {
          id: input.id,
          name: input.name,
        }
        
        if (input.storeNumber !== undefined) siteData.storeNumber = input.storeNumber
        if (input.address !== undefined) siteData.address = input.address
        if (input.city !== undefined) siteData.city = input.city
        if (input.state !== undefined) siteData.state = input.state
        if (input.zipCode !== undefined) siteData.zipCode = input.zipCode
        if (input.phone !== undefined) siteData.phone = input.phone
        if (input.manager !== undefined) siteData.manager = input.manager
        if (input.squareFootage !== undefined) siteData.squareFootage = input.squareFootage
        if (input.openedDate !== undefined) siteData.openedDate = input.openedDate

          const site = await prisma.site.create({
            data: siteData,
          })
          return site
        } catch (error: any) {
        // Log error for debugging with full details
        console.error('Error in ensureExists:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
          input: input,
        })
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying site.ensureExists after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const existing = await prisma.site.findUnique({
              where: { id: input.id },
            })

            if (existing) {
              return existing
            }

            if (input.storeNumber) {
              const byStoreNumber = await prisma.site.findFirst({
                where: { storeNumber: input.storeNumber },
              })
              if (byStoreNumber) {
                return byStoreNumber
              }
            }

            const siteData: any = {
              id: input.id,
              name: input.name,
            }
            
            if (input.storeNumber !== undefined) siteData.storeNumber = input.storeNumber
            if (input.address !== undefined) siteData.address = input.address
            if (input.city !== undefined) siteData.city = input.city
            if (input.state !== undefined) siteData.state = input.state
            if (input.zipCode !== undefined) siteData.zipCode = input.zipCode
            if (input.phone !== undefined) siteData.phone = input.phone
            if (input.manager !== undefined) siteData.manager = input.manager
            if (input.squareFootage !== undefined) siteData.squareFootage = input.squareFootage
            if (input.openedDate !== undefined) siteData.openedDate = input.openedDate

            const site = await prisma.site.create({
              data: siteData,
            })
            return site
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            // Fall through to other error handling
          }
        }
        
        // If it's a unique constraint violation, try to find the existing site
        if (error.code === 'P2002') {
          try {
            // Unique constraint violation - site might exist with different ID
            // Try to find by store number or name
            const orConditions: Array<{ storeNumber?: string } | { name: string }> = [
              { name: input.name },
            ]
            if (input.storeNumber) {
              orConditions.push({ storeNumber: input.storeNumber })
            }
            
            const found = await prisma.site.findFirst({
              where: {
                OR: orConditions,
              },
            })
            if (found) {
              return found
            }
          } catch (findError) {
            console.error('Error finding existing site:', findError)
          }
        }
        
        // Check for database connection errors
        if (error.message?.includes('Can\'t reach database') || 
            error.message?.includes('P1001') ||
            error.code === 'P1001') {
          throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
        }
        
          // Re-throw the error so tRPC can handle it
          throw new Error(`Failed to ensure site exists: ${error.message || 'Unknown error'}`)
        } finally {
          // Remove from the ensuring map when done
          ensuringSites.delete(siteId)
        }
      })()
      
      // Store the promise so concurrent calls can wait for it
      ensuringSites.set(siteId, ensurePromise)
      
      try {
        return await ensurePromise
      } catch (error) {
        // Remove from map on error so it can be retried
        ensuringSites.delete(siteId)
        throw error
      }
    }),

  // Note: Seeding endpoint removed because Next.js cannot resolve TypeScript files
  // in the scripts/ directory at runtime. Use the npm script instead:
  // npm run db:seed
})

