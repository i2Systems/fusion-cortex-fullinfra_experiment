import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Migration endpoint to add missing columns to the database.
 * This handles schema changes that need to be applied to production.
 */
export async function POST() {
  try {
    console.log('Starting schema migration...');

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
    } else {
      console.log('imageUrl column already exists in Site table.');
    }

    console.log('✅ Schema migration completed successfully.');
    return NextResponse.json({ 
      success: true, 
      message: 'Schema migration completed successfully.',
      changes: {
        imageUrlAdded: checkColumn.length === 0
      }
    });
  } catch (error: any) {
    console.error('❌ Error during schema migration:', error);
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

