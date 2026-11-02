/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    cpus: 1,
    workerThreads: false
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raretoonindia.in',
      },
      {
        protocol: 'https',
        hostname: 'img-place.com',
      },
      {
        protocol: 'https',
        hostname: '**.r66nv9ed.com',
      },
      {
        protocol: 'https',
        hostname: '**.owphbf24.com',
      },
      {
        protocol: 'https',
        hostname: '**.animetoonhindi.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
};

export default nextConfig;
