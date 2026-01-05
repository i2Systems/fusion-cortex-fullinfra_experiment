# Deploy Location Table to Production

The `Location` table is missing in production, causing 500 errors when trying to list/create locations.

## Option 1: Run SQL Migration (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `prisma/migrations/20250105_add_location_table.sql`
4. Click **Run** to execute the migration

## Option 2: Use Prisma Migrate (if you have database access)

If you have direct database access, you can run:

```bash
npx prisma migrate deploy
```

This will apply all pending migrations.

## Option 3: Use Prisma DB Push (Development/Staging only)

⚠️ **Warning**: `db push` is not recommended for production as it can cause data loss.

```bash
npx prisma db push
```

## Verify the Table Exists

After running the migration, verify the table was created:

1. Go to Supabase Dashboard → **Table Editor**
2. You should see a `Location` table with these columns:
   - id (text, primary key)
   - name (text)
   - type (text)
   - imageUrl (text, nullable)
   - vectorDataUrl (text, nullable)
   - zoomBounds (jsonb, nullable)
   - parentId (text, nullable)
   - siteId (text)
   - createdAt (timestamp)
   - updatedAt (timestamp)

## Also Fix: Create map-data Bucket in Production

The bucket was created locally, but you need to create it in your **production Supabase instance**:

1. Go to your **production** Supabase project (the one used by Vercel)
2. Navigate to **Storage**
3. Create a bucket named `map-data`:
   - **Public bucket**: ✅ ON
   - **File size limit**: 50MB
   - **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `application/pdf`

Or run the setup script pointing to production:

```bash
# Make sure your .env has production Supabase credentials
npx tsx scripts/setup-supabase-storage.ts
```

