import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function getSupabaseCredentials(): SupabaseCredentials {
  // 尝试多种环境变量名
  const url = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL_SERVER;
  
  const anonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SERVER;

  if (!url) {
    const available = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not set. Available env vars: ${available.join(', ')}`);
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// 创建客户端实例
let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const { url, anonKey } = getSupabaseCredentials();
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;
  const { url, anonKey } = getSupabaseCredentials();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  supabaseAdminClient = createClient(url, serviceRoleKey || anonKey);
  return supabaseAdminClient;
}

export { getSupabaseCredentials, getSupabaseServiceRoleKey };

// ============ Excel 日期与字符串互转（统一使用 UTC 避免时区问题） ============

export function dateToExcelSerial(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00Z');
  const excelEpoch = Date.UTC(1899, 11, 30);
  return Math.floor((date.getTime() - excelEpoch) / (24 * 60 * 60 * 1000));
}

export function excelSerialToDate(serial: number): string {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
