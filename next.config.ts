import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nansen-cli', 'better-sqlite3'],
};

export default nextConfig;
