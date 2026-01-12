import type { Meta, StoryObj } from '@storybook/react'
import { ToastProvider, useToast } from '@/lib/ToastContext'
import { ToastContainer as UIContainer } from '@/components/ui/Toast' // Import correct component
import { ToastProvider as Provider } from '@/lib/ToastContext'
import { Button } from '@/components/ui/Button'
import React from 'react'

// Wrapper component to use the hook
const ToastDemo = () => {
    const { addToast } = useToast()

    return (
        <div className="flex flex-col gap-4 items-start p-8">
            <Button
                onClick={() =>
                    addToast({
                        type: 'success',
                        title: 'Success',
                        message: 'Site created successfully! You can now add devices.',
                    })
                }
            >
                Show Success Toast
            </Button>
            <Button
                variant="danger"
                onClick={() =>
                    addToast({
                        type: 'error',
                        title: 'Error',
                        message: 'Failed to create site. Please try again.',
                    })
                }
            >
                Show Error Toast
            </Button>
            <Button
                variant="secondary"
                onClick={() =>
                    addToast({
                        type: 'info',
                        title: 'Info',
                        message: 'A new update is available.',
                    })
                }
            >
                Show Info Toast
            </Button>
            <Button
                variant="ghost"
                onClick={() =>
                    addToast({
                        type: 'warning',
                        title: 'Warning',
                        message: 'Your session is about to expire.',
                    })
                }
            >
                Show Warning Toast
            </Button>
        </div>
    )
}

const meta: Meta<typeof Provider> = {
    title: 'UI/Toast',
    component: Provider,
    decorators: [
        (Story) => (
            <Provider>
                <Story />
                <UIContainer />
            </Provider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof Provider>

export const Default: Story = {
    render: () => <ToastDemo />,
}
