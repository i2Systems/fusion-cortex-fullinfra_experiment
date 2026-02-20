# Fusion / Cortex — Commissioning & Configuration UI

> **📚 Documentation**: See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for complete documentation navigation.  
> **🤖 AI Assistants**: Start with [AI_NOTES.md](./AI_NOTES.md) for patterns and quick reference.

A web-based commissioning & configuration UI for large-scale retail lighting deployments (e.g., Walmart, American Eagle).

**Current Architecture (2025)**: Zustand stores + tRPC + Next.js 14 App Router. Legacy Context API files exist for compatibility but are deprecated.

### What this fork adds

This fork extends the base app with multi-app shell UX and configurable app-switcher patterns aimed at real-world use cases:

- **Multi-app shell** — Side-by-side with Commissioning: a **Products** placeholder app (filler, lorem product grid) and **izOS Sign** (TV displays, playlists, stub dashboard). All share a unified nav/header pattern (notifications, profile/settings/help in sidebar, theme toggle in header).
- **App switcher styles** (Settings → Appearance → App menu style):
  - **Dropdown** — Click to open menu (default).
  - **Icon tabs** — One icon per app with hover tooltip.
  - **Inline** — Icon and label always visible, no menu.
  - **Primary + overflow** — Main app (e.g. Commissioning) prominent; others under “Other apps”. Best when one product is primary and the rest are satellite tools.
  - **Recent first** — Last-used app at top of the list for faster switching (persisted in `localStorage`). Best for repeat workflows.
  - **Role-based** — Only apps relevant to the current role (e.g. Technician sees Commissioning + Sign, not Products). Best for compliance and task-focused UI.
- **Day/Night design language** — Settings → Appearance: choose which theme is “Day” and which is “Night”; sun/moon toggle in the header switches between them (no extra themes, just remapping).
- **Bottom drawer** — Footer/drawer respects the left nav width via `--fusion-nav-width` so it doesn’t sit under the panel.
- **TanStack Query Devtools** — Trigger moved to bottom-right so it doesn’t cover the nav collapse control.

Filler and Sign are intentionally minimal (stub pages, mock data) so the shell and switcher patterns can be tried without changing core Commissioning behavior.

## 📋 Table of Contents

- [What this fork adds](#what-this-fork-adds)
- [Purpose](#-purpose)
- [Architecture](#-architecture)
- [Design System](#-design-system)
- [Core Features](#-core-features)
- [Multi-Site Architecture](#-multi-site-architecture)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [Additional Documentation](#-additional-documentation)

## 🎯 Purpose

Fusion/Cortex is:
- A setup, mapping, and rules platform
- A bridge between physical devices (fixtures, motion sensors, light sensors) and BACnet/BMS
- Optimized for remote commissioning at scale (thousands of devices, thousands of sites)
- **Multi-site aware** - supports managing multiple sites with isolated data per site

Fusion/Cortex is **not**:
- A lighting control dashboard
- An energy analytics/heatmap tool
- A BMS replacement
- A site manager "operations dashboard"

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS
- **UI Components**: Custom components with design tokens
- **Canvas Rendering**: react-konva for map/blueprint visualization
- **API**: tRPC for type-safe API calls
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand stores (`lib/stores/`) + Sync hooks (`lib/stores/use*Sync.ts`)
  - ⚠️ **Note**: Legacy Context API files exist for compatibility but are deprecated. New code should use Zustand stores.
- **Data Persistence**: localStorage (client-side, site-scoped) + IndexedDB (for future image storage)
- **Caching**: Redis (for future use)
- **Auth**: Auth.js (NextAuth) (to be configured)
- **Workers**: Node.js workers (for background tasks)

### Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main layout group
│   │   ├── dashboard/      # Multi-site dashboard
│   │   ├── map/           # Locations & Devices section
│   │   ├── zones/         # Zones section
│   │   ├── bacnet/        # BACnet Mapping section
│   │   ├── rules/         # Rules & Overrides section
│   │   ├── lookup/        # Device Lookup section (with manual entry)
│   │   ├── faults/        # Faults / Health section
│   │   └── layout.tsx     # Main layout wrapper
│   ├── api/trpc/          # tRPC API route
│   ├── globals.css        # Global styles & theme imports
│   ├── styles/            # CSS Architecture
│   │   ├── themes/        # Individual theme files (dark.css, light.css, etc.)
│   │   ├── base.css       # Core HSL variable definitions
│   │   ├── components.css # Component-specific overrides
│   │   └── utilities.css  # Utility classes
│   └── layout.tsx         # Root layout
├── components/
│   ├── layout/            # Layout components (Nav, TopBar, Panels)
│   ├── map/               # Map visualization components
│   ├── lookup/            # Device lookup components
│   ├── zones/             # Zone management components
│   ├── rules/             # Rules & overrides components
│   ├── dashboard/         # Dashboard components
│   ├── firmware/          # Firmware management components
│   ├── faults/            # Faults & Health components
│   ├── bacnet/            # BACnet mapping components
│   ├── stories/           # Storybook components
│   └── shared/            # Shared components
│       ├── FocusedObjectModal.tsx  # Reusable modal for detailed entity views
│       ├── FocusedModalTabs.tsx   # Tab navigation for focused modals
│       ├── ErrorBoundary.tsx      # Error recovery component
│       └── PanelEmptyState.tsx    # Empty state component
├── server/
│   └── trpc/              # tRPC setup & routers
│       ├── routers/       # Feature-specific routers
│       └── trpc.ts        # Base tRPC config
├── prisma/
│   └── schema.prisma      # Database schema
└── lib/                   # Shared utilities & stores
    ├── stores/            # Zustand stores (current state management)
    │   ├── deviceStore.ts
    │   ├── zoneStore.ts
    │   ├── ruleStore.ts
    │   ├── siteStore.ts
    │   ├── mapStore.ts
    │   └── use*Sync.ts    # Sync hooks bridge tRPC ↔ stores
    ├── hooks/             # React hooks
    │   ├── useDevices.ts  # Device data hook (uses store)
    │   ├── useZones.ts    # Zone data hook (uses store)
    │   ├── useRules.ts    # Rule data hook (uses store)
    │   ├── useSite.ts     # Site data hook (uses store)
    │   ├── useErrorHandler.ts  # Centralized error handling
    │   └── useUndoable.ts      # Undo/redo functionality
    ├── ToastContext.tsx  # Toast notification system
    ├── mockData.ts        # Mock data generators
    └── siteData.ts       # Site-specific data generation
```

## 🎨 Design System

### Design Tokens

All design values are defined as CSS custom properties in `app/globals.css`. This enables:
- Easy theming (swap dark/light themes)
- Consistent spacing, colors, typography
- No hard-coded values in components

**Theme Architecture:**
- **Themes**: Located in `app/styles/themes/`. Each file (`dark.css`, `warm-night.css`) defines the full set of CSS variables.
- **Base**: `app/styles/base.css` defines the core HSL variables and default values.
- **Components**: `app/styles/components.css` contains component-specific overrides and legacy token styles.
- **Globals**: `app/globals.css` serves as the entry point, importing all themes and base styles.

**Key Token Categories:**
- Colors (backgrounds, borders, text, primary, status)
- Spacing (4px base unit scale)
- Border radius
- Shadows (layered, modern, neumorphic)
- Typography (system fonts)
- Transitions
- Z-index layers

**AI Note**: Always use design tokens (`var(--color-primary)`) instead of hard-coded values. To modify a theme, edit the specific file in `app/styles/themes/`.


### Component Library & Storybook

The project includes a Storybook instance for component inspection and design token documentation.

**To run Storybook:**
```bash
npm run storybook
```

Then open `http://localhost:6006` or click "Open Storybook" in Settings → About.

**Storybook includes:**
- **Design tokens reference** - Complete documentation of all CSS custom properties
- **Theme system** - Switch between all 9 themes (dark, light, high-contrast, warm-night, warm-day, glass-neumorphism, business-fluent, on-brand, on-brand-glass) using the toolbar selector
- **Atomic component stories** - Button, Card, DataChip, and more
- **Visual regression testing** - Test components across different themes
- **Component interaction testing** - Interactive component playground

**Theme Switching:**
Use the **Theme** selector in the Storybook toolbar (top right) to preview components in all available themes. All components automatically adapt using design tokens.

**Access from the app:**
- Settings → About → "Open Storybook" button
- Or navigate to `/storybook` (development only)

### Layout System

The app uses a **main + panel** system:

1. **Left Navigation** (80px wide, persistent)
   - Minimal icons only
   - Navigation items with active states
   - Profile & settings at bottom

2. **Top App Bar** (via PageTitle component)
   - Site selector dropdown
   - Breadcrumb navigation

3. **Main Content Area** (center, flexible)
   - Primary working surface per section
   - Scrollable when needed
   - Uses `px-[20px]` padding for consistency

4. **Right Context Panel** (384px wide, always visible on relevant pages)
   - Device details
   - Zone properties
   - Rule preview
   - Site details (on dashboard)

5. **Bottom Drawer** (collapsible)
   - Status information
   - Fault summary
   - Notifications

## 📋 Core Features

### 1. Multi-Site Dashboard
- Overview of all sites in a grid
- Site health, device counts, critical faults
- Warranty alerts and map status
- Quick navigation to site-specific pages
- Detailed site information panel

### 2. Locations & Devices
- Point cloud visualization over blueprint
- Color-coded by device type (fixtures, motion, light sensors)
- Zoom, pan, drag-select
- Layer toggles
- Device selection → right panel details
- Site-scoped map images

### 3. Zones
- Drag-select devices on map → create zone
- Name + color code zones
- Adjust membership with Ctrl-click
- Zones are the unit of control for BMS + rules
- Site-scoped zone data

### 4. BACnet Mapping
- Table: Zone ↔ BACnet Object ID
- Inline editing of IDs
- Status: Connected / Error / Not Assigned
- Validation help in right panel
- Site-scoped mappings

### 5. Rules & Overrides
- Alexa-style rule builder:
  - Trigger (motion, no motion, daylight, BMS)
  - Condition (zone, duration, threshold)
  - Action (set zones, dim, return to BMS)
- Override BMS checkbox + duration
- Human-readable preview in right panel
- Site-scoped rules

### 6. Device Lookup
- Search by device ID or serial number
- Map highlight of device location
- I2QR details: build date, CCT, warranty, parts list
- Empty state with actions: Add Device Manually, Scan QR Code, Import/Export List
- Focused modal view with tabs (Overview, Metrics, History, Related)
- Site-scoped device data

### 7. Faults / Health
- Summary counts (missing, offline, duplicates)
- Click to see filtered device table
- Detailed device info in right panel
- Focused modal view with comprehensive fault details
- Site-scoped fault data

### 8. Firmware Management
- Manage device firmware versions
- Create firmware update campaigns
- Monitor update status
- Site-scoped firmware operations

## 🏪 Multi-Site Architecture

The app supports managing multiple sites with isolated data:

- **Site Store**: Zustand store (`lib/stores/siteStore.ts`) manages active site selection and site metadata
- **Site Sync**: `lib/stores/useSiteSync.ts` handles tRPC ↔ store synchronization
- **Site-Scoped Data**: All data (devices, zones, rules, maps, BACnet mappings) is namespaced by site ID in localStorage
- **Site Switching**: Dropdown in `PageTitle` component allows switching between sites (shows loading state + toast notification)
- **Data Isolation**: Each site has its own device list, zones, rules, and map images
- **State Hydration**: `StateHydration` component initializes stores from database on app load
- **Dashboard**: Shows overview of all sites, with detailed panel for selected site

**Storage Keys Format:**
- Devices: `fusion_devices_site_{siteId}`
- Zones: `fusion_zones_site_{siteId}`
- Rules: `fusion_rules_site_{siteId}`
- Map Images: `fusion_map-image-url_site_{siteId}`
- BACnet Mappings: `fusion_bacnet_mappings_site_{siteId}`

**⚠️ Migration Note**: The app has migrated from React Context API to Zustand stores. Legacy Context files (`*Context.tsx`) exist for backward compatibility but are deprecated. New code should use:
- `useDevices()`, `useZones()`, `useRules()`, `useSite()` hooks (from `lib/hooks/`)
- Direct store access: `useDeviceStore()`, `useZoneStore()`, etc. (from `lib/stores/`)

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))

## 🚀 Getting Started

You can run the application in two ways: **Fully Dockerized** (easiest, best for demos) or **Local Development** (best for coding).

### Option 1: Fully Dockerized (Recommended)

Run the entire application stack in containers. Works on **Apple Silicon (M1/M2/M3)**, Intel Macs, Windows, and Linux.

```bash
# Start everything (App + Database)
npm run cortex:wakeup
```

- Open [http://localhost:3000](http://localhost:3000)
- The app comes pre-seeded with sample data.

To stop:
```bash
npm run cortex:sleep
```

---

### Option 2: Local Development (Hybrid)

Run the database in Docker, but the Next.js app locally for hot-reloading and faster coding.

**Quick start (recommended):**
```bash
npm run local:wakeup
```
This starts the database, waits for it to be ready, and launches the dev server.

**Manual steps:**
1. **Start Database:**
   ```bash
   npm run db:up
   npm run db:wait   # Waits for PostgreSQL to be ready (prevents startup freeze)
   ```

2. **Seed Data (First time only):**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

3. **Start App:**
   ```bash
   npm run dev:local
   ```

### Database Environment Switching

The app can switch between local Docker DB and Supabase Cloud DB:

| Command | Database | Use Case |
|---------|----------|----------|
| `npm run dev:local` | 💻 Local Docker | Active development |
| `npm run dev:cloud` | ☁️ Supabase | Presentations, shared demos |

Check **Settings → Data** in the app to see which is active.

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:push` | Push schema changes |
| `npm run db:migrate` | Run migrations |

### Docker Compose

The `docker-compose.yml` defines:
- **PostgreSQL 15** on port 5433 (avoids conflicts)
- Persistent data volume
- Credentials: `postgres` / `postgres`

See [LOCAL_DB_SETUP.md](./LOCAL_DB_SETUP.md) for detailed setup and troubleshooting.

**App freezes on startup?** Ensure Docker is running and the database is ready before starting the app. Use `npm run local:wakeup` (waits for DB automatically) or run `npm run db:wait` after `npm run db:up`.

## 🛠️ Operations & Maintenance

### System Health
Check if the system is running correctly:
```bash
npm run cortex:health
```
(Runs `docker compose ps` to show running containers).

### Log Management
View real-time logs from the application and database:
```bash
npm run cortex:logs
```
Docker containers are configured with **Log Rotation** (max 10MB file size, 3 files max) to prevent them from consuming all disk space.

### Command Reference
For a quick list of all available commands:
```bash
npm run cortex help
```
(Or `npm run cortex`).

### Backups (Remember)
Data is critical. Save a snapshot of the database (memory):
```bash
npm run cortex:remember -- [optional-tag]
```
Example: `npm run cortex:remember -- pre-demo`
Backups are saved to `./backups` with a timestamp and your tag. The script automatically rotates them (keeping the last 10).

### LAN Access (Tablets/Mobile)
To access the app from other devices on your local network (e.g., controlling lights from an iPad):
1. Find your computer's IP address (e.g., `192.168.1.50`).
2. Update `docker-compose.yml`:
   ```yaml
   environment:
     NEXTAUTH_URL: http://192.168.1.50:3000
   ```
3. Restart the stack: `npm run cortex:wakeup`
4. Open `http://192.168.1.50:3000` on your tablet.

## 🔧 Development

### Quick Start

See the [Getting Started](#-getting-started) section above for setup instructions.

### Code Style

- TypeScript strict mode enabled
- React Server Components by default, `'use client'` when needed
- Functional components with hooks
- Plain language, no jargon (per UX brief)
- Always use design tokens (`var(--color-primary)`) - never hard-code values

### Adding New Features

1. Create route in `app/(main)/[feature]/page.tsx`
2. Add navigation item in `components/layout/MainNav.tsx`
3. Create tRPC router in `server/trpc/routers/[feature].ts`
4. Add router to `server/trpc/routers/_app.ts`
5. Update Prisma schema if needed
6. Use design tokens, not hard-coded values

### For AI Assistants

See [AI_NOTES.md](./AI_NOTES.md) for comprehensive AI-friendly documentation including patterns, file locations, and common issues.

## 🚀 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment guide to Vercel.

**Quick Deploy:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel Dashboard
4. Deploy automatically on push to `main`

**CI/CD:** GitHub Actions runs lint, typecheck, and build on every push/PR.

## 📚 Additional Documentation

**📖 [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete documentation navigation hub  
**⚡ [CODEBASE_QUICK_REFERENCE.md](./CODEBASE_QUICK_REFERENCE.md)** - Quick file location reference

### Core Docs
- **[AI_NOTES.md](./AI_NOTES.md)** - Comprehensive guide for AI assistants (patterns, examples)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow

### Setup & Configuration
- **[LOCAL_DB_SETUP.md](./LOCAL_DB_SETUP.md)** - Local Docker PostgreSQL setup
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase storage and database setup
- **[SEEDING.md](./SEEDING.md)** - Database seeding guide
- **[EXPORT_DATA.md](./EXPORT_DATA.md)** - Exporting zones and device positions

### Deployment
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide (Vercel, GitHub, checklists)

### UX & Design
- **[UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md)** - UX review & improvements

## 🎨 UI Components & Patterns

### Focused Object Modal System

The app uses a **Focused Object Modal** pattern for detailed entity views. This provides a consistent, tabbed interface for viewing comprehensive information about devices, zones, faults, and sites.

**Components:**
- `FocusedObjectModal` - Reusable modal shell with tabs
- `FocusedModalTabs` - Tab navigation component
- Focused content components:
  - `DeviceFocusedContent` - Device details with Overview, Metrics, History, Related tabs
  - `ZoneFocusedContent` - Zone details with comprehensive information
  - `FaultFocusedContent` - Fault details and resolution
  - `SiteFocusedContent` - Site overview and statistics

**Usage Pattern:**
```typescript
<FocusedObjectModal
  isOpen={isOpen}
  onClose={onClose}
  title="Device ID"
  subtitle="Device Type • Serial Number"
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'history', label: 'History' },
    { id: 'related', label: 'Related' },
  ]}
>
  {(activeTab) => <TabContent activeTab={activeTab} />}
</FocusedObjectModal>
```

### Error Handling

The app includes centralized error handling via the `useErrorHandler` hook:

```typescript
const { handleError, handleWarning, handleSuccess } = useErrorHandler()

try {
  await saveSomething()
  handleSuccess('Saved successfully')
} catch (error) {
  handleError(error, { title: 'Failed to save' })
}
```

The hook automatically:
- Parses errors into user-friendly messages
- Categorizes errors (network, auth, validation, server)
- Shows toast notifications
- Logs to console for debugging

### Error Boundary

The `ErrorBoundary` component provides error recovery at the component tree level, preventing the entire app from crashing when errors occur.

## 🎯 Non-Goals

**Do not implement:**
- Energy savings charts
- Heatmaps / occupancy maps
- Analytics dashboards for site managers
- Legacy spec content about energy/analytics beyond what's defined
- Device discovery/scanning (removed - use manual entry in lookup page)

## 🗺️ Roadmap

### Phase 2: Enhanced Components (Current)
- [x] **Badge Component**: Unified status indicators across the app.
- [x] **Toggle Component**: Standardized toggle buttons.
- [ ] **Select Component**: Custom select wrapper for consistent styling.
- [ ] **Card Component**: Standardized container styling.

### Phase 3: Global Theming & Dashboard
- [ ] Refactor Dashboard to use new components.
- [ ] Audit `base.css` for distinct High Contrast vs Dark separation.
- [ ] Refactor Status/Stat Cards.


## 📚 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [react-konva Documentation](https://konvajs.org/docs/react/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Built with ❤️ for large-scale retail lighting deployments**
