# Fix Vercel GitHub Integration

## Issue
GitHub pushes are not automatically triggering Vercel deployments.

## Solution

### Step 1: Verify GitHub Connection in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/msenkow-6995s-projects/fusion-cortex-v04)
2. Navigate to **Settings** → **Git**
3. Check if the repository is connected:
   - Should show: `i2Systems/fusion-cortex`
   - If not connected, click **"Connect Git Repository"**
   - Select the GitHub repository: `i2Systems/fusion-cortex`

### Step 2: Configure Production Branch

1. In **Settings** → **Git**:
   - **Production Branch**: Should be set to `main`
   - **Auto-deploy**: Should be **ON**

### Step 3: Verify GitHub App Permissions

1. Go to GitHub → Settings → Applications → Authorized GitHub Apps
2. Find **Vercel** in the list
3. Ensure it has access to the `i2Systems/fusion-cortex` repository
4. If not, re-authorize:
   - Go to Vercel Dashboard → Settings → Git
   - Click **"Disconnect"** then **"Connect Git Repository"** again
   - Grant permissions when prompted

### Step 4: Test the Connection

1. Make a small change (e.g., update README)
2. Commit and push:
   ```bash
   git commit --allow-empty -m "Test Vercel auto-deploy"
   git push origin main
   ```
3. Check Vercel Dashboard → Deployments
4. A new deployment should appear within 1-2 minutes

### Step 5: Manual Deployment (Current Solution)

If auto-deploy still doesn't work, you can deploy manually:

```bash
# Deploy to production
vercel --prod

# Or deploy and wait for completion
vercel --prod --wait
```

## Current Status

✅ **Project is linked**: `fusion-cortex-v04`  
✅ **Manual deployment works**: Use `vercel --prod`  
⚠️ **Auto-deploy**: Needs to be configured in Vercel Dashboard

## Quick Fix Command

If you need to force deploy right now:

```bash
vercel --prod --yes
```

This will deploy the current code to production immediately.

