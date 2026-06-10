import type { NextConfig } from 'next';

/**
 * App Router (Next 15): server-only env som RESEND_API_KEY lastes fra .env.local
 * automatisk i Node.js API-ruter. serverRuntimeConfig (Pages Router) trengs ikke.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ['docx', 'jszip'],
};

export default nextConfig;
