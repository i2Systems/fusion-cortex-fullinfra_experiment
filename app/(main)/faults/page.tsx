/**
 * Faults / Health Section
 * 
 * Main area: Fault list (left side)
 * Right panel: Fault details with troubleshooting steps
 * 
 * AI Note: Shows device health issues, missing devices, offline devices, low battery warnings.
 */

'use client'

import { useState, useMemo } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { FaultList } from '@/components/faults/FaultList'
import { FaultDetailsPanel } from '@/components/faults/FaultDetailsPanel'
import { useDevices } from '@/lib/DeviceContext'
import { Device } from '@/lib/mockData'

interface Fault {
  device: Device
  faultType: 'missing' | 'offline' | 'low-battery'
  detectedAt: Date
  description: string
}

export default function FaultsPage() {
  const { devices } = useDevices()
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Generate faults from devices
  const faults = useMemo<Fault[]>(() => {
    const faultList: Fault[] = []

    devices.forEach(device => {
      // Missing devices
      if (device.status === 'missing') {
        faultList.push({
          device,
          faultType: 'missing',
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 24) + 1)),
          description: `Device not responding to discovery. Last seen during initial scan.`,
        })
      }
      // Offline devices
      else if (device.status === 'offline') {
        faultList.push({
          device,
          faultType: 'offline',
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 48) + 1)),
          description: `No signal received in last 24 hours. Device may be disconnected or experiencing network issues.`,
        })
      }
      // Low battery devices
      else if (device.battery !== undefined && device.battery < 20) {
        faultList.push({
          device,
          faultType: 'low-battery',
          detectedAt: new Date(Date.now() - 1000 * 60 * (Math.floor(Math.random() * 120) + 30)),
          description: `Battery level is below 20%. Replacement recommended within 48 hours.`,
        })
      }
    })

    // Sort by detected time (most recent first)
    return faultList.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }, [devices])

  const selectedFault = useMemo(() => {
    return faults.find(f => f.device.id === selectedFaultId) || null
  }, [faults, selectedFaultId])

  // Calculate summary counts
  const summary = useMemo(() => {
    return {
      missing: faults.filter(f => f.faultType === 'missing').length,
      offline: faults.filter(f => f.faultType === 'offline').length,
      lowBattery: faults.filter(f => f.faultType === 'low-battery').length,
    }
  }, [faults])

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Summary Cards */}
      <div className="px-[20px] pt-4 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="fusion-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Missing</span>
              <span className="text-2xl font-bold text-[var(--color-danger)]">{summary.missing}</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Not responding to discovery</div>
          </div>
          <div className="fusion-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Offline</span>
              <span className="text-2xl font-bold text-[var(--color-warning)]">{summary.offline}</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">No signal in last 24h</div>
          </div>
          <div className="fusion-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Low Battery</span>
              <span className="text-2xl font-bold text-[var(--color-warning)]">{summary.lowBattery}</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">Below 20% charge</div>
          </div>
        </div>
      </div>

      {/* Main Content: Fault List + Details Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-2 pb-32 overflow-visible">
        {/* Fault List - Left Side */}
        <div className="flex-1 min-w-0">
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <FaultList
              faults={faults}
              selectedFaultId={selectedFaultId}
              onFaultSelect={setSelectedFaultId}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Fault Details Panel - Right Side */}
        <FaultDetailsPanel fault={selectedFault} />
      </div>

      {/* Bottom Search Island */}
      <div className="fixed bottom-10 left-[80px] right-4 z-50">
        <SearchIsland 
          position="bottom" 
          fullWidth={true}
          title="Faults / Health"
          subtitle="Monitor device health and system status"
          placeholder="Search faults or devices..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </div>
  )
}
