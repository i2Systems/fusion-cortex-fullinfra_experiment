import { Meta, StoryObj } from '@storybook/react'
import { ContextPanel } from '@/components/layout/ContextPanel'

const meta: Meta<typeof ContextPanel> = {
  title: 'Layout/ContextPanel',
  component: ContextPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Device Details',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Device Information</h3>
        <div className="space-y-2">
          <p style={{ color: 'var(--color-text-muted)' }}>Device ID: DEV-12345</p>
          <p style={{ color: 'var(--color-text-muted)' }}>Type: Fixture - 16ft Power Entry</p>
          <p style={{ color: 'var(--color-text-muted)' }}>Status: Online</p>
        </div>
      </div>
    ),
  },
}

export const WithClose: Story = {
  args: {
    isOpen: true,
    title: 'Zone Details',
    onClose: () => console.log('Close clicked'),
    children: (
      <div>
        <p style={{ color: 'var(--color-text-muted)' }}>Zone information goes here</p>
      </div>
    ),
  },
}

export const Empty: Story = {
  args: {
    isOpen: true,
    title: 'Empty Panel',
  },
}

