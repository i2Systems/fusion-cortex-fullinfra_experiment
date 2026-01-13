/**
 * Fault List Component
 * 
 * Main view showing all device faults.
 * Clickable rows that select a fault for viewing details.
 * 
 * AI Note: This is the left-side main view, similar to RulesList and DeviceList.
 * 
 * Performance optimized with:
 * - Memoized FaultListItem component
 * - useMemo for filtered and sorted data
 * - Helper functions moved outside
 * - useCallback for handlers
 */

'use client'

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { AlertCircle, Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { Device, DeviceStatus } from '@/lib/mockData'
import { FaultCategory, faultCategories } from '@/lib/faultDefinitions'
import { useDevices } from '@/lib/DeviceContext'
import { useToast } from '@/lib/ToastContext'
import { Button } from '@/components/ui/Button'

interface Fault {
  id?: string // Database fault ID (if from database)
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

// Helper functions moved outside component
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

// Memoized FaultListItem component
interface FaultListItemProps {
  fault: Fault
  isSelected: boolean
  onSelect: () => void
}

const FaultListItem = memo(function FaultListItem({ fault, isSelected, onSelect }: FaultListItemProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  // Auto-scroll into view when selected
  useEffect(() => {
    if (isSelected && elementRef.current) {
      // Use scrollIntoView with smooth behavior for user context, 
      // but 'auto' is often better for initial deep links to avoid "jumping"
      // block: 'nearest' ensures minimal scrolling if already visible
      elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }, [onSelect])

  return (
    <div
      ref={elementRef}
      onClick={handleClick}
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
})

export function FaultList({ faults, selectedFaultId, onFaultSelect, searchQuery = '' }: FaultListProps) {
  const [sortBy, setSortBy] = useState<'deviceId' | 'faultType' | 'detectedAt'>('detectedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { devices, updateMultipleDevices } = useDevices()
  const { addToast } = useToast()
  const [isDiscovering, setIsDiscovering] = useState(false)

  // Simulate fault discovery
  const handleSimulateFaults = async () => {
    setIsDiscovering(true)

    setTimeout(() => {
      // Filter for healthy devices (online and not already in faults list)
      const healthyDevices = devices.filter(d =>
        d.status === 'online' &&
        !faults.some(f => f.device.id === d.id)
      )

      if (healthyDevices.length === 0) {
        setIsDiscovering(false)
        addToast({
          title: 'No Healthy Devices',
          message: 'All devices already have active faults.',
          type: 'warning'
        })
        return
      }

      // Pick up to 5 random devices
      const count = Math.min(5, healthyDevices.length)
      const shuffled = [...healthyDevices].sort(() => 0.5 - Math.random())
      const selectedDevices = shuffled.slice(0, count)

      const updates = selectedDevices.map(device => {
        // Randomly decide fault type and effect
        const faultType = Math.random() > 0.5 ? 'offline' : 'online'
        const battery = Math.random() > 0.8 ? 15 : device.battery // 20% chance of low battery
        const signal = Math.random() > 0.8 ? 10 : device.signal // 20% chance of low signal

        return {
          deviceId: device.id,
          updates: {
            status: faultType as DeviceStatus,
            battery,
            signal
          }
        }
      })

      updateMultipleDevices(updates)

      setIsDiscovering(false)
      addToast({
        title: 'Faults Discovered',
        message: `Detected ${count} new faults in the system.`,
        type: 'error',
        duration: 5000
      })
    }, 2000)
  }

  // Memoized filter - only recalculate when faults or searchQuery changes
  const filteredFaults = useMemo(() => {
    if (!searchQuery.trim()) return faults

    const query = searchQuery.toLowerCase()
    return faults.filter(fault => {
      const categoryInfo = faultCategories[fault.faultType]

      // Build searchable text from all fault and device fields
      const searchableText = [
        fault.device.deviceId,
        fault.device.serialNumber,
        fault.device.location,
        fault.device.zone,
        fault.device.type,
        fault.device.status,
        String(fault.device.signal),
        fault.device.battery !== undefined ? String(fault.device.battery) : '',
        fault.faultType,
        fault.description,
        categoryInfo?.label,
        categoryInfo?.shortLabel,
        categoryInfo?.description,
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(query)
    })
  }, [faults, searchQuery])

  // Memoized sort - only recalculate when filtered faults or sort settings change
  const sortedFaults = useMemo(() => {
    return [...filteredFaults].sort((a, b) => {
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
  }, [filteredFaults, sortBy, sortOrder])

  // Memoized sort handler
  const handleSort = useCallback((field: 'deviceId' | 'faultType' | 'detectedAt') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy])

  // Memoized container click handler
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('fault-list-container')) {
      onFaultSelect?.(null)
    }
  }, [onFaultSelect])

  // Keyboard navigation: up/down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFaultId || sortedFaults.length === 0) return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = sortedFaults.findIndex(f => (f.id || f.device.id) === selectedFaultId)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < sortedFaults.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex
        }

        if (newIndex !== currentIndex) {
          const selectedFault = sortedFaults[newIndex]
          onFaultSelect?.(selectedFault.id || selectedFault.device.id)
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
        onClick={handleContainerClick}
      >
        {sortedFaults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--color-text-muted)] animate-in fade-in duration-500">
            {searchQuery ? (
              <p>No faults match your search</p>
            ) : (
              <div className="flex flex-col items-center gap-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center mb-2">
                  <CheckCircle2 size={32} className="text-[var(--color-success)]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[var(--color-text)] mb-1">System Healthy</h3>
                  <p className="text-sm">No faults detected. All devices are operating within normal parameters.</p>
                </div>

                <div className="pt-4 flex flex-col items-center gap-2">
                  <p className="text-xs text-[var(--color-text-soft)]">
                    Use the simulator to test fault detection scenarios
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleSimulateFaults}
                    disabled={isDiscovering}
                    className="gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                  >
                    {isDiscovering ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                    {isDiscovering ? 'Simulating Failures...' : 'Discover Faults'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="space-y-2 p-2 fault-list-container"
            onClick={handleContainerClick}
          >
            {sortedFaults.map((fault, index) => {
              // Use fault.id if available, otherwise create a unique composite key
              const faultId = fault.id || `${fault.device.id}-${fault.faultType}-${fault.detectedAt.getTime()}-${index}`
              const isSelected = selectedFaultId === (fault.id || fault.device.id)

              return (
                <FaultListItem
                  key={faultId}
                  fault={fault}
                  isSelected={isSelected}
                  onSelect={() => onFaultSelect?.(isSelected ? null : (fault.id || fault.device.id))}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

