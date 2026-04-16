'use client';

// 适配用户现有表结构
export interface LogisticsDataRow {
  sync_id: string;
  日期: number | string;
  时段: string;
  班次: string;
  卸车量: number;
  环线量: number;
  集包量: number;
  管理: number;
  管理薪资: number;
  卸车人数: number;
  卸车薪资: number;
  卸车盈亏: number;
  集包人数: number;
  集包收入: number;
  集包薪资: number;
  集包盈亏: number;
  环线人数: number;
  环线收入: number;
  环线薪资: number;
  环线盈亏: number;
  文件人数: number;
  发验人数: number;
  客服人数: number;
  接发员: number;
  其他成本: number;
  总成本: number;
  总盈亏: number;
  总表人数: number;
  updated_at?: string;
}

// 班次配置接口
export interface ShiftConfig {
  ownWhite: number;
  ownMiddle: number;
  ownNight: number;
  laborWhite: number;
  laborNight: number;
  dailyWhite: number;
  dailyNight: number;
  assessAmount: number;
}

// 保存单个日期的班次配置到 localStorage
export function saveShiftConfig(config: { date: string; configs: Record<string, ShiftConfig>; [key: string]: unknown }): void {
  try {
    const data = {
      [config.date]: {
        ownWhite: config.ownWhite,
        ownMiddle: config.ownMiddle,
        ownNight: config.ownNight,
        laborWhite: config.laborWhite,
        laborNight: config.laborNight,
        dailyWhite: config.dailyWhite,
        dailyNight: config.dailyNight,
        assessAmount: config.assessAmount
      }
    };
    localStorage.setItem(`shiftConfig_${config.date}`, JSON.stringify(data));
  } catch (err) {
    console.error('saveShiftConfig error:', err);
  }
}

// 加载单个日期的班次配置从 localStorage
export function loadShiftConfig(date: string): ShiftConfig | null {
  try {
    const data = localStorage.getItem(`shiftConfig_${date}`);
    if (data) {
      return JSON.parse(data)[date] || null;
    }
  } catch (err) {
    console.error('loadShiftConfig error:', err);
  }
  return null;
}

// 清除班次配置从 localStorage
export function clearShiftConfigs(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('shiftConfig_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('clearShiftConfigs error:', err);
  }
}

// 通过 Next.js API 路由加载数据（避免 CORS 问题）
export async function loadLogisticsData(): Promise<{ data: LogisticsDataRow[]; error?: string }> {
  try {
    const response = await fetch('/api/logistics', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { data: [], error: result.error || '加载失败' };
    }
    
    return { data: result.data || [] };
  } catch (err) {
    console.error('Load error:', err);
    return { data: [], error: '加载失败' };
  }
}

// 通过 Next.js API 路由保存数据
export async function saveLogisticsData(data: Partial<LogisticsDataRow>[]): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/logistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: data })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || '保存失败' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Save error:', err);
    return { success: false, error: '保存失败' };
  }
}

// 通过 Next.js API 路由清除数据
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/logistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || '清除失败' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Clear error:', err);
    return { success: false, error: '清除失败' };
  }
}

// 加载云端班次配置（通过 API）
export async function loadShiftConfigCloud(): Promise<{ data: Record<string, ShiftConfig> | null; error?: string }> {
  try {
    const response = await fetch('/api/logistics?type=shiftConfig', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { data: null, error: result.error || '加载失败' };
    }
    
    return { data: result.data || null };
  } catch (err) {
    console.error('loadShiftConfigCloud error:', err);
    return { data: null, error: '加载失败' };
  }
}

// 保存所有班次配置到云端（通过 API）
export async function saveAllShiftConfigsCloud(configs: Record<string, ShiftConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/logistics?type=shiftConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'shiftConfig', configs })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || '保存失败' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('saveAllShiftConfigsCloud error:', err);
    return { success: false, error: '保存失败' };
  }
}

// 清除所有云端数据
export async function clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 清除业务数据
    await clearLogisticsData();
    
    // 清除班次配置
    const response = await fetch('/api/logistics?type=shiftConfig', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || '清除失败' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('clearAllCloudData error:', err);
    return { success: false, error: '清除失败' };
  }
}

// 日期转换函数
// ============ Excel 日期与字符串互转（统一使用 UTC 避免时区问题） ============

export function dateToExcelSerial(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00Z');  // 使用 UTC
  const excelEpoch = Date.UTC(1899, 11, 30);  // 1899-12-30 UTC
  return Math.floor((date.getTime() - excelEpoch) / (24 * 60 * 60 * 1000));
}

export function excelSerialToDate(serial: number): string {
  const excelEpoch = Date.UTC(1899, 11, 30);  // 1899-12-30 UTC
  const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
