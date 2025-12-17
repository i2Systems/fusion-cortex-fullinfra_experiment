/**
 * Dashboard / Home Page
 * 
 * Multi-store overview showing all stores in a grid.
 * Each card provides a summary with key metrics, faults, warranties, and map status.
 * Clicking a card switches to that store and navigates to relevant pages.
 * 
 * AI Note: This dashboard provides a high-level view across all stores,
 * allowing users to quickly identify issues and dive into specific stores.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { StoreDetailsPanel } from '@/components/dashboard/StoreDetailsPanel'
import { useStore } from '@/lib/StoreContext'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useRules } from '@/lib/RuleContext'
import { Device } from '@/lib/mockData'
import { Zone } from '@/lib/ZoneContext'
import { Rule } from '@/lib/mockRules'
import { FaultCategory, assignFaultCategory, generateFaultDescription } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus } from '@/lib/warranty'
import { 
  AlertTriangle, 
  Shield, 
  Map, 
  MapPin, 
  ChevronRight, 
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Building2,
  Image as ImageIcon,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface StoreSummary {
  storeId: string
  storeName: string
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  healthPercentage: number
  totalZones: number
  criticalFaults: Array<{
    deviceId: string
    deviceName: string
    faultType: FaultCategory
    description: string
    location: string
  }>
  warrantiesExpiring: number // Count of warranties expiring in next 30 days
  warrantiesExpired: number // Count of expired warranties
  mapUploaded: boolean
  lastActivity?: string
  needsAttention: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { stores, activeStoreId, setActiveStore, activeStore } = useStore()
  const { devices } = useDevices()
  const { zones } = useZones()
  const { rules } = useRules()
  const [storeSummaries, setStoreSummaries] = useState<StoreSummary[]>([])
  
  // Initialize selectedStoreId - ensure it's never null when stores exist
  const getInitialSelectedStoreId = (): string => {
    if (activeStoreId) return activeStoreId
    if (stores.length > 0) return stores[0].id
    return ''
  }
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => getInitialSelectedStoreId())
  
  // Ensure at least one store is always selected
  useEffect(() => {
    if (stores.length === 0) return
    
    // If activeStoreId is set, sync selectedStoreId with it
    if (activeStoreId) {
      setSelectedStoreId(activeStoreId)
      return
    }
    
    // If no activeStoreId but we have stores, select the first one
    // This ensures a store is always selected
    const firstStoreId = stores[0].id
    setActiveStore(firstStoreId)
    setSelectedStoreId(firstStoreId)
  }, [activeStoreId, stores, setActiveStore])
  
  // Fallback: ensure selectedStoreId is never empty when stores exist
  useEffect(() => {
    if (stores.length > 0 && (!selectedStoreId || selectedStoreId === '')) {
      const storeToSelect = activeStoreId || stores[0].id
      setSelectedStoreId(storeToSelect)
      if (!activeStoreId) {
        setActiveStore(storeToSelect)
      }
    }
  }, [stores, selectedStoreId, activeStoreId, setActiveStore])

  // Load data for all stores
  useEffect(() => {
    if (typeof window === 'undefined') return

    const summaries: StoreSummary[] = stores.map(store => {
      // Load store-specific data from localStorage
      const devicesKey = `fusion_devices_${store.id}`
      const zonesKey = `fusion_zones_${store.id}`
      const rulesKey = `fusion_rules_${store.id}`
      const mapImageKey = `fusion_map-image-url_${store.id}`

      const devicesData = localStorage.getItem(devicesKey)
      const zonesData = localStorage.getItem(zonesKey)
      const mapImageData = localStorage.getItem(mapImageKey)

      let devices: Device[] = []
      let zones: Zone[] = []
      const mapUploaded = !!mapImageData

      if (devicesData) {
        try {
          devices = JSON.parse(devicesData).map((d: any) => ({
            ...d,
            warrantyExpiry: d.warrantyExpiry ? new Date(d.warrantyExpiry) : undefined,
            components: d.components?.map((c: any) => ({
              ...c,
              warrantyExpiry: c.warrantyExpiry ? new Date(c.warrantyExpiry) : undefined,
            })),
          }))
        } catch (e) {
          console.error(`Failed to parse devices for ${store.id}:`, e)
        }
      }

      if (zonesData) {
        try {
          zones = JSON.parse(zonesData).map((z: any) => ({
            ...z,
            createdAt: z.createdAt ? new Date(z.createdAt) : new Date(),
            updatedAt: z.updatedAt ? new Date(z.updatedAt) : new Date(),
          }))
        } catch (e) {
          console.error(`Failed to parse zones for ${store.id}:`, e)
        }
      }

      // Calculate stats
  const onlineDevices = devices.filter(d => d.status === 'online').length
      const offlineDevices = devices.filter(d => d.status === 'offline' || d.status === 'missing')
  const healthPercentage = devices.length > 0 
    ? Math.round((onlineDevices / devices.length) * 100)
    : 100

      // Find critical faults (offline/missing devices with fault categories)
      const criticalFaults = offlineDevices.slice(0, 3).map(device => {
        const faultType = assignFaultCategory(device)
        return {
          deviceId: device.deviceId,
          deviceName: device.deviceId,
          faultType,
          description: generateFaultDescription(faultType, device.deviceId),
          location: device.location || 'Unknown',
        }
      })

      // Count warranties expiring/expired
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      let warrantiesExpiring = 0
      let warrantiesExpired = 0

      devices.forEach(device => {
        if (device.warrantyExpiry) {
          const warranty = calculateWarrantyStatus(device.warrantyExpiry)
          if (warranty.isExpired) {
            warrantiesExpired++
          } else if (warranty.isNearEnd) {
            warrantiesExpiring++
          }
        }
        // Check component warranties
        device.components?.forEach(component => {
          if (component.warrantyExpiry) {
            const warranty = calculateWarrantyStatus(component.warrantyExpiry)
            if (warranty.isExpired) {
              warrantiesExpired++
            } else if (warranty.isNearEnd) {
              warrantiesExpiring++
            }
          }
        })
      })

      // Determine if store needs attention
      const needsAttention = 
        criticalFaults.length > 0 || 
        warrantiesExpiring > 0 || 
        warrantiesExpired > 0 || 
        !mapUploaded ||
        healthPercentage < 90

      return {
        storeId: store.id,
        storeName: store.name,
        totalDevices: devices.length,
        onlineDevices,
        offlineDevices: offlineDevices.length,
        healthPercentage,
        totalZones: zones.length,
        criticalFaults,
        warrantiesExpiring,
        warrantiesExpired,
        mapUploaded,
        needsAttention,
      }
    })

    setStoreSummaries(summaries)
  }, [stores])

  const handleStoreClick = (storeId: string, targetPage?: string) => {
    setActiveStore(storeId)
    setSelectedStoreId(storeId)
    if (targetPage) {
      router.push(targetPage)
    }
    // Don't navigate by default - just select the store
  }

  // Get detailed data for selected store
  const selectedStoreSummary = useMemo(() => {
    return storeSummaries.find(s => s.storeId === selectedStoreId) || null
  }, [storeSummaries, selectedStoreId])

  // Load detailed data for selected store
  const [selectedStoreData, setSelectedStoreData] = useState<{
    devices: Device[]
    zones: Zone[]
    rules: Rule[]
  }>({ devices: [], zones: [], rules: [] })

  useEffect(() => {
    if (!selectedStoreId || typeof window === 'undefined') return

    const devicesKey = `fusion_devices_${selectedStoreId}`
    const zonesKey = `fusion_zones_${selectedStoreId}`
    const rulesKey = `fusion_rules_${selectedStoreId}`

    const devicesData = localStorage.getItem(devicesKey)
    const zonesData = localStorage.getItem(zonesKey)
    const rulesData = localStorage.getItem(rulesKey)

    let loadedDevices: Device[] = []
    let loadedZones: Zone[] = []
    let loadedRules: Rule[] = []

    if (devicesData) {
      try {
        loadedDevices = JSON.parse(devicesData).map((d: any) => ({
          ...d,
          warrantyExpiry: d.warrantyExpiry ? new Date(d.warrantyExpiry) : undefined,
          components: d.components?.map((c: any) => ({
            ...c,
            warrantyExpiry: c.warrantyExpiry ? new Date(c.warrantyExpiry) : undefined,
          })),
        }))
      } catch (e) {
        console.error(`Failed to parse devices:`, e)
      }
    }

    if (zonesData) {
      try {
        loadedZones = JSON.parse(zonesData).map((z: any) => ({
          ...z,
          createdAt: z.createdAt ? new Date(z.createdAt) : new Date(),
          updatedAt: z.updatedAt ? new Date(z.updatedAt) : new Date(),
        }))
      } catch (e) {
        console.error(`Failed to parse zones:`, e)
      }
    }

    if (rulesData) {
      try {
        loadedRules = JSON.parse(rulesData).map((r: any) => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          lastTriggered: r.lastTriggered ? new Date(r.lastTriggered) : undefined,
        }))
      } catch (e) {
        console.error(`Failed to parse rules:`, e)
      }
    }

    setSelectedStoreData({
      devices: loadedDevices,
      zones: loadedZones,
      rules: loadedRules,
    })
  }, [selectedStoreId])

  const getHealthColor = (percentage: number) => {
    if (percentage >= 95) return 'var(--color-success)'
    if (percentage >= 85) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  const getHealthIcon = (percentage: number, iconSize: number = 16) => {
    if (percentage >= 95) return <CheckCircle2 size={iconSize} className="text-[var(--color-success)]" />
    if (percentage >= 85) return <AlertCircle size={iconSize} className="text-[var(--color-warning)]" />
    return <XCircle size={iconSize} className="text-[var(--color-danger)]" />
  }

  // Calculate dashboard insights with trends
  const dashboardInsight = useMemo(() => {
    if (storeSummaries.length === 0) return null

    const totalDevices = storeSummaries.reduce((sum, s) => sum + s.totalDevices, 0)
    const totalOnline = storeSummaries.reduce((sum, s) => sum + s.onlineDevices, 0)
    const avgHealth = Math.round(
      storeSummaries.reduce((sum, s) => sum + s.healthPercentage, 0) / storeSummaries.length
    )
    const storesNeedingAttention = storeSummaries.filter(s => s.needsAttention).length
    const totalCriticalFaults = storeSummaries.reduce((sum, s) => sum + s.criticalFaults.length, 0)

    // Simulate trend data (in production, this would come from historical data)
    // Mock: Calculate "improving" stores (health > 95% or recently improved)
    const improvingStores = storeSummaries.filter(s => s.healthPercentage >= 95).length
    const decliningStores = storeSummaries.filter(s => s.healthPercentage < 85).length
    
    // Calculate health trend (simulate by comparing stores above/below thresholds)
    const healthTrend = improvingStores > decliningStores ? 'improving' : improvingStores < decliningStores ? 'declining' : 'stable'
    const healthDelta = improvingStores - decliningStores

    // Calculate device online rate trend (simulate)
    const onlineRate = totalDevices > 0 ? (totalOnline / totalDevices) * 100 : 100
    // Mock: Assume previous online rate was slightly different
    const previousOnlineRate = onlineRate - (Math.random() * 4 - 2) // ±2% variation
    const onlineRateDelta = onlineRate - previousOnlineRate
    const onlineRateTrend = onlineRateDelta > 1 ? 'up' : onlineRateDelta < -1 ? 'down' : 'stable'

    return {
      healthTrend: {
        value: avgHealth,
        trend: healthTrend,
        delta: healthDelta,
        label: 'Health Trend',
        description: healthTrend === 'improving' 
          ? `${improvingStores} stores improving`
          : healthTrend === 'declining'
          ? `${decliningStores} stores declining`
          : 'Health stable',
      },
      onlineRate: {
        value: Math.round(onlineRate),
        trend: onlineRateTrend,
        delta: Math.round(onlineRateDelta),
        label: 'Online Rate',
        description: `${totalOnline}/${totalDevices} devices online`,
      },
    }
  }, [storeSummaries])

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Dashboard"
          subtitle="Multi-store overview"
          placeholder="Search, input a task, or ask a question..."
        />
      </div>

      {/* Main Content: Store Cards + Details Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" 
        style={{ overflow: 'visible' }}
      >
        {/* Store Cards - Left Side */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          {/* Store Cards Grid - Responsive */}
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {storeSummaries.map((summary) => {
            const store = stores.find(s => s.id === summary.storeId)
            return (
            <div
              key={summary.storeId}
              className={`fusion-card cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-strong)] flex flex-row gap-4 ${
                summary.storeId === selectedStoreId 
                  ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]/10 ring-2 ring-[var(--color-primary)]/20' 
                  : ''
              } ${summary.needsAttention && summary.storeId !== selectedStoreId ? 'ring-2 ring-[var(--color-warning)]/30' : ''}`}
              onClick={() => handleStoreClick(summary.storeId)}
            >
              {/* Store Image Placeholder - Top Left */}
              <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center relative overflow-hidden">
                <Building2 size={32} className="text-[var(--color-primary)]/40" />
                <div className="absolute bottom-1 right-1">
                  <div className="p-1 rounded bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border-subtle)]">
                    <ImageIcon size={10} className="text-[var(--color-text-muted)]" />
            </div>
          </div>
        </div>

              {/* Card Content - Right Side */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Store Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-semibold text-[var(--color-text)] truncate">
                      {summary.storeName}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getHealthIcon(summary.healthPercentage, 18)}
              <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStoreClick(summary.storeId, '/map')
                        }}
                        className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/10 transition-colors"
                        title="Explore Store"
                      >
                        <Search size={14} />
                      </button>
                </div>
                  </div>
                  {store && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin size={10} />
                        <span className="truncate">{store.city}, {store.state}</span>
                      </div>
                      {store.manager && (
                        <div className="text-[var(--color-text-soft)] truncate">
                          {store.manager}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Health & Metrics Row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: getHealthColor(summary.healthPercentage) }}>
                      {summary.healthPercentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text)]">{summary.totalDevices}</span> devices
                    </span>
                    <span className="text-[var(--color-success)]">
                      <span className="font-semibold">{summary.onlineDevices}</span> online
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text)]">{summary.totalZones}</span> zones
                    </span>
                  </div>
                </div>

                {/* Status Indicators - Horizontal */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {/* Critical Issues */}
                  {summary.criticalFaults.length > 0 && (
                    <div 
                      className="px-2 py-1 rounded-md bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 cursor-pointer hover:bg-[var(--color-danger)]/15 transition-colors flex items-center gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStoreClick(summary.storeId, '/faults')
                      }}
                    >
                      <AlertTriangle size={12} className="text-[var(--color-danger)] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[var(--color-danger)] whitespace-nowrap">
                        {summary.criticalFaults.length} Critical
                      </span>
                    </div>
                  )}

                  {/* Warranties */}
                  {(summary.warrantiesExpiring > 0 || summary.warrantiesExpired > 0) && (
                    <div className="px-2 py-1 rounded-md bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center gap-1.5">
                      <Shield size={12} className="text-[var(--color-warning)] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[var(--color-warning)] whitespace-nowrap">
                        {summary.warrantiesExpiring > 0 && `${summary.warrantiesExpiring} expiring`}
                        {summary.warrantiesExpiring > 0 && summary.warrantiesExpired > 0 && ' • '}
                        {summary.warrantiesExpired > 0 && `${summary.warrantiesExpired} expired`}
                      </span>
                    </div>
                  )}

                  {/* Map Status */}
                  {!summary.mapUploaded && (
                    <div className="px-2 py-1 rounded-md bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center gap-1.5">
                      <Map size={12} className="text-[var(--color-warning)] flex-shrink-0" />
                      <span className="text-xs font-medium text-[var(--color-warning)] whitespace-nowrap">
                        No map
                      </span>
                    </div>
                  )}
                </div>
                </div>
            </div>
            )
          })}
            </div>
          </div>

          {/* Quick Stats Summary - Pushed to Bottom */}
          {storeSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-auto pt-6 flex-shrink-0">
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Stores</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {storeSummaries.length}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Devices</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {storeSummaries.reduce((sum, s) => sum + s.totalDevices, 0).toLocaleString()}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Stores Needing Attention</div>
              <div className="text-2xl font-bold text-[var(--color-warning)]">
                {storeSummaries.filter(s => s.needsAttention).length}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Avg. Health</div>
              <div className="text-2xl font-bold text-[var(--color-success)]">
                {Math.round(
                  storeSummaries.reduce((sum, s) => sum + s.healthPercentage, 0) / storeSummaries.length
                )}%
              </div>
            </div>
            {/* Insight Card: Health Trend */}
            {dashboardInsight && (
          <div className="fusion-card">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {dashboardInsight.healthTrend.trend === 'improving' ? (
                      <TrendingUp size={14} className="text-[var(--color-success)]" />
                    ) : dashboardInsight.healthTrend.trend === 'declining' ? (
                      <TrendingDown size={14} className="text-[var(--color-danger)]" />
                    ) : (
                      <Activity size={14} className="text-[var(--color-text-muted)]" />
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {dashboardInsight.healthTrend.label}
                    </span>
                  </div>
                  {dashboardInsight.healthTrend.delta !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      dashboardInsight.healthTrend.trend === 'improving' 
                        ? 'text-[var(--color-success)]' 
                        : 'text-[var(--color-danger)]'
                    }`}>
                      {dashboardInsight.healthTrend.trend === 'improving' ? (
                        <ArrowUp size={10} />
                      ) : (
                        <ArrowDown size={10} />
                      )}
                      {Math.abs(dashboardInsight.healthTrend.delta)}
                    </div>
                  )}
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  dashboardInsight.healthTrend.trend === 'improving'
                    ? 'text-[var(--color-success)]'
                    : dashboardInsight.healthTrend.trend === 'declining'
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-text)]'
                }`}>
                  {dashboardInsight.healthTrend.value}%
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {dashboardInsight.healthTrend.description}
                </div>
              </div>
            )}
            </div>
          )}
          </div>

        {/* Store Details Panel - Right Side */}
        <div className="flex-shrink-0">
          <StoreDetailsPanel
            store={activeStore || (selectedStoreId ? stores.find(s => s.id === selectedStoreId) : stores[0]) || null}
            devices={selectedStoreData.devices}
            zones={selectedStoreData.zones}
            rules={selectedStoreData.rules}
            criticalFaults={selectedStoreSummary?.criticalFaults || []}
            warrantiesExpiring={selectedStoreSummary?.warrantiesExpiring || 0}
            warrantiesExpired={selectedStoreSummary?.warrantiesExpired || 0}
            mapUploaded={selectedStoreSummary?.mapUploaded || false}
            healthPercentage={selectedStoreSummary?.healthPercentage || 100}
            onlineDevices={selectedStoreSummary?.onlineDevices || 0}
            offlineDevices={selectedStoreSummary?.offlineDevices || 0}
            missingDevices={(selectedStoreSummary?.totalDevices || 0) - (selectedStoreSummary?.onlineDevices || 0) - (selectedStoreSummary?.offlineDevices || 0)}
          />
        </div>
      </div>
    </div>
  )
}
