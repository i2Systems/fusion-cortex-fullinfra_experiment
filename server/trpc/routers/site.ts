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
        meta: error.meta,
        stack: error.stack,
      })
      
      // Handle missing column error (P2022) - use raw SQL to select without imageUrl
      if (error.code === 'P2022' && error.meta?.column === 'Site.imageUrl') {
        console.log('imageUrl column missing, using raw SQL query without imageUrl...')
        try {
          const sites = await prisma.$queryRaw<Array<{
            id: string
            name: string
            storeNumber: string | null
            address: string | null
            city: string | null
            state: string | null
            zipCode: string | null
            phone: string | null
            manager: string | null
            squareFootage: number | null
            openedDate: Date | null
            createdAt: Date
            updatedAt: Date
          }>>`
            SELECT id, name, "storeNumber", address, city, state, "zipCode", phone, manager, "squareFootage", "openedDate", "createdAt", "updatedAt"
            FROM "Site"
            ORDER BY "createdAt" ASC
          `
          // Add imageUrl as null for all sites
          return sites.map(site => ({ ...site, imageUrl: null }))
        } catch (rawError: any) {
          console.error('Raw SQL query also failed:', rawError)
          return []
        }
      }
      
      // Handle authentication errors specifically
      if (error.message?.includes('Authentication failed') || 
          error.message?.includes('credentials') ||
          error.code === 'P1000' || error.code === 'P1001') {
        console.error('❌ Database authentication failed. Check DATABASE_URL environment variable.')
        throw new Error('Database connection failed. Please check your database credentials.')
      }
      
      // Return empty array on other errors to prevent UI crashes
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
      imageUrl: z.string().optional(),
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
          imageUrl: input.imageUrl,
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
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { id, ...updates } = input
        
        // Log imageUrl length if present (for debugging)
        if (updates.imageUrl) {
          console.log('Updating site imageUrl length:', updates.imageUrl.length, 'starts with:', updates.imageUrl.substring(0, 50))
        }
        
        const site = await prisma.site.update({
          where: { id },
          data: updates,
        })
        return site
      } catch (error: any) {
        console.error('Error in site.update:', {
          message: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
          input: input,
        })
        
        // Handle "record not found" errors
        if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
          throw new Error(`Site with ID ${input.id} not found in database`)
        }
        
        // Handle column doesn't exist errors (migration needed)
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.error('❌ Database column missing. You may need to run: npx prisma db push')
          throw new Error('Database schema is out of date. Please run database migration.')
        }
        
        // Handle prepared statement errors with retry
        if (error.code === '26000' || error.message?.includes('prepared statement')) {
          console.log('Retrying site.update after prepared statement error...')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          try {
            const { id, ...updates } = input
            const site = await prisma.site.update({
              where: { id },
              data: updates,
            })
            return site
          } catch (retryError: any) {
            console.error('Retry also failed:', retryError)
            throw new Error(`Failed to update site: ${retryError.message || 'Unknown error'}`)
          }
        }
        
        // Re-throw with more context
        throw new Error(`Failed to update site: ${error.message || 'Unknown error'}`)
      }
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
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const MAX_RETRIES = 3
      let retries = 0
      
      while (retries < MAX_RETRIES) {
        try {
          // Try to find existing site - handle missing imageUrl column gracefully
          let existing
          try {
            existing = await prisma.site.findUnique({
              where: { id: input.id },
            })
          } catch (findError: any) {
            // If imageUrl column is missing, use raw SQL
            if (findError.code === 'P2022' && findError.meta?.column === 'Site.imageUrl') {
              const rawSite = await prisma.$queryRaw<Array<{
                id: string
                name: string
                storeNumber: string | null
                address: string | null
                city: string | null
                state: string | null
                zipCode: string | null
                phone: string | null
                manager: string | null
                squareFootage: number | null
                openedDate: Date | null
                createdAt: Date
                updatedAt: Date
              }>>`
                SELECT id, name, "storeNumber", address, city, state, "zipCode", phone, manager, "squareFootage", "openedDate", "createdAt", "updatedAt"
                FROM "Site"
                WHERE id = ${input.id}
              `
              existing = rawSite[0] ? { ...rawSite[0], imageUrl: null } : null
            } else {
              throw findError
            }
          }

          if (existing) {
            return existing
          }

          // Try to find by store number if provided
          if (input.storeNumber) {
            let byStoreNumber
            try {
              byStoreNumber = await prisma.site.findFirst({
                where: { storeNumber: input.storeNumber },
              })
            } catch (findError: any) {
              // If imageUrl column is missing, use raw SQL
              if (findError.code === 'P2022' && findError.meta?.column === 'Site.imageUrl') {
                const rawSite = await prisma.$queryRaw<Array<{
                  id: string
                  name: string
                  storeNumber: string | null
                  address: string | null
                  city: string | null
                  state: string | null
                  zipCode: string | null
                  phone: string | null
                  manager: string | null
                  squareFootage: number | null
                  openedDate: Date | null
                  createdAt: Date
                  updatedAt: Date
                }>>`
                  SELECT id, name, "storeNumber", address, city, state, "zipCode", phone, manager, "squareFootage", "openedDate", "createdAt", "updatedAt"
                  FROM "Site"
                  WHERE "storeNumber" = ${input.storeNumber}
                  LIMIT 1
                `
                byStoreNumber = rawSite[0] ? { ...rawSite[0], imageUrl: null } : null
              } else {
                throw findError
              }
            }
            if (byStoreNumber) {
              return byStoreNumber
            }
          }

          // Create new site - filter out undefined values and imageUrl if column doesn't exist
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
          // Only include imageUrl if we know the column exists (will be handled in catch if it doesn't)

          let site
          try {
            if (input.imageUrl !== undefined) siteData.imageUrl = input.imageUrl
            site = await prisma.site.create({
              data: siteData,
            })
          } catch (createError: any) {
            // If imageUrl column is missing, create without it
            if (createError.code === 'P2022' && createError.meta?.column === 'Site.imageUrl') {
              delete siteData.imageUrl
              site = await prisma.site.create({
                data: siteData,
              })
              // Add imageUrl as null to match schema
              site = { ...site, imageUrl: null }
            } else {
              throw createError
            }
          }
          return site
        } catch (error: any) {
          // Log error for debugging with full details
          console.error('Error in ensureExists:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack,
            input: input,
            retry: retries,
          })
          
          // Handle prepared statement errors with retry
          if (error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) {
            retries++
            if (retries < MAX_RETRIES) {
              console.log(`Retrying site.ensureExists after prepared statement error. Attempt ${retries}/${MAX_RETRIES}...`)
              await new Promise(resolve => setTimeout(resolve, 200 * retries)) // Exponential backoff
              continue // Retry the loop
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
              console.error('Error finding existing site during P2002 handling:', findError)
            }
          }
          
          // Check for database connection errors
          if (error.message?.includes('Can\'t reach database') || 
              error.message?.includes('P1001') ||
              error.message?.includes('Authentication failed') ||
              error.code === 'P1001' ||
              error.code === 'P1000') {
            throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
          }
          
          // If we've exhausted retries, throw the error
          if (retries >= MAX_RETRIES) {
            throw new Error(`Failed to ensure site exists after ${MAX_RETRIES} retries: ${error.message || 'Unknown error'}`)
          }
          
          // For other errors, throw immediately
          throw new Error(`Failed to ensure site exists: ${error.message || 'Unknown error'}`)
        }
      }
      
      throw new Error(`Failed to ensure site exists after ${MAX_RETRIES} retries.`)
    }),

  // Note: Seeding endpoint removed because Next.js cannot resolve TypeScript files
  // in the scripts/ directory at runtime. Use the npm script instead:
  // npm run db:seed
})

