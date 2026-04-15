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

// 物流数据接口
export interface LogisticsDataRow {
  id?: number;
  sync_id?: string;
  日期: string;
  时段: string;
  班次?: string;
  频次?: string;
  卸车量?: number;
  卸车人数?: number;
  卸车人效?: number;
  卸车薪资?: number;
  卸车成本?: number;
  卸车盈亏?: number;
  集包量?: number;
  集包人数?: number;
  集包人效?: number;
  集包薪资?: number;
  集包收入?: number;
  集包盈亏?: number;
  环线量?: number;
  环线人数?: number;
  环线人效?: number;
  环线薪资?: number;
  环线收入?: number;
  环线盈亏?: number;
  管理人数?: number;
  管理薪资?: number;
  总薪资?: number;
  总成本?: number;
  总收入?: number;
  总盈亏?: number;
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
        await client
          .from('business_data')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await client
          .from('business_data')
          .insert(record);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 从云端加载物流数据
export async function loadLogisticsData(): Promise<{ success: boolean; data?: LogisticsDataRow[]; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('business_data')
      .select('*')
      .order('日期', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 清空物流数据
export async function clearLogisticsData(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('business_data').delete().neq('id', 0);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ==================== 班次配置操作 ====================

// 从云端加载班次配置
export async function loadShiftConfigCloud(): Promise<{ success: boolean; data?: ShiftConfigRow[]; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('shift_config')
      .select('*')
      .order('日期', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 保存单个班次配置到本地存储
export function saveShiftConfigLocal(configs: ShiftConfigRow[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shiftConfigs', JSON.stringify(configs));
  }
}

// 保存所有班次配置到云端
export async function saveAllShiftConfigsCloud(configs: ShiftConfigRow[]): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    
    // 先清空
    await client.from('shift_config').delete().neq('id', 0);
    
    // 再插入新的
    if (configs.length > 0) {
      const { error } = await client
        .from('shift_config')
        .insert(configs.map(c => ({
          日期: c.日期,
          班次类型: c.班次类型,
          总人数: c.总人数 || 0,
          卸车人数: c.卸车人数 || 0,
          集包人数: c.集包人数 || 0,
          环线人数: c.环线人数 || 0,
          管理人数: c.管理人数 || 0,
          备注: c.备注 || ''
        })));
      
      if (error) {
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 清空班次配置
export async function clearShiftConfigs(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('shift_config').delete().neq('id', 0);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 清空所有云端数据
export async function clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    
    await client.from('business_data').delete().neq('id', 0);
    await client.from('shift_config').delete().neq('id', 0);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
