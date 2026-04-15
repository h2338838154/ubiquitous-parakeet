import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 允许的开发环境域名
  allowedDevOrigins: ['*.dev.coze.site'],
  
  // 图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  
  // 修复锁文件警告
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
