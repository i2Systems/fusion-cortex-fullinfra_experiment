import { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Components/DataChip',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <span
        style={{
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-surface-subtle)',
          color: 'var(--color-text)',
          fontSize: 'var(--font-size-sm)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        Online
      </span>
      <span
        style={{
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-success)',
          color: 'var(--color-text-on-primary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Active
      </span>
      <span
        style={{
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-danger)',
          color: 'var(--color-text-on-primary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Fault
      </span>
      <span
        style={{
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-warning)',
          color: 'var(--color-text-on-primary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Warning
      </span>
    </div>
  ),
}

