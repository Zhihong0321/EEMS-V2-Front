/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  // Force cache busting
  generateEtags: false,
  poweredByHeader: false,
  // Force complete cache busting
  env: {
    BUILD_TIME: new Date().toISOString(),
    CACHE_BUST: Date.now().toString(),
    FORCE_REBUILD: "v2.0-" + Date.now()
  },
  // Disable all caching
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate'
        }
      ]
    }
  ]
};

export default nextConfig;
