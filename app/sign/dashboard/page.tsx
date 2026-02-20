/**
 * izOS Sign — Dashboard (fake app). Summary cards + Device Status.
 */

'use client'

import Link from 'next/link'
import { Tv, Wifi, Image, List } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const SUMMARY_CARDS = [
  { label: 'TV Displays', value: '3', icon: Tv },
  { label: 'Devices Online', value: '0/0', icon: Wifi },
  { label: 'Media Files', value: '8', icon: Image },
  { label: 'Playlists', value: '1', icon: List },
]

export default function SignDashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="flex flex-col items-center gap-2 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-primary)]">
                <Icon size={24} />
              </div>
              <span className="text-2xl font-bold text-[var(--color-text)]">{card.value}</span>
              <span className="text-sm text-[var(--color-text-muted)]">{card.label}</span>
            </Card>
          )
        })}
      </div>

      {/* Device Status */}
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Device Status</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            No devices paired yet. Pair your first device.
          </p>
          <Link
            href="/sign/devices"
            className="inline-block mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Pair your first device
          </Link>
        </div>
        <Link
          href="/sign/devices"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline shrink-0"
        >
          View All
        </Link>
      </Card>
    </div>
  )
}
