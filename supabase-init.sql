-- ============================================
-- 智能物流绩效分析系统 - Supabase 数据库初始化
-- ============================================

-- 1. 创建业务量数据表
CREATE TABLE IF NOT EXISTS business_data (
  id BIGSERIAL PRIMARY KEY,
  sync_id TEXT UNIQUE,
  日期 DATE NOT NULL,
  时段 TEXT NOT NULL,
  班次 TEXT DEFAULT '白班',
  频次 TEXT DEFAULT '一频',
  卸车量 INTEGER DEFAULT 0,
  卸车人数 INTEGER DEFAULT 0,
  卸车人效 DECIMAL(10,2) DEFAULT 0,
  卸车薪资 DECIMAL(10,2) DEFAULT 0,
  卸车成本 DECIMAL(10,2) DEFAULT 0,
  卸车盈亏 DECIMAL(10,2) DEFAULT 0,
  集包量 INTEGER DEFAULT 0,
  集包人数 INTEGER DEFAULT 0,
  集包人效 DECIMAL(10,2) DEFAULT 0,
  集包薪资 DECIMAL(10,2) DEFAULT 0,
  集包收入 DECIMAL(10,2) DEFAULT 0,
  集包盈亏 DECIMAL(10,2) DEFAULT 0,
  环线量 INTEGER DEFAULT 0,
  环线人数 INTEGER DEFAULT 0,
  环线人效 DECIMAL(10,2) DEFAULT 0,
  环线薪资 DECIMAL(10,2) DEFAULT 0,
  环线收入 DECIMAL(10,2) DEFAULT 0,
  环线盈亏 DECIMAL(10,2) DEFAULT 0,
  管理人数 INTEGER DEFAULT 0,
  管理薪资 DECIMAL(10,2) DEFAULT 0,
  总薪资 DECIMAL(10,2) DEFAULT 0,
  总成本 DECIMAL(10,2) DEFAULT 0,
  总收入 DECIMAL(10,2) DEFAULT 0,
  总盈亏 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建班次配置表
CREATE TABLE IF NOT EXISTS shift_config (
  id BIGSERIAL PRIMARY KEY,
  日期 DATE NOT NULL,
  班次类型 TEXT NOT NULL,
  总人数 INTEGER DEFAULT 0,
  卸车人数 INTEGER DEFAULT 0,
  集包人数 INTEGER DEFAULT 0,
  环线人数 INTEGER DEFAULT 0,
  管理人数 INTEGER DEFAULT 0,
  备注 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(日期, 班次类型)
);

-- 3. 创建每日汇总表
CREATE TABLE IF NOT EXISTS daily_summary (
  id BIGSERIAL PRIMARY KEY,
  日期 DATE NOT NULL UNIQUE,
  总业务量 INTEGER DEFAULT 0,
  总卸车量 INTEGER DEFAULT 0,
  总集包量 INTEGER DEFAULT 0,
  总环线量 INTEGER DEFAULT 0,
  总人数 INTEGER DEFAULT 0,
  白班人数 INTEGER DEFAULT 0,
  中班人数 INTEGER DEFAULT 0,
  夜班人数 INTEGER DEFAULT 0,
  总薪资 DECIMAL(10,2) DEFAULT 0,
  总成本 DECIMAL(10,2) DEFAULT 0,
  总收入 DECIMAL(10,2) DEFAULT 0,
  总盈亏 DECIMAL(10,2) DEFAULT 0,
  人均效率 DECIMAL(10,2) DEFAULT 0,
  单票成本 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 启用 Row Level Security (RLS)
-- ============================================
ALTER TABLE business_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 创建公开访问策略（无需登录即可访问）
-- ============================================

-- 业务数据表策略
DROP POLICY IF EXISTS "允许公开读取业务数据" ON business_data;
CREATE POLICY "允许公开读取业务数据" ON business_data
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许公开插入业务数据" ON business_data;
CREATE POLICY "允许公开插入业务数据" ON business_data
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开更新业务数据" ON business_data;
CREATE POLICY "允许公开更新业务数据" ON business_data
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "允许公开删除业务数据" ON business_data;
CREATE POLICY "允许公开删除业务数据" ON business_data
  FOR DELETE USING (true);

-- 班次配置表策略
DROP POLICY IF EXISTS "允许公开读取班次配置" ON shift_config;
CREATE POLICY "允许公开读取班次配置" ON shift_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许公开插入班次配置" ON shift_config;
CREATE POLICY "允许公开插入班次配置" ON shift_config
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开更新班次配置" ON shift_config;
CREATE POLICY "允许公开更新班次配置" ON shift_config
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "允许公开删除班次配置" ON shift_config;
CREATE POLICY "允许公开删除班次配置" ON shift_config
  FOR DELETE USING (true);

-- 每日汇总表策略
DROP POLICY IF EXISTS "允许公开读取每日汇总" ON daily_summary;
CREATE POLICY "允许公开读取每日汇总" ON daily_summary
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许公开插入每日汇总" ON daily_summary;
CREATE POLICY "允许公开插入每日汇总" ON daily_summary
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开更新每日汇总" ON daily_summary;
CREATE POLICY "允许公开更新每日汇总" ON daily_summary
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "允许公开删除每日汇总" ON daily_summary;
CREATE POLICY "允许公开删除每日汇总" ON daily_summary
  FOR DELETE USING (true);

-- ============================================
-- 创建索引以提升查询性能
-- ============================================
CREATE INDEX IF NOT EXISTS idx_business_data_日期 ON business_data(日期);
CREATE INDEX IF NOT EXISTS idx_business_data_班次 ON business_data(班次);
CREATE INDEX IF NOT EXISTS idx_shift_config_日期 ON shift_config(日期);
CREATE INDEX IF NOT EXISTS idx_daily_summary_日期 ON daily_summary(日期);

-- ============================================
-- 创建自动更新 updated_at 的触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为三个表创建触发器
DROP TRIGGER IF EXISTS update_business_data_updated_at ON business_data;
CREATE TRIGGER update_business_data_updated_at
  BEFORE UPDATE ON business_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shift_config_updated_at ON shift_config;
CREATE TRIGGER update_shift_config_updated_at
  BEFORE UPDATE ON shift_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_summary_updated_at ON daily_summary;
CREATE TRIGGER update_daily_summary_updated_at
  BEFORE UPDATE ON daily_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
