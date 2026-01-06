# Deployment Checklist

Use this checklist when deploying to production.

## Pre-Deployment

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

## Deployment

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

## Post-Deployment

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
  - [ ] Update deployment notes

## Rollback Plan

If deployment fails:

1. **Immediate Rollback**
   - [ ] Promote previous successful deployment in Vercel
   - [ ] Verify rollback successful

2. **Database Rollback** (if needed)
   - [ ] Revert migrations manually
   - [ ] Restore from backup if necessary

3. **Investigation**
   - [ ] Review error logs
   - [ ] Identify root cause
   - [ ] Fix issues
   - [ ] Re-deploy when ready

## Environment Variables Reference

### Required for Production

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.vercel.app
```

### Optional (but recommended)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

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
```

