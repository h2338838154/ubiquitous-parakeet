'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pczkhicrnvhsfmenubmn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjemtoaWNybnZoc2ZtZW51Ym1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTAyOTAsImV4cCI6MjA5MTM4NjI5MH0.jh6OyWCSv-RneKqcBxzf8z5hYLQU5hRjHbB0KVEckXM';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;
export { supabase };

// 日期转换函数：ISO日期转Excel序列号
export function dateToExcelSerial(dateStr: string): number {
  const date = new Date(dateStr);
  const excelEpoch = new Date(1899, 11, 30);
  return Math.floor((date.getTime() - excelEpoch.getTime()) / (1000 * 60 * 60 * 24));
}

// 日期转换函数：Excel序列号转ISO日期
export function excelSerialToDate(serial: number): string {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 物流数据接口（使用中文列名）
export interface LogisticsDataRow {
  id?: number;
  sync_id?: string;
  '日期': string;
  '时段': string;
  '班次'?: string;
  '频次'?: string;
  '卸车量'?: number;
  '卸车人数'?: number;
  '卸车薪资'?: number;
  '卸车盈亏'?: number;
  '集包量'?: number;
  '集包人数'?: number;
  '集包薪资'?: number;
  '集包收入'?: number;
  '集包盈亏'?: number;
  '环线量'?: number;
  '环线人数'?: number;
  '环线薪资'?: number;
  '环线收入'?: number;
  '环线盈亏'?: number;
  '管理薪资'?: number;
  '管理'?: number;
  '文件人数'?: number;
  '发验人数'?: number;
  '客服人数'?: number;
  '接发员'?: number;
  '其他成本'?: number;
  '总盈亏'?: number;
  '总表人数'?: number;
  created_at?: string;
  updated_at?: string;
}

// 班次配置接口
export interface ShiftConfigRow {
  id?: number;
  日期: string;
  班次类型: string;
  总人数?: number;
  卸车人数?: number;
  集包人数?: number;
  环线人数?: number;
  管理人数?: number;
  备注?: string;
  created_at?: string;
  updated_at?: string;
}

// DailyStaffConfig 类型
type DailyStaffConfig = Record<string, { white: number; middle: number; night: number }>;

// ==================== 云端数据操作 ====================

// 保存物流数据到云端
export async function saveLogisticsData(data: LogisticsDataRow[]): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    
    for (const record of data) {
      const { 日期, 时段 } = record;
      
      // 检查是否已存在
      const { data: existing } = await client
        .from('business_data')
        .select('id')
        .eq('日期', 日期)
        .eq('时段', 时段)
        .maybeSingle();

      if (existing) {
        // 更新
        const { error } = await client
          .from('business_data')
          .update(record)
          .eq('id', existing.id);
        
        if (error) {
          console.error('Update error:', error);
          return { success: false, error: error.message };
        }
      } else {
        // 新增
        const { error } = await client
          .from('business_data')
          .insert(record);
        
        if (error) {
          console.error('Insert error:', error);
          return { success: false, error: error.message };
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Save error:', err);
    return { success: false, error: '保存失败' };
  }
}

// 加载物流数据
export async function loadLogisticsData(): Promise<{ data: LogisticsDataRow[]; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('business_data')
      .select('*')
      .order('日期', { ascending: false });
    
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

// 清除物流数据
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('business_data').delete().neq('id', 0);
    if (error) {
      console.warn('Clear warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}

// ==================== 班次配置相关 ====================

// 保存班次配置到本地存储
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

// 批量保存班次配置到云端
export async function saveAllShiftConfigsCloud(configs: DailyStaffConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    
    for (const [dateStr, config] of Object.entries(configs)) {
      const excelDate = dateToExcelSerial(dateStr);
      
      // 检查是否已存在
      const { data: existing } = await client
        .from('business_data')
        .select('id')
        .eq('日期', excelDate)
        .eq('时段', '班次配置')
        .maybeSingle();

      const record = {
        '日期': excelDate,
        '时段': '班次配置',
        '班次': '配置',
        '卸车量': config.white,
        '环线量': config.middle,
        '集包量': config.night
      };

      if (existing) {
        await client
          .from('business_data')
          .update(record)
          .eq('id', existing.id);
      } else {
        await client
          .from('business_data')
          .insert(record);
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
  try {
    const client = getSupabaseClient();
    
    let query = client
      .from('business_data')
      .select('日期, 卸车量, 环线量, 集包量')
      .eq('时段', '班次配置');

    if (dateStr) {
      query = query.eq('日期', dateToExcelSerial(dateStr));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Load shift config error:', error);
      return { data: null, error: error.message };
    }

    if (data && data.length > 0) {
      const configs: DailyStaffConfig = {};
      (data as unknown as Array<{'日期': number | string; '卸车量'?: number; '环线量'?: number; '集包量'?: number}>).forEach((row) => {
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

    return { data: null };
  } catch (err) {
    console.error('Load shift config failed:', err);
    return { data: null, error: '加载班次配置失败' };
  }
}

// 清除班次配置
export async function clearShiftConfigs(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
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
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('business_data').delete().neq('id', 0);
    if (error && Object.keys(error).length > 0) {
      console.warn('Clear all data warning:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: '清除失败' };
  }
}
