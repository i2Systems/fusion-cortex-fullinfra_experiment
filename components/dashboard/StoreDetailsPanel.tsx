/**
 * Store Details Panel Component
 * 
 * Right-side panel showing comprehensive details about a selected store.
 * Displays metrics, faults, warranties, zones, rules, and recent activity.
 * 
 * AI Note: This panel appears when a store card is selected on the dashboard.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, useStore } from '@/lib/StoreContext'
import { Device } from '@/lib/mockData'
import { Zone } from '@/lib/ZoneContext'
import { Rule } from '@/lib/mockRules'
import { FaultCategory } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus } from '@/lib/warranty'
import {
  MapPin,
  Phone,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  Shield,
  Map,
  Zap,
  Layers,
  Workflow,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Plus,
  Upload,
  Download,
  Building2,
  Trash2,
  Edit2
} from 'lucide-react'

interface StoreDetailsPanelProps {
  store: Store | null
  devices: Device[]
  zones: Zone[]
  rules: Rule[]
  criticalFaults: Array<{
    deviceId: string
    deviceName: string
    faultType: FaultCategory
    description: string
    location: string
  }>
  warrantiesExpiring: number
  warrantiesExpired: number
  mapUploaded: boolean
  healthPercentage: number
  onlineDevices: number
  offlineDevices: number
  missingDevices: number
  onAddSite?: () => void
  onEditSite?: (store: Store) => void
  onRemoveSite?: (storeId: string) => void
  onImportSites?: () => void
  onExportSites?: () => void
}

export function StoreDetailsPanel({
  store,
  devices,
  zones,
  rules,
  criticalFaults,
  warrantiesExpiring,
  warrantiesExpired,
  mapUploaded,
  healthPercentage,
  onlineDevices,
  offlineDevices,
  missingDevices,
  onAddSite,
  onEditSite,
  onRemoveSite,
  onImportSites,
  onExportSites,
}: StoreDetailsPanelProps) {
  const router = useRouter()
  const { setActiveStore, stores } = useStore()
  const [storeImageUrl, setStoreImageUrl] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(0) // Force re-render on update

  // Load store image from client storage
  useEffect(() => {
    const loadStoreImage = async () => {
      if (!store?.id) {
        setStoreImageUrl(null)
        return
      }

      try {
        const { getSiteImage } = await import('@/lib/libraryUtils')
        const image = await getSiteImage(store.id)
        setStoreImageUrl(image)
      } catch (error) {
        console.error('Failed to load store image:', error)
        setStoreImageUrl(null)
      }
    }

    loadStoreImage()

    // Listen for site image updates
    const handleSiteImageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ siteId: string }>
      if (customEvent.detail?.siteId === store?.id) {
        setImageKey(prev => prev + 1) // Force re-render
        loadStoreImage() // Reload image
      }
    }
    window.addEventListener('siteImageUpdated', handleSiteImageUpdate)
    return () => window.removeEventListener('siteImageUpdated', handleSiteImageUpdate)
  }, [store?.id, imageKey])

  if (!store) {
    return (
      <div className="w-96 min-w-[20rem] max-w-[32rem] bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden flex-shrink-0 h-full">
        <div className="flex-1 flex flex-col">
          {/* Empty State Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center">
              <Building2 size={40} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              No Site Selected
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Select a site from the dashboard to view detailed information
            </p>
          </div>

          {/* Action Buttons Bar */}
          <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onAddSite}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Add Site
              </button>
              <div className="flex-1" />
              <button
                onClick={onImportSites}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Upload size={16} />
                Import
              </button>
              <button
                onClick={onExportSites}
                className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleNavigate = (path: string) => {
    setActiveStore(store.id)
    router.push(path)
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 95) return 'var(--color-success)'
    if (percentage >= 85) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  const getHealthIcon = (percentage: number) => {
    if (percentage >= 95) return <CheckCircle2 size={16} className="text-[var(--color-success)]" />
    if (percentage >= 85) return <AlertCircle size={16} className="text-[var(--color-warning)]" />
    return <XCircle size={16} className="text-[var(--color-danger)]" />
  }

  // Calculate recent activity (mock data for now)
  const recentActivity = [
    ...criticalFaults.slice(0, 2).map(fault => ({
      type: 'fault' as const,
      title: `Fault: ${fault.deviceName}`,
      description: fault.location,
      time: '45 minutes ago',
      icon: AlertTriangle,
      color: 'var(--color-danger)',
      onClick: () => handleNavigate('/faults'),
    })),
    ...(zones.length > 0 ? [{
      type: 'zone' as const,
      title: `Zone configured`,
      description: zones[0]?.name || 'Zone updated',
      time: '1 day ago',
      icon: Layers,
      color: 'var(--color-primary)',
      onClick: () => handleNavigate('/zones'),
    }] : []),
  ].slice(0, 5)

  return (
    <div className="w-full h-full bg-[var(--color-surface)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-subtle)] flex flex-col shadow-[var(--shadow-strong)] overflow-hidden">
      <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Store Header */}
      <div>
        {/* Store Image */}
        {storeImageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden aspect-video bg-[var(--color-surface-subtle)]">
            <img
              src={storeImageUrl}
              alt={store.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{store.name}</h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEditSite?.(store)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Edit site"
            >
              <Edit2 size={14} className="text-[var(--color-text-muted)]" />
            </button>
            {stores.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to remove "${store.name}"? This will delete all associated data.`)) {
                    onRemoveSite?.(store.id)
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                title="Remove site"
              >
                <Trash2 size={14} className="text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {store.address && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>{store.address}, {store.city}, {store.state} {store.zipCode}</span>
            </div>
          )}
          {store.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <span>{store.phone}</span>
            </div>
          )}
          {store.manager && (
            <div className="flex items-center gap-2">
              <User size={14} />
              <span>Manager: {store.manager}</span>
            </div>
          )}
          {store.squareFootage && (
            <div className="flex items-center gap-2">
              <Map size={14} />
              <span>{store.squareFootage.toLocaleString()} sq ft</span>
            </div>
          )}
        </div>
      </div>

      {/* Health Status */}
      <div className="p-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <span className="font-semibold text-[var(--color-text)]">System Health</span>
          </div>
          {getHealthIcon(healthPercentage)}
        </div>
        <div className="text-3xl font-bold mb-2" style={{ color: getHealthColor(healthPercentage) }}>
          {healthPercentage}%
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[var(--color-text-muted)]">Online</div>
            <div className="font-semibold text-[var(--color-success)]">{onlineDevices}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">Offline</div>
            <div className="font-semibold text-[var(--color-warning)]">{offlineDevices}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">Missing</div>
            <div className="font-semibold text-[var(--color-danger)]">{missingDevices}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Devices</div>
          <div className="text-xl font-bold text-[var(--color-text)]">{devices.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Zones</div>
          <div className="text-xl font-bold text-[var(--color-text)]">{zones.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Rules</div>
          <div className="text-xl font-bold text-[var(--color-text)]">{rules.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Map Status</div>
          <div className="text-sm font-semibold flex items-center gap-1">
            {mapUploaded ? (
              <>
                <CheckCircle2 size={14} className="text-[var(--color-success)]" />
                <span className="text-[var(--color-success)]">Uploaded</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-[var(--color-warning)]" />
                <span className="text-[var(--color-warning)]">Not uploaded</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Critical Faults */}
      {criticalFaults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-danger)]" />
              <span className="font-semibold text-[var(--color-text)]">Critical Faults</span>
            </div>
            <button
              onClick={() => handleNavigate('/faults')}
              className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {criticalFaults.slice(0, 3).map((fault, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 cursor-pointer hover:bg-[var(--color-danger)]/15 transition-colors"
                onClick={() => handleNavigate('/faults')}
              >
                <div className="font-medium text-sm text-[var(--color-text)] mb-1">
                  {fault.deviceName}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1 line-clamp-2">
                  {fault.description}
                </div>
                <div className="text-xs text-[var(--color-text-soft)] flex items-center gap-1">
                  <MapPin size={10} />
                  {fault.location}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warranty Alerts */}
      {(warrantiesExpiring > 0 || warrantiesExpired > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[var(--color-warning)]" />
              <span className="font-semibold text-[var(--color-text)]">Warranty Alerts</span>
            </div>
            <button
              onClick={() => handleNavigate('/lookup')}
              className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View devices
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {warrantiesExpiring > 0 && (
              <div className="p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
                <div className="text-sm font-medium text-[var(--color-warning)] mb-1">
                  {warrantiesExpiring} warranty{warrantiesExpiring !== 1 ? 'ies' : ''} expiring soon
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Expiring within 30 days
                </div>
              </div>
            )}
            {warrantiesExpired > 0 && (
              <div className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                <div className="text-sm font-medium text-[var(--color-danger)] mb-1">
                  {warrantiesExpired} expired warranty{warrantiesExpired !== 1 ? 'ies' : ''}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Requires attention
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[var(--color-text-muted)]" />
            <span className="font-semibold text-[var(--color-text)]">Recent Activity</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((activity, idx) => {
              const Icon = activity.icon
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[var(--color-surface-subtle)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                  onClick={activity.onClick}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-[var(--color-surface)] flex-shrink-0">
                      <Icon size={14} style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text)] mb-0.5">
                        {activity.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mb-1">
                        {activity.description}
                      </div>
                      <div className="text-xs text-[var(--color-text-soft)]">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <div className="font-semibold text-sm text-[var(--color-text)] mb-3">Quick Actions</div>
        <div className="space-y-2">
          <button
            onClick={() => handleNavigate('/map')}
            className="w-full fusion-button fusion-button-primary text-left justify-start text-sm"
          >
            <Map size={16} />
            View Map
          </button>
          <button
            onClick={() => handleNavigate('/zones')}
            className="w-full fusion-button text-left justify-start text-sm"
            style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}
          >
            <Layers size={16} />
            Manage Zones
          </button>
          <button
            onClick={() => handleNavigate('/rules')}
            className="w-full fusion-button text-left justify-start text-sm"
            style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}
          >
            <Workflow size={16} />
            Configure Rules
          </button>
        </div>
      </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddSite}
            className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-glow-primary)] transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add Site
          </button>
          <div className="flex-1" />
          <button
            onClick={onImportSites}
            className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={onExportSites}
            className="px-4 py-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}

