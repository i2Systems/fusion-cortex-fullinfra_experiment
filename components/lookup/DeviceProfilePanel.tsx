/**
 * Device Profile Panel Component
 * 
 * Right-side panel showing comprehensive device details.
 * Acts as an "object profile page" for understanding the light.
 * 
 * AI Note: Shows I2QR details, build date, CCT, warranty, parts list, etc.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Image, Calendar, Thermometer, Shield, Package, MapPin, Radio, Battery, Wifi, WifiOff, CheckCircle2, AlertCircle, XCircle, QrCode, AlertTriangle, ExternalLink, Plus, Upload, Download, Info, Trash2, Loader2, Download as DownloadIcon, Maximize2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Device, Component, DeviceType } from '@/lib/mockData'
import { ComponentTree } from '@/components/shared/ComponentTree'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { assignFaultCategory, generateFaultDescription, faultCategories } from '@/lib/faultDefinitions'
import { useDevices } from '@/lib/hooks/useDevices'
import { isFixtureType } from '@/lib/deviceUtils'
import { getDeviceLibraryUrl, getDeviceImage, getDeviceImageAsync } from '@/lib/libraryUtils'
import { SelectSwitcher } from '@/components/shared/SelectSwitcher'
import { getStatusTokenClass, getSignalTokenClass, getBatteryTokenClass } from '@/lib/styleUtils'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/lib/ToastContext'
import { DeviceFocusedModal } from './DeviceFocusedContent'
import { ConfirmationModal } from '@/components/shared/ConfirmationModal'

interface DeviceProfilePanelProps {
  device: Device | null
  /** When device has no assigned person, show this as default (e.g. site manager name) */
  siteManagerName?: string | null
  onDeviceSelect?: (device: Device | null) => void
  onComponentClick?: (component: Component, parentDevice: Device) => void
  onManualEntry?: () => void
  onQRScan?: () => void
  onImport?: () => void
  onExport?: () => void
  onDelete?: (deviceId: string) => void
  onEdit?: (device: Device) => void
}

// Device Icon Component with image support
function DeviceIcon({ deviceType }: { deviceType: string }) {
  const [imageError, setImageError] = useState(false)
  const [deviceImage, setDeviceImage] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(0) // For forcing image reload when needed
  const currentImageRef = useRef<string | null>(null)

  // Load device image (database first, then client storage, then default)
  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      // Try sync first (for localStorage images)
      const syncImage = getDeviceImage(deviceType as DeviceType)
      if (syncImage && !syncImage.startsWith('https://images.unsplash.com')) {
        if (isMounted && currentImageRef.current !== syncImage) {
          currentImageRef.current = syncImage
          setDeviceImage(syncImage)
          setImageError(false)
        }
        return
      }

      // Try async (for database/IndexedDB images)
      try {
        const asyncImage = await getDeviceImageAsync(deviceType as DeviceType)
        if (asyncImage && !asyncImage.startsWith('https://images.unsplash.com')) {
          if (isMounted && currentImageRef.current !== asyncImage) {
            currentImageRef.current = asyncImage
            setDeviceImage(asyncImage)
            setImageError(false)
          }
          return
        } else if (asyncImage) {
          // Default image
          if (isMounted && currentImageRef.current !== asyncImage) {
            currentImageRef.current = asyncImage
            setDeviceImage(asyncImage)
            setImageError(false)
          }
          return
        }
      } catch (error) {
        console.error('Failed to load device image:', error)
      }

      // Fallback to sync default
      const defaultImage = getDeviceImage(deviceType as DeviceType)
      if (isMounted && currentImageRef.current !== defaultImage) {
        currentImageRef.current = defaultImage
        setDeviceImage(defaultImage)
        setImageError(false)
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [deviceType])

  // Listen for library image updates - only reload if image actually changed
  useEffect(() => {
    const handleImageUpdate = async () => {
      // Reload the image to check if it changed
      const syncImage = getDeviceImage(deviceType as DeviceType)
      if (syncImage && syncImage !== currentImageRef.current) {
        currentImageRef.current = syncImage
        setDeviceImage(syncImage)
        setImageError(false)
        setImageKey(prev => prev + 1) // Only update key when image actually changes
        return
      }

      try {
        const asyncImage = await getDeviceImageAsync(deviceType as DeviceType)
        if (asyncImage && asyncImage !== currentImageRef.current) {
          currentImageRef.current = asyncImage
          setDeviceImage(asyncImage)
          setImageError(false)
          setImageKey(prev => prev + 1) // Only update key when image actually changes
        }
      } catch (error) {
        // Ignore errors on update
      }
    }
    window.addEventListener('libraryImageUpdated', handleImageUpdate)
    return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
  }, [deviceType])

  const showImage = deviceImage && !imageError

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Lighting Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  return (
    <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-soft)] overflow-hidden relative">
      {showImage ? (
        <img
          key={imageKey}
          src={deviceImage}
          alt={getTypeLabel(deviceType)}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isFixtureType(deviceType as DeviceType) ? (
            <Image size={32} className="text-[var(--color-primary)]" />
          ) : deviceType === 'motion' ? (
            <Radio size={32} className="text-[var(--color-accent)]" />
          ) : (
            <Thermometer size={32} className="text-[var(--color-success)]" />
          )}
        </div>
      )}
    </div>
  )
}

export function DeviceProfilePanel({ device, siteManagerName, onDeviceSelect, onComponentClick, onManualEntry, onQRScan, onImport, onExport, onDelete, onEdit }: DeviceProfilePanelProps) {
  const router = useRouter()
  const { devices, addDevice } = useDevices()
  const { addToast } = useToast()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [showFocusedModal, setShowFocusedModal] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Simulate device discovery with structured groups
  const handleSimulateDiscovery = async () => {
    setIsDiscovering(true)

    // Simulate network delay
    setTimeout(() => {
      const timestamp = Date.now()
      let addedCount = 0
      let globalIndex = 0

      // Entry types to cycle through for different groups
      const entryTypes: DeviceType[] = [
        'fixture-16ft-power-entry',
        'fixture-12ft-power-entry',
        'fixture-8ft-power-entry',
      ]

      // Follower types in descending size order (will cycle through)
      const followerTypes: DeviceType[] = [
        'fixture-16ft-follower',
        'fixture-12ft-follower',
        'fixture-8ft-follower',
      ]

      // Sensor types to add at the end of each group
      const sensorTypes: DeviceType[] = [
        'motion',
        'light-sensor',
      ]

      // Possible fixture counts per group (not including sensors)
      const fixtureCountOptions = [6, 8, 10]

      // Create 2 groups with different configurations
      const numGroups = 2

      for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
        // Pick a random fixture count for this group
        const fixtureCount = fixtureCountOptions[Math.floor(Math.random() * fixtureCountOptions.length)]

        // Each group gets a different entry type
        const entryType = entryTypes[groupIndex % entryTypes.length]

        let devicePositionInGroup = 1 // Start at 1 for user-friendly numbering

        // 1. First device: Entry light
        const entryDevice: Device = {
          id: `discovered-${timestamp}-${globalIndex}`,
          deviceId: `G${groupIndex + 1}-${devicePositionInGroup}`,
          serialNumber: `SN-${timestamp}-G${groupIndex + 1}-${devicePositionInGroup}`,
          type: entryType,
          signal: Math.floor(Math.random() * 40) + 60,
          status: 'online',
          location: `Group ${groupIndex + 1}`,
          zone: `Discovery Zone ${groupIndex + 1}`,
          warrantyStatus: 'Active',
          warrantyExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        }
        addDevice(entryDevice)
        addedCount++
        globalIndex++
        devicePositionInGroup++

        // 2. Remaining fixtures: Followers (cycling through sizes 16→12→8)
        for (let i = 0; i < fixtureCount - 1; i++) {
          const followerType = followerTypes[i % followerTypes.length]

          const followerDevice: Device = {
            id: `discovered-${timestamp}-${globalIndex}`,
            deviceId: `G${groupIndex + 1}-${devicePositionInGroup}`,
            serialNumber: `SN-${timestamp}-G${groupIndex + 1}-${devicePositionInGroup}`,
            type: followerType,
            signal: Math.floor(Math.random() * 40) + 60,
            status: 'online',
            location: `Group ${groupIndex + 1}`,
            zone: `Discovery Zone ${groupIndex + 1}`,
            warrantyStatus: 'Active',
            warrantyExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
          }
          addDevice(followerDevice)
          addedCount++
          globalIndex++
          devicePositionInGroup++
        }

        // 3. Add sensors at the end of the group (1 motion, 1 light-sensor)
        for (const sensorType of sensorTypes) {
          const sensorDevice: Device = {
            id: `discovered-${timestamp}-${globalIndex}`,
            deviceId: `G${groupIndex + 1}-${devicePositionInGroup}`,
            serialNumber: `SN-${timestamp}-G${groupIndex + 1}-${devicePositionInGroup}`,
            type: sensorType,
            signal: Math.floor(Math.random() * 40) + 60,
            status: 'online',
            location: `Group ${groupIndex + 1}`,
            zone: `Discovery Zone ${groupIndex + 1}`,
            warrantyStatus: 'Active',
            warrantyExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
          }
          addDevice(sensorDevice)
          addedCount++
          globalIndex++
          devicePositionInGroup++
        }
      }

      setIsDiscovering(false)
      addToast({
        title: 'Discovery Complete',
        message: `Discovered ${addedCount} devices in ${numGroups} groups (fixtures + sensors).`,
        type: 'success',
        duration: 5000
      })

    }, 2000)
  }



  if (!device) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with secondary actions as icon buttons */}
        <div className="fusion-panel-header">
          <h2 className="fusion-panel-header-title text-base">Devices</h2>
          <div className="fusion-panel-header-actions">
            <button type="button" onClick={onManualEntry} className="fusion-panel-header-action" title="Add device manually">
              <Plus size={18} />
            </button>
            <button type="button" onClick={onQRScan} className="fusion-panel-header-action" title="Scan QR code">
              <QrCode size={18} />
            </button>
            <button type="button" onClick={onImport} className="fusion-panel-header-action" title="Import list">
              <Upload size={18} />
            </button>
            <button type="button" onClick={onExport} className="fusion-panel-header-action" title="Export">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex flex-col min-h-0">
          <PanelEmptyState
            icon={QrCode}
            title="No Device Selected"
            description="Select a device from the list to view detailed information"
          />
        </div>

        {/* Single primary CTA in footer */}
        <div className="fusion-panel-footer">
          <Button
            onClick={handleSimulateDiscovery}
            disabled={isDiscovering}
            variant="primary"
            className="w-full flex items-center justify-center gap-2 text-sm"
            title="Discover Devices"
          >
            {isDiscovering ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
            {isDiscovering ? 'Discovering...' : 'Discover Devices'}
          </Button>
        </div>
      </div>
    )
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixture': return 'Lighting Fixture'
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 size={14} />
      case 'offline': return <XCircle size={14} />
      case 'missing': return <AlertCircle size={14} />
      default: return null
    }
  }

  // Get warranty info
  const warrantyInfo = calculateWarrantyStatus(device.warrantyExpiry)

  // Generate fake I2QR data based on device (use actual data if available)
  const buildDate = device.warrantyExpiry
    ? new Date(new Date(device.warrantyExpiry).getTime() - 5 * 365 * 24 * 60 * 60 * 1000) // Approximate 5 years before warranty expiry
    : new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
  const cct = isFixtureType(device.type) ? [2700, 3000, 3500, 4000, 5000][Math.floor(Math.random() * 5)] : undefined
  const partsList = isFixtureType(device.type)
    ? ['LCM', 'Driver Board', 'Power Supply', 'LED Board', 'Metal Bracket', 'Cable Harness', 'Lower LED Housing with Optic', 'Sensor']
    : device.type === 'motion'
      ? ['PIR Sensor', 'Lens', 'Mounting Bracket']
      : ['Photodiode', 'Lens', 'Mounting Bracket']

  // Generate faults for this device (similar to faults page logic)
  const deviceFaults = (() => {
    const faults: Array<{ faultType: string; description: string; detectedAt: Date }> = []

    // Check if device has fault status
    if (device.status === 'missing' || device.status === 'offline') {
      const faultCategory = assignFaultCategory(device)
      faults.push({
        faultType: faultCategory,
        description: generateFaultDescription(faultCategory, device.deviceId),
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * (Math.floor(Math.random() * 48) + 1)),
      })
    }

    // Check for low battery
    if (device.battery !== undefined && device.battery < 20) {
      faults.push({
        faultType: 'electrical-driver',
        description: device.battery < 10
          ? `Critical battery level (${device.battery}%). Device may shut down. Power supply or charging system issue suspected.`
          : `Battery level is below 20% (${device.battery}%). Replacement recommended. May indicate charging system or power supply problem.`,
        detectedAt: new Date(Date.now() - 1000 * 60 * (Math.floor(Math.random() * 120) + 30)),
      })
    }

    return faults
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Data-Dense Header */}
      <div className="p-3 md:p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-primary-soft)]/30 to-[var(--color-surface-subtle)]">
        <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
          {/* Device Image/Icon */}
          <DeviceIcon deviceType={device.type} />
          {/* Meta Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1.5 md:mb-2">
              <div className="flex-1 min-w-0">
                {onDeviceSelect && devices.length > 1 ? (
                  <SelectSwitcher
                    items={devices}
                    selectedItem={device}
                    onSelect={onDeviceSelect}
                    getLabel={(d) => d.deviceId}
                    getKey={(d) => d.id}
                    className="mb-1"
                    maxWidth="100%"
                  />
                ) : (
                  <h3 className="text-sm md:text-base font-bold text-[var(--color-text)] mb-0.5 truncate">
                    {device.deviceId}
                  </h3>
                )}
                <div className="flex items-center gap-1 md:gap-1.5">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {getTypeLabel(device.type)}
                  </p>
                  {getDeviceLibraryUrl(device.type) && (
                    <Link
                      href={getDeviceLibraryUrl(device.type)!}
                      onClick={(e) => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                      title="View in library"
                    >
                      <Info size={12} className="text-[var(--color-primary)]" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="fusion-panel-header-actions">
                <button
                  type="button"
                  onClick={() => setShowFocusedModal(true)}
                  className="fusion-panel-header-action text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  title="Open focused view"
                >
                  <Maximize2 size={14} />
                </button>
                <span className={getStatusTokenClass(device.status)}>
                  {getStatusIcon(device.status)}
                  {device.status}
                </span>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
              <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-[10px] md:text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Serial</div>
                <div className="text-[10px] md:text-xs font-mono font-semibold text-[var(--color-text)] truncate">{device.serialNumber}</div>
              </div>
              {device.location && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin size={10} />
                    Location
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{device.location}</div>
                </div>
              )}
              {device.zone && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Zone</div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{device.zone}</div>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Signal</div>
                {device.signal > 0 ? (
                  <div className={getSignalTokenClass(device.signal)}>
                    <Wifi size={10} />
                    <span>{device.signal}%</span>
                  </div>
                ) : (
                  <div className="token token-data">
                    <WifiOff size={10} />
                    <span>—</span>
                  </div>
                )}
              </div>
              {device.battery !== undefined && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Battery</div>
                  <div className={getBatteryTokenClass(device.battery)}>
                    <Battery size={10} />
                    <span>{device.battery}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 pb-2">
        {/* Basic Information */}
        <div>
          <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3">Basic Information</h4>
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-xs md:text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-xs md:text-sm font-mono font-medium text-[var(--color-text)] truncate ml-2">
                {device.serialNumber}
              </span>
            </div>
            <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-xs md:text-sm text-[var(--color-text-muted)]">Device ID</span>
              <span className="text-xs md:text-sm font-medium text-[var(--color-text)] truncate ml-2">
                {device.deviceId}
              </span>
            </div>
            <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-xs md:text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-xs md:text-sm font-medium text-[var(--color-text)] truncate ml-2">
                {getTypeLabel(device.type)}
              </span>
            </div>
            <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-xs md:text-sm text-[var(--color-text-muted)]">Assigned to</span>
              <span className="text-xs md:text-sm font-medium text-[var(--color-text)] truncate ml-2">
                {device.assignedToPerson
                  ? `${device.assignedToPerson.firstName} ${device.assignedToPerson.lastName}`
                  : siteManagerName
                    ? `${siteManagerName} (default)`
                    : 'Site manager (default)'}
              </span>
            </div>
            {device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">
                  {device.location}
                </span>
              </div>
            )}
            {device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {device.zone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Connection Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                Signal Strength
              </span>
              {device.signal > 0 ? (
                <div className={getSignalTokenClass(device.signal)}>
                  <Wifi size={14} />
                  <span>{device.signal}%</span>
                </div>
              ) : (
                <div className="token token-data">
                  <WifiOff size={14} />
                  <span>—</span>
                </div>
              )}
            </div>
            {device.battery !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  Battery Level
                </span>
                <div className={getBatteryTokenClass(device.battery)}>
                  <Battery size={14} />
                  <span>{device.battery}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* I2QR Information */}
        <div>
          <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
            <QrCode size={14} className="md:w-4 md:h-4" />
            I2QR Information
          </h4>
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Calendar size={14} />
                Build Date
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {buildDate.toLocaleDateString()}
              </span>
            </div>
            {cct && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Thermometer size={14} />
                  Color Temperature
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {cct}K
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Information */}
        <div>
          <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
            <Shield size={14} className="md:w-4 md:h-4" />
            Warranty Information
          </h4>
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Shield size={14} />
                Warranty Status
              </span>
              {device.warrantyExpiry ? (
                <span className={getWarrantyStatusTokenClass(warrantyInfo.status)}>
                  {getWarrantyStatusLabel(warrantyInfo.status)}
                </span>
              ) : (
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  No warranty
                </span>
              )}
            </div>
            {device.warrantyExpiry && (
              <>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Expiry Date</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {formatWarrantyExpiry(device.warrantyExpiry)}
                  </span>
                </div>
                {warrantyInfo.daysRemaining !== null && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                    <span className="text-sm text-[var(--color-text-muted)]">Days Remaining</span>
                    <span className={`text-sm font-medium ${warrantyInfo.isNearEnd
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-text)]'
                      }`}>
                      {warrantyInfo.daysRemaining} days
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                  <Button
                    onClick={() => {
                      // Navigate to i2systems.com for replacement parts
                      window.open('https://i2systems.com', '_blank')
                    }}
                    variant="primary"
                    className="w-full flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm"
                    title="Request Replacement Parts"
                  >
                    <Package size={12} className="md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline">Request Replacement</span>
                    <span className="md:hidden">Request Parts</span>
                    <ExternalLink size={10} className="md:w-3 md:h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Firmware Information */}
        {(device.firmwareVersion || device.firmwareStatus || device.firmwareTarget) && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
              <DownloadIcon size={14} className="md:w-4 md:h-4" />
              Firmware Information
            </h4>
            <div className="space-y-1.5 md:space-y-2">
              {device.firmwareVersion && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Current Version</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {device.firmwareVersion}
                  </span>
                </div>
              )}
              {device.firmwareTarget && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Target Version</span>
                  <span className="text-sm font-medium text-yellow-400">
                    {device.firmwareTarget}
                  </span>
                </div>
              )}
              {device.firmwareStatus && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Status</span>
                  <span className={`text-sm font-medium ${device.firmwareStatus === 'UP_TO_DATE' ? 'text-green-400' :
                    device.firmwareStatus === 'UPDATE_AVAILABLE' ? 'text-yellow-400' :
                      device.firmwareStatus === 'UPDATE_IN_PROGRESS' ? 'text-blue-400' :
                        device.firmwareStatus === 'UPDATE_FAILED' ? 'text-red-400' :
                          'text-[var(--color-text-muted)]'
                    }`}>
                    {device.firmwareStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {device.lastFirmwareUpdate && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Last Updated</span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(device.lastFirmwareUpdate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {device.firmwareStatus === 'UPDATE_AVAILABLE' && (
                <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                  <Link
                    href={`/firmware?deviceId=${device.id}`}
                    className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 justify-center p-2 rounded-lg bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    View firmware updates
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device Faults */}
        {deviceFaults.length > 0 && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
              <AlertTriangle size={14} className="md:w-4 md:h-4 text-[var(--color-warning)]" />
              Active Faults
            </h4>
            <div className="space-y-1.5 md:space-y-2">
              {deviceFaults.map((fault, index) => {
                const categoryInfo = faultCategories[fault.faultType as keyof typeof faultCategories]
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--color-text-muted)]">
                        {categoryInfo?.shortLabel || fault.faultType}
                      </span>
                      <span className="text-xs text-[var(--color-text-soft)]">
                        {new Date(fault.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {fault.description}
                    </p>
                    <button
                      onClick={() => {
                        sessionStorage.setItem('highlightDevice', device.deviceId)
                        router.push('/faults')
                      }}
                      className="mt-2 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 flex items-center gap-1"
                    >
                      View on Faults page
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Components */}
        {device.components && device.components.length > 0 && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
              <Package size={14} className="md:w-4 md:h-4" />
              Components
            </h4>
            <ComponentTree
              components={device.components}
              expanded={true}
              showHeader={false}
              parentDevice={device}
              onComponentClick={onComponentClick}
            />
          </div>
        )}

        {/* Parts List (fallback for devices without components) */}
        {(!device.components || device.components.length === 0) && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
              <Package size={14} className="md:w-4 md:h-4" />
              Parts List
            </h4>
            <div className="space-y-1 md:space-y-1.5">
              {partsList.map((part, index) => (
                <div
                  key={index}
                  className="p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)] text-xs md:text-sm text-[var(--color-text-muted)]"
                >
                  {part}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Position */}
        {device.x !== undefined && device.y !== undefined && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-[var(--color-text)] mb-2 md:mb-3">Map Position</h4>
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-xs md:text-sm text-[var(--color-text-muted)]">X Coordinate</span>
                <span className="text-xs md:text-sm font-medium text-[var(--color-text)]">
                  {(device.x * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5 md:p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-xs md:text-sm text-[var(--color-text-muted)]">Y Coordinate</span>
                <span className="text-xs md:text-sm font-medium text-[var(--color-text)]">
                  {(device.y * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Delete Action - at bottom of scrollable content */}
        {onDelete && (
          <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)]">
            <Button onClick={() => setIsDeleteModalOpen(true)} variant="danger" className="w-full flex items-center justify-center gap-2">
              <Trash2 size={14} />
              Delete Device
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete(device.id)
            setIsDeleteModalOpen(false)
          }
        }}
        title="Delete Device"
        message={`Are you sure you want to delete device "${device.deviceId}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Device"
      />

      {/* Focused Modal */}
      <DeviceFocusedModal
        isOpen={showFocusedModal}
        onClose={() => setShowFocusedModal(false)}
        device={device}
        allDevices={devices}
        onComponentClick={onComponentClick}
      />
    </div>
  )
}

