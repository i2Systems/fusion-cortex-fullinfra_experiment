import { Meta, StoryObj } from '@storybook/react'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { useState } from 'react'

const meta: Meta<typeof SettingsModal> = {
  title: 'Modals/SettingsModal',
  component: SettingsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const ModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(true)
  return <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}

export const Default: Story = {
  render: () => <ModalWrapper />,
}

