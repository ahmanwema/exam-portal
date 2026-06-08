import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'exam-portal-oatizijlc-ahmanwema-5144s-projects.vercel.app',
        '*.vercel.app',
      ],
    },
  },
}

export default nextConfig
