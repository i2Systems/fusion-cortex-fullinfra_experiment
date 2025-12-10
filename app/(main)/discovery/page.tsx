/**
 * Discovery Section
 * 
 * Network discovery interface for finding devices.
 * Supports both automatic network scanning and manual device entry.
 * 
 * AI Note: This is the main discovery interface. Should integrate
 * with tRPC endpoints for starting/stopping discovery and fetching results.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { DiscoveryControls } from '@/components/discovery/DiscoveryControls'
import { DiscoveryProgress } from '@/components/discovery/DiscoveryProgress'
import { DiscoveredDevicesList } from '@/components/discovery/DiscoveredDevicesList'
import { ManualDeviceEntry } from '@/components/discovery/ManualDeviceEntry'
import { Device } from '@/lib/mockData'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { detectZonesFromDevices } from '@/lib/zoneDetection'

export default function DiscoveryPage() {
  const { devices, addDevice, setDevices } = useDevices()
  const { zones, addZone, deleteZone } = useZones()
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [devicesFound, setDevicesFound] = useState(0)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [scanDuration, setScanDuration] = useState(0)
  const [zonesCreated, setZonesCreated] = useState(0)
  const [isCreatingZones, setIsCreatingZones] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Use devices from context as discovered devices
  const discoveredDevices = devices

  // Simulate discovery scan
  useEffect(() => {
    if (isScanning) {
      const startTime = Date.now()
      // Import mockDevices for the scan simulation
      import('@/lib/mockData').then(({ mockDevices: mockDevicesData }) => {
        // Shuffle and take first 250 devices to simulate discovery
        const devicesToDiscover = [...mockDevicesData].sort(() => Math.random() - 0.5).slice(0, 250)
        let discoveredCount = 0
        
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000
          setScanDuration(Math.floor(elapsed))
          
          // Simulate progress (0-100%) - faster scan for demo (5 seconds)
          const progress = Math.min((elapsed / 5) * 100, 100) // 5 second scan
          setScanProgress(progress)
          
          // Simulate finding devices - add them to the shared context as discovered
          const targetCount = Math.floor((progress / 100) * 250)
          if (targetCount > discoveredCount && discoveredCount < devicesToDiscover.length) {
            const devicesToAdd = devicesToDiscover.slice(discoveredCount, targetCount)
            // Add devices to shared context
            devicesToAdd.forEach(device => {
              addDevice(device)
            })
            discoveredCount = targetCount
            setDevicesFound(discoveredCount)
          }
          
          // Complete scan
          if (progress >= 100) {
            setIsScanning(false)
            setLastRun(new Date())
            clearInterval(interval)
            
            // Auto-create zones from discovered devices
            setTimeout(() => {
              createZonesFromDevices()
            }, 300) // Small delay to ensure all devices are added
          }
        }, 100) // Update every 100ms for faster progress
        
        return () => clearInterval(interval)
      })
    } else {
      // Reset when not scanning
      setScanProgress(0)
    }
  }, [isScanning, addDevice])

  const handleStartScan = () => {
    // Clear existing devices and zones for a fresh discovery
    setDevices([])
    setZonesCreated(0)
    
    // Clear all existing zones (they'll be recreated from discovered devices)
    zones.forEach(zone => {
      deleteZone(zone.id)
    })
    
    setIsScanning(true)
    setScanProgress(0)
    setDevicesFound(0)
    setScanDuration(0)
    // In production, this would trigger a tRPC call to start network scan
  }

  const handleStopScan = () => {
    setIsScanning(false)
    if (scanProgress > 0) {
      setLastRun(new Date())
    }
    // In production, this would trigger a tRPC call to stop the scan
  }

  const handleManualEntry = () => {
    setShowManualEntry(true)
  }

  const handleAddDevice = (deviceData: { deviceId: string; serialNumber: string; type: 'fixture' | 'motion' | 'light-sensor' }) => {
    const newDevice: Device = {
      id: `device-${Date.now()}`,
      ...deviceData,
      signal: Math.floor(Math.random() * 40) + 50,
      battery: deviceData.type !== 'fixture' ? Math.floor(Math.random() * 40) + 60 : undefined,
      status: 'online',
      location: 'Manually Added',
      x: Math.random(),
      y: Math.random(),
    }
    addDevice(newDevice) // Add to shared context
    setDevicesFound(devices.length + 1)
  }

  const handleQRScan = () => {
    // Placeholder for QR code scanning
    alert('QR code scanning would open camera here. In production, this would use the device camera to scan I2QR codes on devices.')
  }

  const handleImport = () => {
    // Placeholder for importing device list
    alert('Import functionality would open file picker here. Supports CSV or JSON device lists.')
  }

  const createZonesFromDevices = useCallback(() => {
    if (devices.length === 0) return
    
    setIsCreatingZones(true)
    
    // Detect zones from discovered devices (already limited to 12)
    const detectedZones = detectZonesFromDevices(devices)
    
    // Clear existing zones first (since we're starting fresh)
    // Then create all detected zones
    zones.forEach(zone => {
      deleteZone(zone.id)
    })
    
    // Create all detected zones (already limited to 12 max)
    detectedZones.forEach(zoneData => {
      addZone(zoneData)
    })
    
    setZonesCreated(detectedZones.length)
    setIsCreatingZones(false)
  }, [devices, zones, addZone, deleteZone])

  const handleExport = () => {
    // Export discovered devices as JSON
    if (devices.length === 0) {
      alert('No devices to export')
      return
    }
    const dataStr = JSON.stringify(devices, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `devices-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatLastRun = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="main-content-area h-full p-8 relative pb-48">
      <div className="max-w-6xl mx-auto">
        {/* Discovery Controls */}
        <DiscoveryControls
          isScanning={isScanning}
          onStartScan={handleStartScan}
          onStopScan={handleStopScan}
          onManualEntry={handleManualEntry}
          onQRScan={handleQRScan}
          onImport={handleImport}
          onExport={handleExport}
        />

        {/* Progress (only shown when scanning) */}
        <DiscoveryProgress
          isScanning={isScanning}
          progress={scanProgress}
          devicesFound={devices.length}
          devicesPerSecond={devices.length > 0 ? devices.length / Math.max(scanDuration, 1) : 0}
          estimatedTimeRemaining={scanProgress > 0 ? (5 * (1 - scanProgress / 100)) : 5}
          currentSubnet={isScanning ? `192.168.1.${Math.floor(scanProgress / 4)}/24` : undefined}
        />

        {/* Zone Creation Status */}
        {isCreatingZones && (
          <div className="fusion-card mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
              <span className="text-sm text-[var(--color-text)]">
                Analyzing discovered devices and creating zones...
              </span>
            </div>
          </div>
        )}
        {zonesCreated > 0 && !isCreatingZones && (
          <div className="fusion-card mb-6 border border-[var(--color-success)]/30 bg-[var(--color-success)]/10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)]"></div>
              <span className="text-sm text-[var(--color-text)]">
                <strong>{zonesCreated} zone{zonesCreated !== 1 ? 's' : ''}</strong> automatically created from discovered devices
              </span>
            </div>
          </div>
        )}

        {/* Discovery Status & Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="fusion-card">
            <h3 className="text-md font-semibold text-[var(--color-text)] mb-4">
              Discovery Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Status</span>
                <span className={isScanning ? 'text-[var(--color-primary)]' : 'text-[var(--color-success)]'}>
                  {isScanning ? 'Scanning...' : 'Idle'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Devices Found</span>
                <span className="text-[var(--color-text)] font-semibold">{devices.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Zones Created</span>
                <span className="text-[var(--color-text)] font-semibold">
                  {isCreatingZones ? '...' : zones.length}
                </span>
              </div>
              {zonesCreated > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">New Zones</span>
                  <span className="text-[var(--color-success)] font-semibold">+{zonesCreated}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Last Run</span>
                <span className="text-[var(--color-text-muted)]">{formatLastRun(lastRun)}</span>
              </div>
              {scanDuration > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Duration</span>
                  <span className="text-[var(--color-text-muted)]">{formatDuration(scanDuration)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Discovered Devices List */}
          <div className="lg:col-span-2">
            <DiscoveredDevicesList
              devices={devices}
              onDeviceSelect={setSelectedDevice}
              selectedDeviceId={selectedDevice?.id || null}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <ManualDeviceEntry
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onAdd={handleAddDevice}
      />

      {/* Bottom Search Island */}
      <div className="fixed bottom-10 left-[80px] right-4 z-50">
      <SearchIsland 
        position="bottom" 
        fullWidth={true}
        title="Device Discovery"
        subtitle="Discover and map all lighting devices in your network"
        placeholder="Search devices or type 'start scan' or 'add device'..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onActionDetected={(action) => {
          if (action.id === 'start-scan' && !isScanning) {
            handleStartScan()
          } else if (action.id === 'add-manual') {
            setShowManualEntry(true)
          }
        }}
      />
      </div>
    </div>
  )
}
