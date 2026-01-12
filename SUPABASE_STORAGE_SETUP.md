# Supabase Storage Setup Guide

**Setup guide for Supabase Storage image hosting (free tier).**

This project uses Supabase Storage for image hosting (free tier). Images are optimized and stored as URLs in the database instead of base64 strings.

## Quick Setup (Automated)

### Step 1: Get Your Supabase Credentials

1. **Go to https://supabase.com** and sign in (or create an account)
2. **Create a new project** (or use existing):
   - Click "New Project"
   - Choose organization
   - Enter project name (e.g., "fusion-cortex")
   - Enter database password (save this!)
   - Choose region
   - Click "Create new project"
   - Wait 2-3 minutes for setup to complete

3. **Get your API keys**:
   - In your project dashboard, go to **Settings** → **API**
   - Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon public** key (starts with `eyJ...`)
     - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

### Step 2: Add Credentials to .env File

Add these to your `.env` file in the project root:

```env
# Supabase Storage (for image hosting)
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

**For Vercel deployment**, also add these in:
- Vercel Dashboard → Your Project → Settings → Environment Variables

### Step 3: Run the Setup Script

Once credentials are in your `.env` file, run:

```bash
npm run setup:supabase
```

This will automatically:
- ✅ Create `site-images` bucket (public)
- ✅ Create `library-images` bucket (public)
- ✅ Verify the setup

### Step 4: Verify Setup

1. Go to **Storage** in your Supabase dashboard
2. You should see two buckets:
   - `site-images` (public)
   - `library-images` (public)

If they're not marked as "public", click on each bucket → Settings → Toggle "Public bucket" to ON.

### Step 5: Run Database Migration

The schema uses `imageUrl` instead of `imageData`:

```bash
npx prisma db push
```

Or create a migration:
```bash
npx prisma migrate dev --name use_image_urls
```

## Manual Setup (Alternative)

If you prefer to create buckets manually:

1. Go to **Storage** in your Supabase dashboard
2. Create two public buckets:
   - **Bucket name**: `site-images` → Enable **Public bucket** → Create
   - **Bucket name**: `library-images` → Enable **Public bucket** → Create

## How It Works

1. **Image Upload**: When an image is uploaded:
   - Client compresses image (400px max, 0.6 quality, 200KB max)
   - Sends base64 to server
   - Server uploads to Supabase Storage
   - Server saves URL in database (or base64 if Supabase not configured)

2. **Image Retrieval**: 
   - Server returns URL from database
   - Frontend displays image from URL (or base64 fallback)
   - Images are served via Supabase CDN

3. **Fallback**: If Supabase is not configured, images are stored as base64 in the database (old behavior)

## Free Tier Limits

- **Storage**: 1GB free
- **Bandwidth**: 2GB/month free
- **Files**: Unlimited

For most use cases, this is sufficient. Images are optimized to ~50-150KB each.

## Troubleshooting

**Script says "Missing credentials"?**
- Make sure `.env` file exists in project root
- Check that variable names match exactly (case-sensitive)
- Restart your terminal/IDE after adding to `.env`

**Buckets not created?**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
- Verify project is fully set up in Supabase dashboard
- Check script output for specific error messages

**Images not uploading?**
- Check Supabase credentials in `.env`
- Verify buckets are created and public
- Check server logs for upload errors

**Images not displaying?**
- Verify bucket is set to **Public**
- Check that URLs are being saved to database
- Check browser console for CORS errors

**Still using base64?**
- Supabase not configured → using fallback
- Check environment variables are set correctly
- Check server logs for "Supabase upload failed" messages

## Quick Check

Run this to verify your credentials are set:

```bash
npx tsx scripts/check-supabase-env.ts
```

