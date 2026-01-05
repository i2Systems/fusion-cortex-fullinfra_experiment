import { Meta, StoryObj } from '@storybook/react'
import { AddSiteModal } from '@/components/dashboard/AddSiteModal'
import { useState } from 'react'

const meta: Meta<typeof AddSiteModal> = {
  title: 'Modals/AddSiteModal',
  component: AddSiteModal,
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
    <AddSiteModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onAdd={(site) => console.log('Add site:', site)}
      onEdit={(id, site) => console.log('Edit site:', id, site)}
    />
  )
}

export const Default: Story = {
  render: () => <ModalWrapper />,
}

export const Editing: Story = {
  args: {
    isOpen: true,
    editingSite: {
      id: 'site-1234',
      name: 'Store #1234 - Main St',
      siteNumber: '1234',
      address: '1250 Main Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '(217) 555-0123',
      manager: 'Sarah Johnson',
      squareFootage: 180000,
      openedDate: new Date('2018-03-15'),
    },
    onClose: () => {},
    onAdd: () => {},
    onEdit: () => {},
  },
}

