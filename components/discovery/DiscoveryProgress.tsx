/**
 * Discovery Progress Component
 * 
 * Shows real-time progress during network scanning.
 * 
 * AI Note: Displays scan progress, device count, and estimated time remaining.
 */

'use client'

interface DiscoveryProgressProps {
  isScanning: boolean
  progress: number // 0-100
  devicesFound: number
  devicesPerSecond: number
  estimatedTimeRemaining: number // seconds
  currentSubnet?: string
}

export function DiscoveryProgress({
  isScanning,
  progress,
  devicesFound,
  devicesPerSecond,
  estimatedTimeRemaining,
  currentSubnet,
}: DiscoveryProgressProps) {
  if (!isScanning) return null

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  return (
    <div className="fusion-card mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold text-[var(--color-text)]">
          Scan Progress
        </h3>
        <span className="text-sm text-[var(--color-text-muted)]">
          {Math.round(progress)}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Devices Found</div>
          <div className="text-lg font-bold text-[var(--color-text)]">{devicesFound}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Rate</div>
          <div className="text-lg font-bold text-[var(--color-text)]">
            {devicesPerSecond.toFixed(1)}/s
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Time Remaining</div>
          <div className="text-lg font-bold text-[var(--color-text)]">
            {formatTime(estimatedTimeRemaining)}
          </div>
        </div>
      </div>

      {currentSubnet && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-soft)]">
            Scanning: {currentSubnet}
          </div>
        </div>
      )}
    </div>
  )
}

