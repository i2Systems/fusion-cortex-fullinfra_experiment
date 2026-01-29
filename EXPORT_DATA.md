# Exporting Zones, Devices, People, and Groups

> **AI Note**: Instructions for exporting current state as seed data. See [SEEDING.md](./SEEDING.md) for seeding overview.

**Guide for exporting and persisting zones, devices, people, and groups across deployments.**

## Problem
When you push code to GitHub and deploy to Vercel, your zones and device positions are lost because they're stored in browser localStorage. People and groups live in the database but are not part of the export story.

## Solution
Export your current state and commit it as seed data. The export now includes **people and groups** (from the app stores) as well as zones and devices (from localStorage). The app will use this seed data on fresh deployments.

## Quick Workflow: Make Current State the Default

### Before Pushing (when you want to save your current state):

1. **Open your local app** in the browser with a **site selected** so people and groups are loaded (e.g., `http://localhost:3000`)
2. **Open the browser console** (F12 or Cmd+Option+I)
3. **Run this command:**
   ```javascript
   exportFusionData()
   ```
   
   This will:
   - Display the TypeScript code in the console
   - **Download files automatically:**
     - `seedZones.ts` - Zones
     - `seedDevices.ts` - Devices
     - `seedPeople.ts` - People (when loaded)
     - `seedGroups.ts` - Groups (when loaded)
     - `fusion-data-export-YYYY-MM-DD.json` - Backup JSON (includes all)

4. **Move the downloaded files:**
   ```bash
   mv ~/Downloads/seedZones.ts lib/seedZones.ts
   mv ~/Downloads/seedDevices.ts lib/seedDevices.ts
   mv ~/Downloads/seedPeople.ts lib/seedPeople.ts   # if present
   mv ~/Downloads/seedGroups.ts lib/seedGroups.ts   # if present
   ```

5. **Commit and push:**
   ```bash
   git add lib/seedZones.ts lib/seedDevices.ts lib/seedPeople.ts lib/seedGroups.ts
   git commit -m "Update seed data (zones, devices, people, groups)"
   git push origin main
   ```

That's it! Your current state (including people and groups) is now part of the export.

### Alternative: Using JSON Export

If you prefer to use the JSON file:

1. Export using `exportFusionData()` (downloads JSON with zones, devices, people, groups)
2. Run: `npx tsx lib/generateSeedFiles.ts <path-to-exported-json>`
3. This generates all seed files (zones, devices, people, groups) automatically
4. Commit and push as above

## How It Works

- **Zones and devices** are read from localStorage.
- **People and groups** are read from the app’s in-memory stores (they are synced from the API when you have a site selected). StateHydration exposes them on `window` so `exportFusionData()` can include them.
- The JSON and generated `.ts` files include all four so you can commit a full snapshot.

## Notes

- The seed files are committed to the repository, so they persist across deployments.
- You can update seed data anytime by exporting (with a site selected) and committing again.
- Loading seed people/groups into the database is a separate step (e.g. a seed script that reads `seedPeople.ts` / `seedGroups.ts`); the export gives you the data to commit and reuse.

