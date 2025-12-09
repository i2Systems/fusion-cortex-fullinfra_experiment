/**
 * Device Lookup Section
 * 
 * Main area: Device list (left side)
 * Right panel: Device profile with image placeholder and detailed information
 * 
 * AI Note: I2QR details include build date, CCT, warranty status, parts list.
 * Global search from TopBar should integrate with this.
 */

'use client'

import { useState, useMemo } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { DeviceList } from '@/components/lookup/DeviceList'
import { DeviceProfilePanel } from '@/components/lookup/DeviceProfilePanel'
import { useDevices } from '@/lib/DeviceContext'

export default function LookupPage() {
  const { devices } = useDevices()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  const selectedDevice = useMemo(() => {
    return devices.find(d => d.id === selectedDeviceId) || null
  }, [devices, selectedDeviceId])

  return (
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Main Content: Device List + Profile Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-4 pb-48 overflow-visible">
        {/* Device List - Left Side */}
        <div className="flex-1 min-w-0">
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <DeviceList
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceSelect={setSelectedDeviceId}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Device Profile Panel - Right Side */}
        <DeviceProfilePanel device={selectedDevice} />
      </div>

      {/* Bottom Search Island */}
      <div className="fixed bottom-10 left-[80px] right-4 z-50">
        <SearchIsland 
          position="bottom" 
          fullWidth={true}
          title="Device Lookup"
          subtitle="Search for devices by ID or serial number"
          placeholder="Enter device ID or serial number..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </div>
  )
}
