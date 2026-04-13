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
  
  // Netlify 部署配置
  trailingSlash: false,
  
  // 输出配置 - Netlify 需要
  output: 'standalone',
};

export default nextConfig;
