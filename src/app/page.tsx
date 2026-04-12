'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Download, TrendingUp, Package, Truck, RotateCw,
  DollarSign, Users, FileSpreadsheet, AlertCircle, CheckCircle, Calculator, Brain,
  TrendingDown, Activity, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon,
  Settings2, Sparkles, Target, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// ============ 类型定义 ============
interface StaffConfig {
  totalStaff: number;
  unloadStaff: number;
  packageStaff: number;
  loopStaff: number;
  reusedStaff: number; // 复用人员
}

interface ShiftConfig {
  name: string;
  timeRanges: string[];
  baseStaff: number;
  staffRange: [number, number];
  allocation: {
    unloadRatio: number;
    packageRatio: number;
    loopRatio: number;
    reusedRatio: number;
  };
}

interface TimeSlotData {
  date: string;
  timeSlot: string;
  shift: string;
  frequency: string;
  unloadCount: number;
  packageCount: number;
  loopCount: number;
  unloadStaff: number;
  packageStaff: number;
  loopStaff: number;
  reusedStaff: number;
  unloadEfficiency: number;
  packageEfficiency: number;
  loopEfficiency: number;
  unloadPrice: number;
  packagePrice: number;
  loopPrice: number;
  unloadSalary: number;
  packageSalary: number;
  loopSalary: number;
  unloadProfit: number;
  packageProfit: number;
  loopProfit: number;
  otherCost: number;
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalSalary: number;
}

interface DailyConfig {
  date: string;
  whiteShift: StaffConfig;
  middleShift: StaffConfig;
  nightShift: StaffConfig;
}

// ============ 常量配置 ============
const SHIFTS_CONFIG: Record<string, ShiftConfig> = {
  white: {
    name: '白班',
    timeRanges: ['0700-0800', '0800-0900', '0900-1000', '1000-1100', '1100-1200', '1200-1300', '1300-1400', '1400-1500', '1500-1600', '1600-1700', '1700-1800'],
    baseStaff: 65,
    staffRange: [58, 70],
    allocation: { unloadRatio: 0.15, packageRatio: 0.32, loopRatio: 0.45, reusedRatio: 0.08 }
  },
  middle: {
    name: '中班',
    timeRanges: ['1130-1230', '1230-1330', '1330-1430', '1430-1530', '1530-1630', '1630-1730', '1730-1830', '1830-1930', '1930-2030', '2030-2130', '2130-2230', '2230-2330', '2330-0030'],
    baseStaff: 8,
    staffRange: [5, 10],
    allocation: { unloadRatio: 0.25, packageRatio: 0.35, loopRatio: 0.30, reusedRatio: 0.10 }
  },
  night: {
    name: '夜班',
    timeRanges: ['1800-1900', '1900-2000', '2000-2100', '2100-2200', '2200-2300', '2300-0000', '0000-0100', '0100-0200', '0200-0300', '0300-0400', '0400-0500', '0500-0600', '0600-0700'],
    baseStaff: 92,
    staffRange: [85, 100],
    allocation: { unloadRatio: 0.22, packageRatio: 0.33, loopRatio: 0.38, reusedRatio: 0.07 }
  }
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// ============ 智能分配算法 ============
function calculateStaffAllocation(totalStaff: number, config: typeof SHIFTS_CONFIG.white.allocation) {
  const { unloadRatio, packageRatio, loopRatio, reusedRatio } = config;
  
  const baseUnloadStaff = Math.round(totalStaff * unloadRatio);
  const basePackageStaff = Math.round(totalStaff * packageRatio);
  const baseLoopStaff = Math.round(totalStaff * loopRatio);
  const baseReusedStaff = Math.round(totalStaff * reusedRatio);
  
  // 确保总数一致
  const diff = totalStaff - (baseUnloadStaff + basePackageStaff + baseLoopStaff + baseReusedStaff);
  const loopStaff = baseLoopStaff + diff; // 调整环线人数
  
  return { unloadStaff: baseUnloadStaff, packageStaff: basePackageStaff, loopStaff, reusedStaff: baseReusedStaff };
}

function generateTimeSlotData(date: string, shift: ShiftConfig, staffConfig: StaffConfig): TimeSlotData[] {
  const { unloadStaff, packageStaff, loopStaff, reusedStaff } = staffConfig;
  const result: TimeSlotData[] = [];
  
  // 业务量系数（根据时段调整）
  const peakHours = ['0900-1000', '1000-1100', '1300-1400', '1900-2000', '2000-2100'];
  const lowHours = ['0600-0700', '0700-0800', '1100-1200', '1700-1800', '0500-0600', '2300-0000'];
  
  shift.timeRanges.forEach((timeSlot) => {
    let volumeMultiplier = 1.0;
    if (peakHours.includes(timeSlot)) volumeMultiplier = 1.5;
    else if (lowHours.includes(timeSlot)) volumeMultiplier = 0.6;
    
    // 模拟业务量
    const baseUnload = 5000 + Math.random() * 10000;
    const basePackage = 3000 + Math.random() * 8000;
    const baseLoop = 2000 + Math.random() * 5000;
    
    const unloadCount = Math.round(baseUnload * volumeMultiplier);
    const packageCount = Math.round(basePackage * volumeMultiplier);
    const loopCount = Math.round(baseLoop * volumeMultiplier);
    
    // 计算人效
    const unloadEfficiency = unloadStaff > 0 ? unloadCount / unloadStaff : 0;
    const packageEfficiency = packageStaff > 0 ? packageCount / packageStaff : 0;
    const loopEfficiency = loopStaff > 0 ? loopCount / loopStaff : 0;
    
    // 计算薪资（按人效阶梯）
    const getSalary = (efficiency: number, base: number) => {
      if (efficiency > 800) return base * 1.3;
      if (efficiency > 500) return base * 1.1;
      if (efficiency > 300) return base;
      return base * 0.85;
    };
    
    const baseUnloadSalary = 260 + reusedStaff * 15;
    const basePackageSalary = 320;
    const baseLoopSalary = 480;
    
    const unloadSalary = getSalary(unloadEfficiency, baseUnloadSalary);
    const packageSalary = getSalary(packageEfficiency, basePackageSalary);
    const loopSalary = getSalary(loopEfficiency, baseLoopSalary);
    
    // 计算收入（按单价）
    const unloadPrice = unloadCount * 0.03;
    const packagePrice = packageCount * 0.05;
    const loopPrice = loopCount * 0.08;
    
    // 计算盈亏
    const unloadProfit = unloadPrice - unloadSalary * unloadStaff;
    const packageProfit = packagePrice - packageSalary * packageStaff;
    const loopProfit = loopPrice - loopSalary * loopStaff;
    
    // 其他成本（场地、设备等）
    const otherCost = 180 + Math.random() * 60;
    
    // 总计
    const totalRevenue = unloadPrice + packagePrice + loopPrice;
    const totalSalary = unloadSalary * unloadStaff + packageSalary * packageStaff + loopSalary * loopStaff;
    const totalCost = totalSalary + otherCost;
    const totalProfit = unloadProfit + packageProfit + loopProfit - otherCost;
    
    result.push({
      date,
      timeSlot,
      shift: shift.name,
      frequency: timeSlot.includes('1100') || timeSlot.includes('1700') ? '清场' : (shift.name === '白班' ? '进口' : '出口'),
      unloadCount,
      packageCount,
      loopCount,
      unloadStaff,
      packageStaff,
      loopStaff,
      reusedStaff,
      unloadEfficiency,
      packageEfficiency,
      loopEfficiency,
      unloadPrice,
      packagePrice,
      loopPrice,
      unloadSalary,
      packageSalary,
      loopSalary,
      unloadProfit,
      packageProfit,
      loopProfit,
      otherCost,
      totalProfit,
      totalRevenue,
      totalCost,
      totalSalary
    });
  });
  
  return result;
}

// ============ 演示数据生成 ============
function generateDemoData(config: DailyConfig): TimeSlotData[] {
  const allData: TimeSlotData[] = [];
  
  // 白班
  const whiteData = generateTimeSlotData(config.date, SHIFTS_CONFIG.white, config.whiteShift);
  allData.push(...whiteData);
  
  // 中班
  const middleData = generateTimeSlotData(config.date, SHIFTS_CONFIG.middle, config.middleShift);
  allData.push(...middleData);
  
  // 夜班
  const nightData = generateTimeSlotData(config.date, SHIFTS_CONFIG.night, config.nightShift);
  allData.push(...nightData);
  
  return allData;
}

// ============ 主组件 ============
export default function SmartPerformanceDashboard() {
  // 状态
  const [data, setData] = useState<TimeSlotData[]>([]);
  const [filteredData, setFilteredData] = useState<TimeSlotData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 智能配置状态
  const [dailyConfig, setDailyConfig] = useState<DailyConfig>({
    date: format(new Date(), 'yyyy-MM-dd'),
    whiteShift: { totalStaff: 65, ...calculateStaffAllocation(65, SHIFTS_CONFIG.white.allocation) },
    middleShift: { totalStaff: 8, ...calculateStaffAllocation(8, SHIFTS_CONFIG.middle.allocation) },
    nightShift: { totalStaff: 92, ...calculateStaffAllocation(92, SHIFTS_CONFIG.night.allocation) }
  });
  
  // 更新人数配置
  const updateStaffConfig = (shift: 'whiteShift' | 'middleShift' | 'nightShift', total: number) => {
    const config = shift === 'whiteShift' ? SHIFTS_CONFIG.white.allocation 
                 : shift === 'middleShift' ? SHIFTS_CONFIG.middle.allocation 
                 : SHIFTS_CONFIG.night.allocation;
    const allocation = calculateStaffAllocation(total, config);
    setDailyConfig(prev => ({
      ...prev,
      date: selectedDate,
      [shift]: { totalStaff: total, ...allocation }
    }));
  };
  
  // 生成数据
  const generateData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const newData = generateDemoData({ ...dailyConfig, date: selectedDate });
      setData(newData);
      setFilteredData(newData);
      setLoading(false);
      setNotification({ type: 'success', message: `成功生成 ${newData.length} 条数据` });
    }, 500);
  }, [dailyConfig, selectedDate]);
  
  // 筛选数据
  useEffect(() => {
    let result = [...data];
    if (selectedDate) {
      result = result.filter(item => item.date === selectedDate);
    }
    if (selectedShift !== 'all') {
      result = result.filter(item => item.shift === selectedShift);
    }
    setFilteredData(result);
  }, [data, selectedDate, selectedShift]);
  
  // 统计汇总
  const stats = useMemo(() => {
    const totalUnload = filteredData.reduce((sum, d) => sum + d.unloadCount, 0);
    const totalPackage = filteredData.reduce((sum, d) => sum + d.packageCount, 0);
    const totalLoop = filteredData.reduce((sum, d) => sum + d.loopCount, 0);
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalCost = filteredData.reduce((sum, d) => sum + d.totalCost, 0);
    const totalSalary = filteredData.reduce((sum, d) => sum + d.totalSalary, 0);
    const totalProfit = filteredData.reduce((sum, d) => sum + d.totalProfit, 0);
    const totalStaff = filteredData.reduce((sum, d) => sum + d.unloadStaff + d.packageStaff + d.loopStaff + d.reusedStaff, 0);
    
    const avgEfficiency = totalStaff > 0 ? (totalUnload + totalPackage + totalLoop) / totalStaff : 0;
    const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return { totalUnload, totalPackage, totalLoop, totalRevenue, totalCost, totalSalary, totalProfit, totalStaff, avgEfficiency, profitRate };
  }, [filteredData]);
  
  // 图表数据
  const trendChartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      卸车: d.unloadCount,
      集包: d.packageCount,
      环线: d.loopCount,
      利润: Math.round(d.totalProfit),
      薪资: Math.round(d.totalSalary)
    }));
  }, [filteredData]);
  
  const profitChartData = useMemo(() => {
    const byShift = {
      white: { revenue: 0, cost: 0, profit: 0 },
      middle: { revenue: 0, cost: 0, profit: 0 },
      night: { revenue: 0, cost: 0, profit: 0 }
    };
    
    filteredData.forEach(d => {
      const key = d.shift === '白班' ? 'white' : d.shift === '中班' ? 'middle' : 'night';
      byShift[key].revenue += d.totalRevenue;
      byShift[key].cost += d.totalCost;
      byShift[key].profit += d.totalProfit;
    });
    
    return [
      { name: '白班', revenue: Math.round(byShift.white.revenue), cost: Math.round(byShift.white.cost), profit: Math.round(byShift.white.profit) },
      { name: '中班', revenue: Math.round(byShift.middle.revenue), cost: Math.round(byShift.middle.cost), profit: Math.round(byShift.middle.profit) },
      { name: '夜班', revenue: Math.round(byShift.night.revenue), cost: Math.round(byShift.night.cost), profit: Math.round(byShift.night.profit) }
    ];
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
      环线人数: d.loopStaff,
      复用人数: d.reusedStaff
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
  
  const revenueCostChartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.timeSlot,
      收入: Math.round(d.totalRevenue),
      成本: Math.round(d.totalCost),
      薪资: Math.round(d.totalSalary)
    }));
  }, [filteredData]);
  
  const radarChartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const avg = {
      unloadEff: 0, packageEff: 0, loopEff: 0,
      profit: 0, revenue: 0, efficiency: 0
    };
    filteredData.forEach(d => {
      avg.unloadEff += d.unloadEfficiency;
      avg.packageEff += d.packageEfficiency;
      avg.loopEff += d.loopEfficiency;
      avg.profit += d.totalProfit;
      avg.revenue += d.totalRevenue;
      avg.efficiency += (d.unloadEfficiency + d.packageEfficiency + d.loopEfficiency) / 3;
    });
    const len = filteredData.length;
    return [{
      subject: '卸车人效', A: Math.round(avg.unloadEff / len), fullMark: 1500,
    }, {
      subject: '集包人效', A: Math.round(avg.packageEff / len), fullMark: 1500,
    }, {
      subject: '环线人效', A: Math.round(avg.loopEff / len), fullMark: 1500,
    }, {
      subject: '利润', A: Math.round(avg.profit / len), fullMark: 5000,
    }, {
      subject: '收入', A: Math.round(avg.revenue / len), fullMark: 20000,
    }, {
      subject: '综合效率', A: Math.round(avg.efficiency / len), fullMark: 1500,
    }];
  }, [filteredData]);
  
  // Excel导出
  const exportToExcel = () => {
    const exportData = filteredData.map(d => ({
      '日期': d.date,
      '时段': d.timeSlot,
      '班次': d.shift,
      '频次': d.frequency,
      '卸车量': d.unloadCount,
      '集包量': d.packageCount,
      '环线量': d.loopCount,
      '卸车人数': d.unloadStaff,
      '集包人数': d.packageStaff,
      '环线人数': d.loopStaff,
      '复用人数': d.reusedStaff,
      '卸车人效': Math.round(d.unloadEfficiency),
      '集包人效': Math.round(d.packageEfficiency),
      '环线人效': Math.round(d.loopEfficiency),
      '卸车收入': d.unloadPrice.toFixed(2),
      '集包收入': d.packagePrice.toFixed(2),
      '环线收入': d.loopPrice.toFixed(2),
      '卸车薪资': d.unloadSalary.toFixed(2),
      '集包薪资': d.packageSalary.toFixed(2),
      '环线薪资': d.loopSalary.toFixed(2),
      '卸车盈亏': d.unloadProfit.toFixed(2),
      '集包盈亏': d.packageProfit.toFixed(2),
      '环线盈亏': d.loopProfit.toFixed(2),
      '其他成本': d.otherCost.toFixed(2),
      '总收入': d.totalRevenue.toFixed(2),
      '总成本': d.totalCost.toFixed(2),
      '总薪资': d.totalSalary.toFixed(2),
      '总盈亏': d.totalProfit.toFixed(2)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '绩效数据');
    XLSX.writeFile(wb, `绩效数据_${selectedDate}.xlsx`);
    setNotification({ type: 'success', message: '数据导出成功' });
  };
  
  // 清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // 初始加载演示数据
  useEffect(() => {
    generateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-emerald-500';
    if (value < 0) return 'text-red-500';
    return 'text-slate-500';
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                智能物流绩效分析系统
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                输入总人数，智能分配到各时段各环节，自动计算人效薪资盈亏
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={generateData} disabled={loading}>
                <Sparkles className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                智能生成
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredData.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                导出Excel
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 智能配置区域 */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" />
              智能人员配置
              <Badge variant="outline" className="ml-2">修改总人数自动分配</Badge>
            </CardTitle>
            <CardDescription>只需输入各班次总人数，系统自动智能分配到各时段各环节</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="text-sm font-medium">总人数 ({SHIFTS_CONFIG.white.staffRange[0]}-{SHIFTS_CONFIG.white.staffRange[1]}人)</label>
                      <Input
                        type="number"
                        value={dailyConfig.whiteShift.totalStaff}
                        onChange={(e) => updateStaffConfig('whiteShift', parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min={SHIFTS_CONFIG.white.staffRange[0]}
                        max={SHIFTS_CONFIG.white.staffRange[1]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>卸车:</span><span className="font-semibold">{dailyConfig.whiteShift.unloadStaff}人</span></div>
                      <div className="flex justify-between"><span>集包:</span><span className="font-semibold">{dailyConfig.whiteShift.packageStaff}人</span></div>
                      <div className="flex justify-between"><span>环线:</span><span className="font-semibold">{dailyConfig.whiteShift.loopStaff}人</span></div>
                      <div className="flex justify-between"><span>复用:</span><span className="font-semibold">{dailyConfig.whiteShift.reusedStaff}人</span></div>
                    </div>
                    <Progress value={(dailyConfig.whiteShift.totalStaff / 70) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              {/* 中班配置 */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    中班 (11:30-00:00)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">总人数 ({SHIFTS_CONFIG.middle.staffRange[0]}-{SHIFTS_CONFIG.middle.staffRange[1]}人)</label>
                      <Input
                        type="number"
                        value={dailyConfig.middleShift.totalStaff}
                        onChange={(e) => updateStaffConfig('middleShift', parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min={SHIFTS_CONFIG.middle.staffRange[0]}
                        max={SHIFTS_CONFIG.middle.staffRange[1]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>卸车:</span><span className="font-semibold">{dailyConfig.middleShift.unloadStaff}人</span></div>
                      <div className="flex justify-between"><span>集包:</span><span className="font-semibold">{dailyConfig.middleShift.packageStaff}人</span></div>
                      <div className="flex justify-between"><span>环线:</span><span className="font-semibold">{dailyConfig.middleShift.loopStaff}人</span></div>
                      <div className="flex justify-between"><span>复用:</span><span className="font-semibold">{dailyConfig.middleShift.reusedStaff}人</span></div>
                    </div>
                    <Progress value={(dailyConfig.middleShift.totalStaff / 10) * 100} className="h-2" />
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
                      <label className="text-sm font-medium">总人数 ({SHIFTS_CONFIG.night.staffRange[0]}-{SHIFTS_CONFIG.night.staffRange[1]}人)</label>
                      <Input
                        type="number"
                        value={dailyConfig.nightShift.totalStaff}
                        onChange={(e) => updateStaffConfig('nightShift', parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min={SHIFTS_CONFIG.night.staffRange[0]}
                        max={SHIFTS_CONFIG.night.staffRange[1]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>卸车:</span><span className="font-semibold">{dailyConfig.nightShift.unloadStaff}人</span></div>
                      <div className="flex justify-between"><span>集包:</span><span className="font-semibold">{dailyConfig.nightShift.packageStaff}人</span></div>
                      <div className="flex justify-between"><span>环线:</span><span className="font-semibold">{dailyConfig.nightShift.loopStaff}人</span></div>
                      <div className="flex justify-between"><span>复用:</span><span className="font-semibold">{dailyConfig.nightShift.reusedStaff}人</span></div>
                    </div>
                    <Progress value={(dailyConfig.nightShift.totalStaff / 100) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">选择日期:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={generateData} disabled={loading} className="bg-gradient-to-r from-blue-500 to-cyan-500">
                <Zap className="w-4 h-4 mr-2" />
                一键生成数据
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">卸车总量</p>
                  <p className="text-white text-xl font-bold">{stats.totalUnload.toLocaleString()}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs">集包总量</p>
                  <p className="text-white text-xl font-bold">{stats.totalPackage.toLocaleString()}</p>
                </div>
                <Package className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs">环线总量</p>
                  <p className="text-white text-xl font-bold">{stats.totalLoop.toLocaleString()}</p>
                </div>
                <RotateCw className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-xs">总人数</p>
                  <p className="text-white text-xl font-bold">{stats.totalStaff}</p>
                </div>
                <Users className="w-8 h-8 text-cyan-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-xs">平均人效</p>
                  <p className="text-white text-xl font-bold">{Math.round(stats.avgEfficiency)}</p>
                </div>
                <Target className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-xs">总收入</p>
                  <p className="text-white text-xl font-bold">¥{Math.round(stats.totalRevenue).toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-teal-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-xs">总薪资</p>
                  <p className="text-white text-xl font-bold">¥{Math.round(stats.totalSalary).toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-rose-200" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs">总盈亏</p>
                  <p className="text-white text-xl font-bold">¥{Math.round(stats.totalProfit).toLocaleString()}</p>
                </div>
                {stats.totalProfit >= 0 ? <TrendingUp className="w-8 h-8 text-green-200" /> : <TrendingDown className="w-8 h-8 text-red-200" />}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 图表区域 */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="trend">趋势</TabsTrigger>
            <TabsTrigger value="profit">盈亏</TabsTrigger>
            <TabsTrigger value="staff">人员</TabsTrigger>
            <TabsTrigger value="efficiency">人效</TabsTrigger>
          </TabsList>
          
          {/* 总览页 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 业务量占比 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="w-5 h-5 text-blue-500" />
                    业务量占比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                          {pieChartData.map((entry: { name: string; value: number; color: string }, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* 雷达图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-purple-500" />
                    综合效能分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
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
            
            {/* 班次对比 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-cyan-500" />
                  班次盈亏对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="成本" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="利润" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 趋势页 */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LineChartIcon className="w-5 h-5 text-emerald-500" />
                  业务量与盈亏趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="colorUnload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorPackage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorLoop" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} yAxisId="left" />
                      <YAxis tick={{ fontSize: 11 }} yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="卸车" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUnload)" />
                      <Area yAxisId="left" type="monotone" dataKey="集包" stroke="#10b981" fillOpacity={1} fill="url(#colorPackage)" />
                      <Area yAxisId="left" type="monotone" dataKey="环线" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLoop)" />
                      <Line yAxisId="right" type="monotone" dataKey="利润" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="薪资" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 盈亏页 */}
          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    收入与成本对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueCostChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="成本" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                    薪资分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueCostChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="薪资" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 盈亏明细表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5 text-blue-500" />
                  盈亏明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时段</TableHead>
                        <TableHead>卸车盈亏</TableHead>
                        <TableHead>集包盈亏</TableHead>
                        <TableHead>环线盈亏</TableHead>
                        <TableHead>其他成本</TableHead>
                        <TableHead className="text-right">总盈亏</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{d.timeSlot}</TableCell>
                          <TableCell className={getProfitColor(d.unloadProfit)}>¥{d.unloadProfit.toFixed(2)}</TableCell>
                          <TableCell className={getProfitColor(d.packageProfit)}>¥{d.packageProfit.toFixed(2)}</TableCell>
                          <TableCell className={getProfitColor(d.loopProfit)}>¥{d.loopProfit.toFixed(2)}</TableCell>
                          <TableCell className="text-red-500">-¥{d.otherCost.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${getProfitColor(d.totalProfit)}`}>¥{d.totalProfit.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 人员页 */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-violet-500" />
                  各时段人员配置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="卸车人数" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="集包人数" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="环线人数" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="复用人数" fill="#8b5cf6" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 人效页 */}
          <TabsContent value="efficiency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-teal-500" />
                  各时段人效对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={efficiencyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend />
                      <Line type="monotone" dataKey="卸车人效" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="集包人效" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="环线人效" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 数据明细表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                数据明细
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="全部班次" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    <SelectItem value="白班">白班</SelectItem>
                    <SelectItem value="中班">中班</SelectItem>
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
                    <TableHead className="w-[80px]">时段</TableHead>
                    <TableHead className="w-[60px]">班次</TableHead>
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
                    <TableHead className="text-right">盈亏</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.timeSlot}</TableCell>
                      <TableCell>
                        <Badge variant={d.shift === '白班' ? 'default' : d.shift === '中班' ? 'secondary' : 'outline'}>
                          {d.shift}
                        </Badge>
                      </TableCell>
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
                      <TableCell className={`text-right font-bold ${getProfitColor(d.totalProfit)}`}>
                        ¥{Math.round(d.totalProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* 页脚 */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-500">
          智能物流绩效分析系统 · 自动计算人效薪资盈亏
        </div>
      </footer>
    </div>
  );
}
