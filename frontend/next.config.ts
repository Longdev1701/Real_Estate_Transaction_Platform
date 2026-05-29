import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  },
  allowedDevOrigins: [
    "192.168.110.195",
    "localhost",
    "127.0.0.1"
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/api/:path*"
      },
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:4000/socket.io/:path*"
      }
    ];
  }
};

export default nextConfig;
