/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  // Force cache busting
  generateEtags: false,
  poweredByHeader: false,
  // Force complete cache busting with version tracking
  env: {
    BUILD_TIME: new Date().toISOString(),
    CACHE_BUST: Date.now().toString(),
    FORCE_REBUILD: "v47-" + Date.now(),
    DEPLOYMENT_VERSION: "v47-KIRO-TEST",
    BUILD_ID: "build-" + Math.random().toString(36).substr(2, 9)
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
