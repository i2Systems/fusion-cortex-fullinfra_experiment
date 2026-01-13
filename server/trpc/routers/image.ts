/**
 * Image Router
 * 
 * tRPC procedures for storing and retrieving images.
 * Images are stored in Supabase Storage, with URLs saved in the database.
 * Falls back to base64 storage if Supabase is not configured.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { supabaseAdmin, STORAGE_BUCKETS } from '@/lib/supabase'

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

          console.log(`💾 [SERVER] Saving site image for ${input.siteId}, size: ${input.imageData.length} chars (${(input.imageData.length / 1024).toFixed(1)} KB)`)

          // Reject temporary site IDs - they should not be saved to the database
          // Temporary IDs are: "site-" followed only by digits (timestamp), or "temp-"
          const isTempId = /^site-\d+$/.test(input.siteId) || input.siteId.startsWith('temp-')
          if (isTempId) {
            console.warn(`⚠️ [SERVER] Rejecting temporary site ID: ${input.siteId}. Images for new sites should be saved after the site is created in the database.`)
            throw new Error(`Cannot save image for temporary site ID: ${input.siteId}. Please create the site first.`)
          }

          // First ensure site exists
          const siteExists = await prisma.site.findUnique({
            where: { id: input.siteId },
            select: { id: true },
          })

          if (!siteExists) {
            console.error(`❌ [SERVER] Site ${input.siteId} does not exist in database. Cannot save image.`)
            throw new Error(`Site ${input.siteId} does not exist. Please create the site first.`)
          }

          // Try to upload to Supabase Storage
          let imageUrl = input.imageData // Fallback to base64

          if (supabaseAdmin && input.imageData.startsWith('data:')) {
            try {
              // Convert base64 to Buffer
              const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64Data, 'base64')

              // Generate filename
              const fileExtension = 'jpg' // Always use jpg for optimization
              const fileName = `${input.siteId}.${fileExtension}`

              // Upload to Supabase Storage
              const { data, error } = await supabaseAdmin.storage
                .from(STORAGE_BUCKETS.SITE_IMAGES)
                .upload(fileName, buffer, {
                  contentType: 'image/jpeg', // Always JPEG for optimization
                  upsert: true,
                })

              if (!error && data) {
                // Get public URL
                const { data: urlData } = supabaseAdmin.storage
                  .from(STORAGE_BUCKETS.SITE_IMAGES)
                  .getPublicUrl(fileName)

                imageUrl = urlData.publicUrl
                console.log(`✅ [SERVER] Uploaded site image to Supabase Storage: ${imageUrl}`)
              } else {
                console.warn(`⚠️ [SERVER] Supabase upload failed, using base64 fallback:`, error?.message)
              }
            } catch (uploadError: any) {
              console.warn(`⚠️ [SERVER] Supabase upload error, using base64 fallback:`, uploadError.message)
            }
          }

          // Update site with imageUrl (either Supabase URL or base64 fallback)
          const site = await prisma.site.update({
            where: { id: input.siteId },
            data: { imageUrl },
          })

          console.log(`✅ [SERVER] Site image saved for ${input.siteId}`)
          const isSupabaseUrl = imageUrl.startsWith('http')
          console.log(`   imageUrl type: ${isSupabaseUrl ? '✅ Supabase URL (persistent)' : '⚠️ base64 (fallback - browser-specific)'}`)
          console.log(`   imageUrl length: ${imageUrl.length}`)
          if (isSupabaseUrl) {
            console.log(`   Supabase URL: ${imageUrl}`)
          } else {
            console.log(`   imageUrl preview: ${imageUrl.substring(0, 100)}...`)
            console.warn(`   ⚠️ WARNING: Image saved as base64, not Supabase URL. This means:`)
            console.warn(`      - Supabase Storage is not configured or upload failed`)
            console.warn(`      - Image will be stored in database (not ideal for large images)`)
            console.warn(`      - Check SUPABASE_SERVICE_ROLE_KEY environment variable`)
          }

          // Verify it was actually saved by reading it back
          const verify = await prisma.site.findUnique({
            where: { id: input.siteId },
            select: { imageUrl: true },
          })
          if (verify?.imageUrl) {
            const verifyIsSupabase = verify.imageUrl.startsWith('http')
            console.log(`✅ [SERVER] Verified: Image URL saved to database for ${input.siteId}`)
            console.log(`   Saved as: ${verifyIsSupabase ? '✅ Supabase URL' : '⚠️ base64'}`)
            console.log(`   Length: ${verify.imageUrl.length}`)
            if (verifyIsSupabase) {
              console.log(`   URL: ${verify.imageUrl}`)
            }
          } else {
            console.error(`❌ [SERVER] VERIFICATION FAILED: Image URL not found in database after save for ${input.siteId}`)
          }

          return { success: true, siteId: input.siteId, imageUrl }
        } catch (error: any) {
          lastError = error
          console.error(`Error saving site image to database (attempt ${attempt + 1}):`, error)

          // Handle missing column error
          if (error.code === 'P2022' && error.meta?.column === 'Site.imageUrl') {
            console.warn('imageUrl column missing, attempting to add it...')
            try {
              await prisma.$executeRaw`ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
              // Retry the update (will use base64 fallback if Supabase not configured)
              const fallbackUrl = input.imageData
              const site = await prisma.site.update({
                where: { id: input.siteId },
                data: { imageUrl: fallbackUrl },
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
      console.log(`🔍 [SERVER] getSiteImage called for siteId: ${input.siteId} at ${new Date().toISOString()}`)
      const MAX_RETRIES = 3

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`  [SERVER] Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt))
          }

          // First check if site exists
          const siteExists = await prisma.site.findUnique({
            where: { id: input.siteId },
            select: { id: true, imageUrl: true },
          })

          if (!siteExists) {
            // Log available sites for debugging (only first 10 to avoid spam)
            const availableSites = await prisma.site.findMany({
              select: { id: true },
              take: 10
            }).catch(() => [])
            console.log(`⚠️ [SERVER] Site ${input.siteId} does not exist in database. Available sites:`,
              availableSites.map(s => s.id)
            )
            return null
          }

          if (siteExists.imageUrl && siteExists.imageUrl.trim().length > 0) {
            console.log(`✅ [SERVER] Found image in database for ${input.siteId}, length: ${siteExists.imageUrl.length}`)
            return siteExists.imageUrl
          } else {
            console.log(`ℹ️ [SERVER] Site ${input.siteId} exists but imageUrl is ${siteExists.imageUrl === null ? 'null' : 'empty'}`)
            return null
          }
        } catch (error: any) {
          console.error(`❌ [SERVER] Error getting site image from database (attempt ${attempt + 1}):`, {
            message: error.message,
            code: error.code,
            siteId: input.siteId,
            stack: error.stack?.substring(0, 200),
          })

          // Handle missing column error
          if (error.code === 'P2022' && error.meta?.column === 'Site.imageUrl') {
            console.warn(`⚠️ [SERVER] imageUrl column missing for ${input.siteId}`)
            return null
          }

          // Handle site not found
          if (error.code === 'P2025' || error.message?.includes('Record to find does not exist')) {
            console.log(`⚠️ [SERVER] Site ${input.siteId} not found in database`)
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

  // Save library object image (uploads to Supabase Storage, stores URL in database)
  saveLibraryImage: publicProcedure
    .input(z.object({
      libraryId: z.string(),
      imageData: z.string(), // Base64 encoded image (will be uploaded to Supabase)
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

          console.log(`💾 [SERVER] Saving library image for ${input.libraryId}, size: ${input.imageData.length} chars`)

          // Try to upload to Supabase Storage
          let imageUrl = input.imageData // Fallback to base64

          if (supabaseAdmin && input.imageData.startsWith('data:')) {
            try {
              // Convert base64 to Buffer
              const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64Data, 'base64')

              // Generate filename (sanitize libraryId for filename)
              const sanitizedId = input.libraryId.replace(/[^a-zA-Z0-9-_]/g, '_')
              const fileName = `${sanitizedId}.jpg`

              // Upload to Supabase Storage
              const { data, error } = await supabaseAdmin.storage
                .from(STORAGE_BUCKETS.LIBRARY_IMAGES)
                .upload(fileName, buffer, {
                  contentType: 'image/jpeg', // Always JPEG for optimization
                  upsert: true,
                })

              if (!error && data) {
                // Get public URL
                const { data: urlData } = supabaseAdmin.storage
                  .from(STORAGE_BUCKETS.LIBRARY_IMAGES)
                  .getPublicUrl(fileName)

                imageUrl = urlData.publicUrl
                console.log(`✅ [SERVER] Uploaded library image to Supabase Storage: ${imageUrl}`)
              } else {
                console.warn(`⚠️ [SERVER] Supabase upload failed, using base64 fallback:`, error?.message)
              }
            } catch (uploadError: any) {
              console.warn(`⚠️ [SERVER] Supabase upload error, using base64 fallback:`, uploadError.message)
            }
          }

          // Upsert library image (create or update) - now using imageUrl instead of imageData
          const libraryImage = await prisma.libraryImage.upsert({
            where: { libraryId: input.libraryId },
            update: {
              imageUrl,
              mimeType: input.mimeType,
              updatedAt: new Date(),
            },
            create: {
              libraryId: input.libraryId,
              imageUrl,
              mimeType: input.mimeType,
            },
          })

          console.log(`✅ [SERVER] Library image saved for ${input.libraryId}`)
          return { success: true, libraryId: input.libraryId, imageUrl }
        } catch (error: any) {
          lastError = error
          console.error(`Error saving library image to database (attempt ${attempt + 1}):`, error)

          // Handle missing column error (imageUrl column doesn't exist)
          if (error.code === 'P2022' && error.meta?.column === 'LibraryImage.imageUrl') {
            console.warn('⚠️ [SERVER] imageUrl column missing in LibraryImage table, attempting to add it...')
            try {
              // First check if table exists, if not create it
              await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS "LibraryImage" (
                  "id" TEXT NOT NULL,
                  "libraryId" TEXT NOT NULL,
                  "imageUrl" TEXT,
                  "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
                  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  "updatedAt" TIMESTAMP(3) NOT NULL,
                  CONSTRAINT "LibraryImage_pkey" PRIMARY KEY ("id")
                )
              `
              // Add the imageUrl column if it doesn't exist
              await prisma.$executeRaw`ALTER TABLE "LibraryImage" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
              // Create indexes if they don't exist
              await prisma.$executeRaw`
                CREATE UNIQUE INDEX IF NOT EXISTS "LibraryImage_libraryId_key" ON "LibraryImage"("libraryId")
              `
              await prisma.$executeRaw`
                CREATE INDEX IF NOT EXISTS "LibraryImage_libraryId_idx" ON "LibraryImage"("libraryId")
              `
              console.log('✅ [SERVER] Added imageUrl column to LibraryImage table')
              // Retry the upsert
              if (attempt < MAX_RETRIES - 1) continue
            } catch (addColumnError: any) {
              console.error('❌ [SERVER] Failed to add imageUrl column to LibraryImage table:', addColumnError)
              if (attempt < MAX_RETRIES - 1) continue
              throw new Error('Database schema update required. Please run migrations.')
            }
          }

          // Handle table doesn't exist error
          if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LibraryImage')) {
            console.warn('⚠️ [SERVER] LibraryImage table missing, attempting to create it...')
            try {
              await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS "LibraryImage" (
                  "id" TEXT NOT NULL,
                  "libraryId" TEXT NOT NULL,
                  "imageUrl" TEXT,
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
              console.log('✅ [SERVER] Created LibraryImage table')
              // Retry the upsert
              if (attempt < MAX_RETRIES - 1) continue
            } catch (createTableError) {
              console.error('❌ [SERVER] Failed to create LibraryImage table:', createTableError)
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
            select: { imageUrl: true, mimeType: true },
          })

          return libraryImage?.imageUrl || null
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

