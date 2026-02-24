'use client'

import { useState, useEffect } from 'react'
import { Maximize, Minimize } from 'lucide-react'

/**
 * Fullscreen toggle for tablet/iPad: uses Fullscreen API to hide browser chrome.
 * Tap again (or the header button) to exit; the system "Done"/X is from iOS and cannot be hidden.
 * For a fully chromeless experience, use "Add to Home Screen" for standalone mode.
 */
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const doc = document as Document & { fullscreenElement?: Element }
    setSupported(
      typeof doc.fullscreenElement !== 'undefined' ||
        typeof (doc as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement !== 'undefined'
    )
  }, [])

  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { fullscreenElement?: Element; webkitFullscreenElement?: Element }
      const full = !!(
        doc.fullscreenElement ??
        (doc as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      )
      setIsFullscreen(full)
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggle = async () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
    try {
      if (isFullscreen) {
        const doc = document as Document & { exitFullscreen?: () => Promise<void>; webkitExitFullscreen?: () => Promise<void> }
        if (doc.exitFullscreen) await doc.exitFullscreen()
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      } else {
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      }
    } catch {
      // Ignore (e.g. not allowed in iframe, or user cancelled)
    }
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      title={isFullscreen ? 'Exit full screen' : 'Full screen (hide browser bar)'}
      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
    >
      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
    </button>
  )
}
