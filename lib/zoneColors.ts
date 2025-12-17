/**
 * Zone Color Constants
 * 
 * Shared zone color palette used across the app for zone visualization.
 * These colors are user-selectable and stored as hex values in the database.
 * 
 * AI Note: Colors are chosen to work well across all themes while maintaining
 * good contrast and visual distinction between zones.
 */

/**
 * Default zone color palette
 * Colors are selected to align with design token colors where possible,
 * but remain as hex values for user customization and database storage.
 */
export const ZONE_COLORS = [
  '#4c7dff', // primary blue (matches --color-primary in light theme)
  '#f97316', // accent orange (matches --color-accent in light theme)
  '#22c55e', // success green (matches --color-success in light theme)
  '#eab308', // warning yellow (matches --color-warning in light theme)
  '#a855f7', // purple (vibrant, distinct)
  '#ec4899', // pink (vibrant, distinct)
  '#06b6d4', // cyan (vibrant, distinct)
  '#f59e0b', // amber (vibrant, distinct)
  '#10b981', // emerald (vibrant, distinct)
  '#6366f1', // indigo (vibrant, distinct)
] as const

/**
 * Default zone color (first in palette)
 */
export const DEFAULT_ZONE_COLOR = ZONE_COLORS[0]





