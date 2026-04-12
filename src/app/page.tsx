'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Upload, Trash2, RefreshCw, Filter, Download, TrendingUp, Package, Truck, RotateCw, DollarSign, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';

// 类型定义
interface LogisticsData {
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

interface FilterState {
  date: string;
  timeSlot: string;
  shiftType: string;
  frequency: string;
}

// 时间段选项
const TIME_SLOTS = [
  '0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300',
  '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800', '1800-1900',
  '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-0000', '0000-0100',
  '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700'
];

const SHIFT_TYPES = ['白班', '夜班'];
const FREQUENCY_TYPES = ['进口', '出口', '清场'];

// 图表颜色
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// 指标配置
const METRICS_CONFIG = [
  { key: 'unload_count', label: '卸车', color: '#3b82f6', icon: Truck },
  { key: 'package_count', label: '集包', color: '#10b981', icon: Package },
  { key: 'loop_count', label: '环线', color: '#f59e0b', icon: RotateCw },
  { key: 'other_cost', label: '其他成本', color: '#ef4444', icon: DollarSign, isCost: true },
];

// 演示数据
const DEMO_DATA: LogisticsData[] = [
  { date: '2026-04-01', time_slot: '0700-0800', shift_type: '白班', frequency: '进口', unload_count: 1250, package_count: 890, loop_count: 560, other_cost: '1250.00', total_profit: '4560.00' },
  { date: '2026-04-01', time_slot: '0800-0900', shift_type: '白班', frequency: '进口', unload_count: 1380, package_count: 920, loop_count: 620, other_cost: '1380.00', total_profit: '5120.00' },
  { date: '2026-04-01', time_slot: '0900-1000', shift_type: '白班', frequency: '出口', unload_count: 1150, package_count: 780, loop_count: 480, other_cost: '1150.00', total_profit: '3890.00' },
  { date: '2026-04-01', time_slot: '1000-1100', shift_type: '白班', frequency: '出口', unload_count: 1420, package_count: 980, loop_count: 650, other_cost: '1420.00', total_profit: '5680.00' },
  { date: '2026-04-01', time_slot: '1100-1200', shift_type: '白班', frequency: '进口', unload_count: 1680, package_count: 1120, loop_count: 720, other_cost: '1680.00', total_profit: '6890.00' },
  { date: '2026-04-01', time_slot: '1300-1400', shift_type: '白班', frequency: '进口', unload_count: 1520, package_count: 1050, loop_count: 680, other_cost: '1520.00', total_profit: '6120.00' },
  { date: '2026-04-01', time_slot: '1400-1500', shift_type: '白班', frequency: '出口', unload_count: 1290, package_count: 870, loop_count: 540, other_cost: '1290.00', total_profit: '4560.00' },
  { date: '2026-04-01', time_slot: '1500-1600', shift_type: '白班', frequency: '进口', unload_count: 1750, package_count: 1180, loop_count: 780, other_cost: '1750.00', total_profit: '7280.00' },
  { date: '2026-04-01', time_slot: '1600-1700', shift_type: '白班', frequency: '清场', unload_count: 980, package_count: 650, loop_count: 420, other_cost: '980.00', total_profit: '3280.00' },
  { date: '2026-04-01', time_slot: '0700-0800', shift_type: '夜班', frequency: '进口', unload_count: 1180, package_count: 820, loop_count: 510, other_cost: '1180.00', total_profit: '4120.00' },
  { date: '2026-04-01', time_slot: '0800-0900', shift_type: '夜班', frequency: '出口', unload_count: 1320, package_count: 910, loop_count: 590, other_cost: '1320.00', total_profit: '4890.00' },
  { date: '2026-04-01', time_slot: '0900-1000', shift_type: '夜班', frequency: '进口', unload_count: 1450, package_count: 990, loop_count: 660, other_cost: '1450.00', total_profit: '5560.00' },
];

// 解析Excel日期
function parseExcelDate(value: unknown): string {
  if (!value) return '';
  
  if (typeof value === 'number') {
    // Excel日期序列号
    const date = new Date((value - 25569) * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  
  if (typeof value === 'string') {
    // 尝试解析各种格式
    const formats = [
      'yyyy/MM/dd', 'yyyy-M-d', 'd-MMM-yyyy', 'MM/dd/yyyy',
      'yyyy.MM.dd', 'yyyy年MM月dd日'
    ];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(value, fmt, new Date());
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {}
    }
    
    // 如果已经是 yyyy-MM-dd 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
  }
  
  return String(value);
}

// 计算可视化条宽度
function getBarWidth(value: number, maxValue: number): string {
  if (maxValue === 0) return '0%';
  return `${Math.min((value / maxValue) * 100, 100)}%`;
}

// 获取利润颜色
function getProfitColor(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numValue > 0) return 'text-emerald-500';
  if (numValue < 0) return 'text-red-500';
  return 'text-gray-500';
}

export default function LogisticsDashboard() {
  // 状态
  const [data, setData] = useState<LogisticsData[]>([]);
  const [filteredData, setFilteredData] = useState<LogisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'cloud' | 'demo'>('cloud');
  const [filters, setFilters] = useState<FilterState>({
    date: '',
    timeSlot: '',
    shiftType: '',
    frequency: '',
  });
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['unload_count', 'package_count', 'loop_count']);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.set('date', filters.date);
      if (filters.timeSlot && filters.timeSlot !== 'all') params.set('timeSlot', filters.timeSlot);
      if (filters.shiftType && filters.shiftType !== 'all') params.set('shiftType', filters.shiftType);
      if (filters.frequency && filters.frequency !== 'all') params.set('frequency', filters.frequency);

      const response = await fetch(`/api/logistics?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setData(result.data);
        setDataSource('cloud');
      } else {
        // 如果云端没有数据，使用演示数据
        setData(DEMO_DATA);
        setDataSource('demo');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setData(DEMO_DATA);
      setDataSource('demo');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 筛选数据
  useEffect(() => {
    let result = [...data];

    if (filters.date) {
      result = result.filter(item => item.date === filters.date);
    }
    if (filters.timeSlot && filters.timeSlot !== 'all') {
      result = result.filter(item => item.time_slot === filters.timeSlot);
    }
    if (filters.shiftType && filters.shiftType !== 'all') {
      result = result.filter(item => item.shift_type === filters.shiftType);
    }
    if (filters.frequency && filters.frequency !== 'all') {
      result = result.filter(item => item.frequency === filters.frequency);
    }

    // 根据选中的指标筛选
    result = result.filter(item => {
      if (selectedMetrics.length === 0) return true;
      return selectedMetrics.some(metric => {
        const value = item[metric as keyof LogisticsData];
        return value !== undefined && value !== null && value !== 0;
      });
    });

    setFilteredData(result);
  }, [data, filters, selectedMetrics]);

  // 计算统计数据
  const stats = useMemo(() => {
    const totalUnload = filteredData.reduce((sum, item) => sum + (item.unload_count || 0), 0);
    const totalPackage = filteredData.reduce((sum, item) => sum + (item.package_count || 0), 0);
    const totalLoop = filteredData.reduce((sum, item) => sum + (item.loop_count || 0), 0);
    const totalOtherCost = filteredData.reduce((sum, item) => sum + parseFloat(item.other_cost || '0'), 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + parseFloat(item.total_profit || '0'), 0);

    return { totalUnload, totalPackage, totalLoop, totalOtherCost, totalProfit };
  }, [filteredData]);

  // 图表数据
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      name: item.time_slot,
      卸车: item.unload_count || 0,
      集包: item.package_count || 0,
      环线: item.loop_count || 0,
      其他成本: parseFloat(item.other_cost || '0'),
      利润: parseFloat(item.total_profit || '0'),
    }));
  }, [filteredData]);

  // 饼图数据
  const pieChartData = useMemo(() => {
    const selected: { name: string; value: number; color: string }[] = [];
    
    if (selectedMetrics.includes('unload_count')) {
      selected.push({ name: '卸车', value: stats.totalUnload, color: COLORS[0] });
    }
    if (selectedMetrics.includes('package_count')) {
      selected.push({ name: '集包', value: stats.totalPackage, color: COLORS[1] });
    }
    if (selectedMetrics.includes('loop_count')) {
      selected.push({ name: '环线', value: stats.totalLoop, color: COLORS[2] });
    }
    if (selectedMetrics.includes('other_cost')) {
      selected.push({ name: '其他成本', value: stats.totalOtherCost, color: COLORS[3] });
    }
    
    return selected;
  }, [selectedMetrics, stats]);

  // 获取最大值用于可视化
  const maxValues = useMemo(() => {
    return {
      unload_count: Math.max(...filteredData.map(d => d.unload_count || 0), 1),
      package_count: Math.max(...filteredData.map(d => d.package_count || 0), 1),
      loop_count: Math.max(...filteredData.map(d => d.loop_count || 0), 1),
      other_cost: Math.max(...filteredData.map(d => parseFloat(d.other_cost || '0')), 1),
    };
  }, [filteredData]);

  // 处理Excel上传
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setNotification(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

          // 解析并转换数据
          const records: LogisticsData[] = jsonData.map(row => {
            const dateValue = row['日期'] || row['date'] || row['DATE'];
            const timeSlotValue = row['时间段'] || row['time_slot'] || row['TIME_SLOT'] || row['时段'];
            
            return {
              date: parseExcelDate(dateValue),
              time_slot: String(timeSlotValue || '').trim(),
              shift_type: String(row['班次'] || row['shift_type'] || row['SHIFT_TYPE'] || '白班').trim(),
              frequency: String(row['频次'] || row['frequency'] || row['FREQUENCY'] || '进口').trim(),
              unload_count: Number(row['卸车'] || row['unload_count'] || row['UNLOAD_COUNT'] || 0),
              package_count: Number(row['集包'] || row['package_count'] || row['PACKAGE_COUNT'] || 0),
              loop_count: Number(row['环线'] || row['loop_count'] || row['LOOP_COUNT'] || 0),
              other_cost: String(row['其他成本'] || row['other_cost'] || row['OTHER_COST'] || '0'),
              total_profit: String(row['总利润'] || row['total_profit'] || row['TOTAL_PROFIT'] || '0'),
            };
          }).filter(record => record.date && record.time_slot);

          if (records.length === 0) {
            throw new Error('未找到有效数据，请检查文件格式');
          }

          // 上传到云端
          const response = await fetch('/api/logistics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records }),
          });

          const result = await response.json();
          
          if (result.success) {
            setNotification({ type: 'success', message: `成功导入 ${result.count} 条数据` });
            loadData();
          } else {
            throw new Error(result.error || '上传失败');
          }
        } catch (error) {
          setNotification({ type: 'error', message: error instanceof Error ? error.message : '解析失败' });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setNotification({ type: 'error', message: '读取文件失败' });
      setUploading(false);
    }

    // 清空input
    event.target.value = '';
  };

  // 清空数据
  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？')) return;

    try {
      const response = await fetch('/api/logistics?action=clear', { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        setNotification({ type: 'success', message: '数据已清空' });
        setData([]);
        setFilteredData([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setNotification({ type: 'error', message: error instanceof Error ? error.message : '清空失败' });
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const template = [
      { 日期: '2026-04-01', 时间段: '0700-0800', 班次: '白班', 频次: '进口', 卸车: 0, 集包: 0, 环线: 0, 其他成本: 0, 总利润: 0 },
      { 日期: '2026-04-01', 时间段: '0800-0900', 班次: '白班', 频次: '出口', 卸车: 0, 集包: 0, 环线: 0, 其他成本: 0, 总利润: 0 },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '数据模板');
    XLSX.writeFile(wb, '物流数据导入模板.xlsx');
  };

  // 清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({ date: '', timeSlot: '', shiftType: '', frequency: '' });
    setSelectedMetrics(['unload_count', 'package_count', 'loop_count']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                物流数据看板
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                实时监控业务数据 · 数据来源：
                <Badge variant={dataSource === 'cloud' ? 'default' : 'secondary'}>
                  {dataSource === 'cloud' ? '云端' : '演示数据'}
                </Badge>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearData}>
                <Trash2 className="w-4 h-4 mr-2" />
                清空数据
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">卸车总量</p>
                  <p className="text-white text-2xl font-bold">{stats.totalUnload.toLocaleString()}</p>
                </div>
                <Truck className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">集包总量</p>
                  <p className="text-white text-2xl font-bold">{stats.totalPackage.toLocaleString()}</p>
                </div>
                <Package className="w-10 h-10 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-amber-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">环线总量</p>
                  <p className="text-white text-2xl font-bold">{stats.totalLoop.toLocaleString()}</p>
                </div>
                <RotateCw className="w-10 h-10 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">其他成本</p>
                  <p className="text-white text-2xl font-bold">¥{stats.totalOtherCost.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-purple-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">总利润</p>
                  <p className={`text-white text-2xl font-bold ${getProfitColor(stats.totalProfit)}`}>
                    ¥{stats.totalProfit.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选区域 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              数据筛选
            </CardTitle>
            <CardDescription>选择日期和时间段来筛选数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">日期</label>
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">时间段</label>
                <Select value={filters.timeSlot || 'all'} onValueChange={(v) => setFilters({ ...filters, timeSlot: v === 'all' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部时段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时段</SelectItem>
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">班次</label>
                <Select value={filters.shiftType || 'all'} onValueChange={(v) => setFilters({ ...filters, shiftType: v === 'all' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部班次" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    {SHIFT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">频次</label>
                <Select value={filters.frequency || 'all'} onValueChange={(v) => setFilters({ ...filters, frequency: v === 'all' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部频次" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部频次</SelectItem>
                    {FREQUENCY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleResetFilters} className="w-full">
                  清除筛选
                </Button>
              </div>
            </div>

            {/* 指标选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">显示指标</label>
              <div className="flex flex-wrap gap-4">
                {METRICS_CONFIG.map((metric) => {
                  const Icon = metric.icon;
                  const isSelected = selectedMetrics.includes(metric.key);
                  return (
                    <label
                      key={metric.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMetrics([...selectedMetrics, metric.key]);
                          } else {
                            setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                          }
                        }}
                      />
                      <Icon className="w-4 h-4" style={{ color: metric.color }} />
                      <span className="text-sm font-medium">{metric.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                业务量趋势
              </CardTitle>
              <CardDescription>各时间段业务量变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      {selectedMetrics.includes('unload_count') && (
                        <linearGradient id="colorUnload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      )}
                      {selectedMetrics.includes('package_count') && (
                        <linearGradient id="colorPackage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      )}
                      {selectedMetrics.includes('loop_count') && (
                        <linearGradient id="colorLoop" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend />
                    {selectedMetrics.includes('unload_count') && (
                      <Area type="monotone" dataKey="卸车" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUnload)" />
                    )}
                    {selectedMetrics.includes('package_count') && (
                      <Area type="monotone" dataKey="集包" stroke="#10b981" fillOpacity={1} fill="url(#colorPackage)" />
                    )}
                    {selectedMetrics.includes('loop_count') && (
                      <Area type="monotone" dataKey="环线" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLoop)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 饼图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" />
                业务量占比
              </CardTitle>
              <CardDescription>各业务类型占总业务量的比例</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-purple-500" />
              时间段对比
            </CardTitle>
            <CardDescription>各时间段业务量柱状对比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend />
                  {selectedMetrics.includes('unload_count') && (
                    <Bar dataKey="卸车" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  )}
                  {selectedMetrics.includes('package_count') && (
                    <Bar dataKey="集包" fill="#10b981" radius={[0, 4, 4, 0]} />
                  )}
                  {selectedMetrics.includes('loop_count') && (
                    <Bar dataKey="环线" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                数据明细
              </div>
              <Badge variant="outline">{filteredData.length} 条记录</Badge>
            </CardTitle>
            <CardDescription>展示筛选后的详细数据，支持可视化背景条</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">日期</TableHead>
                    <TableHead className="w-[100px]">时间段</TableHead>
                    <TableHead className="w-[80px]">班次</TableHead>
                    <TableHead className="w-[80px]">频次</TableHead>
                    <TableHead className="text-right">卸车</TableHead>
                    <TableHead className="text-right">集包</TableHead>
                    <TableHead className="text-right">环线</TableHead>
                    <TableHead className="text-right">其他成本</TableHead>
                    <TableHead className="text-right">总利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, index) => (
                      <TableRow key={`${row.date}-${row.time_slot}-${index}`}>
                        <TableCell className="font-medium">{row.date}</TableCell>
                        <TableCell>{row.time_slot}</TableCell>
                        <TableCell>
                          <Badge variant={row.shift_type === '白班' ? 'default' : 'secondary'}>
                            {row.shift_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.frequency}</Badge>
                        </TableCell>
                        {/* 卸车 - 带可视化背景条 */}
                        <TableCell className="text-right relative">
                          <div className="relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-blue-500/20 rounded transition-all"
                              style={{ width: getBarWidth(row.unload_count || 0, maxValues.unload_count) }}
                            />
                            <span className="relative font-semibold">{row.unload_count?.toLocaleString() || 0}</span>
                          </div>
                        </TableCell>
                        {/* 集包 */}
                        <TableCell className="text-right relative">
                          <div className="relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-emerald-500/20 rounded transition-all"
                              style={{ width: getBarWidth(row.package_count || 0, maxValues.package_count) }}
                            />
                            <span className="relative font-semibold">{row.package_count?.toLocaleString() || 0}</span>
                          </div>
                        </TableCell>
                        {/* 环线 */}
                        <TableCell className="text-right relative">
                          <div className="relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-amber-500/20 rounded transition-all"
                              style={{ width: getBarWidth(row.loop_count || 0, maxValues.loop_count) }}
                            />
                            <span className="relative font-semibold">{row.loop_count?.toLocaleString() || 0}</span>
                          </div>
                        </TableCell>
                        {/* 其他成本 */}
                        <TableCell className={`text-right font-semibold ${getProfitColor(-parseFloat(row.other_cost || '0'))}`}>
                          ¥{parseFloat(row.other_cost || '0').toLocaleString()}
                        </TableCell>
                        {/* 总利润 */}
                        <TableCell className={`text-right font-semibold ${getProfitColor(row.total_profit || '0')}`}>
                          ¥{parseFloat(row.total_profit || '0').toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 数据导入区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-500" />
              数据导入
            </CardTitle>
            <CardDescription>
              上传 Excel 文件导入数据 · 支持 .xlsx, .xls 格式 · 自动解析日期格式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">{uploading ? '导入中...' : '上传 Excel 文件'}</span>
                </div>
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <div className="text-sm text-slate-500">
                <p>Excel 列头要求：日期, 时间段, 班次, 频次, 卸车, 集包, 环线, 其他成本, 总利润</p>
                <p className="mt-1">日期支持多种格式：2026/4/1, 1-Apr-2026, 2026-04-01 等</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-500">
          物流数据看板 · 数据实时同步至云端
        </div>
      </footer>
    </div>
  );
}
