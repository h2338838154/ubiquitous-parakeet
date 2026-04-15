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

// 适配用户现有表结构（包含英文和中文列名）
export interface LogisticsDataRow {
  id?: number;
  sync_id: string;
  // 英文列名
  date: string | number;
  time_slot: string;
  shift_type: string;
  frequency: string;
  unload_count: number;
  unload_price: number;
  unload_profit: number;
  unload_loss: number;
  package_count: number;
  package_price: number;
  package_profit: number;
  package_loss: number;
  loop_count: number;
  loop_price: number;
  loop_profit: number;
  loop_loss: number;
  other_cost: number;
  sender_count: number;
  person_count: number;
  receiver_count: number;
  total_profit: number;
  created_at?: string;
  updated_at?: string;
  shift_white?: number;
  shift_middle?: number;
  shift_night?: number;
  // 中文列名
  '日期'?: string | number;
  '时段'?: string;
  '班次'?: string;
  '频次'?: string;
  '卸车量'?: number;
  '卸车人数'?: number;
  '卸车薪资'?: number;
  '卸车盈亏'?: number;
  '集包量'?: number;
  '集包人数'?: number;
  '集包薪资'?: number;
  '集包盈亏'?: number;
  '环线量'?: number;
  '环线人数'?: number;
  '环线薪资'?: number;
  '环线盈亏'?: number;
  '管理薪资'?: number;
  '管理'?: number;
  '其他成本'?: number;
  '总盈亏'?: number;
  '文件人数'?: number;
  '发验人数'?: number;
  '客服人数'?: number;
  '接发员'?: number;
  '总表人数'?: number;
  '人数验证'?: number;
}

// 保存数据
export async function saveLogisticsData(data: Partial<LogisticsDataRow>[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    for (const record of data) {
      const { error } = await supabase
        .from('logistics_data')
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
      .from('logistics_data')
      .select('*')
      .order('date', { ascending: false });
    
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

// 清除数据
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase.from('logistics_data').delete().neq('sync_id', '');
    if (error) {
      console.warn('Clear warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}

// ==================== 班次配置相关 ====================

// 班次配置类型
interface ShiftConfig {
  date: string;
  config_data: Record<string, number>;
  white: number;
  middle: number;
  night: number;
}

// DailyStaffConfig 类型
type DailyStaffConfig = Record<string, { white: number; middle: number; night: number }>;

// 保存班次配置到本地存储（按日期存储多个配置）
export function saveShiftConfigLocal(configs: DailyStaffConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shift_configs_local', JSON.stringify(configs));
    console.log('[saveShiftConfigLocal] 已保存到本地存储:', configs);
  }
}

// 从本地存储加载班次配置
export function loadShiftConfigLocal(): DailyStaffConfig | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shift_configs_local');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// 批量保存所有班次配置到云端（使用 logistics_data 表存储）
export async function saveAllShiftConfigsCloud(configs: DailyStaffConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    // 使用 logistics_data 表存储班次配置
    // date = 日期, time_slot = '班次配置', shift_type = '配置'
    // unload_count = 白班人数, loop_count = 中班人数, package_count = 夜班人数
    const records = Object.entries(configs).map(([dateStr, config]) => ({
      sync_id: `shift_config_${dateStr}`,
      date: dateStr,
      time_slot: '班次配置',
      shift_type: '配置',
      unload_count: config.white,
      loop_count: config.middle,
      package_count: config.night
    }));

    for (const record of records) {
      const { error } = await supabase
        .from('logistics_data')
        .upsert(record, { onConflict: 'sync_id' });
      
      if (error) {
        console.warn('Save shift config warning:', error);
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('Save shift configs failed:', err);
    return { success: false, error: '保存班次配置失败' };
  }
}

// 从云端加载班次配置
export async function loadShiftConfigCloud(dateStr?: string): Promise<{ data: DailyStaffConfig | null; error?: string }> {
  if (!supabase) {
    return { data: null, error: '云端连接不可用' };
  }
  
  try {
    let query = supabase
      .from('logistics_data')
      .select('date, unload_count, loop_count, package_count')
      .eq('time_slot', '班次配置');

    if (dateStr) {
      query = query.eq('date', dateStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Load shift config error:', error);
      return { data: null, error: error.message };
    }

    if (data && data.length > 0) {
      const configs: DailyStaffConfig = {};
      const typedData = data as unknown as Array<{ date: string; unload_count?: number; loop_count?: number; package_count?: number }>;
      typedData.forEach((row) => {
        configs[row.date] = {
          white: row.unload_count ?? 70,
          middle: row.loop_count ?? 0,
          night: row.package_count ?? 95
        };
      });
      console.log('[loadShiftConfigCloud] 配置:', configs);
      saveShiftConfigLocal(configs);
      return { data: configs };
    }

    return { data: null };
  } catch (err) {
    console.error('Load shift config failed:', err);
    return { data: null, error: '加载班次配置失败' };
  }
}

// 清除班次配置
export async function clearShiftConfigs(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase
      .from('logistics_data')
      .delete()
      .eq('time_slot', '班次配置');
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
    const { error } = await supabase.from('logistics_data').delete().neq('sync_id', '');
    if (error && Object.keys(error).length > 0) {
      console.warn('Clear all data warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}
