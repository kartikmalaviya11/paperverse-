import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mobile IP ko direct allow kar rahe hain
  allowedDevOrigins: ['10.36.98.100', 'localhost:3000'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google account profile photos
      },
    ],
  },
};

export default nextConfig;