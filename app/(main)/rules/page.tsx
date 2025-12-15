/**
 * Rules & Overrides Section
 * 
 * Main area: Rule list (left side)
 * Right panel: Rule details when selected, or new rule form when nothing is selected
 * 
 * AI Note: Support rule patterns like:
 * - IF motion in Zone C THEN set Zones A+B+C to 25%
 * - IF no motion for 30 minutes THEN return to BMS
 * - IF daylight > 120fc THEN dim to minimum
 * 
 * Plain language labels, trigger → condition → action builder.
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { MapViewToggle, type MapViewMode } from '@/components/shared/MapViewToggle'
import { MapUpload } from '@/components/map/MapUpload'
import { RulesList } from '@/components/rules/RulesList'
import { RulesPanel } from '@/components/rules/RulesPanel'
import { useRules } from '@/lib/RuleContext'
import { useZones } from '@/lib/ZoneContext'
import { useDevices } from '@/lib/DeviceContext'
import { Rule } from '@/lib/mockRules'

// Dynamically import RulesZoneCanvas to avoid SSR issues with Konva
const RulesZoneCanvas = dynamic(() => import('@/components/rules/RulesZoneCanvas').then(mod => ({ default: mod.RulesZoneCanvas })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading map...</div>
    </div>
  ),
})

export default function RulesPage() {
  const { rules, addRule, updateRule, deleteRule } = useRules()
  const { zones } = useZones()
  const { devices } = useDevices()
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<MapViewMode>('list')
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [mapUploaded, setMapUploaded] = useState(false)
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null)

  // Load saved map image on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedImageUrl = localStorage.getItem('map-image-url')
      if (savedImageUrl) {
        setMapImageUrl(savedImageUrl)
        setMapUploaded(true)
      }
    }
  }, [])

  const handleMapUpload = (imageUrl: string) => {
    setMapImageUrl(imageUrl)
    setMapUploaded(true)
  }

  const selectedRule = useMemo(() => {
    return rules.find(r => r.id === selectedRuleId) || null
  }, [rules, selectedRuleId])

  // Handle zone selection from map
  const handleZoneSelect = (zoneName: string | null) => {
    setSelectedZoneName(zoneName)
  }

  // Filter rules based on selected zone
  const filteredRules = useMemo(() => {
    let filtered = rules
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(rule => 
        rule.name.toLowerCase().includes(query) ||
        rule.description?.toLowerCase().includes(query) ||
        rule.condition.zone?.toLowerCase().includes(query) ||
        rule.action.zones.some(z => z.toLowerCase().includes(query))
      )
    }
    
    // Apply zone filter (only if zone name is provided and zones are loaded)
    if (selectedZoneName && zones.length > 0) {
      filtered = filtered.filter(rule => 
        rule.condition.zone === selectedZoneName ||
        rule.action.zones.includes(selectedZoneName)
      )
    }
    
    return filtered
  }, [rules, searchQuery, selectedZoneName, zones.length])

  // Prepare zones for map
  const mapZones = useMemo(() => {
    return zones.map(z => ({
      id: z.id,
      name: z.name,
      color: z.color,
      polygon: z.polygon,
    }))
  }, [zones])

  // Prepare devices for map
  const mapDevices = useMemo(() => {
    return devices.map(d => ({
      id: d.id,
      x: d.x || 0,
      y: d.y || 0,
      type: d.type,
      deviceId: d.deviceId,
      status: d.status,
      signal: d.signal,
      location: d.location,
    }))
  }, [devices])

  // Get zones that have rules
  const zonesWithRules = useMemo(() => {
    const zoneSet = new Set<string>()
    rules.forEach(rule => {
      if (rule.condition.zone) zoneSet.add(rule.condition.zone)
      rule.action.zones.forEach(z => zoneSet.add(z))
    })
    return Array.from(zoneSet)
  }, [rules])

  const handleSave = (ruleData: Partial<Rule>) => {
    if (selectedRule) {
      // Update existing rule
      updateRule(selectedRule.id, ruleData as Partial<Rule>)
    } else {
      // Create new rule
      addRule({
        name: ruleData.name || 'New Rule',
        description: ruleData.description,
        trigger: ruleData.trigger || 'motion',
        condition: ruleData.condition || {},
        action: ruleData.action || { zones: [] },
        overrideBMS: ruleData.overrideBMS || false,
        enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
      })
      // Clear selection after creating
      setSelectedRuleId(null)
    }
  }

  const handleCancel = () => {
    setSelectedRuleId(null)
  }

  const handleDelete = (ruleId: string) => {
    deleteRule(ruleId)
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(null)
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Top Search Island - In flow */}
      <div className="flex-shrink-0 px-[20px] pt-4 pb-3">
        <SearchIsland 
          position="top" 
          fullWidth={true}
          title="Rules & Overrides"
          subtitle="Create automation rules for lighting control"
          placeholder="Search rules or type 'create rule'..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onActionDetected={(action) => {
            if (action.id === 'create-rule') {
              setSelectedRuleId(null) // This will show the create form in RulesPanel
            }
          }}
        />
      </div>

      {/* Main Content: Rules List/Map + Details Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pb-14" style={{ overflow: 'visible' }}>
        {/* Rules List/Map - Left Side */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* View Toggle */}
          <div className="mb-3 flex items-center justify-between">
            <MapViewToggle currentView={viewMode} onViewChange={setViewMode} />
            {selectedZoneName && viewMode === 'map' && (
              <button
                onClick={() => setSelectedZoneName(null)}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {viewMode === 'list' ? (
              <div className="fusion-card overflow-hidden h-full flex flex-col">
                <RulesList
                  rules={filteredRules}
                  selectedRuleId={selectedRuleId}
                  onRuleSelect={setSelectedRuleId}
                  searchQuery={searchQuery}
                />
              </div>
            ) : (
              <div className="fusion-card overflow-hidden h-full flex flex-col rounded-2xl shadow-[var(--shadow-strong)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] relative">
                {!mapUploaded ? (
                  <div className="w-full h-full">
                    <MapUpload onMapUpload={handleMapUpload} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden">
                    <RulesZoneCanvas
                      zones={mapZones}
                      devices={mapDevices}
                      rules={rules}
                      mapImageUrl={mapImageUrl}
                      selectedZoneName={selectedZoneName}
                      onZoneSelect={handleZoneSelect}
                      devicesData={devices}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rules Panel - Right Side */}
        <RulesPanel
          selectedRule={selectedRule}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
