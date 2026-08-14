import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
