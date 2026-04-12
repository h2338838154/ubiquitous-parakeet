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

// 日期转换函数：Excel序列号转ISO日期
export function excelSerialToDate(serial: number): string {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// 适配用户现有表结构
export interface LogisticsDataRow {
  sync_id: string;
  日期: string;
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

// 班次配置（简化版本，存到 localStorage）
export interface ShiftConfig {
  date: string;
  white: number;
  middle: number;
  night: number;
}

export function saveShiftConfig(config: ShiftConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shift_config', JSON.stringify(config));
  }
}

export function loadShiftConfig(): { data: ShiftConfig[] } {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shift_config');
    if (stored) {
      return { data: [JSON.parse(stored)] };
    }
  }
  return { data: [] };
}

// 清除数据
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase.from('logistics_data').delete().neq('sync_id', '');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}
