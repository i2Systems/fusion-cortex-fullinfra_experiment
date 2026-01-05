# Fusion / Cortex — Commissioning & Configuration UI

A web-based commissioning & configuration UI for large-scale retail lighting deployments (e.g., Walmart, American Eagle).

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
- **State Management**: React Context (DeviceContext, ZoneContext, RuleContext, SiteContext)
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
│   ├── globals.css        # Design tokens & global styles
│   └── layout.tsx         # Root layout
├── components/
│   ├── layout/            # Layout components (Nav, TopBar, Panels)
│   ├── map/               # Map visualization components
│   ├── lookup/            # Device lookup components
│   ├── zones/             # Zone management components
│   ├── rules/             # Rules & overrides components
│   ├── dashboard/         # Dashboard components
│   └── shared/            # Shared components
├── server/
│   └── trpc/              # tRPC setup & routers
│       ├── routers/       # Feature-specific routers
│       └── trpc.ts        # Base tRPC config
├── prisma/
│   └── schema.prisma      # Database schema
└── lib/                   # Shared utilities & contexts
    ├── DeviceContext.tsx  # Device state management
    ├── ZoneContext.tsx    # Zone state management
    ├── RuleContext.tsx    # Rule state management
    ├── SiteContext.tsx   # Multi-site management
    ├── mockData.ts        # Mock data generators
    └── storeData.ts       # Site-specific data generation
```

## 🎨 Design System

### Design Tokens

All design values are defined as CSS custom properties in `app/globals.css`. This enables:
- Easy theming (swap dark/light themes)
- Consistent spacing, colors, typography
- No hard-coded values in components

**Key Token Categories:**
- Colors (backgrounds, borders, text, primary, status)
- Spacing (4px base unit scale)
- Border radius
- Shadows (layered, modern)
- Typography (system fonts)
- Transitions
- Z-index layers

**AI Note**: Always use design tokens (`var(--color-primary)`) instead of hard-coded values. To change the theme, modify tokens in `globals.css`.

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
- Site-scoped device data

### 7. Faults / Health
- Summary counts (missing, offline, duplicates)
- Click to see filtered device table
- Detailed device info in right panel
- Site-scoped fault data

## 🏪 Multi-Site Architecture

The app supports managing multiple sites with isolated data:

- **Site Context**: Manages active site selection and site metadata
- **Site-Scoped Data**: All data (devices, zones, rules, maps, BACnet mappings) is namespaced by site ID in localStorage
- **Site Switching**: Dropdown in PageTitle allows switching between sites
- **Data Isolation**: Each site has its own device list, zones, rules, and map images
- **Dashboard**: Shows overview of all sites, with detailed panel for selected site

**Storage Keys Format:**
- Devices: `fusion_devices_site_{siteId}`
- Zones: `fusion_zones_site_{siteId}`
- Rules: `fusion_rules_site_{siteId}`
- Map Images: `fusion_map-image-url_site_{siteId}`
- BACnet Mappings: `fusion_bacnet_mappings_site_{siteId}`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (optional, for future use)
- Redis (optional, for future caching)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/fusion_cortex"
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Set up database (optional):**
   ```bash
   npx prisma generate
   npx prisma db push
   # Or use migrations:
   npx prisma migrate dev
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Database Management

- **Generate Prisma Client**: `npm run db:generate`
- **Push schema changes**: `npm run db:push`
- **Open Prisma Studio**: `npm run db:studio`
- **Create migration**: `npm run db:migrate`

## 🔧 Development

### Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

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

## 📚 Additional Documentation

- **[SETUP.md](./SETUP.md)** - Quick setup guide and common tasks
- **[AI_NOTES.md](./AI_NOTES.md)** - Comprehensive guide for AI assistants
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow
- **[LOCAL_DB_SETUP.md](./LOCAL_DB_SETUP.md)** - Local PostgreSQL setup
- **[SEEDING.md](./SEEDING.md)** - Database seeding guide
- **[SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)** - Supabase image storage setup
- **[SETUP_PYMUPDF.md](./SETUP_PYMUPDF.md)** - PDF vector extraction setup
- **[EXPORT_DATA.md](./EXPORT_DATA.md)** - Exporting zones and device positions

## 🎯 Non-Goals

**Do not implement:**
- Energy savings charts
- Heatmaps / occupancy maps
- Analytics dashboards for site managers
- Legacy spec content about energy/analytics beyond what's defined
- Device discovery/scanning (removed - use manual entry in lookup page)

## 📚 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [react-konva Documentation](https://konvajs.org/docs/react/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Built with ❤️ for large-scale retail lighting deployments**
