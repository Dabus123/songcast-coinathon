/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      // IPFS gateways
      'sapphire-raw-hawk-781.mypinata.cloud',
      'gateway.pinata.cloud',
      'ipfs.io',
      'cloudflare-ipfs.com',
      'dweb.link',
      'ipfs.filebase.io',
      'gateway.ipfs.io',
      'ipfs.infura.io'
    ],
    unoptimized: true, // Use unoptimized images for all domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Add other configuration options as needed
  reactStrictMode: true,
  experimental: {
    // Support for OpenGraph image generation
    serverComponentsExternalPackages: ['sharp'],
  },
  // Add environment variables here
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
  // Enable CORS for API routes that support Farcaster frame interactions
  async headers() {
    return [
      {
        source: '/api/frame/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/miniapp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 