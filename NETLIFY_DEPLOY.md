# 部署到 Netlify 指南

## 前置准备

### 1. 获取 Supabase 环境变量

登录 [Supabase Dashboard](https://supabase.com/dashboard)，找到你的项目，获取：

- `NEXT_PUBLIC_SUPABASE_URL` - 项目设置中的 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 项目 API 设置中的 `anon` 密钥

### 2. 配置 Supabase

确保你的 Supabase 项目中已创建 `logistics_data` 表，并且 RLS 策略允许匿名访问。

## 部署步骤

### 方法一：Git 部署（推荐）

1. **推送代码到 GitHub/GitLab**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **连接 Netlify**
   - 访问 [Netlify](https://www.netlify.com/)
   - 点击 "Add new site" → "Import an existing project"
   - 选择你的 Git 提供商（GitHub/GitLab）
   - 选择仓库
   - 配置构建设置：
     - **Build command**: `pnpm install && pnpm next build`
     - **Publish directory**: `.next`
   - 点击 "Deploy site"

3. **添加环境变量**
   - 在 Netlify 后台 → Site settings → Environment variables
   - 添加：
     ```
     NEXT_PUBLIC_SUPABASE_URL = 你的Supabase URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY = 你的Supabase Anon Key
     ```
   - 重新部署站点

### 方法二：Netlify CLI 部署

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **部署**
   ```bash
   netlify deploy --prod
   ```

4. **设置环境变量**
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "你的Supabase URL"
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "你的Anon Key"
   netlify deploy --prod
   ```

## 验证部署

部署成功后，访问 Netlify 分配的域名（如 `your-site.netlify.app`），应该能看到应用。

## 注意事项

### 1. Supabase RLS 策略

确保 `logistics_data` 表有正确的 RLS 策略允许匿名读写：

```sql
-- 在 Supabase SQL Editor 中执行
ALTER TABLE logistics_data ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取和写入
CREATE POLICY "Allow anonymous access" ON logistics_data
  FOR ALL USING (true) WITH CHECK (true);
```

### 2. 自定义域名（可选）

在 Netlify 后台 → Domain management → Add custom domain 添加你自己的域名。

### 3. 自动部署

连接 Git 后，每次推送到 main 分支都会自动触发构建和部署。

## 故障排除

### 构建失败
- 检查环境变量是否正确设置
- 查看 Netlify 的构建日志
- 确保 pnpm 版本兼容（项目使用 Node 20）

### 云端数据无法加载
- 检查 Supabase 的 RLS 策略
- 确认 API 密钥正确
- 检查浏览器控制台的错误信息

### CORS 错误
- 确保 Supabase 的 Site URL 和 Redirect URLs 包含你的 Netlify 域名
