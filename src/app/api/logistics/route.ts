import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface LogisticsData {
	id?: number;
	sync_id?: string;
	日期?: number;
	时段?: string;
	班次?: string;
	卸车量?: number;
	环线量?: number;
	集包量?: number;
	管理?: number;
	管理薪资?: number;
	卸车人数?: number;
	卸车薪资?: number;
	卸车盈亏?: number;
	集包人数?: number;
	集包收入?: number;
	集包薪资?: number;
	集包盈亏?: number;
	环线人数?: number;
	环线收入?: number;
	环线薪资?: number;
	环线盈亏?: number;
	文件人数?: number;
	发验人数?: number;
	客服人数?: number;
	接发员?: number;
	其他成本?: number;
	总成本?: number;
	总盈亏?: number;
	总表人数?: number;
	updated_at?: string;
}

export interface ShiftConfig {
	ownWhite: number;
	ownMiddle: number;
	ownNight: number;
	laborWhite: number;
	laborNight: number;
	dailyWhite: number;
	dailyNight: number;
	assessAmount: number;
}

// GET - 获取业务数据或班次配置
export async function GET(request: NextRequest) {
	try {
		const client = getSupabaseClient();
		const { searchParams } = new URL(request.url);
		const type = searchParams.get('type');

		if (type === 'shiftConfig') {
			// 获取班次配置
			const { data, error } = await client
				.from('shift_config')
				.select('*')
				.maybeSingle();

			if (error && error.code !== 'PGRST116') {
				throw new Error(`查询班次配置失败: ${error.message}`);
			}

			return NextResponse.json({ success: true, data: data?.configs || null });
		}

		// 获取业务数据
		let query = client.from('business_data').select('*').order('日期', { ascending: true }).order('时段', { ascending: true });
		const date = searchParams.get('date');

		if (date) {
			query = query.eq('日期', date);
		}

		const { data, error } = await query;

		if (error) {
			throw new Error(`查询业务数据失败: ${error.message}`);
		}

		return NextResponse.json({ success: true, data: data || [] });
	} catch (error) {
		console.error('GET error:', error);
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
		const { records, action, configs, type } = body;

		// 调试日志
		console.log('POST action:', action, 'type:', type, 'records count:', records?.length);

		// 处理班次配置
		if (type === 'shiftConfig' && configs) {
			const { data, error } = await client
				.from('shift_config')
				.upsert({ id: 1, configs }, { onConflict: 'id' })
				.select()
				.single();

			if (error) {
				console.error('shift_config upsert error:', error);
				throw new Error(`保存班次配置失败: ${error.message}`);
			}

			return NextResponse.json({ success: true, data });
		}

		// 清空所有数据
		if (action === 'clear') {
			const { error } = await client.from('business_data').delete().neq('sync_id', '');
			if (error) {
				console.error('clear error:', error);
				throw new Error(`清空数据失败: ${error.message}`);
			}
			return NextResponse.json({ success: true, message: '数据已清空' });
		}

		if (!records || !Array.isArray(records)) {
			throw new Error('Invalid records format');
		}

		console.log('First record:', JSON.stringify(records[0]));

		// 使用 upsert 基于 sync_id
		const { data, error } = await client
			.from('business_data')
			.upsert(records, { onConflict: 'sync_id' })
			.select();

		if (error) {
			console.error('business_data upsert error:', error);
			throw new Error(`保存数据失败: ${error.message}`);
		}

		return NextResponse.json({ success: true, data: data || [], count: data?.length || 0 });
	} catch (error) {
		console.error('POST error:', error);
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
		const syncId = searchParams.get('syncId');
		const type = searchParams.get('type');

		// 删除班次配置
		if (type === 'shiftConfig') {
			const { error } = await client.from('shift_config').delete().eq('id', 1);
			if (error) {
				throw new Error(`删除班次配置失败: ${error.message}`);
			}
			return NextResponse.json({ success: true, message: '班次配置已删除' });
		}

		if (syncId) {
			// 删除单条
			const { error } = await client.from('business_data').delete().eq('sync_id', syncId);
			if (error) {
				throw new Error(`删除失败: ${error.message}`);
			}
		} else {
			// 清空所有数据
			const { error } = await client.from('business_data').delete().neq('sync_id', '');
			if (error) {
				throw new Error(`清空失败: ${error.message}`);
			}
		}

		return NextResponse.json({ success: true, message: '删除成功' });
	} catch (error) {
		console.error('DELETE error:', error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
}
