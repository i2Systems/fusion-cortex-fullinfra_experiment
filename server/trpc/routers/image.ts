/**
 * Image Router
 * 
 * tRPC procedures for storing and retrieving images in Supabase database.
 * Handles both site images and library object images.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'

export const imageRouter = router({
  // Save site image to database (with retry logic)
  saveSiteImage: publicProcedure
    .input(z.object({
      siteId: z.string(),
      imageData: z.string(), // Base64 encoded image
      mimeType: z.string().optional().default('image/jpeg'),
    }))
    .mutation(async ({ input }) => {
      const MAX_RETRIES = 3
      let lastError: any = null
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`  Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt))
          }
          
          console.log(`💾 Saving site image to database for ${input.siteId}, size: ${input.imageData.length} chars`)
          
          // Update site with imageUrl
          const site = await prisma.site.update({
            where: { id: input.siteId },
            data: { imageUrl: input.imageData },
          })
          
          console.log(`✅ Site image saved to database for ${input.siteId}`)
          return { success: true, siteId: input.siteId }
        } catch (error: any) {
          lastError = error
          console.error(`Error saving site image to database (attempt ${attempt + 1}):`, error)
          
          // Handle missing column error
          if (error.code === 'P2022' && error.meta?.column === 'Site.imageUrl') {
            console.warn('imageUrl column missing, attempting to add it...')
            try {
              await prisma.$executeRaw`ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
              // Retry the update
              const site = await prisma.site.update({
                where: { id: input.siteId },
                data: { imageUrl: input.imageData },
              })
              return { success: true, siteId: input.siteId }
            } catch (addColumnError) {
              console.error('Failed to add imageUrl column:', addColumnError)
              if (attempt < MAX_RETRIES - 1) continue
              throw new Error('Database schema update required. Please run migrations.')
            }
          }
          
          // Handle site not found
          if (error.code === 'P2025') {
            throw new Error(`Site with ID ${input.siteId} not found`)
          }
          
          // Handle prepared statement errors
          if (error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) {
            if (attempt < MAX_RETRIES - 1) continue
          }
          
          // If not a retryable error, throw immediately
          if (attempt < MAX_RETRIES - 1) continue
        }
      }
      
      throw new Error(`Failed to save site image after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`)
    }),

  // Get site image from database (with retry logic)
  getSiteImage: publicProcedure
    .input(z.object({
      siteId: z.string(),
    }))
    .query(async ({ input }) => {
      console.log(`🔍 [SERVER] getSiteImage called for siteId: ${input.siteId}`)
      const MAX_RETRIES = 3
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`  [SERVER] Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt))
          }
          
          const site = await prisma.site.findUnique({
            where: { id: input.siteId },
            select: { imageUrl: true },
          })
          
          if (site?.imageUrl) {
            console.log(`✅ [SERVER] Found image in database for ${input.siteId}, length: ${site.imageUrl.length}`)
            return site.imageUrl
          } else {
            console.log(`ℹ️ [SERVER] No image found in database for ${input.siteId}`)
            return null
          }
        } catch (error: any) {
          console.error(`❌ [SERVER] Error getting site image from database (attempt ${attempt + 1}):`, {
            message: error.message,
            code: error.code,
            siteId: input.siteId,
          })
          
          // Handle missing column error
          if (error.code === 'P2022' && error.meta?.column === 'Site.imageUrl') {
            console.warn(`⚠️ [SERVER] imageUrl column missing for ${input.siteId}`)
            return null
          }
          
          // Handle prepared statement errors
          if ((error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) && attempt < MAX_RETRIES - 1) {
            continue
          }
          
          // Return null on other errors
          return null
        }
      }
      
      console.warn(`⚠️ [SERVER] Failed to get site image after ${MAX_RETRIES} attempts for ${input.siteId}`)
      return null
    }),

  // Save library object image to database (with retry logic)
  saveLibraryImage: publicProcedure
    .input(z.object({
      libraryId: z.string(),
      imageData: z.string(), // Base64 encoded image
      mimeType: z.string().optional().default('image/jpeg'),
    }))
    .mutation(async ({ input }) => {
      const MAX_RETRIES = 3
      let lastError: any = null
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`  Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt))
          }
          
          console.log(`💾 Saving library image to database for ${input.libraryId}, size: ${input.imageData.length} chars`)
          
          // Upsert library image (create or update)
          const libraryImage = await prisma.libraryImage.upsert({
            where: { libraryId: input.libraryId },
            update: {
              imageData: input.imageData,
              mimeType: input.mimeType,
              updatedAt: new Date(),
            },
            create: {
              libraryId: input.libraryId,
              imageData: input.imageData,
              mimeType: input.mimeType,
            },
          })
          
          console.log(`✅ Library image saved to database for ${input.libraryId}`)
          return { success: true, libraryId: input.libraryId }
        } catch (error: any) {
          lastError = error
          console.error(`Error saving library image to database (attempt ${attempt + 1}):`, error)
          
          // Handle table doesn't exist error
          if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LibraryImage')) {
            console.warn('LibraryImage table missing, attempting to create it...')
            try {
              await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS "LibraryImage" (
                  "id" TEXT NOT NULL,
                  "libraryId" TEXT NOT NULL,
                  "imageData" TEXT NOT NULL,
                  "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
                  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  "updatedAt" TIMESTAMP(3) NOT NULL,
                  CONSTRAINT "LibraryImage_pkey" PRIMARY KEY ("id")
                )
              `
              await prisma.$executeRaw`
                CREATE UNIQUE INDEX IF NOT EXISTS "LibraryImage_libraryId_key" ON "LibraryImage"("libraryId")
              `
              await prisma.$executeRaw`
                CREATE INDEX IF NOT EXISTS "LibraryImage_libraryId_idx" ON "LibraryImage"("libraryId")
              `
              // Retry the upsert
              if (attempt < MAX_RETRIES - 1) continue
            } catch (createTableError) {
              console.error('Failed to create LibraryImage table:', createTableError)
              if (attempt < MAX_RETRIES - 1) continue
              throw new Error('Database schema update required. Please run migrations or visit /api/migrate-library-images')
            }
          }
          
          // Handle prepared statement errors
          if (error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) {
            if (attempt < MAX_RETRIES - 1) continue
          }
          
          // If not a retryable error, throw immediately
          if (attempt < MAX_RETRIES - 1) continue
        }
      }
      
      throw new Error(`Failed to save library image after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`)
    }),

  // Get library object image from database (with retry logic)
  getLibraryImage: publicProcedure
    .input(z.object({
      libraryId: z.string(),
    }))
    .query(async ({ input }) => {
      const MAX_RETRIES = 3
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 200 * attempt))
          }
          
          const libraryImage = await prisma.libraryImage.findUnique({
            where: { libraryId: input.libraryId },
            select: { imageData: true, mimeType: true },
          })
          
          return libraryImage?.imageData || null
        } catch (error: any) {
          console.error(`Error getting library image from database (attempt ${attempt + 1}):`, error)
          
          // Handle table doesn't exist - return null (will fallback to client storage)
          if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LibraryImage')) {
            return null
          }
          
          // Handle prepared statement errors
          if ((error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) && attempt < MAX_RETRIES - 1) {
            continue
          }
          
          // Return null on other errors
          return null
        }
      }
      
      return null
    }),

  // Remove library image from database
  removeLibraryImage: publicProcedure
    .input(z.object({
      libraryId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        await prisma.libraryImage.delete({
          where: { libraryId: input.libraryId },
        })
        
        return { success: true }
      } catch (error: any) {
        // Ignore if image doesn't exist
        if (error.code === 'P2025') {
          return { success: true }
        }
        console.error('Error removing library image from database:', error)
        throw new Error(`Failed to remove library image: ${error.message}`)
      }
    }),
})

