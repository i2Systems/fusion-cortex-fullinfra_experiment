# Supabase + Vercel Connection Setup

## ⚠️ Important: Use Connection Pooler for Vercel

When deploying to Vercel, you **MUST** use Supabase's connection pooler, not the direct connection.

## Why?

- Vercel functions are serverless and short-lived
- Direct connections (port 5432) don't work well with serverless
- Connection pooler (port 6543) manages connections efficiently

## How to Get the Correct Connection String

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **Settings** → **Database**

### Step 2: Get Connection Pooler String

1. Scroll to **"Connection string"** section
2. **IMPORTANT**: Check the box **"Use connection pooling"**
3. Select **"Transaction mode"** (recommended for serverless)
4. Copy the connection string

The connection string should look like:
```
postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Key differences from direct connection:**
- Port: `6543` (not `5432`)
- Host: `aws-0-[region].pooler.supabase.com` (not `db.[ref].supabase.co`)
- Username format: `postgres.[PROJECT_REF]` (not just `postgres`)

### Step 3: Update Vercel Environment Variable

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL`
3. Replace it with the **pooler connection string** (port 6543)
4. Save and redeploy

## Example

**❌ Wrong (Direct Connection - Won't work on Vercel):**
```
postgresql://postgres:password@db.pphgyszfvzlsjoaukqsn.supabase.co:5432/postgres
```

**✅ Correct (Connection Pooler - Works on Vercel):**
```
postgresql://postgres.pphgyszfvzlsjoaukqsn:RnFU9vnn2dPpQNWb@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note:** The code automatically adds `?pgbouncer=true` if it detects a pooler URL, but you can also add it manually to the connection string in Vercel.

## Local Development

For local development, you can use either:
- **Direct connection** (port 5432) - works fine locally
- **Connection pooler** (port 6543) - also works, but pooler is optional locally

## Troubleshooting

### "Can't reach database server" error

- ✅ Make sure you're using the **pooler connection** (port 6543)
- ✅ Check "Use connection pooling" is enabled in Supabase
- ✅ Verify the password is correct
- ✅ Make sure the region matches your project

### Connection timeout

- The pooler should handle this better than direct connection
- If issues persist, check Supabase dashboard for connection limits

## Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Vercel + Supabase Guide](https://vercel.com/guides/nextjs-prisma-postgres)
