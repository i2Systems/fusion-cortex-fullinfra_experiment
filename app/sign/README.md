# izOS Sign (fake app)

**Purpose**: Placeholder app for app-switcher exploration. Matches the izOS Sign dashboard layout (sidebar, Dashboard, Media Library, TV Displays, etc.).

**To remove**: Delete `app/sign/` and `components/sign/`. Remove the "sign" entry from `components/layout/AppSwitcher.tsx` (APPS array and `getCurrentApp`).

**Routes**: `/sign` → redirects to `/sign/dashboard`; nav items have stub pages (media, displays, playlists, lanes, deployments, devices).
