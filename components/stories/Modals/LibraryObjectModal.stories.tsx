import { Meta, StoryObj } from '@storybook/react'
import { LibraryObjectModal } from '@/components/library/LibraryObjectModal'
import { useState } from 'react'

const meta: Meta<typeof LibraryObjectModal> = {
  title: 'Modals/LibraryObjectModal',
  component: LibraryObjectModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const ModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <LibraryObjectModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      object={{
        id: 'fixture-16ft-power-entry',
        name: '16ft Power Entry Fixture',
        type: 'device',
        description: '16-foot power entry lighting fixture',
        category: 'Fixture',
      }}
    />
  )
}

export const Default: Story = {
  render: () => <ModalWrapper />,
}

export const ComponentType: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    object: {
      id: 'driver-board',
      name: 'Driver Board',
      type: 'component',
      description: 'LED driver board component',
      category: 'Component',
      quantity: 2,
    },
  },
}

