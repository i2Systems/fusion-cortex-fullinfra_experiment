import { Meta, StoryObj } from '@storybook/react'
import { PageTitle } from '@/components/layout/PageTitle'

const meta: Meta<typeof PageTitle> = {
  title: 'Layout/PageTitle',
  component: PageTitle,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Dashboard',
  },
}

export const WithSubtitle: Story = {
  args: {
    title: 'Device Lookup',
    subtitle: 'Search and manage devices across all sites',
  },
}

export const WithAction: Story = {
  args: {
    title: 'Zones',
    subtitle: 'Manage zones for site-1234',
    action: (
      <button className="fusion-button fusion-button-primary">
        Create Zone
      </button>
    ),
  },
}

