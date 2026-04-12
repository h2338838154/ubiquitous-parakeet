'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Type definitions
export interface LogisticsData {
  id?: number;
  date: string;
  time_slot: string;
  shift_type: string;
  frequency: string;
  unload_count: number;
  unload_price: string;
  unload_profit: string;
  unload_loss: string;
  package_count: number;
  package_price: string;
  package_profit: string;
  package_loss: string;
  loop_count: number;
  loop_price: string;
  loop_profit: string;
  loop_loss: string;
  other_cost: string;
  sender_count: number;
  person_count: number;
  receiver_count: number;
  total_profit: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftConfig {
  id?: number;
  date: string;
  shift_type: string;
  unload_count: number;
  package_count: number;
  loop_count: number;
  sender_count: number;
  receiver_count: number;
  created_at?: string;
  updated_at?: string;
}

// API functions
export async function saveLogisticsData(data: Partial<LogisticsData>[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase
      .from('logistics_data')
      .upsert(data, { onConflict: 'date,time_slot' });
    
    if (error) {
      console.error('Supabase save error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Save logistics data error:', err);
    return { success: false, error: '保存失败' };
  }
}

export async function loadLogisticsData(date?: string): Promise<{ data: LogisticsData[]; error?: string }> {
  if (!supabase) {
    return { data: [], error: '云端连接不可用' };
  }
  
  try {
    let query = supabase.from('logistics_data').select('*').order('date').order('time_slot');
    
    if (date && date !== 'all') {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase load error:', error);
      return { data: [], error: error.message };
    }
    return { data: data || [] };
  } catch (err) {
    console.error('Load logistics data error:', err);
    return { data: [], error: '加载失败' };
  }
}

export async function saveShiftConfig(config: ShiftConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    const { error } = await supabase
      .from('shift_config')
      .upsert(config, { onConflict: 'date,shift_type' });
    
    if (error) {
      console.error('Supabase save shift config error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Save shift config error:', err);
    return { success: false, error: '保存失败' };
  }
}

export async function loadShiftConfig(): Promise<{ data: ShiftConfig[]; error?: string }> {
  if (!supabase) {
    return { data: [], error: '云端连接不可用' };
  }
  
  try {
    const { data, error } = await supabase
      .from('shift_config')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase load shift config error:', error);
      return { data: [], error: error.message };
    }
    return { data: data ? [data] : [] };
  } catch (err) {
    console.error('Load shift config error:', err);
    return { data: [], error: '加载失败' };
  }
}

export async function clearLogisticsData(date?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: '云端连接不可用' };
  }
  
  try {
    let query = supabase.from('logistics_data').delete();
    
    if (date && date !== 'all') {
      query = query.eq('date', date);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Supabase clear error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Clear logistics data error:', err);
    return { success: false, error: '清除失败' };
  }
}
