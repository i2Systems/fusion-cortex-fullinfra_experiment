import { Meta, StoryObj } from '@storybook/react'
import { ConditionTile } from '@/components/rules/tiles/ConditionTile'

const meta: Meta<typeof ConditionTile> = {
  title: 'Rules/ConditionTile',
  component: ConditionTile,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    trigger: 'motion',
    condition: {},
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

export const WithZoneCondition: Story = {
  args: {
    trigger: 'motion',
    condition: { zone: 'Zone A' },
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

export const WithDuration: Story = {
  args: {
    trigger: 'no_motion',
    condition: { duration: 15 },
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

