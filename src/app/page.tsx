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
  FileUp, Trash2, Users
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============
interface UploadedData {
  date: string;
  timeSlot: string;
  shift: string;
  freq: string;            // 频次
  unloadCount: number;      // 卸车量
  loopCount: number;        // 环线量
  packageCount: number;     // 集包量
  manageCount: number;      // 管理人数
  unloadStaff: number;      // 卸车人数
  packageStaff: number;      // 集包人数
  loopStaff: number;        // 环线人数
  fileStaff: number;         // 文件人数
  inspectStaff: number;      // 发验人数
  serviceStaff: number;      // 客服人数
  receiveStaff: number;      // 接发员人数
  
  // 以下为Excel中已有的计算结果（用于验证）
  excelManageSalary?: number;
  excelUnloadSalary?: number;
  excelUnloadProfit?: number;
  excelPackageRevenue?: number;
  excelPackageSalary?: number;
  excelPackageProfit?: number;
  excelLoopRevenue?: number;
  excelLoopSalary?: number;
  excelOtherCost?: number;
  excelTotalProfit?: number;
}

interface CalculatedData extends UploadedData {
  // 计算结果
  manageSalary: number;
  unloadSalary: number;
  unloadProfit: number;
  packageRevenue: number;
  packageSalary: number;
  packageProfit: number;
  loopRevenue: number;
  loopSalary: number;
  loopProfit: number;
  otherCost: number;
  totalProfit: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ============ 常量 ============
const PACKAGE_UNIT_PRICE = 0.06859;
const LOOP_UNIT_PRICE = 0.276355;

// ============ 计算公式 ============

/**
 * 管理薪资: IF(管理人数=2, 21.79+16000/30/24, 25.75+12000/30/24*2+30000/30/24)
 */
function calcManageSalary(manageCount: number): number {
  if (manageCount === 2) {
    // 夜班
    return 21.79 + 16000 / 30 / 24;
  } else {
    // 白班
    return 25.75 + 12000 / 30 / 24 * 2 + 30000 / 30 / 24;
  }
}

/**
 * 卸车薪资: 卸车人数 * 14.62 + 21
 */
function calcUnloadSalary(staffCount: number): number {
  return staffCount * 14.62 + 21;
}

/**
 * 集包薪资: (集包人数-13) * 14.62 + 13 * 18 + 21
 */
function calcPackageSalary(staffCount: number): number {
  if (staffCount <= 13) {
    return staffCount * 18 + 21;
  }
  return (staffCount - 13) * 14.62 + 13 * 18 + 21;
}

/**
 * 环线薪资: (环线人数-13) * 14.62 + 13 * 18 + 42
 */
function calcLoopSalary(staffCount: number): number {
  if (staffCount <= 13) {
    return staffCount * 18 + 42;
  }
  return (staffCount - 13) * 14.62 + 13 * 18 + 42;
}

/**
 * 集包收入: 集包量 * 0.06859
 */
function calcPackageRevenue(packageCount: number): number {
  return packageCount * PACKAGE_UNIT_PRICE;
}

/**
 * 环线收入: 环线量 * 0.276355
 */
function calcLoopRevenue(loopCount: number): number {
  return loopCount * LOOP_UNIT_PRICE;
}

/**
 * 其他成本:
 * (文件人数-1) * 14.62 + 9000/26/13
 * + (发验人数-1) * 14.54 + 7500/26/11
 * + 客服人数 * (4200/26/9)
 * + 接发员 * (4000/26/11)
 * + 2000/24
 */
function calcOtherCost(
  fileStaff: number,
  inspectStaff: number,
  serviceStaff: number,
  receiveStaff: number
): number {
  const unload = Math.max(0, fileStaff - 1) * 14.62 + 9000 / 26 / 13;
  const pkg = Math.max(0, inspectStaff - 1) * 14.54 + 7500 / 26 / 11;
  const loop = serviceStaff * (4200 / 26 / 9);
  const express = receiveStaff * (4000 / 26 / 11);
  const fixed = 2000 / 24;
  return unload + pkg + loop + express + fixed;
}

// ============ 日期解析 ============
function parseDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  if (typeof value === 'string') {
    // 处理中文日期如 "4月1日"
    const chineseMatch = value.match(/(\d+)月(\d+)日/);
    if (chineseMatch) {
      const month = chineseMatch[1].padStart(2, '0');
      const day = chineseMatch[2].padStart(2, '0');
      return `2026-${month}-${day}`;
    }
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

/**
 * 根据时段判断班次
 */
function getShiftFromTimeSlot(timeSlot: string): string {
  const hour = parseInt(timeSlot.split('-')[0]);
  if (hour >= 7 && hour < 18) return '白班';
  return '夜班';
}

// ============ 主组件 ============
export default function SmartPerformanceDashboard() {
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 计算数据
  useEffect(() => {
    if (uploadedData.length > 0) {
      const calculated = uploadedData.map(row => {
        // 管理薪资
        const manageSalary = calcManageSalary(row.manageCount);
        
        // 卸车薪资
        const unloadSalary = calcUnloadSalary(row.unloadStaff);
        const unloadProfit = 0 - unloadSalary;
        
        // 集包
        const packageRevenue = calcPackageRevenue(row.packageCount);
        const packageSalary = calcPackageSalary(row.packageStaff);
        const packageProfit = packageRevenue - packageSalary;
        
        // 环线
        const loopRevenue = calcLoopRevenue(row.loopCount);
        const loopSalary = calcLoopSalary(row.loopStaff);
        const loopProfit = loopRevenue - loopSalary;
        
        // 其他成本 (文件人数, 发验人数, 客服人数, 接发员)
        const otherCost = calcOtherCost(row.fileStaff, row.inspectStaff, row.serviceStaff, row.receiveStaff);
        
        // 总盈亏 = 卸车盈亏 + 集包盈亏 + 环线盈亏 - 管理薪资 - 其他成本
        const totalProfit = unloadProfit + packageProfit + loopProfit - manageSalary - otherCost;
        
        return {
          ...row,
          manageSalary,
          unloadSalary,
          unloadProfit,
          packageRevenue,
          packageSalary,
          packageProfit,
          loopRevenue,
          loopSalary,
          loopProfit,
          otherCost,
          totalProfit
        };
      });
      setCalculatedData(calculated);
    }
  }, [uploadedData]);
  
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
    const totalRevenue = filteredData.reduce((s, d) => s + d.packageRevenue + d.loopRevenue, 0);
    const totalSalary = filteredData.reduce((s, d) => s + d.unloadSalary + d.packageSalary + d.loopSalary + d.manageSalary, 0);
    const totalProfit = filteredData.reduce((s, d) => s + d.totalProfit, 0);
    return { totalUnload, totalPackage, totalLoop, totalRevenue, totalSalary, totalProfit };
  }, [filteredData]);
  
  // 按天汇总
  const dailyStats = useMemo(() => {
    const map = new Map<string, { date: string; profit: number; revenue: number; salary: number }>();
    calculatedData.forEach(d => {
      const existing = map.get(d.date) || { date: d.date, profit: 0, revenue: 0, salary: 0 };
      existing.profit += d.totalProfit;
      existing.revenue += d.packageRevenue + d.loopRevenue;
      existing.salary += d.unloadSalary + d.packageSalary + d.loopSalary + d.manageSalary;
      map.set(d.date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [calculatedData]);
  
  // 图表数据
  const pieData = useMemo(() => [
    { name: '卸车', value: stats.totalUnload, color: COLORS[0] },
    { name: '集包', value: stats.totalPackage, color: COLORS[1] },
    { name: '环线', value: stats.totalLoop, color: COLORS[2] }
  ], [stats]);
  
  const profitData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot,
    集包收入: Math.round(d.packageRevenue),
    环线收入: Math.round(d.loopRevenue),
    卸车薪资: Math.round(d.unloadSalary),
    利润: Math.round(d.totalProfit)
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
        
        if (json.length === 0) {
          setNotification({ type: 'error', message: '文件为空' });
          return;
        }
        
        // 查找列名
        const keys = Object.keys(json[0]);
        const findCol = (patterns: string[]): string | undefined => {
          for (const key of keys) {
            for (const pattern of patterns) {
              if (key.includes(pattern)) return key;
            }
          }
          return undefined;
        };
        
        const dateCol = findCol(['日期', 'date']);
        const timeCol = findCol(['时段', 'time']);
        const shiftCol = findCol(['班次', 'shift']);
        const freqCol = findCol(['频次']);
        const unloadCountCol = findCol(['卸车量']);
        const loopCountCol = findCol(['环线量']);
        const packageCountCol = findCol(['集包量']);
        const manageCol = findCol(['管理人数', '管理']);
        const unloadStaffCol = findCol(['卸车人数']);
        const packageStaffCol = findCol(['集包人数']);
        const loopStaffCol = findCol(['环线人数']);
        const fileCol = findCol(['文件人数', '文件']);
        const inspectCol = findCol(['发验人数', '发验']);
        const serviceCol = findCol(['客服人数', '客服']);
        const receiveCol = findCol(['接发员', '接发员']);
        
        if (!dateCol || !timeCol) {
          setNotification({ type: 'error', message: '必须包含"日期"和"时段"列' });
          return;
        }
        
        const parsed: UploadedData[] = json.map(row => {
          const timeSlot = String(row[timeCol] || '').trim();
          let shift = shiftCol ? String(row[shiftCol] || '') : '';
          if (!shift) {
            shift = getShiftFromTimeSlot(timeSlot);
          }
          return {
            date: parseDate(row[dateCol]),
            timeSlot,
            shift,
            freq: freqCol ? String(row[freqCol] || '') : '',
            unloadCount: Number(row[unloadCountCol] || 0),
            loopCount: Number(row[loopCountCol] || 0),
            packageCount: Number(row[packageCountCol] || 0),
            manageCount: Number(row[manageCol] || 2),
            unloadStaff: Number(row[unloadStaffCol] || 0),
            packageStaff: Number(row[packageStaffCol] || 0),
            loopStaff: Number(row[loopStaffCol] || 0),
            fileStaff: Number(row[fileCol] || 0),
            inspectStaff: Number(row[inspectCol] || 0),
            serviceStaff: Number(row[serviceCol] || 0),
            receiveStaff: Number(row[receiveCol] || 0)
          };
        }).filter(d => d.date && d.timeSlot);
        
        if (parsed.length === 0) {
          setNotification({ type: 'error', message: '未找到有效数据' });
          return;
        }
        
        setUploadedData(parsed);
        setSelectedDate('all');
        setNotification({ type: 'success', message: `导入 ${parsed.length} 条数据` });
      } catch (err) {
        console.error(err);
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
      { 
        '日期': '4月1日', '时段': '0700-0800', '班次': '白班', '频次': '进口',
        '卸车量': 1064, '环线量': 1528, '集包量': 246,
        '管理人数': 4, '卸车人数': 8, '集包人数': 21, '环线人数': 33,
        '文件人数': 0, '发验人数': 2, '客服人数': 2, '接发员': 1
      },
      { 
        '日期': '4月1日', '时段': '0000-0100', '班次': '夜班', '频次': '进口',
        '卸车量': 16991, '环线量': 1608, '集包量': 6568,
        '管理人数': 2, '卸车人数': 17, '集包人数': 25, '环线人数': 45,
        '文件人数': 4, '发验人数': 3, '客服人数': 0, '接发员': 1
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '业务数据');
    XLSX.writeFile(wb, '业务数据模板.xlsx');
  };
  
  // 导出
  const exportData = () => {
    const rows = filteredData.map(d => ({
      '日期': d.date, '时段': d.timeSlot, '班次': d.shift, '频次': d.freq,
      '卸车量': d.unloadCount, '卸车人数': d.unloadStaff, '卸车薪资': d.unloadSalary.toFixed(2), '卸车盈亏': d.unloadProfit.toFixed(2),
      '集包量': d.packageCount, '集包人数': d.packageStaff, '集包收入': d.packageRevenue.toFixed(2), '集包薪资': d.packageSalary.toFixed(2), '集包盈亏': d.packageProfit.toFixed(2),
      '环线量': d.loopCount, '环线人数': d.loopStaff, '环线收入': d.loopRevenue.toFixed(2), '环线薪资': d.loopSalary.toFixed(2), '环线盈亏': d.loopProfit.toFixed(2),
      '管理薪资': d.manageSalary.toFixed(2), '其他成本': d.otherCost.toFixed(2),
      '总收入': (d.packageRevenue + d.loopRevenue).toFixed(2), '总薪资': (d.unloadSalary + d.packageSalary + d.loopSalary + d.manageSalary).toFixed(2), '利润': d.totalProfit.toFixed(2)
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
    setSelectedDate('all');
    setSelectedShift('all');
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
                物流绩效分析系统
              </h1>
              <p className="text-sm text-slate-500 mt-1">智能排班 · 自动盈亏计算</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />模板
              </Button>
              <Button variant="outline" size="sm" onClick={exportData} disabled={calculatedData.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />导出
              </Button>
              <Button variant="destructive" size="sm" onClick={clearData} disabled={uploadedData.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />清除
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 上传区域 */}
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
                <p className="font-medium">表头：日期 | 时段 | 班次 | 频次 | 卸车量 | 环线量 | 集包量 | 管理人数 | 卸车/集包/环线人数 | 文件/发验/客服/接发员</p>
                <p className="text-xs mt-1">收入公式：集包量×0.06859 | 环线量×0.276355</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 统计卡片 */}
        {uploadedData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-3">
                <p className="text-blue-100 text-xs">卸车总量</p>
                <p className="text-xl font-bold">{stats.totalUnload.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-3">
                <p className="text-emerald-100 text-xs">集包总量</p>
                <p className="text-xl font-bold">{stats.totalPackage.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-3">
                <p className="text-amber-100 text-xs">环线总量</p>
                <p className="text-xl font-bold">{stats.totalLoop.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <CardContent className="p-3">
                <p className="text-teal-100 text-xs">总收入</p>
                <p className="text-xl font-bold">¥{Math.round(stats.totalRevenue).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
              <CardContent className="p-3">
                <p className="text-rose-100 text-xs">总薪资</p>
                <p className="text-xl font-bold">¥{Math.round(stats.totalSalary).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
              <CardContent className="p-3">
                <p className="text-white/80 text-xs">总利润</p>
                <p className="text-xl font-bold">¥{Math.round(stats.totalProfit).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* 按天汇总 */}
        {uploadedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">按日汇总</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">总收入</TableHead>
                      <TableHead className="text-right">总薪资</TableHead>
                      <TableHead className="text-right">总利润</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map(d => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">{d.date}</TableCell>
                        <TableCell className="text-right">¥{Math.round(d.revenue).toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{Math.round(d.salary).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-bold ${getColor(d.profit)}`}>
                          ¥{Math.round(d.profit).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 筛选 */}
        {uploadedData.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">筛选：</span>
                </div>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部日期</SelectItem>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    <SelectItem value="白班">白班</SelectItem>
                    <SelectItem value="夜班">夜班</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">{filteredData.length} 条</Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 图表 */}
        {uploadedData.length > 0 && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="trend">趋势</TabsTrigger>
              <TabsTrigger value="profit">盈亏明细</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>业务量占比</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => v.toLocaleString()} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>收入对比</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer>
                        <BarChart data={profitData.slice(0, 12)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => `¥${v}`} />
                          <Legend />
                          <Bar dataKey="集包收入" fill="#10b981" />
                          <Bar dataKey="环线收入" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trend">
              <Card>
                <CardHeader>
                  <CardTitle>利润趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer>
                      <AreaChart data={profitData}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `¥${v}`} />
                        <Legend />
                        <Area type="monotone" dataKey="利润" stroke="#3b82f6" fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="profit">
              <Card>
                <CardHeader>
                  <CardTitle>盈亏明细</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer>
                      <BarChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `¥${v}`} />
                        <Legend />
                        <Bar dataKey="集包收入" fill="#10b981" />
                        <Bar dataKey="环线收入" fill="#3b82f6" />
                        <Bar dataKey="卸车薪资" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* 数据表格 */}
        {uploadedData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  完整数据
                </CardTitle>
                <Badge variant="outline">
                  总收入 ¥{Math.round(stats.totalRevenue).toLocaleString()} | 总薪资 ¥{Math.round(stats.totalSalary).toLocaleString()} | 
                  利润 <span className={getColor(stats.totalProfit)}>¥{Math.round(stats.totalProfit).toLocaleString()}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>时段</TableHead>
                      <TableHead>班次</TableHead>
                      <TableHead className="text-right">卸车量</TableHead>
                      <TableHead className="text-right">卸车人</TableHead>
                      <TableHead className="text-right">卸车薪</TableHead>
                      <TableHead className="text-right">卸车盈</TableHead>
                      <TableHead className="text-right">集包量</TableHead>
                      <TableHead className="text-right">集包人</TableHead>
                      <TableHead className="text-right">集包收</TableHead>
                      <TableHead className="text-right">集包薪</TableHead>
                      <TableHead className="text-right">集包盈</TableHead>
                      <TableHead className="text-right">环线量</TableHead>
                      <TableHead className="text-right">环线人</TableHead>
                      <TableHead className="text-right">环线收</TableHead>
                      <TableHead className="text-right">环线薪</TableHead>
                      <TableHead className="text-right">环线盈</TableHead>
                      <TableHead className="text-right">管理薪</TableHead>
                      <TableHead className="text-right">其他</TableHead>
                      <TableHead className="text-right">利润</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={19} className="text-center py-8 text-slate-500">暂无数据</TableCell>
                      </TableRow>
                    ) : filteredData.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.timeSlot}</TableCell>
                        <TableCell>
                          <Badge variant={d.shift === '白班' ? 'default' : 'outline'}>{d.shift}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{d.unloadCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.unloadStaff}</TableCell>
                        <TableCell className="text-right text-red-500">¥{d.unloadSalary.toFixed(0)}</TableCell>
                        <TableCell className={`text-right ${getColor(d.unloadProfit)}`}>¥{d.unloadProfit.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{d.packageCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.packageStaff}</TableCell>
                        <TableCell className="text-right text-emerald-500">¥{d.packageRevenue.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-red-500">¥{d.packageSalary.toFixed(0)}</TableCell>
                        <TableCell className={`text-right ${getColor(d.packageProfit)}`}>¥{d.packageProfit.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{d.loopCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.loopStaff}</TableCell>
                        <TableCell className="text-right text-emerald-500">¥{d.loopRevenue.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-red-500">¥{d.loopSalary.toFixed(0)}</TableCell>
                        <TableCell className={`text-right ${getColor(d.loopProfit)}`}>¥{d.loopProfit.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-red-500">¥{d.manageSalary.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-red-500">¥{d.otherCost.toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-bold ${getColor(d.totalProfit)}`}>¥{d.totalProfit.toFixed(0)}</TableCell>
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
          物流绩效分析系统 · 基于Excel公式计算
        </div>
      </footer>
    </div>
  );
}
