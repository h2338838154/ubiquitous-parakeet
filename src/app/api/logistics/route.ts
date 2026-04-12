import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface LogisticsData {
	id?: number;
	date: string;
	time_slot: string;
	shift_type?: string;
	frequency?: string;
	unload_count?: number;
	unload_price?: string;
	unload_profit?: string;
	unload_loss?: string;
	package_count?: number;
	package_price?: string;
	package_profit?: string;
	package_loss?: string;
	loop_count?: number;
	loop_price?: string;
	loop_profit?: string;
	loop_loss?: string;
	other_cost?: string;
	sender_count?: number;
	person_count?: number;
	receiver_count?: number;
	total_profit?: string;
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
		const frequency = searchParams.get('frequency');

		let query = client.from('logistics_data').select('*').order('date', { ascending: true }).order('time_slot', { ascending: true });

		if (date) {
			query = query.eq('date', date);
		}
		if (timeSlot) {
			query = query.eq('time_slot', timeSlot);
		}
		if (shiftType) {
			query = query.eq('shift_type', shiftType);
		}
		if (frequency) {
			query = query.eq('frequency', frequency);
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
			// 清空所有数据
			const { error } = await client.from('logistics_data').delete().neq('id', 0);
			if (error) {
				throw new Error(`清空数据失败: ${error.message}`);
			}
			return NextResponse.json({ success: true, message: '数据已清空' });
		}

		if (!records || !Array.isArray(records)) {
			throw new Error('Invalid records format');
		}

		// 处理每条记录：如果已存在（同一日期+时间段）则更新，否则插入
		const results = [];
		for (const record of records) {
			const { date, time_slot, ...rest } = record;

			// 先查询是否存在
			const { data: existing } = await client
				.from('logistics_data')
				.select('id')
				.eq('date', date)
				.eq('time_slot', time_slot)
				.maybeSingle();

			if (existing) {
				// 更新
				const { data, error } = await client
					.from('logistics_data')
					.update({ ...record, updated_at: new Date().toISOString() })
					.eq('id', existing.id)
					.select()
					.single();

				if (error) {
					throw new Error(`更新数据失败: ${error.message}`);
				}
				results.push(data);
			} else {
				// 插入
				const { data, error } = await client
					.from('logistics_data')
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
			// 删除单条
			const { error } = await client.from('logistics_data').delete().eq('id', parseInt(id));
			if (error) {
				throw new Error(`删除失败: ${error.message}`);
			}
		} else {
			// 清空所有数据
			const { error } = await client.from('logistics_data').delete().neq('id', 0);
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
