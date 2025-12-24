/**
 * Fault Details Panel Component
 * 
 * Right-side panel showing comprehensive fault details and device information.
 * Acts as a detailed view for understanding and resolving faults.
 * 
 * AI Note: Shows fault diagnosis, device details, troubleshooting steps, etc.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Droplets, Zap, Thermometer, Plug, Settings, Package, Wrench, Lightbulb, MapPin, Radio, RefreshCw, CheckCircle2, Clock, TrendingDown, XCircle, Battery, Shield, ExternalLink, Plus, X, ChevronDown, Info, Image } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Device, DeviceType } from '@/lib/mockData'
import { FaultCategory, faultCategories, generateFaultDescription } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus, getWarrantyStatusLabel, getWarrantyStatusTokenClass, formatWarrantyExpiry } from '@/lib/warranty'
import { getDeviceLibraryUrl, getDeviceImage } from '@/lib/libraryUtils'
import { isFixtureType } from '@/lib/deviceUtils'

interface Fault {
  device: Device
  faultType: FaultCategory
  detectedAt: Date
  description: string
}

interface FaultDetailsPanelProps {
  fault: Fault | null
  devices?: Device[]
  onAddNewFault?: (fault: { device: Device; faultType: FaultCategory; description: string }) => void
}

export function FaultDetailsPanel({ fault, devices = [], onAddNewFault }: FaultDetailsPanelProps) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<FaultCategory | ''>('')
  const [customDescription, setCustomDescription] = useState<string>('')
  
  const handleSubmitNewFault = () => {
    const deviceIdToUse = selectedDeviceId || (fault ? fault.device.id : '')
    if (!deviceIdToUse || !selectedCategory) return
    
    const device = devices.find(d => d.id === deviceIdToUse || d.deviceId === deviceIdToUse)
    if (!device) return
    
    const description = customDescription.trim() || generateFaultDescription(selectedCategory, device.deviceId)
    
    onAddNewFault?.({
      device,
      faultType: selectedCategory,
      description,
    })
    
    // Reset form
    setSelectedDeviceId('')
    setSelectedCategory('')
    setCustomDescription('')
    setShowAddForm(false)
  }
  
  if (!fault) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          {!showAddForm ? (
            <>
              {/* Empty State Content */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
                  <AlertCircle size={40} className="text-[var(--color-text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                  No Fault Selected
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-8">
                  Select a fault from the list to view detailed information and troubleshooting steps
                </p>
              </div>

              {/* Add New Fault Button */}
              {onAddNewFault && (
                <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] flex-shrink-0">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add New Fault
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Add New Fault Form */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Add New Fault</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setSelectedDeviceId('')
                    setSelectedCategory('')
                    setCustomDescription('')
                  }}
                  className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                >
                  <X size={18} className="text-[var(--color-text-muted)]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Device Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Device
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] appearance-none"
                    >
                      <option value="">Select a device...</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.deviceId} - {device.serialNumber} {device.location ? `(${device.location})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Fault Category
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(faultCategories) as FaultCategory[]).map((category) => {
                      const categoryInfo = faultCategories[category]
                      const isSelected = selectedCategory === category
                      
                      const getIcon = () => {
                        switch (category) {
                          case 'environmental-ingress': return <Droplets size={16} />
                          case 'electrical-driver': return <Zap size={16} />
                          case 'thermal-overheat': return <Thermometer size={16} />
                          case 'installation-wiring': return <Plug size={16} />
                          case 'control-integration': return <Settings size={16} />
                          case 'manufacturing-defect': return <Package size={16} />
                          case 'mechanical-structural': return <Wrench size={16} />
                          case 'optical-output': return <Lightbulb size={16} />
                          default: return null
                        }
                      }
                      
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                              : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary)]/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 p-1.5 rounded ${
                              isSelected
                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                            }`}>
                              {getIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--color-text)] mb-0.5">
                                {categoryInfo.label}
                              </div>
                              <div className="text-xs text-[var(--color-text-muted)]">
                                {categoryInfo.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Description (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Leave empty to use default description for this category..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  />
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    If left empty, a default description will be generated based on the selected category.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSubmitNewFault}
                    disabled={!selectedDeviceId || !selectedCategory}
                    className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    Add Fault
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const getFaultIcon = (faultType: FaultCategory) => {
    const iconMap: Record<FaultCategory, React.ReactNode> = {
      'environmental-ingress': <Droplets size={24} className="text-[var(--color-danger)]" />,
      'electrical-driver': <Zap size={24} className="text-[var(--color-danger)]" />,
      'thermal-overheat': <Thermometer size={24} className="text-[var(--color-warning)]" />,
      'installation-wiring': <Plug size={24} className="text-[var(--color-warning)]" />,
      'control-integration': <Settings size={24} className="text-[var(--color-primary)]" />,
      'manufacturing-defect': <Package size={24} className="text-[var(--color-primary)]" />,
      'mechanical-structural': <Wrench size={24} className="text-[var(--color-primary)]" />,
      'optical-output': <Lightbulb size={24} className="text-[var(--color-warning)]" />,
    }
    return iconMap[faultType] || <AlertCircle size={24} className="text-[var(--color-text-muted)]" />
  }

  const getFaultLabel = (faultType: FaultCategory) => {
    return faultCategories[faultType]?.label || faultType
  }

  const getFaultColor = (faultType: FaultCategory) => {
    const categoryInfo = faultCategories[faultType]
    if (!categoryInfo) {
      return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
    }
    
    const colorMap = {
      danger: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30',
      warning: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30',
      info: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    }
    
    return colorMap[categoryInfo.color] || colorMap.info
  }

  const getTroubleshootingSteps = (faultType: FaultCategory) => {
    return faultCategories[faultType]?.troubleshootingSteps || []
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const getTypeLabel = (type: string) => {
    if (type.startsWith('fixture-')) {
      // Format fixture types: 'fixture-16ft-power-entry' -> '16ft Power Entry'
      const parts = type.replace('fixture-', '').split('-')
      const size = parts[0].toUpperCase()
      const category = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      return `${size} ${category}`
    }
    switch (type) {
      case 'motion': return 'Motion Sensor'
      case 'light-sensor': return 'Light Sensor'
      default: return type
    }
  }

  const getSignalTokenClass = (signal: number) => {
    if (signal >= 80) return 'token token-data token-data-signal-high'
    if (signal >= 50) return 'token token-data token-data-signal-medium'
    return 'token token-data token-data-signal-low'
  }

  const getBatteryTokenClass = (battery: number) => {
    if (battery >= 80) return 'token token-data token-data-battery-high'
    if (battery >= 20) return 'token token-data token-data-battery-medium'
    return 'token token-data token-data-battery-low'
  }

  // Device Icon Component with image support
  function DeviceIcon({ deviceType }: { deviceType: string }) {
    const [imageError, setImageError] = useState(false)
    const [imageKey, setImageKey] = useState(0)

    // Listen for library image updates
    useEffect(() => {
      const handleImageUpdate = () => {
        setImageKey(prev => prev + 1)
        setImageError(false) // Reset error state
      }
      window.addEventListener('libraryImageUpdated', handleImageUpdate)
      return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
    }, [])

    // Call getDeviceImage on every render (it checks localStorage each time)
    const deviceImage = getDeviceImage(deviceType as DeviceType)
    const showImage = deviceImage && !imageError

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

  const troubleshootingSteps = getTroubleshootingSteps(fault.faultType)

  // If showing add form while viewing a fault, show it as an overlay
  if (showAddForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add New Fault Form */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Add New Fault</h3>
            <button
              onClick={() => {
                setShowAddForm(false)
                setSelectedDeviceId('')
                setSelectedCategory('')
                setCustomDescription('')
              }}
              className="p-1 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
            >
              <X size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Device Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Device
              </label>
              <div className="relative">
                <select
                  value={selectedDeviceId || fault.device.id}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] appearance-none"
                >
                  <option value={fault.device.id}>
                    {fault.device.deviceId} - {fault.device.serialNumber} {fault.device.location ? `(${fault.device.location})` : ''}
                  </option>
                  {devices.filter(d => d.id !== fault.device.id).map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.deviceId} - {device.serialNumber} {device.location ? `(${device.location})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Fault Category
              </label>
              <div className="space-y-2">
                {(Object.keys(faultCategories) as FaultCategory[]).map((category) => {
                  const categoryInfo = faultCategories[category]
                  const isSelected = selectedCategory === category
                  
                  const getIcon = () => {
                    switch (category) {
                      case 'environmental-ingress': return <Droplets size={16} />
                      case 'electrical-driver': return <Zap size={16} />
                      case 'thermal-overheat': return <Thermometer size={16} />
                      case 'installation-wiring': return <Plug size={16} />
                      case 'control-integration': return <Settings size={16} />
                      case 'manufacturing-defect': return <Package size={16} />
                      case 'mechanical-structural': return <Wrench size={16} />
                      case 'optical-output': return <Lightbulb size={16} />
                      default: return null
                    }
                  }
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                          : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 p-1.5 rounded ${
                          isSelected
                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                        }`}>
                          {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--color-text)] mb-0.5">
                            {categoryInfo.label}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {categoryInfo.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Description (Optional) */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Description (Optional)
              </label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Leave empty to use default description for this category..."
                rows={3}
                className="w-full px-3 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                If left empty, a default description will be generated based on the selected category.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                onClick={handleSubmitNewFault}
                disabled={!selectedCategory}
                className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add Fault
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Data-Dense Header */}
      <div className={`p-4 border-b border-[var(--color-border-subtle)] bg-gradient-to-br ${getFaultColor(fault.faultType)}/10 to-[var(--color-surface-subtle)]`}>
        <div className="flex items-start gap-3 mb-3">
          {/* Device Image/Icon */}
          <DeviceIcon deviceType={fault.device.type} />
          {/* Meta Information */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <button
                onClick={() => {
                  // Navigate to lookup page with device selected
                  sessionStorage.setItem('selectedDeviceId', fault.device.id)
                  router.push('/lookup')
                }}
                className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <h3 className="text-base font-bold text-[var(--color-text)] mb-0.5 truncate group-hover:text-[var(--color-primary)] transition-colors">
                  {fault.device.deviceId}
                </h3>
                <ExternalLink size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0" />
              </button>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {faultCategories[fault.faultType]?.shortLabel || getFaultLabel(fault.faultType)} • {getTypeLabel(fault.device.type)}
                </p>
                {getDeviceLibraryUrl(fault.device.type) && (
                  <Link
                    href={getDeviceLibraryUrl(fault.device.type)!}
                    onClick={(e) => e.stopPropagation()}
                    className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors"
                    title="View in library"
                  >
                    <Info size={10} className="text-[var(--color-primary)]" />
                  </Link>
                )}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Serial</div>
                <div className="text-xs font-mono font-semibold text-[var(--color-text)] truncate">{fault.device.serialNumber}</div>
              </div>
              {fault.device.location && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin size={10} />
                    Location
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{fault.device.location}</div>
                </div>
              )}
              {fault.device.zone && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Zone</div>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">{fault.device.zone}</div>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                <div className="text-xs text-[var(--color-text-soft)] mb-0.5 flex items-center gap-1 whitespace-nowrap">
                  <Clock size={10} />
                  Detected
                </div>
                <div className="text-xs font-semibold text-[var(--color-text)] truncate">{formatTimeAgo(fault.detectedAt)}</div>
              </div>
              {fault.device.signal > 0 && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Signal</div>
                  <div className={getSignalTokenClass(fault.device.signal)}>
                    <Radio size={10} />
                    <span>{fault.device.signal}%</span>
                  </div>
                </div>
              )}
              {fault.device.battery !== undefined && (
                <div className="px-2.5 py-1.5 rounded bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] min-w-0">
                  <div className="text-xs text-[var(--color-text-soft)] mb-0.5 whitespace-nowrap">Battery</div>
                  <div className={getBatteryTokenClass(fault.device.battery)}>
                    <Battery size={10} />
                    <span>{fault.device.battery}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-2">
        {/* Fault Description */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Fault Description</h4>
          <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              {fault.description}
            </p>
            {faultCategories[fault.faultType] && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <p className="text-xs text-[var(--color-text-soft)] mb-2">
                  <strong>Category:</strong> {faultCategories[fault.faultType].label}
                </p>
                <p className="text-xs text-[var(--color-text-soft)]">
                  {faultCategories[fault.faultType].description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Information */}
        {fault.device.warrantyExpiry && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Shield size={16} />
              Warranty Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Shield size={14} />
                  Warranty Status
                </span>
                <span className={getWarrantyStatusTokenClass(calculateWarrantyStatus(fault.device.warrantyExpiry).status)}>
                  {getWarrantyStatusLabel(calculateWarrantyStatus(fault.device.warrantyExpiry).status)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Expiry Date</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {formatWarrantyExpiry(fault.device.warrantyExpiry)}
                </span>
              </div>
              {calculateWarrantyStatus(fault.device.warrantyExpiry).daysRemaining !== null && (
                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                  <span className="text-sm text-[var(--color-text-muted)]">Days Remaining</span>
                  <span className={`text-sm font-medium ${
                    calculateWarrantyStatus(fault.device.warrantyExpiry).isNearEnd
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-text)]'
                  }`}>
                    {calculateWarrantyStatus(fault.device.warrantyExpiry).daysRemaining} days
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device Information */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Device Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Serial Number</span>
              <span className="text-sm font-mono font-medium text-[var(--color-text)]">
                {fault.device.serialNumber}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)]">Type</span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {getTypeLabel(fault.device.type)}
              </span>
            </div>
            {fault.device.location && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">
                  {fault.device.location}
                </span>
              </div>
            )}
            {fault.device.zone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)]">Zone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {fault.device.zone}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                <Radio size={14} />
                Signal Strength
              </span>
              <span className={`text-sm font-medium ${
                fault.device.signal >= 80 ? 'text-[var(--color-success)]' :
                fault.device.signal >= 50 ? 'text-[var(--color-warning)]' :
                'text-[var(--color-danger)]'
              }`}>
                {fault.device.signal}%
              </span>
            </div>
            {fault.device.battery !== undefined && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface-subtle)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Battery size={14} className={fault.device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'} />
                  Battery Level
                </span>
                <span className={`text-sm font-medium ${
                  fault.device.battery > 20 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
                }`}>
                  {fault.device.battery}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Steps */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <RefreshCw size={16} />
            Troubleshooting Steps
          </h4>
          <div className="space-y-2">
            {troubleshootingSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] flex-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Status History */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <TrendingDown size={16} />
            Status History
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <XCircle size={16} className="text-[var(--color-danger)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">Fault detected</p>
                <p className="text-xs text-[var(--color-text-muted)]">{formatTimeAgo(fault.detectedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-subtle)]">
              <CheckCircle2 size={16} className="text-[var(--color-success)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">Last online</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {fault.device.status === 'missing' 
                    ? 'Never' 
                    : fault.device.status === 'offline'
                    ? `${Math.floor((Date.now() - fault.detectedAt.getTime()) / (1000 * 60 * 60)) + 1} hours ago`
                    : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2 flex-shrink-0">
        <button className="w-full fusion-button fusion-button-primary flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          Retry Connection
        </button>
        <button 
          className="w-full fusion-button"
          style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}
        >
          Mark as Resolved
        </button>
        {onAddNewFault && (
          <button
            onClick={() => {
              // Pre-select the current device when adding a new fault
              setSelectedDeviceId(fault.device.id)
              setShowAddForm(true)
            }}
            className="w-full px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Related Fault
          </button>
        )}
      </div>
    </div>
  )
}

