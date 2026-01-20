/**
 * Dashboard / Home Page
 * 
 * Multi-site overview showing all sites in a grid.
 * Each card provides a summary with key metrics, faults, warranties, and map status.
 * Clicking a card switches to that site and navigates to relevant pages.
 * 
 * AI Note: This dashboard provides a high-level view across all stores,
 * allowing users to quickly identify issues and dive into specific stores.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { skipToken } from '@tanstack/react-query'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { ResizablePanel } from '@/components/layout/ResizablePanel'
import { SiteDetailsPanel } from '@/components/dashboard/StoreDetailsPanel'
import { AddSiteModal } from '@/components/dashboard/AddSiteModal'
import { useSite, Site } from '@/lib/SiteContext'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'
import { useRules } from '@/lib/RuleContext'
import { trpc } from '@/lib/trpc/client'
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
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'

interface SiteSummary {
  siteId: string
  siteName: string
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

// Site Image Card Component (loads from database first, then client storage)
function SiteImageCard({ siteId, sizeClass = "w-24 h-24" }: { siteId: string, sizeClass?: string }) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(0) // Force re-render on update

  // Validate siteId before querying - use skipToken to completely skip query if invalid
  const isValidSiteId = !!(siteId && typeof siteId === 'string' && siteId.length > 0)

  // Don't render if siteId is invalid
  if (!isValidSiteId) {
    return (
      <div className={`flex-shrink-0 ${sizeClass} rounded-lg bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center`}>
        <div className="text-[var(--color-text-subtle)] text-xs">No Image</div>
      </div>
    )
  }

  // Query site image from database using tRPC
  // Use skipToken to completely skip the query when siteId is invalid
  // Also use enabled to prevent query execution if siteId is invalid
  // Ensure input is always a proper object, never undefined
  const queryInput = isValidSiteId && siteId ? { siteId: String(siteId).trim() } : skipToken
  const { data: dbImage, isLoading: isDbLoading, isError: isDbError, refetch: refetchSiteImage } = trpc.image.getSiteImage.useQuery(
    queryInput,
    {
      // Double protection: enabled flag prevents query execution
      enabled: isValidSiteId && !!siteId && siteId.trim().length > 0,
      // Skip if siteId is invalid to avoid validation errors
      retry: false,
      // Refetch on mount to ensure fresh data
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      // Don't use stale data
      staleTime: 0,
    }
  )

  // Log query state only when debugging needed
  // ... (Removed excessive logging for cleaner code)

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (isDbLoading) return
        if (isDbError) { } // Handle error silently

        // First try database
        if (dbImage) {
          setDisplayUrl(dbImage)
          return
        }

        // Fallback to client storage
        try {
          const { getSiteImage } = await import('@/lib/libraryUtils')
          const image = await getSiteImage(siteId)
          if (image) {
            setDisplayUrl(image)
          } else {
            setDisplayUrl(null)
          }
        } catch (e) {
          setDisplayUrl(null)
        }
      } catch (error) {
        setDisplayUrl(null)
      }
    }

    loadImage()

    // Listen for site image updates
    const handleSiteImageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ siteId: string }>
      if (!customEvent.detail || customEvent.detail?.siteId === siteId) {
        setImageKey(prev => prev + 1)
        if (siteId) {
          const isTempId = /^site-\d+$/.test(siteId) || siteId.startsWith('temp-')
          const isRealDbId = siteId.length > 15 && !isTempId
          if (!isTempId && isRealDbId) {
            refetchSiteImage()
          }
        }
        loadImage()
      }
    }
    window.addEventListener('siteImageUpdated', handleSiteImageUpdate)
    return () => window.removeEventListener('siteImageUpdated', handleSiteImageUpdate)
  }, [siteId, dbImage, isDbLoading, isDbError, refetchSiteImage])

  return (
    <div className={`flex-shrink-0 ${sizeClass} rounded-lg bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center relative overflow-hidden`}>
      {displayUrl ? (
        <img
          src={displayUrl}
          alt="Site"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <>
          <Building2 size={32} className="text-[var(--color-primary)]/40" />
          <div className="absolute bottom-1 right-1">
            <div className="p-1 rounded bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border-subtle)]">
              <ImageIcon size={10} className="text-[var(--color-text-muted)]" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { sites, activeSiteId, setActiveSite, activeSite, addSite, updateSite, removeSite } = useSite()
  const { devices } = useDevices()
  const { zones } = useZones()
  const { rules } = useRules()
  const trpcUtils = trpc.useUtils()
  const [siteSummaries, setSiteSummaries] = useState<SiteSummary[]>([])
  const [showAddSiteModal, setShowAddSiteModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize selectedSiteId - ensure it's never null when sites exist
  const getInitialSelectedSiteId = (): string => {
    if (activeSiteId) return activeSiteId
    if (sites.length > 0) return sites[0].id
    return ''
  }

  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => getInitialSelectedSiteId())

  // Ensure at least one site is always selected
  useEffect(() => {
    if (sites.length === 0) return

    // If activeSiteId is set, sync selectedSiteId with it
    if (activeSiteId) {
      setSelectedSiteId(activeSiteId)
      return
    }

    // If no activeSiteId but we have sites, select the first one
    // This ensures a site is always selected
    const firstSiteId = sites[0].id
    setActiveSite(firstSiteId)
    setSelectedSiteId(firstSiteId)
  }, [activeSiteId, sites, setActiveSite])

  // Fallback: ensure selectedSiteId is never empty when sites exist
  useEffect(() => {
    if (sites.length > 0 && (!selectedSiteId || selectedSiteId === '')) {
      const siteToSelect = activeSiteId || sites[0].id
      setSelectedSiteId(siteToSelect)
      if (!activeSiteId) {
        setActiveSite(siteToSelect)
      }
    }
  }, [sites, selectedSiteId, activeSiteId, setActiveSite])

  // Fetch devices, zones, faults, and locations for all sites - create queries dynamically
  // Note: We'll fetch data in the useEffect to avoid hook rule violations
  const [siteDevicesMap, setSiteDevicesMap] = useState<Record<string, Device[]>>({})
  const [siteZonesMap, setSiteZonesMap] = useState<Record<string, Zone[]>>({})
  const [siteLocationsMap, setSiteLocationsMap] = useState<Record<string, boolean>>({})
  const [siteFaultsMap, setSiteFaultsMap] = useState<Record<string, Array<{
    deviceId: string
    deviceName: string
    faultType: FaultCategory
    description: string
    location: string
  }>>>({})

  // Refetch devices, zones, and faults when sites change or when we need to refresh
  useEffect(() => {
    if (sites.length === 0) return

    // Fetch all data for all sites using tRPC utils
    const fetchAllSiteData = async () => {
      const devicesMap: Record<string, Device[]> = {}
      const zonesMap: Record<string, Zone[]> = {}
      const locationsMap: Record<string, boolean> = {}
      const faultsMap: Record<string, Array<{
        deviceId: string
        deviceName: string
        faultType: FaultCategory
        description: string
        location: string
      }>> = {}

      await Promise.all(
        sites.map(async (site) => {
          try {
            // Fetch devices
            const devices = await trpcUtils.device.list.fetch({
              siteId: site.id,
              includeComponents: true,
            })
            devicesMap[site.id] = devices || []

            // Fetch zones
            const zones = await trpcUtils.zone.list.fetch({
              siteId: site.id,
            })
            zonesMap[site.id] = (zones || []).map(zone => ({
              ...zone,
              description: zone.description ?? undefined,
              polygon: zone.polygon ?? [],
            }))

            // Fetch faults
            const faults = await trpcUtils.fault.list.fetch({
              siteId: site.id,
              includeResolved: false,
            })

            // Fetch locations (to check if map is uploaded)
            const locations = await trpcUtils.location.list.fetch({
              siteId: site.id,
            })
            locationsMap[site.id] = locations ? locations.some(loc => loc.imageUrl || loc.vectorDataUrl) : false

            // Convert database faults to critical faults format
            const criticalFaults = (faults || []).slice(0, 3).map(fault => {
              const device = devices?.find(d => d.id === fault.deviceId)
              return {
                deviceId: device?.deviceId || fault.deviceId,
                deviceName: device?.deviceId || fault.deviceId,
                faultType: fault.faultType as FaultCategory,
                description: fault.description,
                location: device?.location || 'Unknown',
              }
            })
            faultsMap[site.id] = criticalFaults
          } catch (error) {
            console.error(`Failed to fetch data for site ${site.id}:`, error)
            devicesMap[site.id] = []
            zonesMap[site.id] = []
            locationsMap[site.id] = false
            faultsMap[site.id] = []
          }
        })
      )

      setSiteDevicesMap(devicesMap)
      setSiteZonesMap(zonesMap)
      setSiteLocationsMap(locationsMap)
      setSiteFaultsMap(faultsMap)
    }

    fetchAllSiteData()

    // Set up interval to refetch every 30 seconds
    const interval = setInterval(fetchAllSiteData, 30000)

    return () => clearInterval(interval)
  }, [sites, trpcUtils])

  // Load data for all sites
  useEffect(() => {
    if (typeof window === 'undefined') return

    const summaries: SiteSummary[] = sites.map((site) => {
      // Get devices, zones, and faults from state (fetched from database)
      const devices: Device[] = siteDevicesMap[site.id] || []
      const zones: Zone[] = siteZonesMap[site.id] || []
      const criticalFaults = siteFaultsMap[site.id] || []

      // Get map status from the locations map (fetched with other data)
      const mapUploaded = siteLocationsMap[site.id] ?? false

      // Calculate stats
      const onlineDevices = devices.filter(d => d.status === 'online').length
      const offlineDevices = devices.filter(d => d.status === 'offline' || d.status === 'missing')
      const healthPercentage = devices.length > 0
        ? Math.round((onlineDevices / devices.length) * 100)
        : 100

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

      // Determine if site needs attention
      const needsAttention =
        criticalFaults.length > 0 ||
        warrantiesExpiring > 0 ||
        warrantiesExpired > 0 ||
        !mapUploaded ||
        healthPercentage < 90

      return {
        siteId: site.id,
        siteName: site.name,
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

    setSiteSummaries(summaries)
  }, [sites, siteDevicesMap, siteZonesMap, siteFaultsMap, siteLocationsMap])

  const handleSiteClick = (siteId: string, targetPage?: string) => {
    // If navigating to a page, always select
    if (targetPage) {
      setActiveSite(siteId)
      setSelectedSiteId(siteId)
      router.push(targetPage)
      return
    }

    // Toggle selection: if clicking the same site, deselect it
    if (selectedSiteId === siteId) {
      setSelectedSiteId('')
      return
    }

    setActiveSite(siteId)
    setSelectedSiteId(siteId)
  }

  // Handle clicking outside cards to deselect
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMainContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Deselect if clicking outside both the cards container and panel
    if (
      cardsContainerRef.current &&
      (!panelRef.current || !panelRef.current.contains(target)) &&
      !cardsContainerRef.current.contains(target)
    ) {
      setSelectedSiteId('')
    }
  }

  // Site management handlers
  const handleAddSite = useCallback(() => {
    setEditingSite(null)
    setShowAddSiteModal(true)
  }, [])

  const handleEditSite = useCallback((site: Site) => {
    setEditingSite(site)
    setShowAddSiteModal(true)
  }, [])

  const handleRemoveSite = useCallback((siteId: string) => {
    removeSite(siteId)
    // Re-calculate summaries after removal
    setSiteSummaries(prev => prev.filter(s => s.siteId !== siteId))
  }, [removeSite])

  const handleAddSiteSubmit = useCallback(async (siteData: Omit<Site, 'id'>) => {
    const newSite = addSite(siteData)

    // If there's a temp image stored, move it to the new site ID
    // The AddSiteModal should have stored it with a temp ID in formData.imageUrl
    if (siteData.imageUrl && siteData.imageUrl.startsWith('temp-')) {
      try {
        const { getSiteImage, setSiteImage, removeSiteImage } = await import('@/lib/libraryUtils')
        const tempImage = await getSiteImage(siteData.imageUrl)
        if (tempImage) {
          // Wait a bit for the site to be created and get a real ID
          setTimeout(async () => {
            // Get the actual site ID from the sites list
            const actualSite = sites.find(s => s.name === newSite.name && s.siteNumber === newSite.siteNumber)
            if (actualSite && siteData.imageUrl) {
              await setSiteImage(actualSite.id, tempImage)
              await removeSiteImage(siteData.imageUrl) // Clean up temp
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to move temp image to new site:', error)
      }
    }

    setActiveSite(newSite.id)
    setSelectedSiteId(newSite.id)
    setShowAddSiteModal(false)
  }, [addSite, setActiveSite, sites])

  const handleEditSiteSubmit = useCallback((siteId: string, updates: Partial<Omit<Site, 'id'>>) => {
    updateSite(siteId, updates)
    setShowAddSiteModal(false)
    setEditingSite(null)
  }, [updateSite])

  const handleImportSites = useCallback(() => {
    // Create a hidden file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const importedSites = JSON.parse(text)

          if (!Array.isArray(importedSites)) {
            alert('Invalid file format. Expected an array of sites.')
            return
          }

          let count = 0
          importedSites.forEach((site: any) => {
            if (site.name && (site.siteNumber || site.storeNumber)) {
              addSite({
                name: site.name,
                siteNumber: site.siteNumber || site.storeNumber, // Support both for backward compatibility
                address: site.address || '',
                city: site.city || '',
                state: site.state || '',
                zipCode: site.zipCode || '',
                phone: site.phone,
                manager: site.manager,
                squareFootage: site.squareFootage,
              })
              count++
            }
          })

          alert(`Successfully imported ${count} site(s)`)
        } catch (error) {
          alert('Error importing file. Please check the format.')
          console.error('Import error:', error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [addSite])

  const handleExportSites = useCallback(() => {
    if (sites.length === 0) {
      alert('No sites to export')
      return
    }

    // Export as JSON
    const exportData = sites.map(s => ({
      name: s.name,
      siteNumber: s.siteNumber,
      address: s.address,
      city: s.city,
      state: s.state,
      zipCode: s.zipCode,
      phone: s.phone,
      manager: s.manager,
      squareFootage: s.squareFootage,
    }))

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sites-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [sites])

  // Filter site summaries based on search query
  const filteredSiteSummaries = useMemo(() => {
    if (!searchQuery.trim()) return siteSummaries

    const query = searchQuery.toLowerCase().trim()
    return siteSummaries.filter(summary => {
      const site = sites.find(s => s.id === summary.siteId)
      if (!site) return false

      // Search in site name, site number, city, state, manager, device count, zone count
      const searchableText = [
        site.name,
        site.siteNumber,
        site.city,
        site.state,
        site.manager,
        String(summary.totalDevices),
        String(summary.totalZones),
        String(summary.healthPercentage),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(query)
    })
  }, [siteSummaries, searchQuery, sites])

  // Get detailed data for selected site
  const selectedSiteSummary = useMemo(() => {
    return siteSummaries.find(s => s.siteId === selectedSiteId) || null
  }, [siteSummaries, selectedSiteId])

  // Load detailed data for selected site from database
  const [selectedSiteData, setSelectedSiteData] = useState<{
    devices: Device[]
    zones: Zone[]
    rules: Rule[]
  }>({ devices: [], zones: [], rules: [] })

  useEffect(() => {
    if (!selectedSiteId) return

    // Use data from state maps (fetched from database)
    const devices = siteDevicesMap[selectedSiteId] || []
    const zones = siteZonesMap[selectedSiteId] || []

    // Fetch rules for the selected site
    const fetchRules = async () => {
      try {
        const rules = await trpcUtils.rule.list.fetch({
          siteId: selectedSiteId,
        })
        setSelectedSiteData({
          devices,
          zones,
          rules: (rules || []).map(rule => ({
            ...rule,
            description: rule.description ?? undefined,
            ruleType: 'rule' as const,
            targetType: 'zone' as const,
            targetId: rule.zoneId ?? undefined,
            targetName: rule.zoneName,
            trigger: rule.trigger as any, // Database stores as string, frontend expects TriggerType
          })),
        })
      } catch (error) {
        console.error(`Failed to fetch rules for site ${selectedSiteId}:`, error)
        setSelectedSiteData({
          devices,
          zones,
          rules: [],
        })
      }
    }

    fetchRules()
  }, [selectedSiteId, siteDevicesMap, siteZonesMap, trpcUtils])

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
    if (siteSummaries.length === 0) return null

    const totalDevices = siteSummaries.reduce((sum, s) => sum + s.totalDevices, 0)
    const totalOnline = siteSummaries.reduce((sum, s) => sum + s.onlineDevices, 0)
    const avgHealth = Math.round(
      siteSummaries.reduce((sum, s) => sum + s.healthPercentage, 0) / siteSummaries.length
    )
    const sitesNeedingAttention = siteSummaries.filter(s => s.needsAttention).length
    const totalCriticalFaults = siteSummaries.reduce((sum, s) => sum + s.criticalFaults.length, 0)

    // Simulate trend data (in production, this would come from historical data)
    // Mock: Calculate "improving" sites (health > 95% or recently improved)
    const improvingSites = siteSummaries.filter(s => s.healthPercentage >= 95).length
    const decliningSites = siteSummaries.filter(s => s.healthPercentage < 85).length

    // Calculate health trend (simulate by comparing sites above/below thresholds)
    const healthTrend = improvingSites > decliningSites ? 'improving' : improvingSites < decliningSites ? 'declining' : 'stable'
    const healthDelta = improvingSites - decliningSites

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
          ? `${improvingSites} sites improving`
          : healthTrend === 'declining'
            ? `${decliningSites} sites declining`
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
  }, [siteSummaries])

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island */}
      <div className="flex-shrink-0 page-padding-x pt-3 md:pt-4 pb-2 md:pb-3">
        <SearchIsland
          position="top"
          fullWidth={true}
          title="Dashboard"
          subtitle="Multi-site overview"
          placeholder="Search sites, devices, or type 'view devices' or 'view zones'..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          metrics={siteSummaries.length > 0 ? [
            {
              label: 'Total Sites',
              value: siteSummaries.length,
              color: 'var(--color-text)',
            },
            {
              label: 'Total Devices',
              value: siteSummaries.reduce((sum, s) => sum + s.totalDevices, 0).toLocaleString(),
              color: 'var(--color-text)',
            },
            {
              label: 'Sites Needing Attention',
              value: siteSummaries.filter(s => s.needsAttention).length,
              color: 'var(--color-warning)',
            },
            {
              label: 'Avg. Health',
              value: `${Math.round(
                siteSummaries.reduce((sum, s) => sum + s.healthPercentage, 0) / siteSummaries.length
              )}%`,
              color: 'var(--color-success)',
            },
            {
              label: 'Total Faults',
              value: siteSummaries.reduce((sum, s) => sum + s.criticalFaults.length, 0),
              color: 'var(--color-danger)',
              icon: <AlertTriangle size={14} className="text-[var(--color-danger)]" />,
              onClick: () => {
                // Navigate to notifications with filters set to show all faults for all sites
                router.push('/notifications?filter=faults&siteFilter=all')
              },
            },
            ...(dashboardInsight ? [{
              label: dashboardInsight.healthTrend.label,
              value: `${dashboardInsight.healthTrend.value}%`,
              color: dashboardInsight.healthTrend.trend === 'improving'
                ? 'var(--color-success)'
                : dashboardInsight.healthTrend.trend === 'declining'
                  ? 'var(--color-danger)'
                  : 'var(--color-text)',
              trend: dashboardInsight.healthTrend.trend === 'improving' ? 'up' as const
                : dashboardInsight.healthTrend.trend === 'declining' ? 'down' as const
                  : 'stable' as const,
              delta: dashboardInsight.healthTrend.delta,
              icon: dashboardInsight.healthTrend.trend === 'improving' ? (
                <TrendingUp size={14} className="text-[var(--color-success)]" />
              ) : dashboardInsight.healthTrend.trend === 'declining' ? (
                <TrendingDown size={14} className="text-[var(--color-danger)]" />
              ) : (
                <Activity size={14} className="text-[var(--color-text-muted)]" />
              ),
            }] : []),
          ] : []}
        />
      </div>

      {/* Main Content: Site Cards + Details Panel */}
      <div
        className="main-content-area flex-1 flex min-h-0 gap-2 md:gap-4 page-padding-x pb-12 md:pb-14"
        onClick={handleMainContentClick}
      >
        {/* Site Cards - Left Side */}
        <div ref={cardsContainerRef} className="flex-1 min-w-0 flex flex-col overflow-y-auto -m-4 p-4">
          {/* Site Cards Grid - Responsive */}
          {/* Empty State: No Sites */}
          {sites.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <PanelEmptyState
                icon={Building2}
                title="No Sites Added"
                description="Get started by adding your first site to monitor and manage."
                action={
                  <Button onClick={handleAddSite}>
                    Add Site
                  </Button>
                }
              />
            </div>
          ) : filteredSiteSummaries.length === 0 ? (
            /* Empty State: No Search Results */
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <PanelEmptyState
                icon={Search}
                title="No sites found"
                description="No sites match your search terms."
                action={
                  <Button variant="secondary" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                }
              />
            </div>
          ) : (
            /* Site Cards - Responsive Layout */
            <div className="flex flex-col gap-3 xl:grid xl:grid-cols-2 2xl:grid-cols-3 xl:gap-4 xl:auto-rows-fr">
              {filteredSiteSummaries.map((summary) => {
                const site = sites.find(s => s.id === summary.siteId)

                return (
                  <Card
                    key={summary.siteId}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSiteClick(summary.siteId)
                    }}
                    className={`cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-strong)] 
                      ${summary.siteId === selectedSiteId
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-glow-primary)] ring-1 ring-[var(--color-primary)]/20'
                        : 'border-[var(--color-border-subtle)]'
                      } ${summary.needsAttention && summary.siteId !== selectedSiteId ? 'ring-1 ring-[var(--color-warning)]/20' : ''}
                      
                      /* Responsive Layout Classes */
                      relative overflow-visible /* For hanging tokens */
                      flex flex-row p-4 pb-5 items-center gap-4 /* Base: List View (Row) - extra bottom padding for tokens */
                      xl:flex-col xl:p-6 xl:pb-6 xl:gap-4 xl:fusion-card-tile xl:overflow-hidden /* Desktop: Card View (Tile) */
                    `}
                  >
                    {/* === LIST VIEW (Mobile/Tablet < XL) === */}
                    <div className="contents xl:hidden">
                      {/* Identity Section: Image + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <SiteImageCard siteId={summary.siteId} sizeClass="w-16 h-16" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-[var(--color-text)] truncate mb-0.5" title={summary.siteName}>
                            {summary.siteName}
                          </h3>
                          {site && (
                            <div className="space-y-0.5 text-xs text-[var(--color-text-muted)]">
                              <div className="flex items-center gap-1">
                                <MapPin size={11} />
                                <span className="truncate">{site.city}, {site.state}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mini Metrics (Hidden on very small screens, shown on tablet) */}
                      <div className="hidden sm:flex items-center gap-4 px-4 border-l border-r border-[var(--color-border-subtle)] mx-2">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase text-[var(--color-text-muted)]">Health</span>
                          <span className="font-bold text-sm" style={{ color: getHealthColor(summary.healthPercentage) }}>
                            {summary.healthPercentage}%
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase text-[var(--color-text-muted)]">Devs</span>
                          <span className="font-bold text-sm">{summary.totalDevices}</span>
                        </div>
                      </div>

                      {/* Actions & Status Badge - Compact */}
                      <div className="flex flex-col items-end gap-2 ml-auto min-w-[30px]">
                        {/* Priority Badge Only */}
                        {summary.criticalFaults.length > 0 ? (
                          <Badge variant="destructive" appearance="soft" className="h-6 w-6 p-0 justify-center rounded-full" title={`${summary.criticalFaults.length} Critical Faults`}>
                            <AlertTriangle size={12} />
                          </Badge>
                        ) : !summary.mapUploaded ? (
                          <Badge variant="warning" appearance="soft" className="h-6 w-6 p-0 justify-center rounded-full" title="No Map">
                            <Map size={12} />
                          </Badge>
                        ) : (
                          <div className="h-6 w-6 flex items-center justify-center">
                            {getHealthIcon(summary.healthPercentage, 18)}
                          </div>
                        )}

                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </div>

                      {/* Token Strip - Right-aligned glass container on list view */}
                      {(summary.criticalFaults.length > 0 || (summary.warrantiesExpiring > 0 || summary.warrantiesExpired > 0) || !summary.mapUploaded) && (
                        <div className="absolute -bottom-2.5 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-glass-elevated)] backdrop-blur-md border border-[var(--color-border-subtle)]/50">
                          {summary.criticalFaults.length > 0 && (
                            <Badge
                              variant="destructive"
                              appearance="soft"
                              className="token-link token-sm shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSiteClick(summary.siteId, '/faults')
                              }}
                            >
                              <AlertTriangle size={10} />
                              <span>{summary.criticalFaults.length} Critical</span>
                            </Badge>
                          )}

                          {(summary.warrantiesExpiring > 0 || summary.warrantiesExpired > 0) && (
                            <Badge variant="warning" appearance="soft" className="token-sm shrink-0">
                              <Shield size={10} />
                              <span>
                                {summary.warrantiesExpiring > 0 && `${summary.warrantiesExpiring} exp`}
                                {summary.warrantiesExpiring > 0 && summary.warrantiesExpired > 0 && '•'}
                                {summary.warrantiesExpired > 0 && `${summary.warrantiesExpired} out`}
                              </span>
                            </Badge>
                          )}

                          {!summary.mapUploaded && (
                            <Badge
                              variant="warning"
                              appearance="soft"
                              className="token-link token-sm shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSiteClick(summary.siteId, '/map')
                              }}
                            >
                              <Map size={10} />
                              <span>No map</span>
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>


                    {/* === GRID VIEW (Desktop >= XL) === */}
                    <div className="hidden xl:contents">
                      {/* Card Header */}
                      <div className="fusion-card-tile-header w-full">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Site Image */}
                          <div className="flex-shrink-0">
                            <SiteImageCard siteId={summary.siteId} />
                          </div>

                          {/* Title & Subtitle */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-[var(--color-text)] truncate leading-tight mb-1" title={summary.siteName}>
                              {summary.siteName}
                            </h3>
                            {site && (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                                  <MapPin size={12} />
                                  <span className="truncate">{site.city}, {site.state}</span>
                                </div>
                                {site.manager && (
                                  <div className="text-sm text-[var(--color-text-muted)] truncate">
                                    {site.manager}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getHealthIcon(summary.healthPercentage, 18)}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSiteClick(summary.siteId, '/map')
                            }}
                            className="h-8 w-8"
                            title="Explore Site"
                          >
                            <Search size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* KPIs */}
                      <div className="grid grid-cols-4 gap-2 py-2 w-full">
                        <div className="text-center">
                          <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Health</div>
                          <div className="text-sm font-semibold" style={{ color: getHealthColor(summary.healthPercentage) }}>
                            {summary.healthPercentage}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Devices</div>
                          <div className="text-sm font-semibold text-[var(--color-text)]">{summary.totalDevices}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Online</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                            {summary.onlineDevices}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Zones</div>
                          <div className="text-sm font-semibold text-[var(--color-text)]">{summary.totalZones}</div>
                        </div>
                      </div>

                      {/* Status Indicators */}
                      <div className="flex flex-wrap items-center gap-1.5 w-full">
                        {summary.criticalFaults.length > 0 && (
                          <Badge
                            variant="destructive"
                            appearance="soft"
                            className="token-link text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSiteClick(summary.siteId, '/faults')
                            }}
                          >
                            <AlertTriangle size={11} />
                            <span>{summary.criticalFaults.length} Critical</span>
                          </Badge>
                        )}

                        {(summary.warrantiesExpiring > 0 || summary.warrantiesExpired > 0) && (
                          <Badge variant="warning" appearance="soft" className="text-xs gap-1">
                            <Shield size={11} />
                            <span>
                              {summary.warrantiesExpiring > 0 && `${summary.warrantiesExpiring} expiring`}
                              {summary.warrantiesExpiring > 0 && summary.warrantiesExpired > 0 && ' • '}
                              {summary.warrantiesExpired > 0 && `${summary.warrantiesExpired} expired`}
                            </span>
                          </Badge>
                        )}

                        {!summary.mapUploaded && (
                          <Badge
                            variant="warning"
                            appearance="soft"
                            className="token-link text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSiteClick(summary.siteId, '/map')
                            }}
                          >
                            <Map size={11} />
                            <span>No map</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

        </div>

        {/* Site Details Panel - Right Side */}
        {selectedSiteId && (
          <div ref={panelRef}>
            <ResizablePanel
              defaultWidth={384}
              minWidth={320}
              maxWidth={512}
              collapseThreshold={200}
              storageKey="dashboard_panel"
            >
              <SiteDetailsPanel
                site={activeSite || (selectedSiteId ? sites.find(s => s.id === selectedSiteId) : sites[0]) || null}
                devices={selectedSiteData.devices}
                zones={selectedSiteData.zones}
                rules={selectedSiteData.rules}
                criticalFaults={selectedSiteSummary?.criticalFaults || []}
                warrantiesExpiring={selectedSiteSummary?.warrantiesExpiring || 0}
                warrantiesExpired={selectedSiteSummary?.warrantiesExpired || 0}
                mapUploaded={selectedSiteSummary?.mapUploaded || false}
                healthPercentage={selectedSiteSummary?.healthPercentage || 100}
                onlineDevices={selectedSiteSummary?.onlineDevices || 0}
                offlineDevices={selectedSiteSummary?.offlineDevices || 0}
                missingDevices={(selectedSiteSummary?.totalDevices || 0) - (selectedSiteSummary?.onlineDevices || 0) - (selectedSiteSummary?.offlineDevices || 0)}
                onAddSite={handleAddSite}
                onEditSite={handleEditSite}
                onRemoveSite={handleRemoveSite}
                onImportSites={handleImportSites}
                onExportSites={handleExportSites}
              />
            </ResizablePanel>
          </div>
        )}
      </div>

      {/* Add/Edit Site Modal */}
      <AddSiteModal
        isOpen={showAddSiteModal}
        onClose={() => {
          setShowAddSiteModal(false)
          setEditingSite(null)
        }}
        onAdd={handleAddSiteSubmit}
        onEdit={handleEditSiteSubmit}
        editingSite={editingSite}
      />
    </div >
  )
}
