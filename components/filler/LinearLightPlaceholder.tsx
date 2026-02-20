/**
 * Placeholder image for linear light fixture (metallic bar).
 * Matches the Product Grid reference; uses design tokens for colors.
 */

export function LinearLightPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Metallic bar body - gradient for brushed metal */}
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-surface-subtle)" />
          <stop offset="25%" stopColor="var(--color-text-muted)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="var(--color-text-soft)" stopOpacity="0.2" />
          <stop offset="75%" stopColor="var(--color-text-muted)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--color-surface-subtle)" />
        </linearGradient>
        <linearGradient id="barHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <rect x="10" y="28" width="220" height="24" rx="4" fill="url(#barGrad)" />
      <rect x="10" y="28" width="220" height="8" rx="4" fill="url(#barHighlight)" />
      {/* End caps */}
      <rect x="8" y="30" width="6" height="20" rx="2" fill="var(--color-text-muted)" fillOpacity="0.5" />
      <rect x="226" y="30" width="6" height="20" rx="2" fill="var(--color-text-muted)" fillOpacity="0.5" />
    </svg>
  )
}
