# Filler App (Products / Lorem)

**Purpose**: Placeholder app for exploring navigation between “Commissioning” (main app) and a second product. Easy to remove later.

**To remove**: Delete the `app/filler/` directory; remove `AppSwitcher` from `components/layout/PageTitle.tsx` and from `components/filler/FillerShell.tsx`; delete `components/layout/AppSwitcher.tsx` and `components/filler/`. Optionally remove the TopBar import if unused elsewhere.

**Routes**:
- `/filler` — redirects to Product Grid
- `/filler/products` — Product Grid (lorem)

**Navigation**: Use the app switcher (waffle) in the top bar to switch between Commissioning and Products.
