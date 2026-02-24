import type { NextConfig } from "next";

/**
 * Security Headers Configuration
 *
 * These headers protect against common web vulnerabilities:
 * - CSP: Prevents XSS attacks by controlling which resources can be loaded
 * - X-Frame-Options: Prevents clickjacking by blocking iframe embedding
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - Referrer-Policy: Controls how much referrer info is sent
 * - Permissions-Policy: Restricts browser feature access
 * - HSTS: Forces HTTPS connections
 */

const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://vercel.live https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' https://*.supabase.co data: blob:;
  font-src 'self' https://fonts.gstatic.com data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  frame-src https://vercel.live https://js.stripe.com https://*.stripe.com;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://api.stripe.com https://m.stripe.com https://q.stripe.com;
  upgrade-insecure-requests;
`.replace(/\n/g, '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        // Calendar feeds are consumed by calendar apps (Apple Calendar, Google Calendar),
        // not browsers. Override the catch-all CSP (upgrade-insecure-requests breaks
        // webcal:// protocol) with a minimal policy. Must come AFTER /(.*) to override.
        source: '/api/calendar/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Special headers for service worker
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
