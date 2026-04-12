'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Download, TrendingUp, Package, Truck, RotateCw,
  DollarSign, Users, FileSpreadsheet, AlertCircle, CheckCircle, Brain,
  TrendingDown, Activity, PieChart as PieChartIcon, BarChart3,
  Settings2, Target, FileUp, Trash2, Calendar, Edit3, Plus, Minus
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============
interface StaffAllocation {
  unload: number;      // 卸车网格
  package: number;     // 集包网格
  northLoop: number;   // 北环网格
  southLoop: number;   // 南环网格
  express: number;     // 特快
  reused: number;      // 复用人员（从卸车复用去环线）
}

interface TimeSlotConfig {
  timeSlot: string;
  shift: string;
  staff: StaffAllocation;
  notes: string;
}

interface UploadedData {
  date: string;
  timeSlot: string;
  unloadCount: number;
  packageCount: number;
  loopCount: number;
}

interface CalculatedData extends UploadedData {
  shift: string;
  unloadStaff: number;
  packageStaff: number;
  northLoopStaff: number;
  southLoopStaff: number;
  expressStaff: number;
  reusedStaff: number;
  totalStaff: number;
  unloadEfficiency: number;
  packageEfficiency: number;
  loopEfficiency: number;
  unloadRevenue: number;
  packageRevenue: number;
  loopRevenue: number;
  unloadSalary: number;
  packageSalary: number;
  loopSalary: number;
  totalRevenue: number;
  totalSalary: number;
  totalProfit: number;
}

// ============ 时段配置 ============
const TIME_RANGES = [
  '0000-0100', '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700',
  '0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400',
  '1400-1500', '1500-1600', '1600-1700', '1700-1800', '1800-1900', '1900-2000', '2000-2100',
  '2100-2200', '2200-2300', '2300-0000'
];

const WHITE_RANGES = ['0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800'];
const NIGHT_RANGES = ['1800-1900', '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-0000', '0000-0100', '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ============ 默认排班配置 ============
const DEFAULT_STAFF_CONFIG: Record<string, StaffAllocation> = {
  '0700-0800': { unload: 8, package: 21, northLoop: 16, southLoop: 0, express: 4, reused: 3 },
  '0800-0900': { unload: 8, package: 21, northLoop: 17, southLoop: 0, express: 4, reused: 3 },
  '0900-1000': { unload: 13, package: 21, northLoop: 14, southLoop: 0, express: 4, reused: 0 },
  '1000-1100': { unload: 13, package: 21, northLoop: 14, southLoop: 0, express: 4, reused: 0 },
  '1100-1200': { unload: 15, package: 21, northLoop: 14, southLoop: 0, express: 4, reused: 0 },
  '1200-1300': { unload: 20, package: 4, northLoop: 29, southLoop: 0, express: 4, reused: 17 },
  '1300-1400': { unload: 13, package: 27, northLoop: 16, southLoop: 0, express: 4, reused: 14 },
  '1400-1500': { unload: 13, package: 27, northLoop: 16, southLoop: 0, express: 4, reused: 14 },
  '1500-1600': { unload: 17, package: 23, northLoop: 16, southLoop: 0, express: 4, reused: 14 },
  '1600-1700': { unload: 17, package: 23, northLoop: 16, southLoop: 0, express: 4, reused: 14 },
  '1700-1800': { unload: 17, package: 23, northLoop: 16, southLoop: 0, express: 4, reused: 14 },
  '1800-1900': { unload: 21, package: 15, northLoop: 39, southLoop: 0, express: 4, reused: 2 },
  '1900-2000': { unload: 19, package: 30, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '2000-2100': { unload: 19, package: 30, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '2100-2200': { unload: 19, package: 30, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '2200-2300': { unload: 19, package: 30, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '2300-0000': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0000-0100': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0100-0200': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0200-0300': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0300-0400': { unload: 17, package: 18, northLoop: 30, southLoop: 0, express: 4, reused: 26 },
  '0400-0500': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0500-0600': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
  '0600-0700': { unload: 17, package: 25, northLoop: 26, southLoop: 0, express: 4, reused: 3 },
};

// ============ 日期解析 ============
function parseDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  if (typeof value === 'string') {
    const formats = ['yyyy/MM/dd', 'yyyy-M-d', 'd-MMM-yyyy', 'MM/dd/yyyy', 'yyyy.MM.dd'];
    for (const fmt of formats) {
      try {
        const parsed = parse(value, fmt, new Date());
        if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
      } catch {}
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return String(value);
}

// ============ 薪资计算 ============
// 根据人数段计算单人薪资（参考模板数据）
function getPerPersonSalary(count: number, shift: 'white' | 'night'): number {
  if (count <= 5) return shift === 'white' ? 20 : 21;
  if (count <= 10) return shift === 'white' ? 18 : 19;
  if (count <= 20) return shift === 'white' ? 16.5 : 17;
  return shift === 'white' ? 15.8 : 16;
}

// ============ 计算数据 ============
function calculateData(
  uploadedData: UploadedData[],
  staffConfig: Record<string, StaffAllocation>
): CalculatedData[] {
  return uploadedData.map(data => {
    const staff = staffConfig[data.timeSlot] || { unload: 0, package: 0, northLoop: 0, southLoop: 0, express: 0, reused: 0 };
    const isWhiteShift = WHITE_RANGES.includes(data.timeSlot);
    const shiftType = isWhiteShift ? 'white' : 'night';
    
    const totalLoop = data.loopCount;
    const totalStaff = staff.unload + staff.package + staff.northLoop + staff.southLoop;
    
    // 人效 = 业务量 / 人数
    const unloadEfficiency = staff.unload > 0 ? data.unloadCount / staff.unload : 0;
    const packageEfficiency = staff.package > 0 ? data.packageCount / staff.package : 0;
    const loopEfficiency = totalLoop > 0 && (staff.northLoop + staff.southLoop) > 0 ? totalLoop / (staff.northLoop + staff.southLoop) : 0;
    
    // 【关键修正】收入计算（根据模板）
    // 卸车：收入 ≈ 0（卸车是成本中心，不产生直接收入）
    const unloadRevenue = 0;
    // 集包：收入 = 量 × 0.0645
    const packageRevenue = data.packageCount * 0.0645;
    // 环线：收入 = 量 × 0.2598
    const loopRevenue = totalLoop * 0.2598;
    
    // 薪资计算 = 人数 × 单人薪资
    const unloadSalary = staff.unload * getPerPersonSalary(staff.unload, shiftType);
    const packageSalary = staff.package * getPerPersonSalary(staff.package, shiftType);
    const loopSalary = (staff.northLoop + staff.southLoop) * getPerPersonSalary(staff.northLoop + staff.southLoop, shiftType);
    
    // 盈亏 = 收入 - 薪资
    const unloadProfit = unloadRevenue - unloadSalary;
    const packageProfit = packageRevenue - packageSalary;
    const loopProfit = loopRevenue - loopSalary;
    
    // 其他成本（场地、设备等固定成本分摊到每个时段）
    const otherCost = isWhiteShift ? 150 : 180;
    
    // 总盈亏 = 各环节盈亏 - 其他成本
    const totalProfit = unloadProfit + packageProfit + loopProfit - otherCost;
    
    // 总收入和总薪资
    const totalRevenue = unloadRevenue + packageRevenue + loopRevenue;
    const totalSalary = unloadSalary + packageSalary + loopSalary;
    
    return {
      ...data,
      shift: isWhiteShift ? '白班' : '夜班',
      unloadStaff: staff.unload,
      packageStaff: staff.package,
      northLoopStaff: staff.northLoop,
      southLoopStaff: staff.southLoop,
      expressStaff: staff.express,
      reusedStaff: staff.reused,
      totalStaff,
      unloadEfficiency,
      packageEfficiency,
      loopEfficiency,
      unloadRevenue,
      packageRevenue,
      loopRevenue,
      unloadSalary,
      packageSalary,
      loopSalary,
      totalRevenue,
      totalSalary,
      totalProfit
    };
  });
}

// ============ 主组件 ============
export default function SmartPerformanceDashboard() {
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedData[]>([]);
  const [staffConfig, setStaffConfig] = useState<Record<string, StaffAllocation>>(DEFAULT_STAFF_CONFIG);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 计算数据
  useEffect(() => {
    if (uploadedData.length > 0) {
      const calculated = calculateData(uploadedData, staffConfig);
      setCalculatedData(calculated);
    }
  }, [uploadedData, staffConfig]);
  
  // 筛选
  const filteredData = useMemo(() => {
    let result = [...calculatedData];
    if (selectedDate !== 'all') result = result.filter(d => d.date === selectedDate);
    if (selectedShift !== 'all') result = result.filter(d => d.shift === selectedShift);
    return result;
  }, [calculatedData, selectedDate, selectedShift]);
  
  // 可用日期
  const availableDates = useMemo(() => {
    return [...new Set(uploadedData.map(d => d.date))].sort();
  }, [uploadedData]);
  
  // 统计
  const stats = useMemo(() => {
    const totalUnload = filteredData.reduce((s, d) => s + d.unloadCount, 0);
    const totalPackage = filteredData.reduce((s, d) => s + d.packageCount, 0);
    const totalLoop = filteredData.reduce((s, d) => s + d.loopCount, 0);
    const totalRevenue = filteredData.reduce((s, d) => s + d.totalRevenue, 0);
    const totalSalary = filteredData.reduce((s, d) => s + d.totalSalary, 0);
    const totalProfit = filteredData.reduce((s, d) => s + d.totalProfit, 0);
    const totalStaff = filteredData.reduce((s, d) => s + d.totalStaff, 0);
    const avgEff = totalStaff > 0 ? (totalUnload + totalPackage + totalLoop) / totalStaff : 0;
    return { totalUnload, totalPackage, totalLoop, totalRevenue, totalSalary, totalProfit, totalStaff, avgEff };
  }, [filteredData]);
  
  // 图表数据
  const trendData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot, 卸车: d.unloadCount, 集包: d.packageCount, 环线: d.loopCount
  })), [filteredData]);
  
  const pieData = useMemo(() => [
    { name: '卸车', value: stats.totalUnload, color: COLORS[0] },
    { name: '集包', value: stats.totalPackage, color: COLORS[1] },
    { name: '环线', value: stats.totalLoop, color: COLORS[2] }
  ], [stats]);
  
  const staffChartData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot,
    卸车: d.unloadStaff, 集包: d.packageStaff, 北环: d.northLoop, 南环: d.southLoop, 复用: d.reusedStaff
  })), [filteredData]);
  
  const profitData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot, 收入: Math.round(d.totalRevenue), 薪资: Math.round(d.totalSalary), 利润: Math.round(d.totalProfit)
  })), [filteredData]);
  
  // Excel上传
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        
        const parsed: UploadedData[] = json.map(row => ({
          date: parseDate(row['日期'] || row['date']),
          timeSlot: String(row['时段'] || row['timeSlot'] || '').trim(),
          unloadCount: Number(row['卸车量'] || row['unload'] || 0),
          packageCount: Number(row['集包量'] || row['package'] || 0),
          loopCount: Number(row['环线量'] || row['loop'] || 0)
        })).filter(d => d.date && d.timeSlot);
        
        if (parsed.length === 0) {
          setNotification({ type: 'error', message: '未找到有效数据' });
          return;
        }
        
        setUploadedData(parsed);
        setSelectedDate('all');
        setNotification({ type: 'success', message: `导入 ${parsed.length} 条数据` });
      } catch {
        setNotification({ type: 'error', message: '解析失败' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };
  
  // 下载模板
  const downloadTemplate = () => {
    const template = [
      { 日期: '2026-04-01', 时段: '0700-0800', 卸车量: 5000, 集包量: 3000, 环线量: 2000 },
      { 日期: '2026-04-01', 时段: '0800-0900', 卸车量: 8000, 集包量: 5000, 环线量: 3000 },
      { 日期: '2026-04-01', 时段: '0900-1000', 卸车量: 6000, 集包量: 4000, 环线量: 2500 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '业务数据');
    XLSX.writeFile(wb, '业务数据模板.xlsx');
  };
  
  // 导出
  const exportData = () => {
    const rows = filteredData.map(d => ({
      '日期': d.date, '时段': d.timeSlot, '班次': d.shift,
      '卸车量': d.unloadCount, '集包量': d.packageCount, '环线量': d.loopCount,
      '卸车人数': d.unloadStaff, '集包人数': d.packageStaff, '北环人数': d.northLoopStaff, '南环人数': d.southLoopStaff, '复用人数': d.reusedStaff,
      '总收入': d.totalRevenue.toFixed(2), '总薪资': d.totalSalary.toFixed(2), '利润': d.totalProfit.toFixed(2)
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '绩效数据');
    XLSX.writeFile(wb, `绩效数据_${selectedDate}.xlsx`);
    setNotification({ type: 'success', message: '导出成功' });
  };
  
  // 更新排班
  const updateSlotStaff = (slot: string, field: keyof StaffAllocation, value: number) => {
    setStaffConfig(prev => ({
      ...prev,
      [slot]: { ...prev[slot], [field]: Math.max(0, value) }
    }));
  };
  
  // 应用到所有时段
  const applyToAll = (type: 'white' | 'night' | 'all') => {
    const ranges = type === 'white' ? WHITE_RANGES : type === 'night' ? NIGHT_RANGES : TIME_RANGES;
    ranges.forEach(slot => {
      if (staffConfig[slot]) {
        setStaffConfig(prev => ({
          ...prev,
          [slot]: { ...DEFAULT_STAFF_CONFIG[slot] }
        }));
      }
    });
    setNotification({ type: 'success', message: '已应用默认配置' });
  };
  
  // 清除
  const clearData = () => {
    setUploadedData([]);
    setCalculatedData([]);
    setNotification({ type: 'success', message: '数据已清除' });
  };
  
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);
  
  const getColor = (v: number) => v >= 0 ? 'text-emerald-500' : 'text-red-500';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}
      
      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                智能物流排班系统
              </h1>
              <p className="text-sm text-slate-500 mt-1">灵活配置各时段人员，支持复用规则</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />模板</Button>
              <Button variant="outline" size="sm" onClick={exportData} disabled={calculatedData.length === 0}><FileSpreadsheet className="w-4 h-4 mr-2" />导出</Button>
              <Button variant="destructive" size="sm" onClick={clearData} disabled={uploadedData.length === 0}><Trash2 className="w-4 h-4 mr-2" />清除</Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 上传 */}
        <Card className="border-2 border-dashed border-blue-300">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <label className="cursor-pointer">
                <div className={`flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all ${uploading ? 'opacity-50' : ''}`}>
                  <FileUp className="w-6 h-6" />
                  <span>{uploading ? '导入中...' : '上传业务数据'}</span>
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
              </label>
              <div className="text-sm text-slate-600">
                <p className="font-medium">表头：日期 | 时段 | 卸车量 | 集包量 | 环线量</p>
                <p className="text-xs mt-1">支持多种日期格式</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 排班配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-500" />时段人员配置</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => applyToAll('white')}>应用白班配置</Button>
                <Button size="sm" variant="outline" onClick={() => applyToAll('night')}>应用夜班配置</Button>
                <Button size="sm" variant="outline" onClick={() => applyToAll('all')}>应用全部</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-blue-500" /><span>卸车</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-emerald-500" /><span>集包</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-amber-500" /><span>北环</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-orange-500" /><span>南环</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-purple-500" /><span>特快</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-slate-400" /><span>复用</span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[100px]">时段</TableHead>
                    <TableHead className="text-center">班次</TableHead>
                    <TableHead className="text-center">卸车</TableHead>
                    <TableHead className="text-center">集包</TableHead>
                    <TableHead className="text-center">北环</TableHead>
                    <TableHead className="text-center">南环</TableHead>
                    <TableHead className="text-center">特快</TableHead>
                    <TableHead className="text-center">复用</TableHead>
                    <TableHead className="text-center">小计</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIME_RANGES.map(slot => {
                    const staff = staffConfig[slot] || { unload: 0, package: 0, northLoop: 0, southLoop: 0, express: 0, reused: 0 };
                    const isWhite = WHITE_RANGES.includes(slot);
                    const total = staff.unload + staff.package + staff.northLoop + staff.southLoop + staff.express;
                    
                    return (
                      <TableRow key={slot} className={editingSlot === slot ? 'bg-blue-50' : ''}>
                        <TableCell className="font-medium">{slot}</TableCell>
                        <TableCell><Badge variant={isWhite ? 'default' : 'outline'}>{isWhite ? '白班' : '夜班'}</Badge></TableCell>
                        <TableCell className="text-center">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.unload} onChange={e => updateSlotStaff(slot, 'unload', +e.target.value)} />
                          ) : staff.unload}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.package} onChange={e => updateSlotStaff(slot, 'package', +e.target.value)} />
                          ) : staff.package}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.northLoop} onChange={e => updateSlotStaff(slot, 'northLoop', +e.target.value)} />
                          ) : staff.northLoop}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.southLoop} onChange={e => updateSlotStaff(slot, 'southLoop', +e.target.value)} />
                          ) : staff.southLoop}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.express} onChange={e => updateSlotStaff(slot, 'express', +e.target.value)} />
                          ) : staff.express}
                        </TableCell>
                        <TableCell className="text-center text-slate-500">
                          {editingSlot === slot ? (
                            <Input type="number" className="w-16 h-8 text-center" value={staff.reused} onChange={e => updateSlotStaff(slot, 'reused', +e.target.value)} />
                          ) : staff.reused}
                        </TableCell>
                        <TableCell className="text-center font-bold">{total}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSlot(editingSlot === slot ? null : slot)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white"><CardContent className="p-3"><p className="text-blue-100 text-xs">卸车总量</p><p className="text-xl font-bold">{stats.totalUnload.toLocaleString()}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"><CardContent className="p-3"><p className="text-emerald-100 text-xs">集包总量</p><p className="text-xl font-bold">{stats.totalPackage.toLocaleString()}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white"><CardContent className="p-3"><p className="text-amber-100 text-xs">环线总量</p><p className="text-xl font-bold">{stats.totalLoop.toLocaleString()}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white"><CardContent className="p-3"><p className="text-cyan-100 text-xs">总人数</p><p className="text-xl font-bold">{stats.totalStaff}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white"><CardContent className="p-3"><p className="text-violet-100 text-xs">平均人效</p><p className="text-xl font-bold">{Math.round(stats.avgEff)}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white"><CardContent className="p-3"><p className="text-teal-100 text-xs">总收入</p><p className="text-xl font-bold">¥{Math.round(stats.totalRevenue).toLocaleString()}</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white"><CardContent className="p-3"><p className="text-rose-100 text-xs">总薪资</p><p className="text-xl font-bold">¥{Math.round(stats.totalSalary).toLocaleString()}</p></CardContent></Card>
          <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
            <CardContent className="p-3"><p className="text-white/80 text-xs">总利润</p><p className="text-xl font-bold">¥{Math.round(stats.totalProfit).toLocaleString()}</p></CardContent>
          </Card>
        </div>
        
        {/* 日期筛选 */}
        {uploadedData.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">日期筛选：</span>
                </div>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部日期</SelectItem>
                    {availableDates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="secondary">共 {availableDates.length} 天</Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 图表 */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="trend">趋势</TabsTrigger>
            <TabsTrigger value="staff">人员</TabsTrigger>
            <TabsTrigger value="profit">盈亏</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5" />业务量占比</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v: number) => v.toLocaleString()} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />效能指标</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer><BarChart data={profitData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `¥${v}`} /><Legend /><Bar dataKey="收入" fill="#10b981" /><Bar dataKey="薪资" fill="#f59e0b" /><Bar dataKey="利润" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trend">
            <Card><CardHeader><CardTitle>业务量趋势</CardTitle></CardHeader><CardContent><div className="h-[400px]"><ResponsiveContainer><AreaChart data={trendData}><defs><linearGradient id="gu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} /></linearGradient><linearGradient id="ji" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.1} /></linearGradient><linearGradient id="hu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Area type="monotone" dataKey="卸车" stroke="#3b82f6" fill="url(#gu)" /><Area type="monotone" dataKey="集包" stroke="#10b981" fill="url(#ji)" /><Area type="monotone" dataKey="环线" stroke="#f59e0b" fill="url(#hu)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="staff">
            <Card><CardHeader><CardTitle>人员配置</CardTitle></CardHeader><CardContent><div className="h-[400px]"><ResponsiveContainer><BarChart data={staffChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="卸车" stackId="a" fill="#3b82f6" /><Bar dataKey="集包" stackId="a" fill="#10b981" /><Bar dataKey="北环" stackId="a" fill="#f59e0b" /><Bar dataKey="南环" stackId="a" fill="#f97316" /><Bar dataKey="复用" stackId="a" fill="#94a3b8" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="profit">
            <Card><CardHeader><CardTitle>盈亏分析</CardTitle></CardHeader><CardContent><div className="h-[400px]"><ResponsiveContainer><BarChart data={profitData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `¥${v}`} /><Legend /><Bar dataKey="收入" fill="#10b981" /><Bar dataKey="薪资" fill="#f59e0b" /><Bar dataKey="利润" fill={profitData.some(d => d.利润 < 0) ? '#ef4444' : '#3b82f6'} /></BarChart></ResponsiveContainer></div></CardContent></Card>
          </TabsContent>
        </Tabs>
        
        {/* 数据表格 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />数据明细</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">全部日期</SelectItem>{availableDates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="白班">白班</SelectItem><SelectItem value="夜班">夜班</SelectItem></SelectContent>
                </Select>
                <Badge>{filteredData.length}条</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead>时段</TableHead><TableHead>班次</TableHead>
                    <TableHead className="text-right">卸车量</TableHead><TableHead className="text-right">卸车人</TableHead><TableHead className="text-right">卸车效</TableHead>
                    <TableHead className="text-right">集包量</TableHead><TableHead className="text-right">集包人</TableHead><TableHead className="text-right">集包效</TableHead>
                    <TableHead className="text-right">环线量</TableHead><TableHead className="text-right">环线人</TableHead><TableHead className="text-right">环线效</TableHead>
                    <TableHead className="text-right">收入</TableHead><TableHead className="text-right">薪资</TableHead><TableHead className="text-right">利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow><TableCell colSpan={14} className="text-center py-8">暂无数据</TableCell></TableRow>
                  ) : filteredData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.timeSlot}</TableCell>
                      <TableCell><Badge variant={d.shift === '白班' ? 'default' : 'outline'}>{d.shift}</Badge></TableCell>
                      <TableCell className="text-right">{d.unloadCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{d.unloadStaff}</TableCell>
                      <TableCell className="text-right">{Math.round(d.unloadEfficiency)}</TableCell>
                      <TableCell className="text-right">{d.packageCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{d.packageStaff}</TableCell>
                      <TableCell className="text-right">{Math.round(d.packageEfficiency)}</TableCell>
                      <TableCell className="text-right">{d.loopCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{d.northLoopStaff + d.southLoopStaff}</TableCell>
                      <TableCell className="text-right">{Math.round(d.loopEfficiency)}</TableCell>
                      <TableCell className="text-right">¥{Math.round(d.totalRevenue)}</TableCell>
                      <TableCell className="text-right">¥{Math.round(d.totalSalary)}</TableCell>
                      <TableCell className={`text-right font-bold ${getColor(d.totalProfit)}`}>¥{Math.round(d.totalProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="border-t border-slate-200 bg-white/50 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-500">
          智能物流排班系统 · 灵活配置各时段人员
        </div>
      </footer>
    </div>
  );
}
