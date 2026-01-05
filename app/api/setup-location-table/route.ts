/**
 * Setup Location Table API
 * 
 * One-time endpoint to create the Location table in production.
 * Call this endpoint once to set up the table.
 * 
 * GET /api/setup-location-table
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🚀 Setting up Location table...')

    // Check if table already exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Location'
      );
    `

    if (tableExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: 'Location table already exists',
        action: 'none',
      })
    }

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "Location" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "imageUrl" TEXT,
        "vectorDataUrl" TEXT,
        "zoomBounds" JSONB,
        "parentId" TEXT,
        "siteId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
      );
    `

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_siteId_idx" ON "Location"("siteId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_parentId_idx" ON "Location"("parentId");`

    // Add foreign key constraints
    const parentConstraintExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_parentId_fkey'
      );
    `
    
    if (!parentConstraintExists[0]?.exists) {
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_parentId_fkey" 
        FOREIGN KEY ("parentId") 
        REFERENCES "Location"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `
    }

    const siteConstraintExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_siteId_fkey'
      );
    `
    
    if (!siteConstraintExists[0]?.exists) {
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_siteId_fkey" 
        FOREIGN KEY ("siteId") 
        REFERENCES "Site"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Location table created successfully',
      action: 'created',
    })
  } catch (error: any) {
    console.error('Error setting up Location table:', error)
    
    // If table already exists, that's okay
    if (error.message?.includes('already exists') || error.code === '42P07') {
      return NextResponse.json({
        success: true,
        message: 'Location table already exists',
        action: 'none',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create Location table',
      },
      { status: 500 }
    )
  }
}

