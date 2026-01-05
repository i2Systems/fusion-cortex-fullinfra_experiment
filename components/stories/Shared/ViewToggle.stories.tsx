import { Meta, StoryObj } from '@storybook/react'
import { ViewToggle } from '@/components/lookup/ViewToggle'
import { useState } from 'react'

const meta: Meta<typeof ViewToggle> = {
  title: 'Shared/ViewToggle',
  component: ViewToggle,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const ToggleWrapper = () => {
  const [view, setView] = useState<'table' | 'devices-map' | 'zones-map'>('table')
  return <ViewToggle currentView={view} onViewChange={setView} />
}

export const Default: Story = {
  render: () => <ToggleWrapper />,
}

export const TableView: Story = {
  args: {
    currentView: 'table',
    onViewChange: () => {},
  },
}

export const DevicesMapView: Story = {
  args: {
    currentView: 'devices-map',
    onViewChange: () => {},
  },
}

export const ZonesMapView: Story = {
  args: {
    currentView: 'zones-map',
    onViewChange: () => {},
  },
}

