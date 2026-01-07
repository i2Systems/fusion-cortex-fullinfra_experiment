# Shared Types Module

Production-grade type definitions for device types across the entire application.

## Quick Start

```typescript
import { 
  // Types
  DeviceType,           // Prisma format: 'FIXTURE_16FT_POWER_ENTRY'
  DisplayDeviceType,    // UI format: 'fixture-16ft-power-entry'
  DisplayFixtureType,   // Fixture subset
  DeviceId,             // Branded ID type
  
  // Conversion
  toDisplayType,        // Prisma → Display
  fromDisplayType,      // Display → Prisma
  
  // Type guards
  isDeviceType,         // Validates Prisma format
  isDisplayDeviceType,  // Validates display format
  isFixtureType,        // Checks if fixture
  
  // Zod schemas
  DisplayDeviceTypeSchema,
  DeviceTypeSchema,
  
  // Utilities
  getDeviceTypeLabel,   // Human readable label
  assertNever,          // Exhaustiveness checking
} from '@/lib/types'
```

## Architecture

```
prisma/schema.prisma         → DeviceType enum (source of truth)
                                    ↓
lib/types/device.ts          → DeviceType, DisplayDeviceType, utilities
lib/types/schemas/device.ts  → Zod validation schemas
                                    ↓
lib/types/index.ts           → Barrel export
                                    ↓
All application code
```

## Adding a New Device Type

1. **Schema**: Add to `prisma/schema.prisma`
2. **Generate**: Run `npx prisma generate`
3. **Mappings**: Update `lib/types/device.ts`:
   - `DEVICE_TYPE_DISPLAY`
   - `DEVICE_TYPE_FROM_DISPLAY`
   - `ALL_DISPLAY_DEVICE_TYPES`
4. **Compile**: TypeScript will error on any missing cases

## Key Features

### Branded IDs
```typescript
const device = deviceId('device-123')  // Type: DeviceId
const site = siteId('site-456')        // Type: SiteId

function getDevice(id: DeviceId) { ... }
getDevice(device)  // ✅
getDevice(site)    // ❌ Type error!
```

### Type Guards
```typescript
if (isDisplayDeviceType(input)) {
  // input is now DisplayDeviceType
}

if (isDisplayFixtureType(deviceType)) {
  // deviceType is now DisplayFixtureType
}
```

### Exhaustiveness Checking
```typescript
function getIcon(type: DeviceType): string {
  switch (type) {
    case 'FIXTURE_16FT_POWER_ENTRY': return '💡'
    // ... all cases
    default:
      return assertNever(type) // TypeScript error if case missed
  }
}
```

### Zod Validation
```typescript
const input = DisplayDeviceTypeSchema.parse(userInput)
// input is now validated DisplayDeviceType
```

## Files

| File | Purpose |
|------|---------|
| `device.ts` | Core types and utilities |
| `schemas/device.ts` | Zod validation schemas |
| `index.ts` | Barrel export |
