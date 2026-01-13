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
        campaign.site?.name,
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
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      <div className="px-[20px] py-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchIsland
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search campaigns..."
            />
          </div>
          <Button
            onClick={handleCreateCampaign}
            variant="primary"
            size="md"
          >
            Create Campaign
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            Show completed campaigns
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-[20px] text-[var(--color-text-muted)]">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-[20px]">
              <div className="text-[var(--color-text-muted)] mb-4">
                {searchQuery ? 'No campaigns match your search.' : 'No firmware campaigns yet.'}
              </div>
              {!searchQuery && (
                <Button onClick={handleCreateCampaign} variant="primary">
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
