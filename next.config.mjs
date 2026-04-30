/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.d\.ts\.map$/,
      use: 'null-loader',
    });
    if (config.name === 'server') {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@cursor/sdk');
      }
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@cursor/sdk'],
    instrumentationHook: true,
  },
};

export default nextConfig;
