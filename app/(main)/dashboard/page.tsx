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
import { useState, useEffect, useMemo, useCallback } from 'react'
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
function SiteImageCard({ siteId }: { siteId: string }) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(0) // Force re-render on update

  // Validate siteId before querying - use skipToken to completely skip query if invalid
  const isValidSiteId = !!(siteId && typeof siteId === 'string' && siteId.length > 0)
  
  // Don't render if siteId is invalid
  if (!isValidSiteId) {
    return (
      <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center">
        <div className="text-[var(--color-text-subtle)] text-xs">No Image</div>
      </div>
    )
  }

  // Query site image from database using tRPC
  // Use skipToken to completely skip the query when siteId is invalid
  // Also use enabled to prevent query execution if siteId is invalid
  // Ensure input is always a proper object, never undefined
  const queryInput = isValidSiteId && siteId ? { siteId: String(siteId).trim() } : skipToken
  const { data: dbImage, isLoading: isDbLoading, isError: isDbError, error: dbError, refetch: refetchSiteImage } = trpc.image.getSiteImage.useQuery(
    queryInput,
    { 
      // Double protection: enabled flag prevents query execution
      enabled: isValidSiteId && !!siteId && siteId.trim().length > 0,
      // Skip if siteId is invalid to avoid validation errors
      retry: false,
      // Don't refetch on mount if disabled
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  )

  // Log query state for debugging
  useEffect(() => {
    if (isValidSiteId && siteId) {
      console.log(`🔍 [CLIENT] Query state for ${siteId}:`, {
        enabled: isValidSiteId && !!siteId && siteId.trim().length > 0,
        isLoading: isDbLoading,
        isError: isDbError,
        hasData: !!dbImage,
        dataLength: dbImage?.length,
        error: dbError?.message,
        queryInput: queryInput === skipToken ? 'skipToken' : queryInput,
      })
    }
  }, [siteId, isDbLoading, isDbError, dbImage, dbError, isValidSiteId, queryInput])

  useEffect(() => {
    const loadImage = async () => {
      console.log(`🖼️ Loading image for site: ${siteId}`)
      try {
        // Wait for database query to complete before checking
        if (isDbLoading) {
          console.log(`⏳ Database query still loading for site ${siteId}, waiting...`)
          return
        }

        // Check for query errors
        if (isDbError) {
          console.warn(`⚠️ Database query error for site ${siteId}:`, dbError?.message)
          // Fall through to client storage
        }

        // First try database (from tRPC query)
        if (dbImage) {
          console.log(`✅ Loaded image from database for site ${siteId}, length: ${dbImage.length}`)
          setDisplayUrl(dbImage)
          return
        }

        // Only fallback to client storage if database query completed and returned null
        console.log(`ℹ️ No database image found for site ${siteId}, checking client storage...`)
        const { getSiteImage } = await import('@/lib/libraryUtils')
        const image = await getSiteImage(siteId)
        if (image) {
          console.log(`✅ Loaded image from client storage for site ${siteId}`)
          setDisplayUrl(image)
        } else {
          console.log(`📷 No image found for site ${siteId}, using default`)
          setDisplayUrl(null)
        }
      } catch (error) {
        console.error(`❌ Failed to load site image for ${siteId}:`, error)
        setDisplayUrl(null)
      }
    }

    loadImage()

    // Listen for site image updates
    const handleSiteImageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ siteId: string }>
      // Handle both specific siteId events and general events
      if (!customEvent.detail || customEvent.detail?.siteId === siteId) {
        console.log(`🔄 Site image updated event received for ${siteId}`)
        setImageKey(prev => prev + 1) // Force re-render
        refetchSiteImage() // Refetch from database
        loadImage() // Reload from client storage
      }
    }
    window.addEventListener('siteImageUpdated', handleSiteImageUpdate)
    return () => window.removeEventListener('siteImageUpdated', handleSiteImageUpdate)
  }, [siteId, dbImage, isDbLoading, isDbError, dbError, refetchSiteImage])

  return (
    <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gradient-to-br from-[var(--color-primary-soft)]/20 to-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center relative overflow-hidden">
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

  // Fetch devices, zones, and faults for all sites - create queries dynamically
  // Note: We'll fetch data in the useEffect to avoid hook rule violations
  const [siteDevicesMap, setSiteDevicesMap] = useState<Record<string, Device[]>>({})
  const [siteZonesMap, setSiteZonesMap] = useState<Record<string, Zone[]>>({})
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
            faultsMap[site.id] = []
          }
        })
      )
      
      setSiteDevicesMap(devicesMap)
      setSiteZonesMap(zonesMap)
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
      
      // Check map status from localStorage (for backward compatibility)
      // TODO: Could also check location storage, but for now we'll use localStorage
      const mapImageKey = `fusion_map-image-url_${site.id}`
      const mapUploaded = typeof window !== 'undefined' ? !!localStorage.getItem(mapImageKey) : false

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
  }, [sites, siteDevicesMap, siteZonesMap, siteFaultsMap])

  const handleSiteClick = (siteId: string, targetPage?: string) => {
    setActiveSite(siteId)
    setSelectedSiteId(siteId)
    if (targetPage) {
      router.push(targetPage)
    }
    // Don't navigate by default - just select the site
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
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Dashboard"
          subtitle="Multi-site overview"
          placeholder="Search sites, devices, or type 'view devices' or 'view zones'..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main Content: Site Cards + Details Panel */}
      <div 
        className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" 
        style={{ overflow: 'visible' }}
      >
        {/* Site Cards - Left Side */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          {/* Site Cards Grid - Responsive */}
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {filteredSiteSummaries.map((summary) => {
            const site = sites.find(s => s.id === summary.siteId)
            return (
            <div
              key={summary.siteId}
              className={`fusion-card cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-strong)] flex flex-row gap-4 ${
                summary.siteId === selectedSiteId 
                  ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]/10 ring-2 ring-[var(--color-primary)]/20' 
                  : ''
              } ${summary.needsAttention && summary.siteId !== selectedSiteId ? 'ring-2 ring-[var(--color-warning)]/30' : ''}`}
              onClick={() => handleSiteClick(summary.siteId)}
            >
              {/* Site Image - Top Left */}
              <SiteImageCard siteId={summary.siteId} />

              {/* Card Content - Right Side */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Site Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-semibold text-[var(--color-text)] truncate">
                      {summary.siteName}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getHealthIcon(summary.healthPercentage, 18)}
              <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSiteClick(summary.siteId, '/map')
                        }}
                        className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/10 transition-colors"
                        title="Explore Site"
                      >
                        <Search size={14} />
                      </button>
                </div>
                  </div>
                  {site && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin size={10} />
                        <span className="truncate">{site.city}, {site.state}</span>
                      </div>
                      {site.manager && (
                        <div className="text-[var(--color-text-soft)] truncate">
                          {site.manager}
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
                        handleSiteClick(summary.siteId, '/faults')
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
          {siteSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-2 mt-auto pt-6 flex-shrink-0">
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Sites</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {siteSummaries.length}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Devices</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {siteSummaries.reduce((sum, s) => sum + s.totalDevices, 0).toLocaleString()}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Sites Needing Attention</div>
              <div className="text-2xl font-bold text-[var(--color-warning)]">
                {siteSummaries.filter(s => s.needsAttention).length}
              </div>
            </div>
            <div className="fusion-card">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Avg. Health</div>
              <div className="text-2xl font-bold text-[var(--color-success)]">
                {Math.round(
                  siteSummaries.reduce((sum, s) => sum + s.healthPercentage, 0) / siteSummaries.length
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

        {/* Site Details Panel - Right Side */}
        {selectedSiteId && (
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
    </div>
  )
}
