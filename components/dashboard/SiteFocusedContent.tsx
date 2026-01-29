/**
 * Site Focused Content Component
 * 
 * Provides tabbed content for the site focused modal.
 * Tabs: Overview, Metrics, History, Related
 * 
 * AI Note: This is the detailed view for a site, showing all information
 * from the panel plus metrics, history, and related entities.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  MapPin,
  Phone,
  User,
  Map,
  Activity,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  Layers,
  Workflow,
  Info,
  TrendingUp,
  Calendar,
  Zap,
  Settings,
} from 'lucide-react'
import { FocusedObjectModal } from '@/components/shared/FocusedObjectModal'
import { TabDefinition } from '@/components/shared/FocusedModalTabs'
import { Site } from '@/lib/SiteContext'
import { Device } from '@/lib/mockData'
import { Zone } from '@/lib/DomainContext'
import { Rule } from '@/lib/mockRules'
import { FaultCategory, faultCategories } from '@/lib/faultDefinitions'
import { calculateWarrantyStatus } from '@/lib/warranty'
import { Badge } from '@/components/ui/Badge'
import { trpc } from '@/lib/trpc/client'
import { PersonToken } from '@/components/people/PersonToken'
import { useRouter } from 'next/navigation'

interface CriticalFault {
  deviceId: string
  deviceName: string
  faultType: FaultCategory
  description: string
  location: string
}

interface SiteFocusedContentProps {
  site: Site
  devices?: Device[]
  zones?: Zone[]
  rules?: Rule[]
  criticalFaults?: CriticalFault[]
  healthPercentage?: number
  onlineDevices?: number
  offlineDevices?: number
  missingDevices?: number
  mapUploaded?: boolean
  warrantiesExpiring?: number
  warrantiesExpired?: number
  allSites?: Site[]
}

// Tab definitions
const siteTabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'related', label: 'Related', icon: Users },
]

// Overview Tab Content
function OverviewTab({
  site,
  devices = [],
  zones = [],
  rules = [],
  healthPercentage = 0,
  onlineDevices = 0,
  offlineDevices = 0,
  missingDevices = 0,
  mapUploaded = false,
}: {
  site: Site
  devices?: Device[]
  zones?: Zone[]
  rules?: Rule[]
  healthPercentage?: number
  onlineDevices?: number
  offlineDevices?: number
  missingDevices?: number
  mapUploaded?: boolean
}) {
  const router = useRouter()
  
  // Fetch people to get manager role
  const { data: sitePeople = [] } = trpc.person.list.useQuery(
    { siteId: site?.id || '' },
    { enabled: !!site?.id }
  )

  // Find person matching manager name to get their role
  const managerPerson = site?.manager && sitePeople.length > 0
    ? sitePeople.find(p => {
        const fullName = `${p.firstName} ${p.lastName}`.trim()
        return fullName === site.manager || p.firstName === site.manager || p.lastName === site.manager
      })
    : null
  const managerRole = managerPerson?.role || 'Manager'

  const handlePersonClick = (personId: string) => {
    router.push(`/people?personId=${personId}`)
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 95) return 'var(--color-success)'
    if (percentage >= 85) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Site Visual */}
        <div className="w-full aspect-video rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
          {site.imageUrl ? (
            <img
              src={site.imageUrl}
              alt={site.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Building2 size={64} className="mx-auto mb-3 text-[var(--color-primary)]" />
              <div className="text-xl font-bold text-[var(--color-text)]">{site.name}</div>
              <div className="text-sm text-[var(--color-text-muted)]">{site.address}</div>
            </div>
          )}
        </div>

        {/* Site Information */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Info size={16} className="text-[var(--color-primary)]" />
            Site Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text-muted)]">Name</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{site.name}</span>
            </div>
            {site.address && (
              <div className="flex justify-between items-start p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <MapPin size={14} />
                  Address
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">
                  {site.address}, {site.city}, {site.state} {site.zipCode}
                </span>
              </div>
            )}
            {site.phone && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Phone size={14} />
                  Phone
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">{site.phone}</span>
              </div>
            )}
            {site.manager && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <User size={14} />
                  {managerRole}
                </span>
                {managerPerson ? (
                  <PersonToken
                    person={managerPerson}
                    size="sm"
                    showName={true}
                    layout="chip"
                    onClick={handlePersonClick}
                    variant="subtle"
                    tooltipDetailLevel="none"
                  />
                ) : (
                  <span className="text-sm font-medium text-[var(--color-text)]">{site.manager}</span>
                )}
              </div>
            )}
            {site.squareFootage && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--color-surface)]">
                <span className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                  <Map size={14} />
                  Size
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {site.squareFootage.toLocaleString()} sq ft
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Health Status */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Activity size={16} className="text-[var(--color-primary)]" />
            System Health
          </h4>
          <div className="text-center mb-4">
            <div
              className="text-5xl font-bold mb-2"
              style={{ color: getHealthColor(healthPercentage) }}
            >
              {healthPercentage}%
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">Overall Health</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-success)]">{onlineDevices}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Online</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-warning)]">{offlineDevices}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Offline</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] text-center">
              <div className="text-xl font-bold text-[var(--color-danger)]">{missingDevices}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Missing</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--color-primary)]" />
            Key Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[var(--color-surface)]">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Devices</div>
              <div className="text-xl font-bold text-[var(--color-text)]">{devices.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)]">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Zones</div>
              <div className="text-xl font-bold text-[var(--color-text)]">{zones.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)]">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Rules</div>
              <div className="text-xl font-bold text-[var(--color-text)]">{rules.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)]">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Map Status</div>
              <Badge variant={mapUploaded ? 'success' : 'warning'} appearance="soft">
                {mapUploaded ? 'Uploaded' : 'Missing'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Metrics Tab Content
function MetricsTab({
  site,
  devices = [],
  zones = [],
  healthPercentage = 0,
  onlineDevices = 0,
  offlineDevices = 0,
  missingDevices = 0,
  warrantiesExpiring = 0,
  warrantiesExpired = 0,
}: {
  site: Site
  devices?: Device[]
  zones?: Zone[]
  healthPercentage?: number
  onlineDevices?: number
  offlineDevices?: number
  missingDevices?: number
  warrantiesExpiring?: number
  warrantiesExpired?: number
}) {
  // Group devices by type
  const devicesByType = devices.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Mock health trend
  const healthTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.min(100, Math.max(70, healthPercentage + Math.floor((Math.random() - 0.5) * 20))),
  }))

  const getTypeLabel = (type: string) => {
    if (type.startsWith('fixture-')) {
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

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-text)]">{devices.length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Devices</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{zones.length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Zones</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-warning)]">{warrantiesExpiring}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Warranties Expiring</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-center">
          <div className="text-2xl font-bold text-[var(--color-danger)]">{warrantiesExpired}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Expired</div>
        </div>
      </div>

      {/* Health Trend */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-primary)]" />
          System Health (7 Day Trend)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {healthTrend.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all ${
                  item.value >= 95 ? 'bg-[var(--color-success)]' :
                  item.value >= 85 ? 'bg-[var(--color-warning)]' :
                  'bg-[var(--color-danger)]'
                }`}
                style={{ height: `${item.value}%` }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>Avg: {Math.round(healthTrend.reduce((a, b) => a + b.value, 0) / 7)}%</span>
          <span>Current: {healthPercentage}%</span>
        </div>
      </div>

      {/* Devices by Type */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Layers size={16} className="text-[var(--color-primary)]" />
          Devices by Type
        </h4>
        <div className="space-y-2">
          {Object.entries(devicesByType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)]">
              <span className="text-sm text-[var(--color-text)]">{getTypeLabel(type)}</span>
              <span className="text-sm font-bold text-[var(--color-text)]">{count}</span>
            </div>
          ))}
          {Object.keys(devicesByType).length === 0 && (
            <div className="p-4 text-center text-[var(--color-text-muted)] text-sm">
              No devices at this site
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// History Tab Content
function HistoryTab({ site }: { site: Site }) {
  // Mock history events
  const historyEvents = [
    { type: 'device', title: '5 devices added', time: '2 hours ago', icon: Zap, color: 'var(--color-success)' },
    { type: 'fault', title: 'Critical fault resolved', time: '1 day ago', icon: AlertTriangle, color: 'var(--color-warning)' },
    { type: 'zone', title: 'Zone "Sales Floor" created', time: '3 days ago', icon: Layers, color: 'var(--color-primary)' },
    { type: 'rule', title: 'Rule "Night Mode" configured', time: '5 days ago', icon: Workflow, color: 'var(--color-accent)' },
    { type: 'map', title: 'Floor plan uploaded', time: '7 days ago', icon: Map, color: 'var(--color-primary)' },
    { type: 'created', title: 'Site created', time: '14 days ago', icon: Building2, color: 'var(--color-success)' },
  ]

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[var(--color-primary)]" />
          Activity Timeline
        </h4>
        <div className="space-y-3">
          {historyEvents.map((event, i) => {
            const Icon = event.icon
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${event.color} 20%, transparent)` }}
                >
                  <Icon size={16} style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{event.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{event.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Site Created</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Last Activity</div>
          <div className="text-sm font-semibold text-[var(--color-text)]">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Related Tab Content
function RelatedTab({
  site,
  devices = [],
  zones = [],
  criticalFaults = [],
  allSites = [],
}: {
  site: Site
  devices?: Device[]
  zones?: Zone[]
  criticalFaults?: CriticalFault[]
  allSites?: Site[]
}) {
  return (
    <div className="space-y-6">
      {/* Critical Faults */}
      {criticalFaults.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--color-danger)]" />
            Critical Faults ({criticalFaults.length})
          </h4>
          <div className="space-y-2">
            {criticalFaults.slice(0, 5).map((fault, i) => {
              const categoryInfo = faultCategories[fault.faultType]
              return (
                <div key={i} className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-text)]">{fault.deviceName}</span>
                    <span className="text-xs text-[var(--color-danger)]">
                      {categoryInfo?.shortLabel || fault.faultType}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{fault.description}</p>
                  <p className="text-xs text-[var(--color-text-soft)] mt-1 flex items-center gap-1">
                    <MapPin size={10} />
                    {fault.location}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Zones */}
      {zones.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            Zones ({zones.length})
          </h4>
          <div className="space-y-2">
            {zones.slice(0, 5).map((zone) => (
              <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: zone.color || 'var(--color-primary)' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{zone.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{zone.deviceIds?.length || 0} devices</p>
                  </div>
                </div>
              </div>
            ))}
            {zones.length > 5 && (
              <div className="text-center text-xs text-[var(--color-text-muted)] py-2">
                +{zones.length - 5} more zones
              </div>
            )}
          </div>
        </div>
      )}

      {/* Devices Overview */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <Zap size={16} className="text-[var(--color-primary)]" />
          Devices ({devices.length})
        </h4>
        {devices.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {devices.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    d.status === 'online' ? 'bg-[var(--color-success)]' :
                    d.status === 'offline' ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-danger)]'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{d.deviceId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.location || 'Unknown location'}</p>
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{d.status}</span>
              </div>
            ))}
            {devices.length > 10 && (
              <div className="text-center text-xs text-[var(--color-text-muted)] py-2">
                +{devices.length - 10} more devices
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-[var(--color-text-muted)] text-sm">
            No devices at this site
          </div>
        )}
      </div>

      {/* Empty State */}
      {criticalFaults.length === 0 && zones.length === 0 && devices.length === 0 && (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No related items to display</p>
        </div>
      )}
    </div>
  )
}

// Main Export: Site Focused Modal wrapper
export function SiteFocusedModal({
  isOpen,
  onClose,
  site,
  devices = [],
  zones = [],
  rules = [],
  criticalFaults = [],
  healthPercentage = 0,
  onlineDevices = 0,
  offlineDevices = 0,
  missingDevices = 0,
  mapUploaded = false,
  warrantiesExpiring = 0,
  warrantiesExpired = 0,
  allSites = [],
}: {
  isOpen: boolean
  onClose: () => void
  site: Site
  devices?: Device[]
  zones?: Zone[]
  rules?: Rule[]
  criticalFaults?: CriticalFault[]
  healthPercentage?: number
  onlineDevices?: number
  offlineDevices?: number
  missingDevices?: number
  mapUploaded?: boolean
  warrantiesExpiring?: number
  warrantiesExpired?: number
  allSites?: Site[]
}) {
  return (
    <FocusedObjectModal
      isOpen={isOpen}
      onClose={onClose}
      title={site.name}
      subtitle={site.address ? `${site.address}, ${site.city}, ${site.state}` : 'Retail Location'}
      breadcrumb={[{ label: 'Site' }]}
      icon={<Building2 size={28} className="text-[var(--color-primary)]" />}
      tabs={siteTabs}
    >
      {(activeTab) => {
        switch (activeTab) {
          case 'overview':
            return (
              <OverviewTab
                site={site}
                devices={devices}
                zones={zones}
                rules={rules}
                healthPercentage={healthPercentage}
                onlineDevices={onlineDevices}
                offlineDevices={offlineDevices}
                missingDevices={missingDevices}
                mapUploaded={mapUploaded}
              />
            )
          case 'metrics':
            return (
              <MetricsTab
                site={site}
                devices={devices}
                zones={zones}
                healthPercentage={healthPercentage}
                onlineDevices={onlineDevices}
                offlineDevices={offlineDevices}
                missingDevices={missingDevices}
                warrantiesExpiring={warrantiesExpiring}
                warrantiesExpired={warrantiesExpired}
              />
            )
          case 'history':
            return <HistoryTab site={site} />
          case 'related':
            return (
              <RelatedTab
                site={site}
                devices={devices}
                zones={zones}
                criticalFaults={criticalFaults}
                allSites={allSites}
              />
            )
          default:
            return (
              <OverviewTab
                site={site}
                devices={devices}
                zones={zones}
                rules={rules}
                healthPercentage={healthPercentage}
                onlineDevices={onlineDevices}
                offlineDevices={offlineDevices}
                missingDevices={missingDevices}
                mapUploaded={mapUploaded}
              />
            )
        }
      }}
    </FocusedObjectModal>
  )
}
