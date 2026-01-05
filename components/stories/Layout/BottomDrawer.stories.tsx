import { Meta, StoryObj } from '@storybook/react'
import { BottomDrawer } from '@/components/layout/BottomDrawer'

const meta: Meta<typeof BottomDrawer> = {
  title: 'Layout/BottomDrawer',
  component: BottomDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div style={{ padding: 'var(--space-4)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Bottom drawer content</p>
      </div>
    ),
  },
}

