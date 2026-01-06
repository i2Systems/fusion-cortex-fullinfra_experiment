-- Create Location table for map/floor plan management
CREATE TABLE IF NOT EXISTS "Location" (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "Location_siteId_idx" ON "Location"("siteId");
CREATE INDEX IF NOT EXISTS "Location_parentId_idx" ON "Location"("parentId");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_parentId_fkey'
    ) THEN
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_parentId_fkey" 
        FOREIGN KEY ("parentId") 
        REFERENCES "Location"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Location_siteId_fkey'
    ) THEN
        ALTER TABLE "Location" 
        ADD CONSTRAINT "Location_siteId_fkey" 
        FOREIGN KEY ("siteId") 
        REFERENCES "Site"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

