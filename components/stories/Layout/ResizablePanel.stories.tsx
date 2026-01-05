import { Meta, StoryObj } from '@storybook/react'
import { ResizablePanel } from '@/components/layout/ResizablePanel'

const meta: Meta<typeof ResizablePanel> = {
  title: 'Layout/ResizablePanel',
  component: ResizablePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    defaultWidth: 400,
    minWidth: 200,
    maxWidth: 800,
    children: (
      <div style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>Resizable Panel</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Drag the handle on the left to resize this panel. It will collapse when dragged below the threshold.
        </p>
      </div>
    ),
  },
}

export const WithCloseButton: Story = {
  args: {
    defaultWidth: 400,
    showCloseButton: true,
    onClose: () => console.log('Panel closed'),
    children: (
      <div style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ color: 'var(--color-text)' }}>Panel with Close Button</h3>
      </div>
    ),
  },
}

