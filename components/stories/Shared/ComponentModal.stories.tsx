import { Meta, StoryObj } from '@storybook/react'
import { ComponentModal } from '@/components/shared/ComponentModal'
import { useState } from 'react'

const meta: Meta<typeof ComponentModal> = {
  title: 'Shared/ComponentModal',
  component: ComponentModal,
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
    <ComponentModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      component={{
        componentType: 'driver-board',
        serialNumber: 'DRV-001',
        warrantyExpiry: new Date('2025-12-31'),
        notes: 'Test component',
      }}
      parentDevice={{
        deviceId: 'DEV-123',
        type: 'fixture-16ft-power-entry',
        status: 'online',
      } as any}
    />
  )
}

export const Default: Story = {
  render: () => <ModalWrapper />,
}

