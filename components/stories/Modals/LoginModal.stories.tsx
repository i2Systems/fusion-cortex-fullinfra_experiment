import { Meta, StoryObj } from '@storybook/react'
import { LoginModal } from '@/components/auth/LoginModal'
import { useState } from 'react'

const meta: Meta<typeof LoginModal> = {
  title: 'Modals/LoginModal',
  component: LoginModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const ModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(true)
  return <LoginModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}

export const Default: Story = {
  render: () => <ModalWrapper />,
}

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
}

