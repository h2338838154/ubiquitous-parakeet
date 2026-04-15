#!/bin/bash
# 部署脚本 - 在沙箱中运行此脚本即可部署

# 1. 安装依赖
pnpm install

# 2. 构建生产版本
pnpm build

# 3. 启动生产服务器
pnpm start
