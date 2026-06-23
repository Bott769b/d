/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The chat route streams SSE; let the runtime handle the response body.
  experimental: {
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
