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
  日期: number | string;  // Excel序列号
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
    ownWhite: number;
    ownMiddle: number;
    ownNight: number;
    laborWhite: number;
    laborNight: number;
    dailyWhite: number;
    dailyNight: number;
    assessAmount: number;
  };
}

export interface ShiftConfig {
  date: string;
  configs: DailyStaffConfig;
  ownWhite: number;
  ownMiddle: number;
  ownNight: number;
  laborWhite: number;
  laborNight: number;
  dailyWhite: number;
  dailyNight: number;
  assessAmount: number;
}

interface ShiftConfigRow {
  date: string;
  own_white: number;
  own_middle: number;
  own_night: number;
  labor_white: number;
  labor_night: number;
  daily_white: number;
  daily_night: number;
  assess_amount: number;
}

// 保存班次配置到 localStorage
export function saveShiftConfig(config: ShiftConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shift_config', JSON.stringify(config));
  }
}

// 保存班次配置到云端
export async function saveShiftConfigCloud(config: ShiftConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase
      .from('shift_config')
      .upsert({
        date: config.date,
        config_data: config.configs,
        own_white: config.ownWhite,
        own_middle: config.ownMiddle,
        own_night: config.ownNight,
        labor_white: config.laborWhite,
        labor_night: config.laborNight,
        daily_white: config.dailyWhite,
        daily_night: config.dailyNight,
        assess_amount: config.assessAmount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'date' });
    
    if (error && Object.keys(error).length > 0) {
      console.warn('Save shift config warning:', error);
    }
    return { success: true };
  } catch (err) {
    console.warn('Save shift config failed:', err);
    return { success: false, error: '保存班次配置失败' };
  }
}

// 批量保存所有班次配置到云端
export async function saveAllShiftConfigsCloud(configs: DailyStaffConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const records = Object.entries(configs).map(([date, config]) => ({
      date,
      config_data: config,
      own_white: config.ownWhite,
      own_middle: config.ownMiddle,
      own_night: config.ownNight,
      labor_white: config.laborWhite,
      labor_night: config.laborNight,
      daily_white: config.dailyWhite,
      daily_night: config.dailyNight,
      assess_amount: config.assessAmount,
      updated_at: new Date().toISOString()
    }));
    
    for (const record of records) {
      const { error } = await supabase
        .from('shift_config')
        .upsert(record, { onConflict: 'date' });
      
      if (error && Object.keys(error).length > 0) {
        console.warn('[saveAllShiftConfigsCloud] 保存失败:', record.date, error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('[saveAllShiftConfigsCloud] 保存失败:', err);
    return { success: false, error: '保存班次配置失败' };
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

// 从云端加载班次配置
export async function loadShiftConfigCloud(): Promise<{ data: DailyStaffConfig | null; error?: string }> {
  if (!supabase) {
    return { data: null, error: '云端连接不可用' };
  }
  
  try {
    const { data, error } = await supabase
      .from('shift_config')
      .select('*')
      .order('date', { ascending: true });
    
    if (error && Object.keys(error).length > 0) {
      console.warn('[loadShiftConfigCloud] 加载失败:', error);
      return { data: null, error: error.message };
    }
    
    if (data && data.length > 0) {
      const configs: DailyStaffConfig = {};
      data.forEach((row: ShiftConfigRow) => {
        configs[row.date] = {
          ownWhite: row.own_white ?? 0,
          ownMiddle: row.own_middle ?? 0,
          ownNight: row.own_night ?? 0,
          laborWhite: row.labor_white ?? 0,
          laborNight: row.labor_night ?? 0,
          dailyWhite: row.daily_white ?? 0,
          dailyNight: row.daily_night ?? 0,
          assessAmount: row.assess_amount ?? 0
        };
      });
      return { data: configs };
    }
    
    return { data: null };
  } catch (err) {
    console.warn('[loadShiftConfigCloud] 加载失败:', err);
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

// 清除班次配置
export async function clearShiftConfigs(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase.from('shift_config').delete().neq('date', '');
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
    // 清除业务数据
    await supabase.from('business_data').delete().neq('sync_id', '');
    // 清除班次配置
    await supabase.from('shift_config').delete().neq('date', '');
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}
