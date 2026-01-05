import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  core: {
    builder: {
      name: '@storybook/builder-webpack5',
      options: {
        fsCache: true,
      },
    },
  },
  webpackFinal: async (config) => {
    // Handle Next.js specific imports and path resolution
    if (!config.resolve) config.resolve = {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '..'),
    }
    
    // Ignore Next.js specific modules that aren't needed in Storybook
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    return config
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: false, // Disable react-docgen for now to avoid issues
  },
}

export default config

