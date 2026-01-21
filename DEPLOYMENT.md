# Deployment Guide

This guide covers deploying Fusion/Cortex to Vercel via GitHub.

---

## Table of Contents

1. [Quick Deploy](#-quick-deploy)
2. [Continuous Deployment](#-continuous-deployment)
3. [Database Migrations](#-database-migrations)
4. [Environment Variables](#-environment-variables)
5. [Deployment Checklist](#-deployment-checklist)
6. [Production Database Setup](#-production-database-setup)
7. [Troubleshooting](#-troubleshooting)
8. [Monitoring](#-monitoring)
9. [Rollback](#-rollback)

---

## 🚀 Quick Deploy

### Prerequisites

1. **GitHub Repository** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Database** - PostgreSQL database (Supabase recommended)
4. **Supabase Account** - For image storage (optional but recommended)

### Step 1: Connect GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### Step 2: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

#### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=https://your-app.vercel.app

# Supabase (for image storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-here>
```

#### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Step 3: Database Setup

1. **Create your database** (Supabase recommended):
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your connection string from Settings → Database

2. **Run migrations**:
   ```bash
   # Locally, create migrations
   npx prisma migrate dev --name init
   
   # In production, apply migrations
   npx prisma migrate deploy
   ```

3. **Set up Supabase Storage** (for image hosting):
   ```bash
   # Run the setup script locally with your Supabase credentials
   npm run setup:supabase
   ```

### Step 4: Deploy

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Vercel will automatically**:
   - Install dependencies
   - Generate Prisma Client
   - Build the application
   - Deploy to production

3. **Monitor deployment** in Vercel Dashboard

### Step 5: Post-Deployment

1. **Run database migrations** (if needed):
   - Use Vercel CLI: `vercel env pull` to get production env vars
   - Run: `npx prisma migrate deploy`

2. **Verify Supabase buckets**:
   - Check that `site-images`, `library-images`, and `map-data` buckets exist
   - Ensure they're marked as **Public**

3. **Test the application**:
   - Visit your Vercel URL
   - Test key features (map upload, device lookup, etc.)

---

## 🔄 Continuous Deployment

### Automatic Deployments

- **Production**: Deploys automatically on push to `main` branch
- **Preview**: Deploys automatically on pull requests

### Manual Deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🗄️ Database Migrations

### Development

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy
```

### Production

Migrations should be run **before** deploying new code that requires schema changes:

1. **Create migration locally**:
   ```bash
   npx prisma migrate dev --name add_new_feature
   ```

2. **Test migration**:
   ```bash
   # Use production DATABASE_URL (be careful!)
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

3. **Commit and push**:
   ```bash
   git add prisma/migrations
   git commit -m "Add database migration"
   git push
   ```

4. **Deploy code** (Vercel will auto-deploy)

### Migration Best Practices

- ✅ Always test migrations locally first
- ✅ Use descriptive migration names
- ✅ Review generated SQL before committing
- ✅ Keep migrations small and focused
- ✅ Never modify existing migrations (create new ones)

---

## 🔐 Environment Variables

### Local Development

Create `.env` file (see `env.example` for template):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/fusion_cortex"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

**Note**: Copy `env.example` to `.env` and fill in your values:
```bash
cp env.example .env
# Edit .env with your actual values
```

### Production (Vercel)

Set in Vercel Dashboard → Settings → Environment Variables

**Important**: 
- Use different `NEXTAUTH_SECRET` for production
- Set `NEXTAUTH_URL` to your production domain
- Never commit `.env` files to Git

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] **Code Review**
  - [ ] All changes reviewed and approved
  - [ ] No console.logs or debug code
  - [ ] TypeScript compiles without errors (`npm run typecheck`)

- [ ] **Database**
  - [ ] Schema changes reviewed
  - [ ] Migrations created and tested locally
  - [ ] Migration files committed to Git
  - [ ] Backup production database (if applicable)

- [ ] **Environment Variables**
  - [ ] All required env vars documented
  - [ ] Production env vars set in Vercel
  - [ ] Secrets are secure (not in code)
  - [ ] `NEXTAUTH_SECRET` is unique for production
  - [ ] `NEXTAUTH_URL` matches production domain

- [ ] **Dependencies**
  - [ ] All dependencies up to date
  - [ ] Security vulnerabilities addressed
  - [ ] `package-lock.json` committed

- [ ] **Build**
  - [ ] Build succeeds locally (`npm run build`)
  - [ ] Prisma Client generates successfully
  - [ ] No build warnings or errors

### Deployment

- [ ] **GitHub**
  - [ ] Code pushed to `main` branch
  - [ ] CI checks passing (lint, typecheck, build)
  - [ ] No merge conflicts

- [ ] **Vercel**
  - [ ] Deployment triggered automatically
  - [ ] Build logs reviewed (no errors)
  - [ ] Deployment successful

- [ ] **Database**
  - [ ] Migrations applied (`npx prisma migrate deploy`)
  - [ ] Database schema matches Prisma schema
  - [ ] No migration errors

- [ ] **Supabase** (if using)
  - [ ] Storage buckets exist
  - [ ] Buckets are public
  - [ ] Credentials are correct

### Post-Deployment

- [ ] **Smoke Tests**
  - [ ] Application loads
  - [ ] Authentication works (if enabled)
  - [ ] Database queries succeed
  - [ ] Image uploads work (if applicable)
  - [ ] Key features functional

- [ ] **Monitoring**
  - [ ] Check Vercel logs for errors
  - [ ] Monitor database connections
  - [ ] Check function execution times
  - [ ] Verify no 500 errors

- [ ] **Documentation**
  - [ ] Update changelog (if applicable)
  - [ ] Document any breaking changes

---

## 🗃️ Production Database Setup

### Quick Setup (After First Deployment)

After setting `DATABASE_URL` in Vercel, you need to sync the database schema.

#### Option 1: Push Schema (Recommended for Fresh Database)

```bash
# Get your production DATABASE_URL from Vercel
# Vercel Dashboard → Your Project → Settings → Environment Variables

# Then run locally:
DATABASE_URL="your-production-database-url" npx prisma db push
```

#### Option 2: Use Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.production

# Push schema to production database
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) npx prisma db push
```

### Important Notes

- **Never use `--force-reset` in production** - it will delete all data
- Use `prisma db push` for development/testing
- Use `prisma migrate deploy` for production with migrations
- Make sure `DATABASE_URL` is correctly set in Vercel

### Verify Schema

After pushing, verify the schema is correct:

```bash
DATABASE_URL="your-production-url" npx prisma db pull --print
```

---

## 🐛 Troubleshooting

### Build Fails: Prisma Client Not Generated

**Solution**: The build command includes `prisma generate`, but if it fails:
1. Check `DATABASE_URL` is set in Vercel
2. Verify Prisma schema is valid: `npx prisma validate`
3. Check build logs in Vercel Dashboard

### Database Connection Errors

**Solution**:
1. Verify `DATABASE_URL` is correct in Vercel
2. Check database allows connections from Vercel IPs
3. **For Supabase: Use Connection Pooler (REQUIRED for Vercel)**
   - Go to Supabase Dashboard → Settings → Database
   - Under "Connection string", select **"Use connection pooling"**
   - Copy the connection string (uses port 6543, not 5432)
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - **DO NOT use the direct connection** (port 5432) for Vercel deployments

### Migration Errors in Production

**Solution**:
1. Run migrations manually: `npx prisma migrate deploy`
2. Check migration files are committed to Git
3. Verify database user has migration permissions

### Image Upload Fails

**Solution**:
1. Verify Supabase credentials in Vercel
2. Check buckets exist: `npm run setup:supabase`
3. Ensure buckets are marked as **Public**

### GitHub Auto-Deploy Not Working

If GitHub pushes are not automatically triggering Vercel deployments:

1. **Verify GitHub Connection in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Git
   - Check if the repository is connected
   - If not, click **"Connect Git Repository"**

2. **Configure Production Branch**:
   - **Production Branch**: Should be set to `main`
   - **Auto-deploy**: Should be **ON**

3. **Verify GitHub App Permissions**:
   - Go to GitHub → Settings → Applications → Authorized GitHub Apps
   - Find **Vercel** in the list
   - Ensure it has access to your repository
   - If not, re-authorize via Vercel Dashboard

4. **Test the Connection**:
   ```bash
   git commit --allow-empty -m "Test Vercel auto-deploy"
   git push origin main
   ```
   A new deployment should appear within 1-2 minutes.

5. **Manual Deployment** (if auto-deploy still doesn't work):
   ```bash
   vercel --prod --yes
   ```

---

## 📊 Monitoring

### Vercel Analytics

- View deployment logs in Vercel Dashboard
- Monitor function execution times
- Check error rates

### Database Monitoring

- Use Supabase Dashboard for database metrics
- Monitor connection pool usage
- Check query performance

---

## 🔄 Rollback

If a deployment fails:

1. **Vercel Rollback**:
   - Go to Vercel Dashboard → Deployments
   - Click "..." on previous successful deployment
   - Select "Promote to Production"

2. **Database Rollback** (if needed):
   - If migration caused issues, manually revert SQL
   - Or restore from backup

3. **Investigation**:
   - Review error logs
   - Identify root cause
   - Fix issues
   - Re-deploy when ready

---

## Quick Commands

```bash
# Type check
npm run typecheck

# Build locally
npm run build

# Run migrations
npm run db:migrate:deploy

# Test database connection
npm run db:test

# Setup Supabase
npm run setup:supabase

# Manual deploy
vercel --prod
```

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
