const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content-Security-Policy.
 *
 * - script-src needs 'unsafe-inline' because Next.js emits inline bootstrap scripts
 *   (switch to nonce-based CSP via middleware if you need to remove it).
 * - 'unsafe-eval' is only added in development (React Fast Refresh needs it).
 * - connect-src allows https/wss so the app can talk to whichever Solana RPC you configure.
 * - frame-src allows Solflare's web connector iframe (used when no extension is installed).
 * - frame-ancestors 'none' stops other sites from embedding this app (anti-clickjacking).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:" + (isDev ? ' ws:' : ''),
  "frame-src 'self' https://connect.solflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
