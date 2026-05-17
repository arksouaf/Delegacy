/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (isServer) config.externals.push('ioredis');
    return config;
  },
};

module.exports = nextConfig;
