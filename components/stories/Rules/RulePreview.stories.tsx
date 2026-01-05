import { Meta, StoryObj } from '@storybook/react'
import { RulePreview } from '@/components/rules/RulePreview'

const meta: Meta<typeof RulePreview> = {
  title: 'Rules/RulePreview',
  component: RulePreview,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    rule: {
      id: 'rule-1',
      name: 'Motion Activated Lighting',
      type: 'rule',
      trigger: 'motion',
      condition: { zone: 'Zone A' },
      action: {
        zones: ['Zone A'],
        brightness: 75,
      },
      enabled: true,
    } as any,
  },
}

export const WithDuration: Story = {
  args: {
    rule: {
      id: 'rule-2',
      name: 'No Motion Timeout',
      type: 'rule',
      trigger: 'no_motion',
      condition: { duration: 15 },
      action: {
        zones: ['Zone A'],
        brightness: 0,
      },
      enabled: true,
    } as any,
  },
}

