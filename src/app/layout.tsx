import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '智能物流绩效分析系统',
    template: '%s | 智能物流绩效分析系统',
  },
  description: '智能物流排班系统，上传Excel业务量数据，自动计算人效、薪资、盈亏，支持多维度可视化图表',
  keywords: [
    '物流',
    '绩效分析',
    '人效统计',
    '排班系统',
    '数据分析',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
