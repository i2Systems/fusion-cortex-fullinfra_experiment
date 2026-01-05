import { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Components/Card',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="fusion-card" style={{ width: '300px' }}>
      <h3 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text)' }}>
        Card Title
      </h3>
      <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
        This is a card component using the fusion-card utility class.
      </p>
    </div>
  ),
}

export const WithContent: Story = {
  render: () => (
    <div className="fusion-card" style={{ width: '400px' }}>
      <div className="fusion-card-tile-header">
        <div>
          <h3 className="fusion-card-tile-title">Site Dashboard</h3>
          <p className="fusion-card-tile-subtitle">Store #1234 - Main St</p>
        </div>
      </div>
      <div className="fusion-card-tile-kpis">
        <div className="fusion-card-tile-kpi">
          <span className="fusion-card-tile-kpi-label">Devices</span>
          <span className="fusion-card-tile-kpi-value">142</span>
        </div>
        <div className="fusion-card-tile-kpi">
          <span className="fusion-card-tile-kpi-label">Zones</span>
          <span className="fusion-card-tile-kpi-value">8</span>
        </div>
        <div className="fusion-card-tile-kpi">
          <span className="fusion-card-tile-kpi-label">Faults</span>
          <span className="fusion-card-tile-kpi-value">3</span>
        </div>
      </div>
    </div>
  ),
}

