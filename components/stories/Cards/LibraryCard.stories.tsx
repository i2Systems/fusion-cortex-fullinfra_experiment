import { Meta, StoryObj } from '@storybook/react'
import { LibraryCard } from '@/components/library/LibraryCard'

const meta: Meta<typeof LibraryCard> = {
  title: 'Cards/LibraryCard',
  component: LibraryCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const DeviceType: Story = {
  args: {
    object: {
      id: 'fixture-16ft-power-entry',
      name: '16ft Power Entry Fixture',
      type: 'device',
      description: '16-foot power entry lighting fixture',
    },
    onClick: () => console.log('Card clicked'),
  },
}

export const ComponentType: Story = {
  args: {
    object: {
      id: 'driver-board',
      name: 'Driver Board',
      type: 'component',
      description: 'LED driver board component',
    },
    onClick: () => console.log('Card clicked'),
  },
}

