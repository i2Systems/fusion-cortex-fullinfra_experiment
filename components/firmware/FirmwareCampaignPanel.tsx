/**
 * Firmware Campaign Panel Component
 * 
 * Right-side panel showing campaign details, device list, and progress.
 */

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Play, Pause, X, Trash2, RefreshCw, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react'
import { PanelEmptyState } from '@/components/shared/PanelEmptyState'
import { FirmwareDeviceTable } from './FirmwareDeviceTable'
import { FirmwareProgressChart } from './FirmwareProgressChart'
import { trpc } from '@/lib/trpc/client'
import { useSite } from '@/lib/SiteContext'

interface Campaign {
  id: string
  name: string
  description?: string | null
  version: string
  fileUrl?: string | null
  siteId?: string | null
  site?: {
    id: string
    name: string
    storeNumber?: string | null
  } | null
  deviceTypes: string[]
  status: string
  totalDevices: number
  completed: number
  failed: number
  inProgress: number
  scheduledAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
  createdAt: Date
  deviceUpdates?: Array<{
    id: string
    deviceId: string
    status: string
    errorMessage?: string | null
    startedAt?: Date | null
    completedAt?: Date | null
    retryCount: number
    device: {
      id: string
      deviceId: string
      serialNumber: string
      type: string
      firmwareVersion?: string | null
      firmwareStatus?: string | null
    }
  }>
}

interface FirmwareCampaignPanelProps {
  campaign: Campaign | undefined
  onStartCampaign: (id: string) => void
  onPauseCampaign: (id: string) => void
  onCancelCampaign: (id: string) => void
  onDeleteCampaign: (id: string) => void
  onRefresh: () => void
}

export function FirmwareCampaignPanel({
  campaign,
  onStartCampaign,
  onPauseCampaign,
  onCancelCampaign,
  onDeleteCampaign,
  onRefresh,
}: FirmwareCampaignPanelProps) {
  const { activeSiteId } = useSite()
  const [showEligibleDevices, setShowEligibleDevices] = useState(false)

  // Get eligible devices
  const { data: eligibleDevices, refetch: refetchEligible } = trpc.firmware.getEligibleDevices.useQuery(
    { campaignId: campaign?.id || '' },
    { enabled: !!campaign?.id && showEligibleDevices }
  )

  // Add devices to campaign mutation
  const addDevicesMutation = trpc.firmware.addDevicesToCampaign.useMutation({
    onSuccess: () => {
      refetchEligible()
      onRefresh()
    },
  })

  if (!campaign) {
    return (
      <PanelEmptyState
        icon={Download}
        title="No Campaign Selected"
        description="Select a campaign from the list to view details and manage devices."
      />
    )
  }

  const progress = campaign.totalDevices > 0
    ? Math.round((campaign.completed / campaign.totalDevices) * 100)
    : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400'
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400'
      case 'FAILED':
        return 'bg-red-500/20 text-red-400'
      case 'CANCELLED':
        return 'bg-gray-500/20 text-gray-400'
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleAddDevices = async () => {
    if (!eligibleDevices || eligibleDevices.length === 0) return
    
    const deviceIds = eligibleDevices.map(d => d.id)
    await addDevicesMutation.mutateAsync({
      campaignId: campaign.id,
      deviceIds,
    })
    setShowEligibleDevices(false)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              {campaign.name}
            </h2>
            <Badge className={getStatusColor(campaign.status)}>
              {campaign.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {campaign.status === 'PENDING' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStartCampaign(campaign.id)}
                title="Start campaign"
              >
                <Play size={16} />
              </Button>
            )}
            {campaign.status === 'IN_PROGRESS' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPauseCampaign(campaign.id)}
                title="Pause campaign"
              >
                <Pause size={16} />
              </Button>
            )}
            {campaign.status !== 'COMPLETED' && campaign.status !== 'CANCELLED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancelCampaign(campaign.id)}
                title="Cancel campaign"
              >
                <X size={16} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteCampaign(campaign.id)}
              title="Delete campaign"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {campaign.description && (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {campaign.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Version:</span>
            <span className="text-[var(--color-text)] font-medium">{campaign.version}</span>
          </div>
          {campaign.site && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Site:</span>
              <span className="text-[var(--color-text)]">{campaign.site.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Device Types:</span>
            <span className="text-[var(--color-text)]">
              {campaign.deviceTypes.length} type(s)
            </span>
          </div>
          {campaign.scheduledAt && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Scheduled:</span>
              <span className="text-[var(--color-text)]">
                {new Date(campaign.scheduledAt).toLocaleString()}
              </span>
            </div>
          )}
          {campaign.startedAt && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Started:</span>
              <span className="text-[var(--color-text)]">
                {new Date(campaign.startedAt).toLocaleString()}
              </span>
            </div>
          )}
          {campaign.completedAt && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Completed:</span>
              <span className="text-[var(--color-text)]">
                {new Date(campaign.completedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Chart */}
      {campaign.totalDevices > 0 && (
        <div className="p-6 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">
            Progress
          </h3>
          <FirmwareProgressChart
            total={campaign.totalDevices}
            completed={campaign.completed}
            failed={campaign.failed}
            inProgress={campaign.inProgress}
            pending={campaign.totalDevices - campaign.completed - campaign.failed - campaign.inProgress}
          />
        </div>
      )}

      {/* Device Management */}
      <div className="p-6 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Devices ({campaign.deviceUpdates?.length || 0})
          </h3>
          {campaign.status === 'PENDING' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowEligibleDevices(!showEligibleDevices)}
            >
              {showEligibleDevices ? 'Hide' : 'Add'} Eligible Devices
            </Button>
          )}
        </div>

        {showEligibleDevices && eligibleDevices && (
          <div className="mb-4 p-4 bg-[var(--color-surface-subtle)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text)]">
                {eligibleDevices.length} eligible device(s) found
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddDevices}
                disabled={eligibleDevices.length === 0 || addDevicesMutation.isPending}
              >
                Add All
              </Button>
            </div>
            {eligibleDevices.length > 0 && (
              <div className="text-xs text-[var(--color-text-muted)]">
                Devices will be added to the campaign and marked as pending.
              </div>
            )}
          </div>
        )}

        {campaign.deviceUpdates && campaign.deviceUpdates.length > 0 ? (
          <FirmwareDeviceTable
            deviceUpdates={campaign.deviceUpdates}
            campaignId={campaign.id}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
            No devices added to this campaign yet.
            {campaign.status === 'PENDING' && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEligibleDevices(true)}
                >
                  Add Devices
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
