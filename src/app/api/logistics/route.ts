import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface LogisticsData {
  id?: number;
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

// GET - 获取所有数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const timeSlot = searchParams.get('timeSlot');
    const shiftType = searchParams.get('shiftType');

    let query = client.from('business_data').select('*').order('日期', { ascending: true });

    if (date) {
      query = query.eq('日期', date);
    }
    if (timeSlot) {
      query = query.eq('时段', timeSlot);
    }
    if (shiftType) {
      query = query.eq('班次', shiftType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('GET logistics data error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - 批量插入或更新数据
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { records, action } = body;

    if (action === 'clear') {
      const { error } = await client.from('business_data').delete().neq('id', 0);
      if (error) {
        throw new Error(`清空数据失败: ${error.message}`);
      }
      return NextResponse.json({ success: true, message: '数据已清空' });
    }

    if (!records || !Array.isArray(records)) {
      throw new Error('Invalid records format');
    }

    const results = [];
    for (const record of records) {
      const { 日期, 时段, ...rest } = record;

      const { data: existing } = await client
        .from('business_data')
        .select('id')
        .eq('日期', 日期)
        .eq('时段', 时段)
        .maybeSingle();

      if (existing) {
        const { data, error } = await client
          .from('business_data')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(`更新数据失败: ${error.message}`);
        }
        results.push(data);
      } else {
        const { data, error } = await client
          .from('business_data')
          .insert(record)
          .select()
          .single();

        if (error) {
          throw new Error(`插入数据失败: ${error.message}`);
        }
        results.push(data);
      }
    }

    return NextResponse.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('POST logistics data error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - 删除数据
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { error } = await client.from('business_data').delete().eq('id', parseInt(id));
      if (error) {
        throw new Error(`删除失败: ${error.message}`);
      }
    } else {
      const { error } = await client.from('business_data').delete().neq('id', 0);
      if (error) {
        throw new Error(`清空失败: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('DELETE logistics data error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
