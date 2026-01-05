import { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Cards/DataChip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Status, type, and warranty chips using design token classes. Use the Theme selector to see how chips adapt to different themes.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const StatusOnline: Story = {
  render: () => (
    <span className="token-status-online">Online</span>
  ),
}

export const StatusOffline: Story = {
  render: () => (
    <span className="token-status-offline">Offline</span>
  ),
}

export const StatusError: Story = {
  render: () => (
    <span className="token-status-error">Error</span>
  ),
}

export const TypeFixture: Story = {
  render: () => (
    <span className="token-type-fixture">Fixture</span>
  ),
}

export const WarrantyInWarranty: Story = {
  render: () => (
    <span className="token-warranty-in-warranty">In Warranty</span>
  ),
}

export const AllStatusChips: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <span className="token-status-online">Online</span>
      <span className="token-status-offline">Offline</span>
      <span className="token-status-error">Error</span>
      <span className="token-status-warning">Warning</span>
      <span className="token-status-info">Info</span>
    </div>
  ),
}

