import { Meta, StoryObj } from '@storybook/react'
import { ActionTile } from '@/components/rules/tiles/ActionTile'

const meta: Meta<typeof ActionTile> = {
  title: 'Rules/ActionTile',
  component: ActionTile,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    action: {},
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

export const WithBrightness: Story = {
  args: {
    action: {
      zones: ['Zone A', 'Zone B'],
      brightness: 75,
    },
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

export const WithDuration: Story = {
  args: {
    action: {
      zones: ['Zone A'],
      brightness: 50,
      duration: 30,
    },
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

