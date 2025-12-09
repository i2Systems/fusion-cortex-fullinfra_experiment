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

import { useState, useMemo } from 'react'
import { SearchIsland } from '@/components/layout/SearchIsland'
import { RulesList } from '@/components/rules/RulesList'
import { RulesPanel } from '@/components/rules/RulesPanel'
import { useRules } from '@/lib/RuleContext'
import { Rule } from '@/lib/mockRules'

export default function RulesPage() {
  const { rules, addRule, updateRule, deleteRule } = useRules()
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedRule = useMemo(() => {
    return rules.find(r => r.id === selectedRuleId) || null
  }, [rules, selectedRuleId])

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
    <div className="h-full flex flex-col min-h-0 pb-2 overflow-visible">
      {/* Main Content: Rules List + Details Panel */}
      <div className="main-content-area flex-1 flex min-h-0 gap-4 px-[20px] pt-4 pb-48 overflow-visible">
        {/* Rules List - Left Side */}
        <div className="flex-1 min-w-0">
          <div className="fusion-card overflow-hidden h-full flex flex-col">
            <RulesList
              rules={rules}
              selectedRuleId={selectedRuleId}
              onRuleSelect={setSelectedRuleId}
              searchQuery={searchQuery}
            />
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

      {/* Bottom Search Island */}
      <div className="fixed bottom-10 left-[80px] right-4 z-50">
        <SearchIsland 
          position="bottom" 
          fullWidth={true}
          title="Rules & Overrides"
          subtitle="Create automation rules for lighting control"
          placeholder="Search rules..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </div>
  )
}
