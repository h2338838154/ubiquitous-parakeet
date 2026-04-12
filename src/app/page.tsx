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
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Download, AlertCircle, CheckCircle, FileSpreadsheet, Calendar,
  FileUp, Trash2, Users, Calculator
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============
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

// ============ 常量配置 ============
const TIME_RANGES = [
  '0000-0100', '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700',
  '0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400',
  '1400-1500', '1500-1600', '1600-1700', '1700-1800', '1800-1900', '1900-2000', '2000-2100',
  '2100-2200', '2200-2300', '2300-0000'
];

// 白班: 07-18时, 夜班: 18-07时
const WHITE_RANGES = ['0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ============ 薪资基准配置（根据Excel模板提取） ============
interface SalaryBaseConfig {
  baseCount: number;
  baseSalary: number;
  increment: number;
}

const SALARY_CONFIG: Record<string, Record<'white' | 'night', SalaryBaseConfig>> = {
  unload: {
    white: { baseCount: 8, baseSalary: 137.32, increment: 14.54 },
    night: { baseCount: 17, baseSalary: 269.54, increment: 14.62 }
  },
  package: {
    white: { baseCount: 21, baseSalary: 326.34, increment: 14.54 },
    night: { baseCount: 25, baseSalary: 430.44, increment: 14.62 }
  },
  loop: {
    white: { baseCount: 33, baseSalary: 521.82, increment: 14.54 },
    night: { baseCount: 45, baseSalary: 743.84, increment: 14.62 }
  }
};

const MANAGER_SALARY = { white: 100.75, night: 44.01 };
const REVENUE_PRICE = { unload: 0, package: 0.06447, loop: 0.25977 };
const DEFAULT_OTHER_COST = { white: 121, night: 167 };

// ============ 薪资计算 ============
function calculateSalary(count: number, config: SalaryBaseConfig): number {
  if (count === 0) return 0;
  return config.baseSalary + (count - config.baseCount) * config.increment;
}

// ============ 智能分配算法 ============
// 根据总人数和业务量，自动分配各环节人数
function smartAllocate(totalWhite: number, totalNight: number, data: UploadedData[]): Record<string, {
  unload: number; package: number; northLoop: number; southLoop: number; express: number; reused: number
}> {
  const result: Record<string, {
    unload: number; package: number; northLoop: number; southLoop: number; express: number; reused: number
  }> = {};
  
  // 计算各时段的业务量占比
  const totalUnload = data.reduce((s, d) => s + d.unloadCount, 0);
  const totalPackage = data.reduce((s, d) => s + d.packageCount, 0);
  const totalLoop = data.reduce((s, d) => s + d.loopCount, 0);
  
  TIME_RANGES.forEach(slot => {
    const isWhite = WHITE_RANGES.includes(slot);
    const slotData = data.find(d => d.timeSlot === slot);
    const baseTotal = isWhite ? totalWhite : totalNight;
    
    if (!slotData || baseTotal === 0) {
      result[slot] = { unload: 0, package: 0, northLoop: 0, southLoop: 0, express: 4, reused: 0 };
      return;
    }
    
    // 根据业务量占比分配
    const weight = (slotData.unloadCount + slotData.packageCount + slotData.loopCount) / 
                   (totalUnload + totalPackage + totalLoop) || 0.04;
    
    // 各环节比例（基于历史数据）
    const unloadRatio = 0.25;
    const packageRatio = 0.35;
    
    let staff = Math.round(baseTotal * weight);
    
    // 确保最小人数
    if (staff < 30) staff = 30;
    
    const unload = Math.round(staff * unloadRatio);
    const packageCount = Math.round(staff * packageRatio);
    const totalLoopStaff = staff - unload - packageCount;
    const northLoop = Math.round(totalLoopStaff * 0.65);
    const southLoop = Math.round(totalLoopStaff * 0.35);
    const express = 4;
    
    // 复用规则：卸车人员可复用去环线（高峰时段）
    const reused = slot.includes('1200') || slot.includes('1300') || slot.includes('1400') || slot.includes('0800')
      ? Math.round(unload * 0.2)
      : 0;
    
    result[slot] = {
      unload: unload - reused,
      package: packageCount,
      northLoop: northLoop + Math.round(reused * 0.7),
      southLoop: southLoop + Math.round(reused * 0.3),
      express,
      reused
    };
  });
  
  return result;
}

// ============ 计算数据 ============
function calculateData(
  uploadedData: UploadedData[],
  staffConfig: Record<string, { unload: number; package: number; northLoop: number; southLoop: number; express: number; reused: number }>
): CalculatedData[] {
  return uploadedData.map(data => {
    const staff = staffConfig[data.timeSlot] || { unload: 0, package: 0, northLoop: 0, southLoop: 0, express: 0, reused: 0 };
    const isWhiteShift = WHITE_RANGES.includes(data.timeSlot);
    const shiftType = isWhiteShift ? 'white' : 'night';
    
    const totalLoop = data.loopCount;
    const totalLoopStaff = staff.northLoop + staff.southLoop;
    const totalStaff = staff.unload + staff.package + totalLoopStaff;
    
    const unloadEfficiency = staff.unload > 0 ? data.unloadCount / staff.unload : 0;
    const packageEfficiency = staff.package > 0 ? data.packageCount / staff.package : 0;
    const loopEfficiency = totalLoop > 0 && totalLoopStaff > 0 ? totalLoop / totalLoopStaff : 0;
    
    const unloadRevenue = 0;
    const packageRevenue = data.packageCount * REVENUE_PRICE.package;
    const loopRevenue = totalLoop * REVENUE_PRICE.loop;
    
    const unloadSalary = calculateSalary(staff.unload, SALARY_CONFIG.unload[shiftType]);
    const packageSalary = calculateSalary(staff.package, SALARY_CONFIG.package[shiftType]);
    const loopSalary = calculateSalary(totalLoopStaff, SALARY_CONFIG.loop[shiftType]);
    
    const unloadProfit = unloadRevenue - unloadSalary;
    const packageProfit = packageRevenue - packageSalary;
    const loopProfit = loopRevenue - loopSalary;
    
    const otherCost = DEFAULT_OTHER_COST[shiftType];
    const managerSalary = MANAGER_SALARY[shiftType];
    const totalProfit = unloadProfit + packageProfit + loopProfit - managerSalary - otherCost;
    
    const totalRevenue = unloadRevenue + packageRevenue + loopRevenue;
    const totalSalary = unloadSalary + packageSalary + loopSalary + managerSalary;
    
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

// ============ 主组件 ============
export default function SmartPerformanceDashboard() {
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedData[]>([]);
  const [staffConfig, setStaffConfig] = useState<Record<string, { unload: number; package: number; northLoop: number; southLoop: number; express: number; reused: number }>>({});
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [otherCostConfig, setOtherCostConfig] = useState(DEFAULT_OTHER_COST);
  
  // 班次人数配置
  const [whiteStaffCount, setWhiteStaffCount] = useState(70);
  const [nightStaffCount, setNightStaffCount] = useState(95);
  
  // 智能分配
  useEffect(() => {
    if (uploadedData.length > 0) {
      const allocated = smartAllocate(whiteStaffCount, nightStaffCount, uploadedData);
      setStaffConfig(allocated);
    }
  }, [uploadedData, whiteStaffCount, nightStaffCount]);
  
  // 计算数据
  useEffect(() => {
    if (uploadedData.length > 0 && Object.keys(staffConfig).length > 0) {
      const calculated = calculateData(uploadedData, staffConfig);
      setCalculatedData(calculated);
    }
  }, [uploadedData, staffConfig, otherCostConfig]);
  
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
  const pieData = useMemo(() => [
    { name: '卸车', value: stats.totalUnload, color: COLORS[0] },
    { name: '集包', value: stats.totalPackage, color: COLORS[1] },
    { name: '环线', value: stats.totalLoop, color: COLORS[2] }
  ], [stats]);
  
  const trendData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot,
    卸车: d.unloadCount, 集包: d.packageCount, 环线: d.loopCount
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
    const ws = XLSX.utils.json_to_sheet(template);
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
      '卸车人效': Math.round(d.unloadEfficiency), '集包人效': Math.round(d.packageEfficiency), '环线人效': Math.round(d.loopEfficiency),
      '总收入': d.totalRevenue.toFixed(2), '总薪资': d.totalSalary.toFixed(2), '利润': d.totalProfit.toFixed(2)
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '绩效数据');
    XLSX.writeFile(wb, `绩效数据_${selectedDate}.xlsx`);
    setNotification({ type: 'success', message: '导出成功' });
  };
  
  // 清除
  const clearData = () => {
    setUploadedData([]);
    setCalculatedData([]);
    setStaffConfig({});
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
              <p className="text-sm text-slate-500 mt-1">输入班次人数，自动智能分配各环节人员</p>
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
                <p className="text-xs mt-1">上传数据后，输入白班/夜班总人数，系统自动分配</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 班次人数配置 */}
        {uploadedData.length > 0 && (
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                班次人数配置（系统根据业务量自动分配到各环节）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-xl">☀️</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">白班总人数</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={whiteStaffCount}
                        onChange={e => setWhiteStaffCount(Math.max(0, Number(e.target.value) || 0))}
                      />
                      <span className="text-sm text-slate-400">人（07:00-18:00）</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className="text-xl">🌙</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">夜班总人数</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={nightStaffCount}
                        onChange={e => setNightStaffCount(Math.max(0, Number(e.target.value) || 0))}
                      />
                      <span className="text-sm text-slate-400">人（18:00-07:00）</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">智能分配结果</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">卸车 {Math.round(whiteStaffCount * 0.25)} / {Math.round(nightStaffCount * 0.25)}</Badge>
                      <Badge variant="outline" className="text-xs">集包 {Math.round(whiteStaffCount * 0.35)} / {Math.round(nightStaffCount * 0.35)}</Badge>
                      <Badge variant="outline" className="text-xs">环线 {Math.round(whiteStaffCount * 0.40)} / {Math.round(nightStaffCount * 0.40)}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium">智能分配规则：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>根据各时段业务量占比自动分配人数</li>
                  <li>高峰时段（08:00-14:00）自动增加人员并启用复用机制</li>
                  <li>卸车人员可复用至环线环节</li>
                  <li>各环节比例：卸车25%、集包35%、环线40%</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 其他成本配置 */}
        {uploadedData.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                成本配置（其他成本按天变化，请根据实际情况调整）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">白班其他成本：</span>
                  <Input
                    type="number"
                    className="w-24 h-8"
                    value={otherCostConfig.white}
                    onChange={e => setOtherCostConfig(prev => ({ ...prev, white: Number(e.target.value) || 0 }))}
                  />
                  <span className="text-xs text-slate-400">元/时段</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">夜班其他成本：</span>
                  <Input
                    type="number"
                    className="w-24 h-8"
                    value={otherCostConfig.night}
                    onChange={e => setOtherCostConfig(prev => ({ ...prev, night: Number(e.target.value) || 0 }))}
                  />
                  <span className="text-xs text-slate-400">元/时段</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOtherCostConfig(DEFAULT_OTHER_COST)}>
                  恢复默认
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 统计卡片 */}
        {uploadedData.length > 0 && (
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
        )}
        
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
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    <SelectItem value="白班">白班</SelectItem>
                    <SelectItem value="夜班">夜班</SelectItem>
                  </SelectContent>
                </Select>
                <Badge>{filteredData.length}条</Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 图表 */}
        {uploadedData.length > 0 && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="trend">趋势</TabsTrigger>
              <TabsTrigger value="detail">明细</TabsTrigger>
              <TabsTrigger value="profit">盈亏</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="flex items-center gap-2">📊 业务量占比</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v: number) => v.toLocaleString()} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2">💰 效能指标</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer><BarChart data={profitData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `¥${v}`} /><Legend /><Bar dataKey="收入" fill="#10b981" /><Bar dataKey="薪资" fill="#f59e0b" /><Bar dataKey="利润" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></CardContent></Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trend">
              <Card><CardHeader><CardTitle>业务量趋势</CardTitle></CardHeader><CardContent><div className="h-[400px]"><ResponsiveContainer><AreaChart data={trendData}><defs><linearGradient id="gu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} /></linearGradient><linearGradient id="ji" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.1} /></linearGradient><linearGradient id="hu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Area type="monotone" dataKey="卸车" stroke="#3b82f6" fill="url(#gu)" /><Area type="monotone" dataKey="集包" stroke="#10b981" fill="url(#ji)" /><Area type="monotone" dataKey="环线" stroke="#f59e0b" fill="url(#hu)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
            </TabsContent>
            
            <TabsContent value="detail">
              <Card><CardHeader><CardTitle>人员配置明细</CardTitle></CardHeader><CardContent>
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50">
                      <TableRow>
                        <TableHead>时段</TableHead><TableHead>班次</TableHead>
                        <TableHead className="text-right">卸车量</TableHead><TableHead className="text-right">卸车人</TableHead><TableHead className="text-right">卸车效</TableHead>
                        <TableHead className="text-right">集包量</TableHead><TableHead className="text-right">集包人</TableHead><TableHead className="text-right">集包效</TableHead>
                        <TableHead className="text-right">环线量</TableHead><TableHead className="text-right">环线人</TableHead><TableHead className="text-right">环线效</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="text-center py-8">暂无数据</TableCell></TableRow>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent></Card>
            </TabsContent>
            
            <TabsContent value="profit">
              <Card><CardHeader><CardTitle>盈亏分析</CardTitle></CardHeader><CardContent><div className="h-[400px]"><ResponsiveContainer><BarChart data={profitData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `¥${v}`} /><Legend /><Bar dataKey="收入" fill="#10b981" /><Bar dataKey="薪资" fill="#f59e0b" /><Bar dataKey="利润" fill={profitData.some(d => d.利润 < 0) ? '#ef4444' : '#3b82f6'} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* 数据表格 */}
        {uploadedData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />完整数据</CardTitle>
                <Badge variant="outline">总收入 ¥{Math.round(stats.totalRevenue).toLocaleString()} | 总薪资 ¥{Math.round(stats.totalSalary).toLocaleString()} | 利润 <span className={getColor(stats.totalProfit)}>¥{Math.round(stats.totalProfit).toLocaleString()}</span></Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>时段</TableHead><TableHead>班次</TableHead>
                      <TableHead className="text-right">卸车</TableHead><TableHead className="text-right">集包</TableHead><TableHead className="text-right">环线</TableHead>
                      <TableHead className="text-right">复用</TableHead><TableHead className="text-right">小计</TableHead>
                      <TableHead className="text-right">收入</TableHead><TableHead className="text-right">薪资</TableHead><TableHead className="text-right">利润</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8">暂无数据</TableCell></TableRow>
                    ) : filteredData.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.timeSlot}</TableCell>
                        <TableCell><Badge variant={d.shift === '白班' ? 'default' : 'outline'}>{d.shift}</Badge></TableCell>
                        <TableCell className="text-right">{d.unloadStaff}</TableCell>
                        <TableCell className="text-right">{d.packageStaff}</TableCell>
                        <TableCell className="text-right">{d.northLoopStaff + d.southLoopStaff}</TableCell>
                        <TableCell className="text-right text-slate-400">{d.reusedStaff > 0 ? `+${d.reusedStaff}` : '-'}</TableCell>
                        <TableCell className="text-right font-bold">{d.totalStaff}</TableCell>
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
        )}
      </main>
      
      <footer className="border-t border-slate-200 bg-white/50 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-500">
          智能物流排班系统 · 根据班次人数自动智能分配
        </div>
      </footer>
    </div>
  );
}
