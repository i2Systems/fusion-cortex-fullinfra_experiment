# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   Pages  │  │Components│  │  Layout  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │              │                    │
│       └─────────────┴──────────────┘                    │
│                    │                                     │
│                    ▼                                     │
│            ┌──────────────┐                             │
│            │  tRPC Client │                             │
│            └──────┬───────┘                             │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTP/JSON
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                │
│            ┌──────────────────────┐                      │
│            │  tRPC Server        │                      │
│            │  ┌──────────────┐   │                      │
│            │  │   Routers    │   │                      │
│            │  └──────┬───────┘   │                      │
│            └─────────┼───────────┘                      │
│                      │                                   │
│                      ▼                                   │
│            ┌──────────────────┐                         │
│            │  Prisma Client   │                         │
│            └────────┬─────────┘                         │
└─────────────────────┼────────────────────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │   PostgreSQL     │
            └──────────────────┘
```

## Data Flow

### Reading Data (Query)
1. React component calls `trpc.device.search.useQuery({ query: '765' })`
2. tRPC client sends HTTP request to `/api/trpc`
3. tRPC server routes to `deviceRouter.search`
4. Router procedure executes Prisma query
5. Results serialized with superjson (handles Dates, etc.)
6. Response sent back to client
7. React Query caches and updates component

### Writing Data (Mutation)
1. React component calls `trpc.zone.create.useMutation()`
2. Similar flow, but uses POST and updates database
3. React Query invalidates related queries
4. UI updates automatically

## Component Hierarchy

```
RootLayout (app/layout.tsx)
  └─ TRPCProvider
     └─ MainLayout (app/(main)/layout.tsx)
        ├─ MainNav (left, 80px)
        └─ Content Area
           ├─ TopBar (top, 64px)
           ├─ Main Content (center, flexible)
           │  └─ Section Pages (dashboard, map, zones, lookup, etc.)
           ├─ ContextPanel (right, 384px, slide-in)
           └─ BottomDrawer (bottom, collapsible)
```

## Design Token System

All design values flow from `app/globals.css`:

```
:root {
  --color-primary: #4c7dff;
  --space-4: 1rem;
  --radius-lg: 12px;
  ...
}
         │
         ▼
Components use tokens:
  background: var(--color-primary);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
```

**Benefits:**
- Single source of truth
- Easy theming (change tokens, entire app updates)
- No hard-coded values
- Consistent design system

## File Organization Principles

1. **Routes**: One route per feature section in `app/(main)/[section]/`
2. **Components**: Reusable components in `components/`, organized by feature
3. **API**: tRPC routers in `server/trpc/routers/`, one router per domain
4. **Database**: Prisma schema in `prisma/schema.prisma`
5. **Styles**: Global tokens in `app/globals.css`, component styles inline or in components

## State Management

- **Server State**: React Query (via tRPC) - handles API data, caching, refetching
- **UI State**: React useState/useReducer - local component state
- **Global UI State**: Context API (for panels, drawers) - to be implemented as needed

## Type Safety

- **Frontend ↔ Backend**: tRPC provides end-to-end type safety
- **Database ↔ Backend**: Prisma generates TypeScript types from schema
- **Forms/Validation**: Zod schemas in tRPC procedures

## Performance Considerations

- **Server Components**: Default in Next.js App Router (no JS sent to client)
- **Client Components**: Only when needed (`'use client'`)
- **Code Splitting**: Automatic via Next.js route-based splitting
- **Caching**: React Query handles API response caching
- **Database**: Prisma connection pooling (configure in DATABASE_URL)

## Security

- **Authentication**: Auth.js (NextAuth) - to be configured
- **Authorization**: tRPC middleware - to be implemented
- **Input Validation**: Zod schemas in all tRPC procedures
- **SQL Injection**: Prevented by Prisma (parameterized queries)

## Scalability

- **Horizontal Scaling**: Stateless API routes, shared database
- **Background Tasks**: Node workers + Redis queue (future)
- **Caching**: Redis for frequently accessed data (future)
- **Database**: PostgreSQL handles large datasets efficiently

## Development Workflow

1. **Add Feature**: Create route → Add nav → Create router → Update schema
2. **Modify Design**: Update tokens in `globals.css`
3. **Add API**: Create procedure in router → Use in component
4. **Database Changes**: Update schema → Generate client → Push/migrate

