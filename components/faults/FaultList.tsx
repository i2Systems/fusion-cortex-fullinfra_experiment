/**
 * Fault List Component
 * 
 * Main view showing all device faults.
 * Clickable rows that select a fault for viewing details.
 * 
 * AI Note: This is the left-side main view, similar to RulesList and DeviceList.
 */

'use client'

import { useState } from 'react'
import { AlertCircle, WifiOff, Battery, XCircle, CheckCircle2 } from 'lucide-react'
import { Device } from '@/lib/mockData'

interface Fault {
  device: Device
  faultType: 'missing' | 'offline' | 'low-battery'
  detectedAt: Date
  description: string
}

interface FaultListProps {
  faults: Fault[]
  selectedFaultId?: string | null
  onFaultSelect?: (faultId: string | null) => void
  searchQuery?: string
}

export function FaultList({ faults, selectedFaultId, onFaultSelect, searchQuery = '' }: FaultListProps) {
  const [sortBy, setSortBy] = useState<'deviceId' | 'faultType' | 'detectedAt'>('detectedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter faults by search query
  const filteredFaults = faults.filter(fault => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      fault.device.deviceId.toLowerCase().includes(query) ||
      fault.device.serialNumber.toLowerCase().includes(query) ||
      (fault.device.location && fault.device.location.toLowerCase().includes(query)) ||
      (fault.device.zone && fault.device.zone.toLowerCase().includes(query)) ||
      fault.faultType.toLowerCase().includes(query)
    )
  })

  // Sort faults
  const sortedFaults = [...filteredFaults].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'deviceId':
        aValue = a.device.deviceId
        bValue = b.device.deviceId
        break
      case 'faultType':
        aValue = a.faultType
        bValue = b.faultType
        break
      case 'detectedAt':
        aValue = a.detectedAt.getTime()
        bValue = b.detectedAt.getTime()
        break
    }

    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const getFaultIcon = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return <XCircle size={18} className="text-[var(--color-danger)]" />
      case 'offline':
        return <WifiOff size={18} className="text-[var(--color-warning)]" />
      case 'low-battery':
        return <Battery size={18} className="text-[var(--color-warning)]" />
      default:
        return <AlertCircle size={18} className="text-[var(--color-text-muted)]" />
    }
  }

  const getFaultLabel = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return 'Missing'
      case 'offline':
        return 'Offline'
      case 'low-battery':
        return 'Low Battery'
      default:
        return faultType
    }
  }

  const getFaultColor = (faultType: string) => {
    switch (faultType) {
      case 'missing':
        return 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30'
      case 'offline':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30'
      case 'low-battery':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30'
      default:
        return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const handleSort = (field: 'deviceId' | 'faultType' | 'detectedAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Recent Faults
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {filteredFaults.length} fault{filteredFaults.length !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Fault List */}
      <div className="flex-1 overflow-auto">
        {sortedFaults.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            {searchQuery ? 'No faults match your search' : 'No faults detected. All devices are healthy.'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {sortedFaults.map((fault) => {
              const isSelected = selectedFaultId === fault.device.id

              return (
                <div
                  key={fault.device.id}
                  onClick={() => onFaultSelect?.(fault.device.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]'
                      : 'bg-[var(--color-surface-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-2 rounded-lg flex-shrink-0
                      ${isSelected
                        ? 'bg-[var(--color-primary)]/20'
                        : 'bg-[var(--color-surface)]'
                      }
                    `}>
                      {getFaultIcon(fault.faultType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-[var(--color-text)] mb-1">
                            {fault.device.deviceId}
                          </h4>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {fault.device.serialNumber}
                          </p>
                        </div>
                        <span className={`
                          text-xs px-2 py-1 rounded border flex items-center gap-1 flex-shrink-0 ml-2
                          ${getFaultColor(fault.faultType)}
                        `}>
                          {getFaultLabel(fault.faultType)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mb-2">
                        {fault.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-soft)]">
                        <span>{formatTimeAgo(fault.detectedAt)}</span>
                        {fault.device.location && (
                          <>
                            <span>•</span>
                            <span className="truncate">{fault.device.location}</span>
                          </>
                        )}
                        {fault.device.zone && (
                          <>
                            <span>•</span>
                            <span>{fault.device.zone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

