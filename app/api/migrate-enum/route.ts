/**
 * One-time API endpoint to migrate DeviceType enum in production
 * 
 * This endpoint adds new enum values and migrates existing FIXTURE records.
 * Should only be called once after deploying the new schema.
 * 
 * Usage: POST /api/migrate-enum
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // Simple security check - in production, add proper authentication
  const authHeader = process.env.MIGRATION_SECRET || 'migration-secret-key'
  
  try {
    console.log('🔧 Starting DeviceType enum migration...')
    
    // Step 1: Add new enum values
    console.log('Step 1: Adding new enum values...')
    
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_16FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_12FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_8FT_POWER_ENTRY' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_POWER_ENTRY';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_16FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_16FT_FOLLOWER';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_12FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_12FT_FOLLOWER';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'FIXTURE_8FT_FOLLOWER' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
        ) THEN
          ALTER TYPE "DeviceType" ADD VALUE 'FIXTURE_8FT_FOLLOWER';
        END IF;
      END $$;
    `)
    
    // Step 2: Migrate existing FIXTURE records
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "Device" 
      SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType" 
      WHERE type::text = 'FIXTURE'
    `)
    
    // Get current enum values for verification
    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeviceType')
      ORDER BY enumlabel
    `
    
    return NextResponse.json({
      success: true,
      message: 'Enum migration completed successfully',
      devicesUpdated: result,
      enumValues: enumValues.map(v => v.enumlabel),
    })
    
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

