# Storybook Component Stories

This directory contains Storybook stories for all components in the Fusion/Cortex application.

## Organization

Stories are organized by category:

- **Layout/** - Layout components (ContextPanel, ResizablePanel, BottomDrawer, PageTitle, SearchIsland)
- **Shared/** - Reusable shared components (SelectSwitcher, MapViewToggle, ViewToggle, ComponentModal)
- **Modals/** - Modal dialogs (LoginModal, SettingsModal, AddSiteModal, LibraryObjectModal)
- **Cards/** - Card components (LibraryCard, DataChip)
- **Rules/** - Rule-related components (TriggerTile, ConditionTile, ActionTile, RulePreview)
- **Toolbars/** - Toolbar components (MapToolbar, ZoneToolbar, SelectionToolbar)
- **Components/** - Basic components (Button, Card, DataChip)

## Theme Testing

All stories support theme switching via the Storybook toolbar. Use the **Theme** selector (paintbrush icon) to preview components in all 9 available themes:

- Dark (default)
- Light
- High Contrast
- Warm Night
- Warm Day
- Glass Neumorphism
- Business Fluent
- On Brand
- On Brand Glass

## Adding New Stories

When adding a new component, create a corresponding story file:

1. Create the story file: `components/stories/[Category]/[ComponentName].stories.tsx`
2. Import the component
3. Define meta with title, component, and tags
4. Create stories for different states/variants
5. Use design tokens (`var(--color-*)`) instead of hard-coded values

Example:
```tsx
import { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from '@/components/MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Category/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // component props
  },
}
```

## Current Coverage

✅ **Layout Components** - Complete
✅ **Shared Components** - Complete
✅ **Modal Components** - Complete
✅ **Rule Components** - Core tiles and preview
✅ **Toolbar Components** - Complete
✅ **Card Components** - Complete
✅ **Basic Components** - Complete

🔄 **Panel Components** - Partial (some panels require complex context)
🔄 **List Components** - Partial (some lists require data context)
⏳ **Map Components** - Pending (canvas-based components need special setup)

## Notes

- Some components require context providers (SiteContext, DeviceContext, etc.) and may need decorators
- Canvas-based components (MapCanvas, ZoneCanvas) may need special setup or mock data
- Components with complex dependencies may need simplified stories or mocks

