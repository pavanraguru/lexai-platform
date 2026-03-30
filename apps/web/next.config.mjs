/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lexai/core'],
  typescript: {
    // During Railway build the web app is a bonus — skip type errors
    // Type checking happens in CI separately
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
