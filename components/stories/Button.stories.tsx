import { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Components/Button',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Button component with primary, secondary, and ghost variants. Use the Theme selector in the toolbar to see how buttons adapt to different themes.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  render: () => (
    <button className="fusion-button fusion-button-primary">
      Primary Button
    </button>
  ),
}

export const Secondary: Story = {
  render: () => (
    <button className="fusion-button fusion-button-secondary">
      Secondary Button
    </button>
  ),
}

export const Ghost: Story = {
  render: () => (
    <button className="fusion-button fusion-button-ghost">
      Ghost Button
    </button>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      <button className="fusion-button fusion-button-primary">Primary</button>
      <button className="fusion-button fusion-button-secondary">Secondary</button>
      <button className="fusion-button fusion-button-ghost">Ghost</button>
    </div>
  ),
}

