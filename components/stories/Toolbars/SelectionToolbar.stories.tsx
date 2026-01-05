import { Meta, StoryObj } from '@storybook/react'
import { SelectionToolbar } from '@/components/map/SelectionToolbar'

const meta: Meta<typeof SelectionToolbar> = {
  title: 'Toolbars/SelectionToolbar',
  component: SelectionToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    selectedCount: 3,
    onCreateZone: () => console.log('Create zone'),
    onClearSelection: () => console.log('Clear selection'),
    onAddToZone: () => console.log('Add to zone'),
  },
}

export const SingleSelection: Story = {
  args: {
    selectedCount: 1,
    onCreateZone: () => {},
    onClearSelection: () => {},
  },
}

export const ManySelected: Story = {
  args: {
    selectedCount: 15,
    onCreateZone: () => {},
    onClearSelection: () => {},
  },
}

export const WithPosition: Story = {
  args: {
    selectedCount: 5,
    position: { x: 400, y: 300 },
    onCreateZone: () => {},
    onClearSelection: () => {},
  },
}

