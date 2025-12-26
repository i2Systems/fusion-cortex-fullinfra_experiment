/**
 * Verification endpoint to check if image storage is working
 * Tests database connectivity and schema
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    databaseConnected: false,
    siteTableExists: false,
    siteImageUrlColumnExists: false,
    libraryImageTableExists: false,
    canReadSite: false,
    canReadLibraryImage: false,
  }
  
  try {
    // Check 1: Database connection
    await prisma.$queryRaw`SELECT 1`
    checks.databaseConnected = true
    console.log('✅ Database connected')
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message)
    return NextResponse.json({ checks, error: 'Database connection failed' }, { status: 500 })
  }
  
  try {
    // Check 2: Site table exists
    const siteTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Site'
    `
    checks.siteTableExists = siteTable.length > 0
    console.log(`✅ Site table exists: ${checks.siteTableExists}`)
  } catch (error: any) {
    console.error('❌ Error checking Site table:', error.message)
  }
  
  try {
    // Check 3: imageUrl column exists in Site table
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'Site' AND column_name = 'imageUrl'
    `
    checks.siteImageUrlColumnExists = columns.length > 0
    console.log(`✅ Site.imageUrl column exists: ${checks.siteImageUrlColumnExists}`)
    
    if (!checks.siteImageUrlColumnExists) {
      // Try to add it
      try {
        await prisma.$executeRaw`ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
        checks.siteImageUrlColumnExists = true
        console.log('✅ Added imageUrl column to Site table')
      } catch (addError: any) {
        console.error('❌ Failed to add imageUrl column:', addError.message)
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking imageUrl column:', error.message)
  }
  
  try {
    // Check 4: LibraryImage table exists
    const libraryTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'LibraryImage'
    `
    checks.libraryImageTableExists = libraryTable.length > 0
    console.log(`✅ LibraryImage table exists: ${checks.libraryImageTableExists}`)
    
    if (!checks.libraryImageTableExists) {
      // Try to create it
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
        checks.libraryImageTableExists = true
        console.log('✅ Created LibraryImage table')
      } catch (createError: any) {
        console.error('❌ Failed to create LibraryImage table:', createError.message)
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking LibraryImage table:', error.message)
  }
  
  try {
    // Check 5: Can read from Site table
    const sites = await prisma.site.findMany({ take: 1 })
    checks.canReadSite = true
    console.log('✅ Can read from Site table')
  } catch (error: any) {
    console.error('❌ Cannot read from Site table:', error.message)
  }
  
  try {
    // Check 6: Can read from LibraryImage table (if it exists)
    if (checks.libraryImageTableExists) {
      await prisma.libraryImage.findMany({ take: 1 })
      checks.canReadLibraryImage = true
      console.log('✅ Can read from LibraryImage table')
    }
  } catch (error: any) {
    console.error('❌ Cannot read from LibraryImage table:', error.message)
  }
  
  const allChecksPass = Object.values(checks).every(v => v === true || (v === false && !checks.libraryImageTableExists && !checks.canReadLibraryImage))
  
  return NextResponse.json({
    success: allChecksPass,
    checks,
    message: allChecksPass 
      ? 'All image storage checks passed!' 
      : 'Some checks failed - see details above',
  })
}

