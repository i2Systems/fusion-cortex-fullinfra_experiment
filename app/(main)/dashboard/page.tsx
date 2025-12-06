/**
 * Dashboard / Home Page
 * 
 * Landing page with search island at the top.
 * Overview of system status, recent activity, etc.
 * 
 * AI Note: This is the main landing page. Search is in a floating
 * island at the top, similar to macOS Spotlight or modern dashboards.
 */

'use client'

import { SearchIsland } from '@/components/layout/SearchIsland'
import { useDevices } from '@/lib/DeviceContext'
import { useZones } from '@/lib/ZoneContext'

export default function DashboardPage() {
  const { devices } = useDevices()
  const { zones } = useZones()
  
  const onlineDevices = devices.filter(d => d.status === 'online').length
  const offlineDevices = devices.filter(d => d.status === 'offline' || d.status === 'missing').length
  const healthPercentage = devices.length > 0 
    ? Math.round((onlineDevices / devices.length) * 100)
    : 100
  const activeZones = zones.length

  return (
    <div className="h-full flex flex-col min-h-0 p-8 pb-2">
      {/* Dashboard Content */}
      <div className="flex-1 min-h-0 overflow-hidden max-w-7xl mx-auto w-full flex flex-col">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-shrink-0">
          <div className="fusion-card">
            <div className="text-sm text-[var(--color-text-muted)] mb-2">Total Devices</div>
            <div className="text-3xl font-bold text-[var(--color-text)]">{devices.length.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-success)] mt-2">Discovered devices</div>
          </div>
          <div className="fusion-card">
            <div className="text-sm text-[var(--color-text-muted)] mb-2">Active Zones</div>
            <div className="text-3xl font-bold text-[var(--color-text)]">{activeZones}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-2">Configured zones</div>
          </div>
          <div className="fusion-card">
            <div className="text-sm text-[var(--color-text-muted)] mb-2">System Health</div>
            <div className="text-3xl font-bold text-[var(--color-success)]">{healthPercentage}%</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-2">
              {offlineDevices} device{offlineDevices !== 1 ? 's' : ''} offline
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
          <div className="fusion-card">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)]"></div>
                <div className="flex-1">
                  <div className="text-sm text-[var(--color-text)]">Discovery scan completed - {devices.length.toLocaleString()} devices found</div>
                  <div className="text-xs text-[var(--color-text-muted)]">3 minutes ago</div>
                </div>
              </div>
              {zones.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                  <div className="flex-1">
                    <div className="text-sm text-[var(--color-text)]">Zone "{zones[0]?.name}" configuration saved</div>
                    <div className="text-xs text-[var(--color-text-muted)]">18 minutes ago</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-subtle)] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]"></div>
                <div className="flex-1">
                  <div className="text-sm text-[var(--color-text)]">BACnet mapping updated for {zones.length > 0 ? zones[0]?.name : 'Zone'}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">1 hour ago</div>
                </div>
              </div>
            </div>
          </div>

          <div className="fusion-card">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full fusion-button fusion-button-primary text-left justify-start">
                Start Discovery
              </button>
              <button className="w-full fusion-button" style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}>
                Create Zone
              </button>
              <button className="w-full fusion-button" style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text)' }}>
                View Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Search Island with Title */}
      <SearchIsland 
        position="bottom" 
        fullWidth={true}
        title="Dashboard"
        subtitle="Overview of your lighting system"
        placeholder="Search, input a task, or ask a question..."
      />
    </div>
  )
}

