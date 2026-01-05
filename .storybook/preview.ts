import type { Preview } from '@storybook/react'
import React from 'react'
import '../app/globals.css'
import { ThemeDecorator, THEMES } from './ThemeDecorator'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Disable default backgrounds since we're using themes
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEMES.map((theme) => ({
          value: theme,
          title: theme.charAt(0).toUpperCase() + theme.slice(1).replace(/-/g, ' '),
        })),
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [ThemeDecorator],
}

export default preview

