import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mobile IP ko direct allow kar rahe hain
  allowedDevOrigins: ['10.36.98.100', 'localhost:3000'],
} as any; // <- Ye 'as any' lagane se TypeScript ispe koi error nahi dega!

export default nextConfig;