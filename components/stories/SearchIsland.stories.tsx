import { Meta, StoryObj } from '@storybook/react'
import { SearchIsland } from '@/components/layout/SearchIsland'

const meta: Meta<typeof SearchIsland> = {
  title: 'Layout/SearchIsland',
  component: SearchIsland,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

