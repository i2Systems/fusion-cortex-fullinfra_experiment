import { Meta, StoryObj } from '@storybook/react'
import { ZoneToolbar } from '@/components/zones/ZoneToolbar'
import { useState } from 'react'

const meta: Meta<typeof ZoneToolbar> = {
  title: 'Toolbars/ZoneToolbar',
  component: ZoneToolbar,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const ToolbarWrapper = () => {
  const [mode, setMode] = useState<'select' | 'draw-rectangle' | 'draw-polygon' | 'edit' | 'delete'>('select')
  return (
    <ZoneToolbar
      mode={mode}
      onModeChange={setMode}
      onDeleteZone={() => console.log('Delete zone')}
      canDelete={true}
      onSave={() => console.log('Save')}
    />
  )
}

export const Default: Story = {
  render: () => <ToolbarWrapper />,
}

export const SelectMode: Story = {
  args: {
    mode: 'select',
    onModeChange: () => {},
  },
}

export const DrawRectangleMode: Story = {
  args: {
    mode: 'draw-rectangle',
    onModeChange: () => {},
  },
}

