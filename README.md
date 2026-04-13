# 物流绩效分析系统 - Netlify 部署指南

## 快速开始

### 第一步：在 Netlify 上部署

1. **Fork 或上传代码到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "物流绩效分析系统"
   git remote add origin https://github.com/你的用户名/你的仓库.git
   git push -u origin main
   ```

2. **连接 Netlify**
   - 访问 [app.netlify.com](https://app.netlify.com/)
   - 点击 "Add new site" → "Import an existing project"
   - 选择 "GitHub" 授权
   - 选择你的仓库

3. **配置构建设置**
   - **Base directory**: 空（或留空）
   - **Build command**: `pnpm install && pnpm next build`
   - **Publish directory**: `.next`

4. **添加环境变量**（重要！）
   在 Netlify 后台 → Site settings → Environment variables，添加：

   | Key | Value（从 Supabase 获取） |
   |-----|--------------------------|
   | NEXT_PUBLIC_SUPABASE_URL | `https://ccijiwfjklrmnabdnrua.supabase.co` |
   | NEXT_PUBLIC_SUPABASE_ANON_KEY | 在 Supabase → Settings → API 中复制 `anon` 密钥 |

5. **触发重新部署**
   点击 "Deploys" → "Trigger deploy" → "Deploy site"

### 第二步：获取你的 Supabase 密钥

1. 登录 [Supabase](https://supabase.com/dashboard)
2. 进入你的项目
3. 点击 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public** 密钥

### 第三步：验证部署

部署完成后，访问 Netlify 分配的域名（格式为 `xxx-xxx.netlify.app`）。

如果页面能正常加载，说明部署成功！

---

## 常见问题

### Q: 云端数据无法加载？

**检查 RLS 策略**：
1. 在 Supabase 后台 → Table Editor → logistics_data
2. 点击 "Policies" 标签
3. 确保有以下策略（允许公开访问）：
   - ✅ 允许公开读取
   - ✅ 允许公开插入
   - ✅ 允许公开更新
   - ✅ 允许公开删除

### Q: 页面显示空白？

**检查环境变量**：
1. 确认 Supabase URL 和 ANON_KEY 正确
2. 确保没有多余的空格或引号
3. 重新部署以应用新的环境变量

### Q: 如何绑定自定义域名？

在 Netlify 后台 → Domain management → Add custom domain，按照指引添加你的域名即可。

---

## 技术说明

- **前端框架**: Next.js 16 (App Router)
- **数据库**: Supabase (PostgreSQL)
- **图表库**: Recharts
- **样式**: Tailwind CSS + shadcn/ui

## 功能特性

- ✅ Excel 数据导入
- ✅ 智能人员分配算法
- ✅ 实时绩效计算
- ✅ 云端数据同步
- ✅ 多维度可视化图表
- ✅ 按日期/班次筛选

---

## 许可证

MIT License
