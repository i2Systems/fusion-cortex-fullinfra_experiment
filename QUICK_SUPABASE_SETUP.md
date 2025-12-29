# Quick Supabase Storage Setup

I've created automated scripts to help you set up Supabase Storage. Follow these steps:

## Step 1: Get Your Supabase Credentials

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
   - You'll see:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon public** key (starts with `eyJ...`)
     - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

## Step 2: Add Credentials to .env File

Add these to your `.env` file in the project root:

```env
# Supabase Storage (for image hosting)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Vercel deployment**, also add these in:
- Vercel Dashboard → Your Project → Settings → Environment Variables

## Step 3: Run the Setup Script

Once credentials are in your `.env` file, run:

```bash
npm run setup:supabase
```

This will automatically:
- ✅ Create `site-images` bucket (public)
- ✅ Create `library-images` bucket (public)
- ✅ Verify the setup

## Step 4: Verify in Dashboard (Optional)

1. Go to **Storage** in your Supabase dashboard
2. You should see two buckets:
   - `site-images` (public)
   - `library-images` (public)

If they're not marked as "public", click on each bucket → Settings → Toggle "Public bucket" to ON.

## Step 5: Test It!

1. Upload an image in your app
2. Check the Supabase Storage dashboard - you should see the file
3. The image should display from a Supabase URL (not base64)

## Troubleshooting

**Script says "Missing credentials"?**
- Make sure `.env` file exists in project root
- Check that variable names match exactly (case-sensitive)
- Restart your terminal/IDE after adding to `.env`

**Buckets not created?**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
- Verify project is fully set up in Supabase dashboard
- Check script output for specific error messages

**Images still using base64?**
- Verify buckets are marked as "public" in Supabase dashboard
- Check server logs for upload errors
- Make sure environment variables are set in Vercel (if deployed)

## Quick Check

Run this to verify your credentials are set:

```bash
npx tsx scripts/check-supabase-env.ts
```

