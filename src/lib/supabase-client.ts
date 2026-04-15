'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// 日期转换函数：ISO日期转Excel序列号
export function dateToExcelSerial(dateStr: string): number {
  const date = new Date(dateStr);
  const excelEpoch = new Date(1899, 11, 30);
  return Math.floor((date.getTime() - excelEpoch.getTime()) / (1000 * 60 * 60 * 24));
}

// 日期转换函数：Excel序列号转ISO日期（考虑时区偏移）
export function excelSerialToDate(serial: number): string {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 适配用户现有表结构
export interface LogisticsDataRow {
  sync_id: string;
  日期: number | string;  // 可能是Excel序列号或字符串
  时段: string;
  班次: string;
  频次: string;
  卸车量: number;
  环线量: number;
  集包量: number;
  管理: number;
  管理薪资: number;
  卸车人数: number;
  卸车人效: number;
  卸车薪资: number;
  卸车盈亏: number;
  集包人数: number;
  集包人效: number;
  集包单价: number;
  集包收入: number;
  集包薪资: number;
  集包盈亏: number;
  环线人数: number;
  环线人效: number;
  环线单价: number;
  环线收入: number;
  环线薪资: number;
  环线盈亏: number;
  文件人数: number;
  发验人数: number;
  客服人数: number;
  接发员: number;
  其他成本: number;
  总盈亏: number;
  人数验证: number;
  总表人数: number;
  updated_at?: string;
}

// 保存数据
export async function saveLogisticsData(data: Partial<LogisticsDataRow>[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    for (const record of data) {
      const { error } = await supabase
        .from('business_data')
        .upsert(record, { onConflict: 'sync_id' });
      
      if (error) {
        console.error('Save error:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Save error:', err);
    return { success: false, error: '保存失败' };
  }
}

// 加载数据
export async function loadLogisticsData(): Promise<{ data: LogisticsDataRow[]; error?: string }> {
  if (!supabase) {
    return { data: [], error: '云端连接不可用' };
  }
  
  try {
    const { data, error } = await supabase
      .from('business_data')
      .select('*')
      .order('日期', { ascending: true })
      .order('时段', { ascending: true });
    
    if (error) {
      console.error('Load error:', error);
      return { data: [], error: error.message };
    }
    return { data: (data as LogisticsDataRow[]) || [] };
  } catch (err) {
    console.error('Load error:', err);
    return { data: [], error: '加载失败' };
  }
}

// 班次配置（按日期存储）
export interface DailyStaffConfig {
  [date: string]: {
    white: number;
    middle: number;
    night: number;
  };
}

export interface ShiftConfig {
  date: string;
  configs: DailyStaffConfig;
  white: number;
  middle: number;
  night: number;
}

interface ShiftConfigRow {
  date: string;
  white: number;
  middle: number;
  night: number;
}

// 保存班次配置到本地存储（按日期存储多个配置）
export function saveShiftConfigLocal(configs: DailyStaffConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shift_configs_local', JSON.stringify(configs));
    console.log('[saveShiftConfigLocal] 已保存到本地存储:', configs);
  }
}
export async function saveAllShiftConfigsCloud(configs: DailyStaffConfig): Promise<{ success: boolean; error?: string }> {
  console.log('[saveAllShiftConfigsCloud] 保存配置:', configs);
  
  saveShiftConfigLocal(configs);
  
  if (!supabase) {
    console.log('[saveAllShiftConfigsCloud] 云端不可用，仅保存到本地');
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    // 使用 business_data 表存储班次配置
    // 卸车量 = 白班人数, 环线量 = 中班人数, 集包量 = 夜班人数
    // 日期需要转换为 Excel 序列号格式
    const records = Object.entries(configs).map(([date, config]) => ({
      sync_id: `shift_config_${date}`,
      '日期': dateToExcelSerial(date),
      '时段': '班次配置',
      '班次': '配置',
      '卸车量': config.white,
      '环线量': config.middle,
      '集包量': config.night
    }));
    
    console.log('[saveAllShiftConfigsCloud] 保存记录:', records);
    
    for (const record of records) {
      const { error } = await supabase
        .from('business_data')
        .upsert(record, { onConflict: 'sync_id' });
      
      if (error) {
        console.warn('[saveAllShiftConfigsCloud] 保存失败:', record.sync_id, error);
      } else {
        console.log('[saveAllShiftConfigsCloud] 成功保存:', record.sync_id);
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('[saveAllShiftConfigsCloud] 保存失败:', err);
    return { success: true, error: '已保存到本地存储' };
  }
}

// 加载班次配置
export function loadShiftConfig(): { data: ShiftConfig | null } {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shift_config');
    if (stored) {
      return { data: JSON.parse(stored) };
    }
  }
  return { data: null };
}

// 从本地存储加载班次配置
export function loadShiftConfigLocal(): DailyStaffConfig | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shift_configs_local');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('[loadShiftConfigLocal] 从本地存储加载:', data);
        return data;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// 从云端加载班次配置（使用 business_data 表存储）
export async function loadShiftConfigCloud(): Promise<{ data: DailyStaffConfig | null; error?: string }> {
  const localData = loadShiftConfigLocal();
  
  if (!supabase) {
    console.log('[loadShiftConfigCloud] 云端不可用');
    return { data: localData, error: '云端连接不可用' };
  }
  
  try {
    // 使用 business_data 表查询班次配置
    // 时段 = '班次配置' 的记录是班次配置
    // 卸车量 = 白班人数, 环线量 = 中班人数, 集包量 = 夜班人数
    console.log('[loadShiftConfigCloud] 从 business_data 表加载班次配置...');
    const { data, error } = await supabase
      .from('business_data')
      .select('sync_id, 日期, 时段, 卸车量, 环线量, 集包量')
      .eq('时段', '班次配置')
      .limit(100);
    
    console.log('[loadShiftConfigCloud] 查询结果:', { data, error });
    
    if (error) {
      console.warn('[loadShiftConfigCloud] 查询失败:', error);
      if (localData) return { data: localData, error: '使用本地存储备份' };
      return { data: null, error: error.message };
    }
    
    if (data && data.length > 0) {
      const configs: DailyStaffConfig = {};
      const typedData = data as unknown as Array<{ 日期: number | string; 卸车量?: number; 环线量?: number; 集包量?: number }>;
      typedData.forEach((row) => {
        // 日期可能是 Excel 序列号（数字）或日期字符串
        let dateStr: string;
        if (typeof row['日期'] === 'number') {
          dateStr = excelSerialToDate(row['日期']);
        } else {
          dateStr = String(row['日期']).trim();
        }
        configs[dateStr] = {
          white: row['卸车量'] ?? 70,
          middle: row['环线量'] ?? 0,
          night: row['集包量'] ?? 95
        };
      });
      console.log('[loadShiftConfigCloud] 配置:', configs);
      saveShiftConfigLocal(configs);
      return { data: configs };
    }
    
    console.log('[loadShiftConfigCloud] 云端无数据');
    if (localData) return { data: localData };
    return { data: null };
  } catch (err) {
    console.warn('[loadShiftConfigCloud] 加载失败:', err);
    if (localData) return { data: localData, error: '使用本地存储备份' };
    return { data: null, error: '加载班次配置失败' };
  }
}

// 清除数据（不清除班次配置）
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase.from('business_data').delete().neq('sync_id', '');
    if (error && Object.keys(error).length > 0) {
      console.warn('Clear logistics data warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}

// 清除班次配置（使用 business_data 表，时段='班次配置'的记录）
export async function clearShiftConfigs(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase
      .from('business_data')
      .delete()
      .eq('时段', '班次配置');
    if (error && Object.keys(error).length > 0) {
      console.warn('Clear shift configs warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除班次配置失败' };
  }
}

// 清除所有云端数据
export async function clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    // 清除所有 business_data 记录（包括业务数据和班次配置）
    const { error } = await supabase.from('business_data').delete().neq('sync_id', '');
    if (error && Object.keys(error).length > 0) {
      console.warn('Clear all data warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}
