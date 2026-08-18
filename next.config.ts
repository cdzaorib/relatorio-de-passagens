import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Erros de tipo e de lint quebram o build de propósito (evita subir código torto).
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

export default nextConfig
