# Supabase Storage Bucket Setup

## Quick Fix: Create Missing Buckets

The application requires three Supabase storage buckets:

1. **site-images** - For site/store images
2. **library-images** - For library component images  
3. **map-data** - For floor plan/map images (currently missing)

## Option 1: Run Setup Script (Recommended)

If you have access to run scripts locally:

```bash
npx tsx scripts/setup-supabase-storage.ts
```

This will automatically create all three buckets.

## Option 2: Manual Setup via Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** for each bucket:

### Create `site-images` bucket:
- **Name**: `site-images`
- **Public bucket**: ✅ **ON** (important!)
- **File size limit**: 2MB
- **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`
- Click **"Create bucket"**

### Create `library-images` bucket:
- **Name**: `library-images`
- **Public bucket**: ✅ **ON** (important!)
- **File size limit**: 2MB
- **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`
- Click **"Create bucket"**

### Create `map-data` bucket:
- **Name**: `map-data`
- **Public bucket**: ✅ **ON** (important!)
- **File size limit**: 50MB (for large floor plans)
- **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `application/pdf`
- Click **"Create bucket"**

## Verify Buckets Are Public

After creating each bucket:

1. Click on the bucket name
2. Go to **Settings** tab
3. Ensure **"Public bucket"** toggle is **ON**
4. If not, toggle it **ON** and save

## Test Upload

After creating the buckets, try uploading a map image again. The error should be resolved.

## Troubleshooting

**"Bucket not found" error persists:**
- Verify bucket names match exactly (case-sensitive): `site-images`, `library-images`, `map-data`
- Check that buckets are marked as **Public**
- Verify Supabase credentials are set in Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Location list returns 500 error:**
- This may indicate the `Location` table doesn't exist in the database
- Run database migration: `npx prisma db push` or `npx prisma migrate deploy`

