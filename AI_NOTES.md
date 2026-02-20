# AI Assistant Notes

> **Purpose**: Quick reference guide for AI assistants working on this codebase.  
> **Last Updated**: Reflects current Zustand-based architecture (2025)  
> **See Also**: [README.md](./README.md) | [ARCHITECTURE.md](./ARCHITECTURE.md)

**Quick Context**: Fusion/Cortex - Commissioning & Configuration UI for retail lighting. Setup, mapping, and rules platform (NOT a dashboard or analytics tool). Next.js 14 App Router, React, tRPC, Prisma, PostgreSQL, Tailwind. Multi-site aware with site-scoped data isolation.

## 📋 Table of Contents

- [Critical Rules](#critical-rules)
- [State Management (Current)](#state-management-current)
- [Legacy Patterns (Deprecated)](#legacy-patterns-deprecated)
- [Common Patterns](#common-patterns)
- [File Structure](#file-structure)
- [Design Tokens](#design-tokens)
- [Common Issues](#common-issues--solutions)

## Critical Rules

1. **Design tokens only** - Never hard-code colors/spacing. Use `var(--color-*)`, `var(--space-*)` from `app/globals.css`
2. **Type safety** - tRPC for API calls, Zod for validation, TypeScript strict mode
3. **Server Components default** - Only use `'use client'` when needed (interactivity, hooks, browser APIs)
4. **Plain language** - No jargon, simple UX
5. **Site-aware** - All data contexts use site-scoped localStorage keys: `fusion_[data]_site_{siteId}`

## State Management (Current)

**✅ USE THESE** (Zustand stores + hooks):

- **Stores**: `lib/stores/*Store.ts` - Zustand stores for state
- **Sync Hooks**: `lib/stores/use*Sync.ts` - Bridge tRPC ↔ stores
- **Data Hooks**: `lib/hooks/use*.ts` - React hooks that use stores
  - `useDevices()` - Device data (from `lib/hooks/useDevices.ts`)
  - `useZones()` - Zone data (from `lib/hooks/useZones.ts`)
  - `useRules()` - Rule data (from `lib/hooks/useRules.ts`)
  - `useSite()` - Site data (from `lib/hooks/useSite.ts`)

**Example:**
```typescript
import { useDevices } from '@/lib/hooks/useDevices'
import { useDeviceStore } from '@/lib/stores/deviceStore'

// ✅ Preferred: Use data hook
const { devices, isLoading } = useDevices()

// ✅ Or: Direct store access (for selective subscriptions)
const devices = useDeviceStore(state => state.devices)
```

## Legacy Patterns (Deprecated)

**⚠️ DO NOT USE** (kept for backward compatibility only):

- `DeviceContext`, `ZoneContext`, `RuleContext`, `SiteContext` - Use Zustand stores instead
- `useDomain()` - Use `useDevices()`, `useZones()`, `useRules()` directly
- `MapContext` - Use `useMap()` hook or `mapStore` directly

**Migration Path:**
- Old: `const { devices } = useDevices()` from `DeviceContext`
- New: `const { devices } = useDevices()` from `lib/hooks/useDevices.ts` (same API, different implementation)

## Multi-Site Architecture

- **Site Store**: `lib/stores/siteStore.ts` - Zustand store for sites
- **Site Sync**: `lib/stores/useSiteSync.ts` - Handles tRPC ↔ store sync
- **Site Hook**: `lib/hooks/useSite.ts` - React hook (use this in components)
- **Site-Scoped Keys**: `fusion_[data]_site_{siteId}` (devices, zones, rules, maps, BACnet)
- **Auto-Reload**: Stores reload when `activeSiteId` changes (via sync hooks)
- **Site Switching**: Dropdown in `PageTitle` component (shows loading state + toast)

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

### Making a Component Site-Aware

```typescript
// ✅ Current pattern (Zustand)
import { useSite } from '@/lib/hooks/useSite'

export function MyComponent() {
  const { activeSiteId } = useSite()
  
  // Use site-scoped localStorage key
  const storageKey = `fusion_myData_site_${activeSiteId}`
  
  // Reload when site changes
  useEffect(() => {
    // Load data for activeSiteId
  }, [activeSiteId])
}
```

**Note**: `useSite()` from `lib/hooks/useSite.ts` provides the same API as the old Context, but uses Zustand under the hood.

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

### Error Handling Pattern

Always use the `useErrorHandler` hook for consistent error handling:

```typescript
'use client'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'

export function MyComponent() {
  const { handleError, handleSuccess, handleWarning } = useErrorHandler()
  
  const handleSave = async () => {
    try {
      await saveSomething()
      handleSuccess('Saved successfully')
    } catch (error) {
      handleError(error, { title: 'Failed to save' })
    }
  }
}
```

The hook automatically:
- Parses errors into user-friendly messages
- Categorizes errors (network, auth, validation, server)
- Shows toast notifications
- Logs to console for debugging

### Focused Object Modal Pattern

Use `FocusedObjectModal` for detailed entity views with tabs:

```typescript
'use client'
import { FocusedObjectModal } from '@/components/shared/FocusedObjectModal'
import { TabDefinition } from '@/components/shared/FocusedModalTabs'

export function MyFocusedView({ isOpen, onClose, entity }) {
  const tabs: TabDefinition[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'metrics', label: 'Metrics', icon: BarChart },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'related', label: 'Related', icon: Link },
  ]
  
  return (
    <FocusedObjectModal
      isOpen={isOpen}
      onClose={onClose}
      title={entity.name}
      subtitle={entity.description}
      tabs={tabs}
    >
      {(activeTab) => {
        switch (activeTab) {
          case 'overview':
            return <OverviewTab entity={entity} />
          case 'metrics':
            return <MetricsTab entity={entity} />
          // ... other tabs
        }
      }}
    </FocusedObjectModal>
  )
}
```

**Focused Content Components:**
- `DeviceFocusedContent` - Device details modal
- `ZoneFocusedContent` - Zone details modal
- `FaultFocusedContent` - Fault details modal
- `SiteFocusedContent` - Site details modal

These components follow a consistent pattern with Overview, Metrics, History, and Related tabs.

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

### Panel layout and actions

Detail/context panels use a consistent structure (see `app/styles/components.css`):

- **Header**: `fusion-panel-header`, `fusion-panel-header-title`, `fusion-panel-header-actions`. Icon buttons use `fusion-panel-header-action` (edit, delete, maximize).
- **Body**: Scrollable content; use `fusion-panel-body` or `flex-1 overflow-auto` with padding.
- **Footer**: `fusion-panel-footer` for actions attached to the bottom. Inner layout:
  - `fusion-panel-footer-actions` — horizontal row (gap).
  - `fusion-panel-footer-actions--between` — primary left, secondary/utility right.
  - `fusion-panel-footer-actions--stacked` — vertical stack; buttons full-width.
- **Section links**: In-content links like "View devices →" use `fusion-panel-section-link`.

Use `Button` with `variant="primary" | "secondary" | "ghost" | "danger"` for all panel actions so styling stays consistent.

## File Structure

- **Pages**: `app/(main)/[section]/page.tsx`
- **Layout**: `components/layout/` (MainNav, PageTitle, ContextPanel, BottomDrawer, etc.)
- **Features**: `components/[feature]/` (map, zones, rules, lookup, etc.)
- **Shared Components**: `components/shared/` (FocusedObjectModal, ErrorBoundary, etc.)
- **Focused Content**: `components/[feature]/[Feature]FocusedContent.tsx` (DeviceFocusedContent, ZoneFocusedContent, etc.)
- **Stores** (Current): `lib/stores/*Store.ts` - Zustand stores
- **Sync Hooks**: `lib/stores/use*Sync.ts` - tRPC ↔ store bridges
- **Data Hooks**: `lib/hooks/use*.ts` - React hooks using stores
- **Legacy Contexts** (Deprecated): `lib/[Feature]Context.tsx` - Compatibility layer only
- **Utilities**: `lib/hooks/` (useErrorHandler, useUndoable, useFocusTrap)
- **tRPC**: `server/trpc/routers/[feature].ts` → `server/trpc/routers/_app.ts`
- **Schema**: `prisma/schema.prisma`
- **Tokens**: `app/globals.css` and `app/styles/themes/*.css`

## Design Tokens (Quick Reference)

See `app/globals.css` for full token list. Key tokens:
- **Colors**: `--color-primary`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-success`, `--color-danger`, `--color-warning`
- **Spacing**: `--space-1` through `--space-20` (4px base unit)
- **Radius**: `--radius-xs` through `--radius-2xl`
- **Shadows**: `--shadow-soft`, `--shadow-md`, `--shadow-strong`

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

**Site data not switching**
- Ensure using `activeSiteId` from `useSite()` hook
- Check localStorage keys include site ID
- Verify context reloads when `activeSiteId` changes

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

## Quick Checklist

When adding features:
- ✅ Uses design tokens (no hard-coded values)
- ✅ Type-safe (tRPC + TypeScript)
- ✅ Server Component unless client features needed
- ✅ Added to navigation if main section
- ✅ tRPC router created and added to app router
- ✅ Database schema updated if needed
- ✅ Plain language, no jargon
- ✅ Site-aware if dealing with data
- ✅ Reloads when active site changes
- ✅ Uses `useErrorHandler` for error handling
- ✅ Uses `FocusedObjectModal` for detailed entity views
- ✅ Wrapped in `ErrorBoundary` for error recovery
- ✅ Uses Zustand stores (not deprecated Context API)
- ✅ Uses data hooks (`useDevices()`, `useZones()`, etc.)

## Related Documentation

- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - All documentation navigation
