# AI Assistant Notes

This file contains helpful context for AI assistants working on this codebase.

## Quick Context

**Project**: Fusion/Cortex - Commissioning & Configuration UI for retail lighting
**Purpose**: Setup, mapping, and rules platform (NOT a dashboard or analytics tool)
**Tech**: Next.js 14 App Router, React, tRPC, Prisma, PostgreSQL, Tailwind
**Architecture**: Multi-store aware with store-scoped data isolation

## Key Principles

1. **Always use design tokens** - Never hard-code colors/spacing. Use `var(--color-*)`, `var(--space-*)`, etc.
2. **Type safety first** - Use tRPC for all API calls, Zod for validation, TypeScript strict mode
3. **Server Components by default** - Only use `'use client'` when needed (interactivity, hooks, browser APIs)
4. **Plain language** - No jargon, simple UX (per brief requirements)
5. **Store-aware** - All data contexts are store-scoped using localStorage keys with store ID prefix

## Multi-Store Architecture

The app supports multiple stores with isolated data:

- **StoreContext**: Manages active store selection (`activeStoreId`, `stores`, `setActiveStore`)
- **Store-Scoped Storage**: All data uses keys like `fusion_devices_store_{storeId}`
- **Auto-Reload**: Contexts (Device, Zone, Rule) automatically reload when `activeStoreId` changes
- **Dashboard**: Shows overview of all stores, detailed panel for selected store
- **Store Switching**: Dropdown in PageTitle component

**Storage Key Format:**
- `fusion_devices_store_{storeId}`
- `fusion_zones_store_{storeId}`
- `fusion_rules_store_{storeId}`
- `fusion_map-image-url_store_{storeId}`
- `fusion_bacnet_mappings_store_{storeId}`

## Common Patterns

### Adding a New Section

```typescript
// 1. Create page
// app/(main)/newsection/page.tsx
export default function NewSectionPage() {
  return <div>...</div>
}

// 2. Add to nav
// components/layout/MainNav.tsx
const navItems = [
  // ... existing items
  { href: '/newsection', label: 'New Section', icon: IconName },
]

// 3. Create router (if needed)
// server/trpc/routers/newsection.ts
export const newsectionRouter = router({
  list: publicProcedure.query(async () => { ... }),
})

// 4. Add to app router
// server/trpc/routers/_app.ts
export const appRouter = router({
  // ... existing routers
  newsection: newsectionRouter,
})
```

### Making a Component Store-Aware

```typescript
import { useStore } from '@/lib/StoreContext'

export function MyComponent() {
  const { activeStoreId } = useStore()
  
  // Use store-scoped localStorage key
  const storageKey = `fusion_myData_store_${activeStoreId}`
  
  // Reload when store changes
  useEffect(() => {
    // Load data for activeStoreId
  }, [activeStoreId])
}
```

### Using tRPC in Components

```typescript
'use client'
import { trpc } from '@/lib/trpc/client'

export function MyComponent() {
  const { data, isLoading } = trpc.device.search.useQuery({ query: '765' })
  const createMutation = trpc.zone.create.useMutation()
  
  // ...
}
```

### Styling Components

```typescript
// ✅ Good - uses tokens
<div className="bg-[var(--color-surface)] p-[var(--space-6)] rounded-[var(--radius-lg)]">

// ❌ Bad - hard-coded
<div className="bg-[#111322] p-6 rounded-lg">
```

### Layout Pattern

```typescript
// Main content area pattern (used across all pages)
<div className="flex-1 flex min-h-0 gap-4 px-[20px] pb-14">
  {/* Left: Main content */}
  <div className="flex-1 min-w-0 flex flex-col">
    {/* Content here */}
  </div>
  
  {/* Right: Panel (always visible) */}
  <div className="flex-shrink-0">
    <SomePanel />
  </div>
</div>
```

## File Locations

- **Pages**: `app/(main)/[section]/page.tsx`
- **Layout Components**: `components/layout/`
- **Feature Components**: `components/[feature]/`
- **Context Providers**: `lib/[Feature]Context.tsx`
- **tRPC Routers**: `server/trpc/routers/[feature].ts`
- **Database Schema**: `prisma/schema.prisma`
- **Design Tokens**: `app/globals.css` (look for `:root`)

## Design Token Reference

**Colors:**
- `--color-primary`: #4c7dff (main brand color)
- `--color-surface`: #111322 (card/panel backgrounds)
- `--color-text`: #f9fafb (primary text)
- `--color-text-muted`: #9ca3af (secondary text)
- `--color-success`: #22c55e
- `--color-danger`: #f97373
- `--color-warning`: #facc15

**Spacing:** `--space-1` through `--space-20` (4px base unit)

**Radius:** `--radius-xs` through `--radius-2xl`

**Shadows:** `--shadow-soft`, `--shadow-md`, `--shadow-strong`

## Common Issues & Solutions

**"Cannot find module '@/...'"**
- Check `tsconfig.json` paths configuration
- Ensure file exists at that path
- Restart TypeScript server

**tRPC type errors**
- Run `npx prisma generate` after schema changes
- Restart dev server
- Check router is added to `_app.ts`

**Styling not applying**
- Ensure using design tokens, not hard-coded values
- Check Tailwind classes are valid
- Verify `globals.css` is imported in root layout

**Store data not switching**
- Ensure using `activeStoreId` from `StoreContext`
- Check localStorage keys include store ID
- Verify context reloads when `activeStoreId` changes

**Database connection errors**
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running
- Run `npx prisma db push` to sync schema

## Non-Goals (Don't Implement)

- Energy savings charts
- Heatmaps / occupancy maps
- Analytics dashboards
- Store manager operations dashboards
- Legacy energy/analytics features
- Device discovery/scanning (removed - use manual entry in lookup page)

## Testing Checklist

When adding features:
- [ ] Uses design tokens (no hard-coded values)
- [ ] Type-safe (tRPC + TypeScript)
- [ ] Server Component unless client features needed
- [ ] Added to navigation if it's a main section
- [ ] tRPC router created and added to app router (if needed)
- [ ] Database schema updated if needed
- [ ] Plain language, no jargon
- [ ] Store-aware if dealing with data (uses store-scoped keys)
- [ ] Reloads when active store changes

## Next Steps for Full Implementation

1. **Connect tRPC to Prisma**: Create `lib/prisma.ts`, use in routers
2. **Map canvas**: Blueprint upload, device rendering, interactions
3. **Zone management**: Create/edit zones, device assignment
4. **Rule engine**: Rule builder, evaluation, BMS integration
5. **Auth setup**: Configure Auth.js, protect routes
6. **Real-time updates**: WebSockets or polling for device status
7. **Image storage**: Connect IndexedDB for store images
