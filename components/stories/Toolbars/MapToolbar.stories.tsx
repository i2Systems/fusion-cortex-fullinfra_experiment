import { Meta, StoryObj } from '@storybook/react'
import { MapToolbar } from '@/components/map/MapToolbar'

const meta: Meta<typeof MapToolbar> = {
  title: 'Toolbars/MapToolbar',
  component: MapToolbar,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onUpload: () => console.log('Upload clicked'),
    onToggleView: () => console.log('View toggled'),
    currentView: 'map',
  },
}

export const ListView: Story = {
  args: {
    onUpload: () => {},
    onToggleView: () => {},
    currentView: 'list',
  },
}

