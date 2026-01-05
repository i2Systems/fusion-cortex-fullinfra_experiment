import { Meta, StoryObj } from '@storybook/react'
import { MapViewToggle } from '@/components/shared/MapViewToggle'
import { useState } from 'react'

const meta: Meta<typeof MapViewToggle> = {
  title: 'Shared/MapViewToggle',
  component: MapViewToggle,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const ToggleWrapper = () => {
  const [view, setView] = useState<'list' | 'map'>('list')
  return <MapViewToggle currentView={view} onViewChange={setView} />
}

export const Default: Story = {
  render: () => <ToggleWrapper />,
}

export const ListView: Story = {
  args: {
    currentView: 'list',
    onViewChange: () => {},
  },
}

export const MapView: Story = {
  args: {
    currentView: 'map',
    onViewChange: () => {},
  },
}

