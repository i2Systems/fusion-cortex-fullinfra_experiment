-- Update DeviceType enum to include new fixture types
-- This script adds new enum values and updates existing FIXTURE records

BEGIN;

-- Step 1: Add new enum values (PostgreSQL allows adding values to enums)
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_16FT_POWER_ENTRY';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_12FT_POWER_ENTRY';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_8FT_POWER_ENTRY';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_16FT_FOLLOWER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_12FT_FOLLOWER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FIXTURE_8FT_FOLLOWER';

-- Step 2: Update all existing FIXTURE records to FIXTURE_16FT_POWER_ENTRY
-- Note: This will only work if FIXTURE_16FT_POWER_ENTRY was added successfully
UPDATE "Device" 
SET type = 'FIXTURE_16FT_POWER_ENTRY'::"DeviceType" 
WHERE type::text = 'FIXTURE';

COMMIT;
