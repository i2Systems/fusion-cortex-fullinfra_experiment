/**
 * Fault List Component
 * 
 * Main view showing all device faults.
 * Clickable rows that select a fault for viewing details.
 * 
 * AI Note: This is the left-side main view, similar to RulesList and DeviceList.
 */

'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb } from 'lucide-react'
import { Device } from '@/lib/mockData'
import { FaultCategory, faultCategories } from '@/lib/faultDefinitions'

interface Fault {
  device: Device
  faultType: FaultCategory
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
    const categoryInfo = faultCategories[fault.faultType]
    return (
      fault.device.deviceId.toLowerCase().includes(query) ||
      fault.device.serialNumber.toLowerCase().includes(query) ||
      (fault.device.location && fault.device.location.toLowerCase().includes(query)) ||
      (fault.device.zone && fault.device.zone.toLowerCase().includes(query)) ||
      fault.faultType.toLowerCase().includes(query) ||
      (categoryInfo && (
        categoryInfo.label.toLowerCase().includes(query) ||
        categoryInfo.shortLabel.toLowerCase().includes(query) ||
        categoryInfo.description.toLowerCase().includes(query)
      )) ||
      fault.description.toLowerCase().includes(query)
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

  const getFaultIcon = (faultType: FaultCategory) => {
    const iconMap: Record<FaultCategory, React.ReactNode> = {
      'environmental-ingress': <Droplets size={18} className="text-[var(--color-danger)]" />,
      'electrical-driver': <Zap size={18} className="text-[var(--color-danger)]" />,
      'thermal-overheat': <Thermometer size={18} className="text-[var(--color-warning)]" />,
      'installation-wiring': <Plug size={18} className="text-[var(--color-warning)]" />,
      'control-integration': <Settings size={18} className="text-[var(--color-info)]" />,
      'manufacturing-defect': <Package size={18} className="text-[var(--color-info)]" />,
      'mechanical-structural': <Wrench size={18} className="text-[var(--color-info)]" />,
      'optical-output': <Lightbulb size={18} className="text-[var(--color-warning)]" />,
    }
    return iconMap[faultType] || <AlertCircle size={18} className="text-[var(--color-text-muted)]" />
  }

  const getFaultLabel = (faultType: FaultCategory) => {
    return faultCategories[faultType]?.shortLabel || faultType
  }

  const getFaultTokenClass = (faultType: FaultCategory) => {
    const categoryInfo = faultCategories[faultType]
    if (!categoryInfo) {
      return 'token token-status-offline'
    }
    
    const colorMap = {
      danger: 'token token-status-error',
      warning: 'token token-status-warning',
      info: 'token token-status-info',
    }
    
    return colorMap[categoryInfo.color] || colorMap.info
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

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an item is selected and we're not typing in an input
      if (!selectedFaultId || sortedFaults.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = sortedFaults.findIndex(f => f.device.id === selectedFaultId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < sortedFaults.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          onFaultSelect?.(sortedFaults[newIndex].device.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFaultId, sortedFaults, onFaultSelect])

  return (
    <div className="h-full flex flex-col">
      {/* Fault List */}
      <div 
        className="flex-1 overflow-auto pb-2"
        onClick={(e) => {
          // If clicking on the container itself (not a fault item), deselect
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('fault-list-container')) {
            onFaultSelect?.(null)
          }
        }}
      >
        {sortedFaults.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            {searchQuery ? 'No faults match your search' : 'No faults detected. All devices are healthy.'}
          </div>
        ) : (
          <div 
            className="space-y-2 p-2 fault-list-container"
            onClick={(e) => {
              // If clicking on empty space in the list container, deselect
              if (e.target === e.currentTarget) {
                onFaultSelect?.(null)
              }
            }}
          >
            {sortedFaults.map((fault) => {
              const isSelected = selectedFaultId === fault.device.id

              return (
                <div
                  key={fault.device.id}
                  onClick={(e) => {
                    e.stopPropagation() // Prevent container click handler
                    // Toggle: if already selected, deselect; otherwise select
                    onFaultSelect?.(isSelected ? null : fault.device.id)
                  }}
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
                        <span className={`${getFaultTokenClass(fault.faultType)} flex-shrink-0 ml-2`}>
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

