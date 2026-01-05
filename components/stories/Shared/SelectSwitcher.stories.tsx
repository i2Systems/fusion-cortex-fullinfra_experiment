import { Meta, StoryObj } from '@storybook/react'
import { SelectSwitcher } from '@/components/shared/SelectSwitcher'
import { useState } from 'react'

const meta: Meta<typeof SelectSwitcher> = {
  title: 'Shared/SelectSwitcher',
  component: SelectSwitcher,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const items = [
  { id: '1', name: 'Device 1' },
  { id: '2', name: 'Device 2' },
  { id: '3', name: 'Device 3' },
]

const SelectSwitcherWrapper = () => {
  const [selected, setSelected] = useState<typeof items[0] | null>(items[0])
  return (
    <SelectSwitcher
      items={items}
      selectedItem={selected}
      onSelect={setSelected}
      getLabel={(item) => item.name}
      getKey={(item) => item.id}
      placeholder="Select a device..."
    />
  )
}

export const Default: Story = {
  render: () => <SelectSwitcherWrapper />,
}

export const Empty: Story = {
  render: () => (
    <SelectSwitcher
      items={[]}
      selectedItem={null}
      onSelect={() => {}}
      getLabel={() => ''}
      placeholder="No items available"
    />
  ),
}

