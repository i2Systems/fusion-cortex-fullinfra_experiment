/**
 * Firmware Updates Section
 * 
 * Main area: Firmware campaign list (left side)
 * Right panel: Campaign details when selected, or new campaign form when nothing is selected
 * 
 * AI Note: Manages firmware update campaigns that can target specific device types and sites.
 * Shows progress, device status, and allows scheduling updates.
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { FirmwareCampaignList } from '@/components/firmware/FirmwareCampaignList'
import { FirmwareCampaignPanel } from '@/components/firmware/FirmwareCampaignPanel'
import { ResizablePanel } from '@/components/layout/ResizablePanel'
import { useSite } from '@/lib/SiteContext'
import { trpc } from '@/lib/trpc/client'
import { CreateFirmwareCampaignModal } from '@/components/firmware/CreateFirmwareCampaignModal'

export default function FirmwarePage() {
  const { activeSiteId } = useSite()
  const searchParams = useSearchParams()
  const campaignIdFromUrl = searchParams.get('id')

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [includeCompleted, setIncludeCompleted] = useState(false)

  // Set selected campaign from URL
  useEffect(() => {
    if (campaignIdFromUrl) {
      setSelectedCampaignId(campaignIdFromUrl)
    }
  }, [campaignIdFromUrl])

  // Fetch campaigns from database
  const { data: campaigns, refetch: refetchCampaigns, isLoading } = trpc.firmware.listCampaigns.useQuery(
    { siteId: activeSiteId || undefined, includeCompleted },
    { enabled: true, refetchOnWindowFocus: false }
  )

  // Get selected campaign details
  const { data: selectedCampaign, refetch: refetchSelectedCampaign } = trpc.firmware.getCampaign.useQuery(
    { id: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  )

  // Update campaign status mutation
  const updateCampaignStatusMutation = trpc.firmware.updateCampaignStatus.useMutation({
    onSuccess: () => {
      refetchCampaigns()
      if (selectedCampaignId) {
        refetchSelectedCampaign()
      }
    },
  })

  // Delete campaign mutation
  const deleteCampaignMutation = trpc.firmware.deleteCampaign.useMutation({
    onSuccess: () => {
      refetchCampaigns()
      setSelectedCampaignId(null)
    },
  })

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return []

    if (!searchQuery.trim()) return campaigns

    const query = searchQuery.toLowerCase().trim()
    return campaigns.filter(campaign => {
      const searchableText = [
        campaign.name,
        campaign.description,
        campaign.version,
        (campaign as any).site?.name,
        campaign.status,
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(query)
    })
  }, [campaigns, searchQuery])

  const handleCreateCampaign = () => {
    setShowCreateModal(true)
  }

  const handleCampaignCreated = () => {
    setShowCreateModal(false)
    refetchCampaigns()
  }

  const handleStartCampaign = async (id: string) => {
    await updateCampaignStatusMutation.mutateAsync({
      id,
      status: 'IN_PROGRESS',
    })
  }

  const handlePauseCampaign = async (id: string) => {
    await updateCampaignStatusMutation.mutateAsync({
      id,
      status: 'PENDING',
    })
  }

  const handleCancelCampaign = async (id: string) => {
    if (confirm('Are you sure you want to cancel this campaign? This cannot be undone.')) {
      await updateCampaignStatusMutation.mutateAsync({
        id,
        status: 'CANCELLED',
      })
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      await deleteCampaignMutation.mutateAsync({ id })
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-[var(--color-bg-base)]">
      {/* Page Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Firmware Campaigns</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage device updates and track deployment progress</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 px-8 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/50 flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <SearchIsland
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search campaigns..."
            fullWidth
          />
        </div>

        <div className="h-6 w-px bg-[var(--color-border)] mx-2" />

        <div className="flex items-center gap-3">
          <Switch
            checked={includeCompleted}
            onCheckedChange={setIncludeCompleted}
            id="show-completed"
          />
          <label
            htmlFor="show-completed"
            className="text-sm font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
          >
            Show completed
          </label>
        </div>

        <div className="h-6 w-px bg-[var(--color-border)] mx-2" />

        <Button
          onClick={handleCreateCampaign}
          variant="primary"
          size="sm"
          className="shadow-[var(--shadow-sm)]"
        >
          Create Campaign
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto bg-[var(--color-bg-surface-subtle)]">
          {isLoading ? (
            <div className="p-8 text-[var(--color-text-muted)] flex items-center gap-2">
              <span className="animate-spin">⟳</span> Loading campaigns...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--color-bg-base)]">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center mb-6 shadow-[var(--shadow-md)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">No Firmware Campaigns</h3>
              <p className="text-[var(--color-text-muted)] max-w-xs mb-8">
                {searchQuery
                  ? 'No campaigns match your search criteria. Try adjusting your filters.'
                  : 'Create a campaign to update device firmware across your sites.'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateCampaign} variant="secondary" size="md">
                  Create Your First Campaign
                </Button>
              )}
            </div>
          ) : (
            <FirmwareCampaignList
              campaigns={filteredCampaigns}
              selectedCampaignId={selectedCampaignId}
              onSelectCampaign={setSelectedCampaignId}
              onStartCampaign={handleStartCampaign}
              onPauseCampaign={handlePauseCampaign}
              onCancelCampaign={handleCancelCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}
        </div>

        {/* Right Panel */}
        <ResizablePanel defaultWidth={384} minWidth={320} maxWidth={600}>
          <FirmwareCampaignPanel
            campaign={selectedCampaign}
            onStartCampaign={handleStartCampaign}
            onPauseCampaign={handlePauseCampaign}
            onCancelCampaign={handleCancelCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onRefresh={() => {
              refetchCampaigns()
              if (selectedCampaignId) {
                refetchSelectedCampaign()
              }
            }}
          />
        </ResizablePanel>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateFirmwareCampaignModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCampaignCreated}
        />
      )}
    </div>
  )
}
