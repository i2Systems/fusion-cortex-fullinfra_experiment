/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Konva requires canvas on server-side, but we only use it client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      }
    }

    // Ignore canvas module for client-side builds
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }

    return config
  },
}

module.exports = nextConfig

