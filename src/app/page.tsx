'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Download, TrendingUp, Package, Truck, RotateCw,
  DollarSign, Users, FileSpreadsheet, AlertCircle, CheckCircle, Brain,
  TrendingDown, Activity, PieChart as PieChartIcon, BarChart3,
  Settings2, Target, FileUp, Trash2
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============
interface StaffConfig {
  totalStaff: number;
  unloadStaff: number;
  packageStaff: number;
  loopStaff: number;
  reusedStaff: number;
}

interface UploadedData {
  date: string;
  timeSlot: string;
  shift: string;
  unloadCount: number;
  packageCount: number;
  loopCount: number;
}

interface CalculatedData extends UploadedData {
  unloadStaff: number;
  packageStaff: number;
  loopStaff: number;
  reusedStaff: number;
  unloadEfficiency: number;
  packageEfficiency: number;
  loopEfficiency: number;
  unloadRevenue: number;
  packageRevenue: number;
  loopRevenue: number;
  unloadSalary: number;
  packageSalary: number;
  loopSalary: number;
  unloadProfit: number;
  packageProfit: number;
  loopProfit: number;
  otherCost: number;
  totalProfit: number;
  totalRevenue: number;
  totalSalary: number;
}

// ============ 常量配置 ============
// 白班: 07:00-18:00
// 夜班: 18:00-07:00 (次日)
const WHITE_TIME_RANGES = ['0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800'];
const NIGHT_TIME_RANGES = ['1800-1900', '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-0000', '0000-0100', '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// ============ 智能分配算法 ============
function calculateStaffAllocation(totalStaff: number) {
  const unloadRatio = 0.18;
  const packageRatio = 0.35;
  const loopRatio = 0.40;
  const reusedRatio = 0.07;
  
  const baseUnloadStaff = Math.round(totalStaff * unloadRatio);
  const basePackageStaff = Math.round(totalStaff * packageRatio);
  const baseLoopStaff = Math.round(totalStaff * loopRatio);
  const baseReusedStaff = Math.round(totalStaff * reusedRatio);
  
  const diff = totalStaff - (baseUnloadStaff + basePackageStaff + baseLoopStaff + baseReusedStaff);
  const loopStaff = baseLoopStaff + diff;
  
  return { unloadStaff: baseUnloadStaff, packageStaff: basePackageStaff, loopStaff, reusedStaff: baseReusedStaff };
}

// ============ 数据计算 ============
function calculateData(uploadedData: UploadedData[], whiteStaff: StaffConfig, nightStaff: StaffConfig): CalculatedData[] {
  return uploadedData.map(data => {
    const isWhiteShift = WHITE_TIME_RANGES.includes(data.timeSlot);
    const staff = isWhiteShift ? whiteStaff : nightStaff;
    
    const { unloadStaff, packageStaff, loopStaff, reusedStaff } = staff;
    
    // 计算人效
    const unloadEfficiency = unloadStaff > 0 ? data.unloadCount / unloadStaff : 0;
    const packageEfficiency = packageStaff > 0 ? data.packageCount / packageStaff : 0;
    const loopEfficiency = loopStaff > 0 ? data.loopCount / loopStaff : 0;
    
    // 计算收入（单价）
    const unloadRevenue = data.unloadCount * 0.05;
    const packageRevenue = data.packageCount * 0.06;
    const loopRevenue = data.loopCount * 0.08;
    
    // 计算薪资（按人效阶梯）
    const getSalary = (efficiency: number, base: number) => {
      if (efficiency > 800) return base * 1.4;
      if (efficiency > 600) return base * 1.2;
      if (efficiency > 400) return base * 1.0;
      if (efficiency > 200) return base * 0.9;
      return base * 0.8;
    };
    
    const baseUnloadSalary = 280 + reusedStaff * 20;
    const basePackageSalary = 320;
    const baseLoopSalary = 480;
    
    const unloadSalary = getSalary(unloadEfficiency, baseUnloadSalary);
    const packageSalary = getSalary(packageEfficiency, basePackageSalary);
    const loopSalary = getSalary(loopEfficiency, baseLoopSalary);
    
    // 计算盈亏
    const unloadProfit = unloadRevenue - unloadSalary * unloadStaff;
    const packageProfit = packageRevenue - packageSalary * packageStaff;
    const loopProfit = loopRevenue - loopSalary * loopStaff;
    
    // 其他成本
    const otherCost = 180 + Math.random() * 80;
    
    // 总计
    const totalRevenue = unloadRevenue + packageRevenue + loopRevenue;
    const totalSalary = unloadSalary * unloadStaff + packageSalary * packageStaff + loopSalary * loopStaff;
    const totalProfit = unloadProfit + packageProfit + loopProfit - otherCost;
    
    return {
      ...data,
      unloadStaff,
      packageStaff,
      loopStaff,
      reusedStaff,
      unloadEfficiency,
      packageEfficiency,
      loopEfficiency,
      unloadRevenue,
      packageRevenue,
      loopRevenue,
      unloadSalary,
      packageSalary,
      loopSalary,
      unloadProfit,
      packageProfit,
      loopProfit,
      otherCost,
      totalProfit,
      totalRevenue,
      totalSalary
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
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {}
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return String(value);
}

// ============ 主组件 ============
export default function SmartPerformanceDashboard() {
  // 状态
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 人员配置
  const [whiteStaff, setWhiteStaff] = useState<StaffConfig>({ totalStaff: 65, ...calculateStaffAllocation(65) });
  const [nightStaff, setNightStaff] = useState<StaffConfig>({ totalStaff: 92, ...calculateStaffAllocation(92) });
  
  // 重新计算数据
  useEffect(() => {
    if (uploadedData.length > 0) {
      const calculated = calculateData(uploadedData, whiteStaff, nightStaff);
      setCalculatedData(calculated);
    }
  }, [uploadedData, whiteStaff, nightStaff]);
  
  // 筛选数据
  const filteredData = useMemo(() => {
    let result = [...calculatedData];
    if (selectedDate) {
      result = result.filter(item => item.date === selectedDate);
    }
    if (selectedShift !== 'all') {
      result = result.filter(item => item.shift === selectedShift);
    }
    return result;
  }, [calculatedData, selectedDate, selectedShift]);
  
  // 统计汇总
  const stats = useMemo(() => {
    const totalUnload = filteredData.reduce((sum, d) => sum + d.unloadCount, 0);
    const totalPackage = filteredData.reduce((sum, d) => sum + d.packageCount, 0);
    const totalLoop = filteredData.reduce((sum, d) => sum + d.loopCount, 0);
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalSalary = filteredData.reduce((sum, d) => sum + d.totalSalary, 0);
    const totalProfit = filteredData.reduce((sum, d) => sum + d.totalProfit, 0);
    const totalStaff = filteredData.reduce((sum, d) => sum + d.unloadStaff + d.packageStaff + d.loopStaff, 0);
    const avgEfficiency = totalStaff > 0 ? (totalUnload + totalPackage + totalLoop) / totalStaff : 0;
    
    return { totalUnload, totalPackage, totalLoop, totalRevenue, totalSalary, totalProfit, totalStaff, avgEfficiency };
  }, [filteredData]);
  
  // 图表数据
  const trendChartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      卸车: d.unloadCount,
      集包: d.packageCount,
      环线: d.loopCount,
      利润: Math.round(d.totalProfit)
    }));
  }, [filteredData]);
  
  const pieChartData = useMemo(() => [
    { name: '卸车', value: stats.totalUnload, color: COLORS[0] },
    { name: '集包', value: stats.totalPackage, color: COLORS[1] },
    { name: '环线', value: stats.totalLoop, color: COLORS[2] }
  ], [stats]);
  
  const staffChartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      卸车人数: d.unloadStaff,
      集包人数: d.packageStaff,
      环线人数: d.loopStaff
    }));
  }, [filteredData]);
  
  const efficiencyChartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      卸车人效: Math.round(d.unloadEfficiency),
      集包人效: Math.round(d.packageEfficiency),
      环线人效: Math.round(d.loopEfficiency)
    }));
  }, [filteredData]);
  
  const revenueCostData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      收入: Math.round(d.totalRevenue),
      薪资: Math.round(d.totalSalary),
      利润: Math.round(d.totalProfit)
    }));
  }, [filteredData]);
  
  const radarData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const totals = { unload: 0, package: 0, loop: 0, profit: 0 };
    filteredData.forEach(d => {
      totals.unload += d.unloadEfficiency;
      totals.package += d.packageEfficiency;
      totals.loop += d.loopEfficiency;
      totals.profit += d.totalProfit;
    });
    const len = filteredData.length;
    return [
      { subject: '卸车人效', A: Math.round(totals.unload / len), fullMark: 1500 },
      { subject: '集包人效', A: Math.round(totals.package / len), fullMark: 1500 },
      { subject: '环线人效', A: Math.round(totals.loop / len), fullMark: 1500 },
      { subject: '利润', A: Math.round(totals.profit / len), fullMark: 5000 }
    ];
  }, [filteredData]);
  
  // Excel上传
  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        const parsed: UploadedData[] = jsonData.map(row => {
          const dateVal = row['日期'] || row['date'] || row['DATE'];
          const timeVal = row['时段'] || row['timeSlot'] || row['TIME_SLOT'];
          const shiftVal = row['班次'] || row['shift'] || row['SHIFT'];
          
          return {
            date: parseDate(dateVal),
            timeSlot: String(timeVal || '').trim(),
            shift: String(shiftVal || '').trim() || (WHITE_TIME_RANGES.includes(String(timeVal || '').trim()) ? '白班' : '夜班'),
            unloadCount: Number(row['卸车量'] || row['卸车'] || row['UNLOAD'] || 0),
            packageCount: Number(row['集包量'] || row['集包'] || row['PACKAGE'] || 0),
            loopCount: Number(row['环线量'] || row['环线'] || row['LOOP'] || 0)
          };
        }).filter(d => d.date && d.timeSlot);
        
        if (parsed.length === 0) {
          setNotification({ type: 'error', message: '未找到有效数据，请检查文件格式' });
          return;
        }
        
        setUploadedData(parsed);
        setSelectedDate(parsed[0].date);
        setNotification({ type: 'success', message: `成功导入 ${parsed.length} 条数据` });
      } catch {
        setNotification({ type: 'error', message: '文件解析失败' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };
  
  // 下载模板
  const downloadTemplate = () => {
    const template = [
      { 日期: '2026-04-01', 时段: '0700-0800', 班次: '白班', 卸车量: 5000, 集包量: 3000, 环线量: 2000 },
      { 日期: '2026-04-01', 时段: '0800-0900', 班次: '白班', 卸车量: 8000, 集包量: 5000, 环线量: 3000 },
      { 日期: '2026-04-01', 时段: '1800-1900', 班次: '夜班', 卸车量: 12000, 集包量: 8000, 环线量: 5000 },
      { 日期: '2026-04-01', 时段: '1900-2000', 班次: '夜班', 卸车量: 15000, 集包量: 10000, 环线量: 6000 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '业务数据');
    XLSX.writeFile(wb, '业务数据导入模板.xlsx');
  };
  
  // 导出数据
  const exportData = () => {
    const exportRows = filteredData.map(d => ({
      '日期': d.date,
      '时段': d.timeSlot,
      '班次': d.shift,
      '卸车量': d.unloadCount,
      '集包量': d.packageCount,
      '环线量': d.loopCount,
      '卸车人数': d.unloadStaff,
      '集包人数': d.packageStaff,
      '环线人数': d.loopStaff,
      '卸车人效': Math.round(d.unloadEfficiency),
      '集包人效': Math.round(d.packageEfficiency),
      '环线人效': Math.round(d.loopEfficiency),
      '卸车收入': d.unloadRevenue.toFixed(2),
      '集包收入': d.packageRevenue.toFixed(2),
      '环线收入': d.loopRevenue.toFixed(2),
      '卸车薪资': d.unloadSalary.toFixed(2),
      '集包薪资': d.packageSalary.toFixed(2),
      '环线薪资': d.loopSalary.toFixed(2),
      '总收入': d.totalRevenue.toFixed(2),
      '总薪资': d.totalSalary.toFixed(2),
      '总利润': d.totalProfit.toFixed(2)
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '绩效数据');
    XLSX.writeFile(wb, `绩效数据_${selectedDate}.xlsx`);
    setNotification({ type: 'success', message: '导出成功' });
  };
  
  // 清除数据
  const clearData = () => {
    setUploadedData([]);
    setCalculatedData([]);
    setNotification({ type: 'success', message: '数据已清除' });
  };
  
  // 更新通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-emerald-500';
    if (value < 0) return 'text-red-500';
    return 'text-slate-500';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 通知 */}
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                智能物流绩效分析系统
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                上传业务量数据，智能计算人效薪资盈亏
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
              <Button variant="outline" size="sm" onClick={exportData} disabled={calculatedData.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                导出数据
              </Button>
              <Button variant="destructive" size="sm" onClick={clearData} disabled={uploadedData.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                清除
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 上传区域 */}
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <label className="cursor-pointer">
                <div className={`flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg ${uploading ? 'opacity-50' : ''}`}>
                  <FileUp className="w-6 h-6" />
                  <span className="font-medium">{uploading ? '导入中...' : '上传业务数据'}</span>
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" disabled={uploading} />
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-medium mb-2">Excel表头要求：</p>
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">日期 | 时段 | 班次 | 卸车量 | 集包量 | 环线量</code>
                <p className="mt-2 text-xs">支持 .xlsx, .xls 格式，自动解析日期</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 人员配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" />
              人员配置
              <Badge variant="outline" className="ml-2">输入总人数自动分配</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 白班配置 */}
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    白班 (07:00-18:00)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">总人数 (58-70人)</label>
                      <Input
                        type="number"
                        value={whiteStaff.totalStaff}
                        onChange={(e) => {
                          const total = parseInt(e.target.value) || 0;
                          setWhiteStaff({ totalStaff: total, ...calculateStaffAllocation(total) });
                        }}
                        className="mt-1"
                        min={58} max={70}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>卸车:</span><span className="font-semibold">{whiteStaff.unloadStaff}人</span></div>
                      <div className="flex justify-between"><span>集包:</span><span className="font-semibold">{whiteStaff.packageStaff}人</span></div>
                      <div className="flex justify-between"><span>环线:</span><span className="font-semibold">{whiteStaff.loopStaff}人</span></div>
                      <div className="flex justify-between"><span>复用:</span><span className="font-semibold">{whiteStaff.reusedStaff}人</span></div>
                    </div>
                    <Progress value={(whiteStaff.totalStaff / 70) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              {/* 夜班配置 */}
              <Card className="border-indigo-200 dark:border-indigo-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    夜班 (18:00-07:00)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">总人数 (85-100人)</label>
                      <Input
                        type="number"
                        value={nightStaff.totalStaff}
                        onChange={(e) => {
                          const total = parseInt(e.target.value) || 0;
                          setNightStaff({ totalStaff: total, ...calculateStaffAllocation(total) });
                        }}
                        className="mt-1"
                        min={85} max={100}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>卸车:</span><span className="font-semibold">{nightStaff.unloadStaff}人</span></div>
                      <div className="flex justify-between"><span>集包:</span><span className="font-semibold">{nightStaff.packageStaff}人</span></div>
                      <div className="flex justify-between"><span>环线:</span><span className="font-semibold">{nightStaff.loopStaff}人</span></div>
                      <div className="flex justify-between"><span>复用:</span><span className="font-semibold">{nightStaff.reusedStaff}人</span></div>
                    </div>
                    <Progress value={(nightStaff.totalStaff / 100) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-blue-100 text-xs">卸车总量</p><p className="text-xl font-bold">{stats.totalUnload.toLocaleString()}</p></div>
                <Truck className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-emerald-100 text-xs">集包总量</p><p className="text-xl font-bold">{stats.totalPackage.toLocaleString()}</p></div>
                <Package className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-amber-100 text-xs">环线总量</p><p className="text-xl font-bold">{stats.totalLoop.toLocaleString()}</p></div>
                <RotateCw className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-cyan-100 text-xs">总人数</p><p className="text-xl font-bold">{stats.totalStaff}</p></div>
                <Users className="w-8 h-8 text-cyan-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-violet-100 text-xs">平均人效</p><p className="text-xl font-bold">{Math.round(stats.avgEfficiency)}</p></div>
                <Target className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-teal-100 text-xs">总收入</p><p className="text-xl font-bold">¥{Math.round(stats.totalRevenue).toLocaleString()}</p></div>
                <TrendingUp className="w-8 h-8 text-teal-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-rose-100 text-xs">总薪资</p><p className="text-xl font-bold">¥{Math.round(stats.totalSalary).toLocaleString()}</p></div>
                <DollarSign className="w-8 h-8 text-rose-200" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-xs">总利润</p><p className="text-xl font-bold">¥{Math.round(stats.totalProfit).toLocaleString()}</p></div>
                {stats.totalProfit >= 0 ? <TrendingUp className="w-8 h-8 text-green-200" /> : <TrendingDown className="w-8 h-8 text-red-200" />}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 图表区域 */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="trend">趋势</TabsTrigger>
            <TabsTrigger value="staff">人员</TabsTrigger>
            <TabsTrigger value="efficiency">人效</TabsTrigger>
          </TabsList>
          
          {/* 总览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-blue-500" />业务量占比</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                          {pieChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => v.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-purple-500" />效能雷达</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis tick={{ fontSize: 10 }} />
                        <Radar name="效能" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-500" />收入/薪资/利润对比</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="薪资" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="利润" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 趋势 */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" />业务量趋势</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="colorUnload" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} /></linearGradient>
                        <linearGradient id="colorPackage" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.1} /></linearGradient>
                        <linearGradient id="colorLoop" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                      <Area type="monotone" dataKey="卸车" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUnload)" />
                      <Area type="monotone" dataKey="集包" stroke="#10b981" fillOpacity={1} fill="url(#colorPackage)" />
                      <Area type="monotone" dataKey="环线" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLoop)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 人员 */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-violet-500" />人员配置</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="卸车人数" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="集包人数" fill="#10b981" stackId="a" />
                      <Bar dataKey="环线人数" fill="#f59e0b" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 人效 */}
          <TabsContent value="efficiency" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-teal-500" />人效对比</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                      <Bar dataKey="卸车人效" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="集包人效" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="环线人效" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 数据表格 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                数据明细
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="全部班次" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    <SelectItem value="白班">白班</SelectItem>
                    <SelectItem value="夜班">夜班</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">{filteredData.length} 条记录</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead>时段</TableHead>
                    <TableHead>班次</TableHead>
                    <TableHead className="text-right">卸车量</TableHead>
                    <TableHead className="text-right">卸车人</TableHead>
                    <TableHead className="text-right">卸车人效</TableHead>
                    <TableHead className="text-right">集包量</TableHead>
                    <TableHead className="text-right">集包人</TableHead>
                    <TableHead className="text-right">集包人效</TableHead>
                    <TableHead className="text-right">环线量</TableHead>
                    <TableHead className="text-right">环线人</TableHead>
                    <TableHead className="text-right">环线人效</TableHead>
                    <TableHead className="text-right">收入</TableHead>
                    <TableHead className="text-right">薪资</TableHead>
                    <TableHead className="text-right">利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-500">暂无数据，请上传Excel文件</TableCell></TableRow>
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
                      <TableCell className="text-right">{d.loopStaff}</TableCell>
                      <TableCell className="text-right">{Math.round(d.loopEfficiency)}</TableCell>
                      <TableCell className="text-right">¥{Math.round(d.totalRevenue)}</TableCell>
                      <TableCell className="text-right">¥{Math.round(d.totalSalary)}</TableCell>
                      <TableCell className={`text-right font-bold ${getProfitColor(d.totalProfit)}`}>¥{Math.round(d.totalProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-500">
          智能物流绩效分析系统 · 上传业务量，自动计算绩效
        </div>
      </footer>
    </div>
  );
}
