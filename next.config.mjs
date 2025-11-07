/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  // Force cache busting
  generateEtags: false,
  poweredByHeader: false,
  // Add timestamp to force rebuild
  env: {
    BUILD_TIME: new Date().toISOString(),
    CACHE_BUST: Date.now().toString()
  }
};

export default nextConfig;
