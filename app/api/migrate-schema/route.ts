import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Migration endpoint to add missing columns to the database.
 * This handles schema changes that need to be applied to production.
 */
export async function POST() {
  try {
    console.log('Starting schema migration...');
    const changes: Record<string, boolean> = {};

    // Check if imageUrl column exists, if not add it
    const checkColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Site' AND column_name = 'imageUrl';
    `;

    if (checkColumn.length === 0) {
      console.log('Adding imageUrl column to Site table...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Site" 
        ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
      `);
      console.log('✅ Added imageUrl column to Site table.');
      changes.imageUrlAdded = true;
    } else {
      console.log('imageUrl column already exists in Site table.');
      changes.imageUrlAdded = false;
    }

    // Check if Location table exists, if not create it
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Location'
      );
    `;

    if (!tableExists[0]?.exists) {
      console.log('Creating Location table...');
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
      `;
      
      // Create indexes
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_siteId_idx" ON "Location"("siteId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Location_parentId_idx" ON "Location"("parentId");`;
      
      // Add foreign key constraints
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_parentId_fkey" 
        FOREIGN KEY ("parentId") 
        REFERENCES "Location"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_siteId_fkey" 
        FOREIGN KEY ("siteId") 
        REFERENCES "Site"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `;
      
      console.log('✅ Created Location table.');
      changes.locationTableCreated = true;
    } else {
      console.log('Location table already exists.');
      changes.locationTableCreated = false;
    }

    console.log('✅ Schema migration completed successfully.');
    return NextResponse.json({ 
      success: true, 
      message: 'Schema migration completed successfully.',
      changes
    });
  } catch (error: any) {
    console.error('❌ Error during schema migration:', error);
    // If table already exists, that's okay
    if (error.message?.includes('already exists') || error.code === '42P07') {
      return NextResponse.json({ 
        success: true, 
        message: 'Schema migration completed (some items may already exist).',
        changes: {}
      });
    }
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown migration error' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Allow GET requests for easy testing in browser
export async function GET() {
  return POST();
}

