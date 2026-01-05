import { Meta, StoryObj } from '@storybook/react'
import { TriggerTile } from '@/components/rules/tiles/TriggerTile'
import { useState } from 'react'

const meta: Meta<typeof TriggerTile> = {
  title: 'Rules/TriggerTile',
  component: TriggerTile,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const TileWrapper = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [trigger, setTrigger] = useState<'motion' | undefined>(undefined)
  
  return (
    <TriggerTile
      trigger={trigger}
      ruleType="rule"
      isEditing={isEditing}
      onClick={() => setIsEditing(!isEditing)}
      onChange={(newTrigger) => {
        setTrigger(newTrigger)
        setIsEditing(false)
      }}
    />
  )
}

export const Default: Story = {
  render: () => <TileWrapper />,
}

export const WithMotionTrigger: Story = {
  args: {
    trigger: 'motion',
    ruleType: 'rule',
    isEditing: false,
    onClick: () => {},
    onChange: () => {},
  },
}

export const Editing: Story = {
  args: {
    trigger: undefined,
    ruleType: 'rule',
    isEditing: true,
    onClick: () => {},
    onChange: () => {},
  },
}

