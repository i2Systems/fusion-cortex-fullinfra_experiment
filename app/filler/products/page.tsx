/**
 * Product Grid — lorem version matching the reference image.
 * Uses design tokens and fusion-card; placeholder images for linear lights.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Circle, CircleDot } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LinearLightPlaceholder } from '@/components/filler/LinearLightPlaceholder'

const STATUS_TABS = [
  { id: 'active', label: 'Active', count: 67, active: true },
  { id: 'wip', label: 'WIP', count: 18, active: false },
  { id: 'archived', label: 'Archived', count: 8, active: false },
  { id: 'deleted', label: 'Deleted', count: 3, active: false },
]

const FILTER_LABELS = [
  'Technology',
  'Application',
  'Product Family',
  'CCT',
  'CRI',
  'Beam',
  'Length',
]

const PRODUCTS = [
  { id: '1', name: 'Compose', description: 'Indirect Asymmetric Lighting', date: '06.22.22', active: true },
  { id: '2', name: 'Runway', description: 'Linear Direct Lighting', date: '05.18.22', active: false },
  { id: '3', name: 'i2Cove', description: 'Cove Indirect Lighting', date: '04.12.22', active: false },
  { id: '4', name: 'Gen4', description: 'Track Linear System', date: '03.08.22', active: false },
  { id: '5', name: 'Fusion', description: 'Integrated Ambient Lighting', date: '02.14.22', active: false },
  { id: '6', name: 'Graphite', description: 'Suspended Linear Pendant', date: '01.20.22', active: false },
  { id: '7', name: 'Gen3', description: 'Legacy Linear System', date: '12.01.21', active: false },
  { id: '8', name: 'Airscale', description: 'Scalable Linear Luminaire', date: '11.15.21', active: false },
]

export default function ProductGridPage() {
  const [activeStatus, setActiveStatus] = useState('active')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumbs + Title row */}
      <div className="shrink-0 px-6 pt-6 pb-2">
        <nav className="text-sm text-[var(--color-text-muted)] mb-2">
          <Link href="/filler" className="hover:text-[var(--color-text)] transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-text)] underline underline-offset-2">Product Grid</span>
        </nav>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
            Product Grid
          </h1>
          <button
            type="button"
            className="shrink-0 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-medium text-sm hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-elevated)] transition-colors"
          >
            + Product
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="shrink-0 flex items-center gap-1 px-6 pb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveStatus(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab.active
                ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs ${
                tab.active
                  ? 'bg-[var(--color-text-on-primary)]/20 text-[var(--color-text-on-primary)]'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="shrink-0 flex items-center gap-3 px-6 pb-4 border-b border-[var(--color-border-subtle)]">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">Filter</span>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {FILTER_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            >
              {label}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-70">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Product grid */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div
          className="grid gap-4 w-full"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}
        >
          {PRODUCTS.map((product) => (
            <Card
              key={product.id}
              className="flex flex-col overflow-hidden p-0 cursor-pointer hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-start justify-between p-3 pb-0">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs">
                  {product.active ? (
                    <CircleDot size={14} className="text-[var(--color-success)]" />
                  ) : (
                    <Circle size={14} strokeWidth={2} />
                  )}
                  <span>{product.date}</span>
                </div>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  aria-label="Options"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
              <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
                <div className="w-full aspect-[3/1] rounded-lg overflow-hidden bg-[var(--color-bg-elevated)] flex items-center justify-center mb-3">
                  <LinearLightPlaceholder className="w-full h-full object-contain" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)] truncate">
                  {product.name}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] truncate mt-0.5">
                  {product.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
