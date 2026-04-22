/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'natural', '@prisma/client'],
  },
}

module.exports = nextConfig
