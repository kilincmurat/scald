import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  // Self-hosted deployment: emit .next/standalone (server + only the traced
  // node_modules) so the runtime image does not need pnpm or the workspace.
  output: 'standalone',
  // The workspace root, not apps/web — otherwise tracing misses hoisted
  // pnpm dependencies and the standalone server fails on first import.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['maplibre-gl'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_MINIO_HOST || 'localhost',
      },
    ],
  },
  // Security headers for WCAG and general security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
