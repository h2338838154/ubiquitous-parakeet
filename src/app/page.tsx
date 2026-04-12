'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  Download, AlertCircle, CheckCircle, FileSpreadsheet, Calendar,
  FileUp, Trash2, Users, TrendingUp, DollarSign, Package, Truck, ArrowUp, ArrowDown,
  Cloud, CloudOff, RefreshCw, Save, Loader2
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  saveLogisticsData, loadLogisticsData, saveShiftConfig, loadShiftConfig, clearLogisticsData,
  type LogisticsData, type ShiftConfig 
} from '@/lib/supabase-client';

// ============ 类型定义 ============
interface UploadedData {
  date: string;
  timeSlot: string;
  shift: string;
  freq: string;
  unloadCount: number;
  loopCount: number;
  packageCount: number;
  manageCount: number;
  unloadStaff: number;
  packageStaff: number;
  loopStaff: number;
  fileStaff: number;
  inspectStaff: number;
  serviceStaff: number;
  receiveStaff: number;
}

interface CalculatedData extends UploadedData {
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

interface StaffConfig {
  white: number;
  night: number;
}

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  unload: '#3b82f6',
  package: '#10b981',
  loop: '#f59e0b'
};

// ============ 常量 ============
const PACKAGE_UNIT_PRICE = 0.06859;
const LOOP_UNIT_PRICE = 0.276355;

// ============ 示例数据（默认展示） ============
const EXAMPLE_DATA: UploadedData[] = [
  { date: '2026-04-01', timeSlot: '0000-0100', shift: '夜班', freq: '进口', unloadCount: 16991, loopCount: 1608, packageCount: 6568, manageCount: 2, unloadStaff: 18, packageStaff: 22, loopStaff: 28, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0100-0200', shift: '夜班', freq: '进口', unloadCount: 12453, loopCount: 1245, packageCount: 4321, manageCount: 2, unloadStaff: 15, packageStaff: 18, loopStaff: 24, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0200-0300', shift: '夜班', freq: '进口', unloadCount: 9876, loopCount: 987, packageCount: 3456, manageCount: 2, unloadStaff: 12, packageStaff: 15, loopStaff: 20, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0700-0800', shift: '白班', freq: '进口', unloadCount: 1064, loopCount: 1528, packageCount: 246, manageCount: 4, unloadStaff: 5, packageStaff: 3, loopStaff: 6, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0800-0900', shift: '白班', freq: '进口', unloadCount: 5592, loopCount: 3243, packageCount: 4179, manageCount: 4, unloadStaff: 8, packageStaff: 10, loopStaff: 12, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0900-1000', shift: '白班', freq: '进口', unloadCount: 4321, loopCount: 2567, packageCount: 3210, manageCount: 4, unloadStaff: 7, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1000-1100', shift: '白班', freq: '进口', unloadCount: 3654, loopCount: 1987, packageCount: 2876, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 9, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1100-1200', shift: '白班', freq: '进口', unloadCount: 2987, loopCount: 1654, packageCount: 2109, manageCount: 4, unloadStaff: 5, packageStaff: 6, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1200-1300', shift: '白班', freq: '进口', unloadCount: 3456, loopCount: 1876, packageCount: 2543, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1300-1400', shift: '白班', freq: '进口', unloadCount: 4123, loopCount: 2234, packageCount: 3098, manageCount: 4, unloadStaff: 7, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1400-1500', shift: '白班', freq: '进口', unloadCount: 3876, loopCount: 2098, packageCount: 2876, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 9, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1500-1600', shift: '白班', freq: '进口', unloadCount: 3543, loopCount: 1876, packageCount: 2654, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1800-1900', shift: '夜班', freq: '进口', unloadCount: 5432, loopCount: 2876, packageCount: 3987, manageCount: 2, unloadStaff: 8, packageStaff: 10, loopStaff: 12, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1900-2000', shift: '夜班', freq: '进口', unloadCount: 7654, loopCount: 3876, packageCount: 5432, manageCount: 2, unloadStaff: 10, packageStaff: 12, loopStaff: 15, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '2000-2100', shift: '夜班', freq: '进口', unloadCount: 9876, loopCount: 4654, packageCount: 6876, manageCount: 2, unloadStaff: 12, packageStaff: 15, loopStaff: 18, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '2100-2200', shift: '夜班', freq: '进口', unloadCount: 11234, loopCount: 5432, packageCount: 7890, manageCount: 2, unloadStaff: 14, packageStaff: 18, loopStaff: 22, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0000-0100', shift: '夜班', freq: '进口', unloadCount: 14567, loopCount: 1543, packageCount: 5987, manageCount: 2, unloadStaff: 16, packageStaff: 20, loopStaff: 25, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0800-0900', shift: '白班', freq: '进口', unloadCount: 6234, loopCount: 3543, packageCount: 4654, manageCount: 4, unloadStaff: 9, packageStaff: 11, loopStaff: 14, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0900-1000', shift: '白班', freq: '进口', unloadCount: 4876, loopCount: 2765, packageCount: 3543, manageCount: 4, unloadStaff: 7, packageStaff: 9, loopStaff: 11, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '1000-1100', shift: '白班', freq: '进口', unloadCount: 4123, loopCount: 2234, packageCount: 2987, manageCount: 4, unloadStaff: 6, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '1900-2000', shift: '夜班', freq: '进口', unloadCount: 8234, loopCount: 4123, packageCount: 5876, manageCount: 2, unloadStaff: 11, packageStaff: 13, loopStaff: 16, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '2000-2100', shift: '夜班', freq: '进口', unloadCount: 10654, loopCount: 5098, packageCount: 7432, manageCount: 2, unloadStaff: 13, packageStaff: 16, loopStaff: 20, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
];

// ============ 计算公式 ============
function calcManageSalary(manageCount: number): number {
  if (manageCount === 2) {
    return 21.79 + 16000 / 30 / 24;
  } else {
    return 25.75 + 12000 / 30 / 24 * 2 + 30000 / 30 / 24;
  }
}

function calcUnloadSalary(staffCount: number): number {
  return staffCount * 14.62 + 21;
}

function calcPackageSalary(staffCount: number): number {
  if (staffCount <= 13) {
    return staffCount * 18 + 21;
  }
  return (staffCount - 13) * 14.62 + 13 * 18 + 21;
}

function calcLoopSalary(staffCount: number): number {
  if (staffCount <= 13) {
    return staffCount * 18 + 42;
  }
  return (staffCount - 13) * 14.62 + 13 * 18 + 42;
}

function calcPackageRevenue(packageCount: number): number {
  return packageCount * PACKAGE_UNIT_PRICE;
}

function calcLoopRevenue(loopCount: number): number {
  return loopCount * LOOP_UNIT_PRICE;
}

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

// ============ 智能分配函数 ============
let currentTimeSlot = '0800-0900';

function smartAllocate(
  totalStaff: number,
  unloadCount: number,
  packageCount: number,
  loopCount: number,
  isWhite: boolean
): { unload: number; package: number; loop: number; file: number; inspect: number; service: number; receive: number } {
  const total = unloadCount + packageCount + loopCount;
  const file = isWhite ? 0 : 4;
  const inspect = isWhite ? 2 : 3;
  const service = isWhite ? 2 : 0;
  const receive = 1;
  const fixedStaff = file + inspect + service + receive;
  const allocatable = Math.max(1, totalStaff - fixedStaff);
  
  if (total === 0) {
    return {
      unload: Math.round(allocatable * 0.25),
      package: Math.round(allocatable * 0.35),
      loop: Math.round(allocatable * 0.40),
      file, inspect, service, receive
    };
  }
  
  let unloadRatio = unloadCount / total;
  let packageRatio = packageCount / total;
  let loopRatio = loopCount / total;
  
  const hour = parseInt(currentTimeSlot.split('-')[0]);
  const isPeak = hour >= 8 && hour <= 14;
  if (isPeak) {
    unloadRatio *= 1.2;
    packageRatio *= 1.2;
    loopRatio *= 1.2;
  }
  
  const sum = unloadRatio + packageRatio + loopRatio;
  unloadRatio /= sum;
  packageRatio /= sum;
  loopRatio /= sum;
  
  let unload = Math.round(allocatable * unloadRatio);
  let package_ = Math.round(allocatable * packageRatio);
  let loop = Math.round(allocatable * loopRatio);
  
  if (isWhite && loop > 0 && unload > 0) {
    const reuse = Math.min(Math.floor(unload * 0.15), Math.floor(loop * 0.25));
    loop += reuse;
    unload -= reuse;
  }
  
  const current = unload + package_ + loop;
  const diff = allocatable - current;
  if (diff !== 0) package_ += diff;
  
  return {
    unload: Math.max(1, unload),
    package: Math.max(1, package_),
    loop: Math.max(1, loop),
    file, inspect, service, receive
  };
}

// ============ 日期解析 ============
function parseDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  if (typeof value === 'string') {
    const chineseMatch = value.match(/(\d+)月(\d+)日/);
    if (chineseMatch) {
      const month = chineseMatch[1].padStart(2, '0');
      const day = chineseMatch[2].padStart(2, '0');
      return `2026-${month}-${day}`;
    }
    const formats = ['yyyy/MM/dd', 'yyyy-M-d', 'MM/dd/yyyy', 'yyyy.MM.dd'];
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
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [staffConfig, setStaffConfig] = useState<StaffConfig>({ white: 70, night: 95 });
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCloudData, setHasCloudData] = useState(false);
  
  // 检查云端连接
  useEffect(() => {
    const checkCloudConnection = async () => {
      try {
        const { data: configData } = await loadShiftConfig();
        setIsCloudConnected(true);
        setHasCloudData(configData.length > 0);
      } catch {
        setIsCloudConnected(false);
      }
    };
    checkCloudConnection();
  }, []);
  
  // 从云端加载数据
  const loadFromCloud = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await loadLogisticsData();
      if (error) {
        setNotification({ type: 'error', message: `加载失败: ${error}` });
        return;
      }
      
      if (data && data.length > 0) {
        const parsed: UploadedData[] = data.map(row => ({
          date: row.date,
          timeSlot: row.time_slot,
          shift: row.shift_type,
          freq: row.frequency,
          unloadCount: row.unload_count,
          loopCount: row.loop_count,
          packageCount: row.package_count,
          manageCount: row.shift_type === '夜班' ? 2 : 4,
          unloadStaff: 0, packageStaff: 0, loopStaff: 0,
          fileStaff: 0, inspectStaff: 0, serviceStaff: 0, receiveStaff: 0
        }));
        setUploadedData(parsed);
        setHasCloudData(true);
        setNotification({ type: 'success', message: `成功加载 ${parsed.length} 条云端数据` });
      } else {
        setNotification({ type: 'success', message: '云端暂无数据' });
      }
    } catch {
      setNotification({ type: 'error', message: '加载失败' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存到云端
  const saveToCloud = async () => {
    if (calculatedData.length === 0) {
      setNotification({ type: 'error', message: '暂无数据可保存' });
      return;
    }
    
    setIsSaving(true);
    try {
      // 保存业务数据
      const logisticsRecords: Partial<LogisticsData>[] = calculatedData.map(d => ({
        date: d.date,
        time_slot: d.timeSlot,
        shift_type: d.shift,
        frequency: d.freq,
        unload_count: d.unloadCount,
        unload_price: PACKAGE_UNIT_PRICE.toString(),
        unload_profit: d.unloadProfit.toString(),
        unload_loss: Math.max(0, -d.unloadProfit).toString(),
        package_count: d.packageCount,
        package_price: PACKAGE_UNIT_PRICE.toString(),
        package_profit: d.packageProfit.toString(),
        package_loss: Math.max(0, -d.packageProfit).toString(),
        loop_count: d.loopCount,
        loop_price: LOOP_UNIT_PRICE.toString(),
        loop_profit: d.loopProfit.toString(),
        loop_loss: Math.max(0, -d.loopProfit).toString(),
        other_cost: d.otherCost.toString(),
        sender_count: 0,
        person_count: d.unloadStaff + d.packageStaff + d.loopStaff,
        receiver_count: d.receiveStaff,
        total_profit: d.totalProfit.toString()
      }));
      
      const saveResult = await saveLogisticsData(logisticsRecords);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      // 保存班次配置
      const dates = [...new Set(calculatedData.map(d => d.date))];
      for (const date of dates) {
        const dayData = calculatedData.filter(d => d.date === date);
        const hasWhite = dayData.some(d => d.shift === '白班');
        const hasNight = dayData.some(d => d.shift === '夜班');
        
        if (hasWhite) {
          const whiteData = dayData.filter(d => d.shift === '白班');
          const whiteConfig: ShiftConfig = {
            date,
            shift_type: '白班',
            unload_count: whiteData.reduce((s, d) => s + d.unloadStaff, 0),
            package_count: whiteData.reduce((s, d) => s + d.packageStaff, 0),
            loop_count: whiteData.reduce((s, d) => s + d.loopStaff, 0),
            sender_count: whiteData.reduce((s, d) => s + d.fileStaff, 0),
            receiver_count: whiteData.reduce((s, d) => s + d.receiveStaff, 0)
          };
          await saveShiftConfig(whiteConfig);
        }
        
        if (hasNight) {
          const nightData = dayData.filter(d => d.shift === '夜班');
          const nightConfig: ShiftConfig = {
            date,
            shift_type: '夜班',
            unload_count: nightData.reduce((s, d) => s + d.unloadStaff, 0),
            package_count: nightData.reduce((s, d) => s + d.packageStaff, 0),
            loop_count: nightData.reduce((s, d) => s + d.loopStaff, 0),
            sender_count: nightData.reduce((s, d) => s + d.fileStaff, 0),
            receiver_count: nightData.reduce((s, d) => s + d.receiveStaff, 0)
          };
          await saveShiftConfig(nightConfig);
        }
      }
      
      // 更新班次人数配置
      const latestDate = dates.sort()[dates.length - 1];
      await saveShiftConfig({
        date: latestDate,
        shift_type: '配置',
        unload_count: staffConfig.white,
        package_count: staffConfig.night,
        loop_count: 0,
        sender_count: 0,
        receiver_count: 0
      });
      
      setHasCloudData(true);
      setNotification({ type: 'success', message: '数据已保存到云端' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 加载示例数据
  const loadExampleData = () => {
    setUploadedData(EXAMPLE_DATA);
    setSelectedDate('all');
    setNotification({ type: 'success', message: `已加载示例数据 ${EXAMPLE_DATA.length} 条` });
  };
  
  // 计算数据
  useEffect(() => {
    if (uploadedData.length > 0) {
      const calculated = uploadedData.map(row => {
        currentTimeSlot = row.timeSlot;
        const isWhite = row.shift === '白班';
        const totalStaff = isWhite ? staffConfig.white : staffConfig.night;
        const allocation = smartAllocate(totalStaff, row.unloadCount, row.packageCount, row.loopCount, isWhite);
        
        const manageSalary = calcManageSalary(row.manageCount);
        const unloadSalary = calcUnloadSalary(allocation.unload);
        const unloadProfit = 0 - unloadSalary;
        const packageRevenue = calcPackageRevenue(row.packageCount);
        const packageSalary = calcPackageSalary(allocation.package);
        const packageProfit = packageRevenue - packageSalary;
        const loopRevenue = calcLoopRevenue(row.loopCount);
        const loopSalary = calcLoopSalary(allocation.loop);
        const loopProfit = loopRevenue - loopSalary;
        const otherCost = calcOtherCost(allocation.file, allocation.inspect, allocation.service, allocation.receive);
        const totalProfit = unloadProfit + packageProfit + loopProfit - manageSalary - otherCost;
        
        return {
          ...row,
          unloadStaff: allocation.unload, packageStaff: allocation.package, loopStaff: allocation.loop,
          fileStaff: allocation.file, inspectStaff: allocation.inspect, serviceStaff: allocation.service, receiveStaff: allocation.receive,
          manageSalary, unloadSalary, unloadProfit, packageRevenue, packageSalary, packageProfit,
          loopRevenue, loopSalary, loopProfit, otherCost, totalProfit
        };
      });
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
  
  const availableDates = useMemo(() => [...new Set(uploadedData.map(d => d.date))].sort(), [uploadedData]);
  
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
    { name: '卸车', value: stats.totalUnload, color: COLORS.unload },
    { name: '集包', value: stats.totalPackage, color: COLORS.package },
    { name: '环线', value: stats.totalLoop, color: COLORS.loop }
  ], [stats]);
  
  const profitTrendData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot, date: d.date,
    利润: Math.round(d.totalProfit),
    收入: Math.round(d.packageRevenue + d.loopRevenue),
    薪资: Math.round(d.unloadSalary + d.packageSalary + d.loopSalary)
  })), [filteredData]);
  
  const hourlyProfitData = useMemo(() => {
    const map = new Map<string, number>();
    calculatedData.forEach(d => {
      const hour = d.timeSlot.split('-')[0];
      map.set(hour, (map.get(hour) || 0) + d.totalProfit);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, profit]) => ({ hour: `${hour}-${String(parseInt(hour) + 1).padStart(4, '0')}`, 利润: Math.round(profit) }));
  }, [calculatedData]);
  
  const revenueDetailData = useMemo(() => filteredData.map(d => ({
    name: d.timeSlot,
    集包收入: Math.round(d.packageRevenue),
    环线收入: Math.round(d.loopRevenue),
    卸车成本: Math.round(d.unloadSalary),
    管理成本: Math.round(d.manageSalary),
    其他成本: Math.round(d.otherCost)
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
        if (json.length === 0) { setNotification({ type: 'error', message: '文件为空' }); return; }
        
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
        const unloadCountCol = findCol(['卸车量']);
        const loopCountCol = findCol(['环线量']);
        const packageCountCol = findCol(['集包量']);
        
        if (!dateCol || !timeCol) { setNotification({ type: 'error', message: '必须包含"日期"和"时段"列' }); return; }
        
        const parsed: UploadedData[] = json.map(row => {
          const timeSlot = String(row[timeCol!] || '').trim();
          const hour = parseInt(timeSlot.split('-')[0]);
          const shift = hour >= 7 && hour < 18 ? '白班' : '夜班';
          return {
            date: parseDate(row[dateCol!]), timeSlot, shift, freq: '',
            unloadCount: Number(row[unloadCountCol!] || 0),
            loopCount: Number(row[loopCountCol!] || 0),
            packageCount: Number(row[packageCountCol!] || 0),
            manageCount: shift === '夜班' ? 2 : 4,
            unloadStaff: 0, packageStaff: 0, loopStaff: 0,
            fileStaff: 0, inspectStaff: 0, serviceStaff: 0, receiveStaff: 0
          };
        }).filter(d => d.date && d.timeSlot);
        
        if (parsed.length === 0) { setNotification({ type: 'error', message: '未找到有效数据' }); return; }
        
        setUploadedData(parsed);
        setSelectedDate('all');
        setNotification({ type: 'success', message: `成功导入 ${parsed.length} 条数据` });
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
      { '日期': '4月1日', '时段': '0000-0100', '卸车量': 16991, '集包量': 6568, '环线量': 1608 },
      { '日期': '4月1日', '时段': '0700-0800', '卸车量': 1064, '集包量': 246, '环线量': 1528 },
      { '日期': '4月1日', '时段': '0800-0900', '卸车量': 5592, '集包量': 4179, '环线量': 3243 },
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
  
  const clearData = () => {
    setUploadedData([]); setCalculatedData([]); setSelectedDate('all'); setSelectedShift('all');
    setHasCloudData(false);
    setNotification({ type: 'success', message: '数据已清除' });
  };
  
  const clearCloudData = async () => {
    if (!confirm('确定要清除云端数据吗？')) return;
    const result = await clearLogisticsData();
    if (result.success) {
      setHasCloudData(false);
      setUploadedData([]);
      setCalculatedData([]);
      setNotification({ type: 'success', message: '云端数据已清除' });
    } else {
      setNotification({ type: 'error', message: '清除失败' });
    }
  };
  
  useEffect(() => {
    if (notification) { const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t); }
  }, [notification]);
  
  const getColor = (v: number) => v >= 0 ? 'text-emerald-600' : 'text-red-600';
  const getBgColor = (v: number) => v >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl ${notification.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-red-500 to-rose-500'} text-white`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
      
      {/* 头部 */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl sticky top-0 z-40">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">物流绩效分析系统</h1>
                <p className="text-slate-400 text-sm mt-0.5">智能排班 · 数据驱动 · 精准分析</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* 云端状态指示 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                {isCloudConnected ? (
                  <Cloud className="w-5 h-5 text-emerald-400" />
                ) : (
                  <CloudOff className="w-5 h-5 text-slate-400" />
                )}
                <span className="text-sm">{isCloudConnected ? '已连接' : '离线'}</span>
              </div>
              
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={loadExampleData}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />示例数据
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={loadFromCloud} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                云端加载
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={saveToCloud} disabled={isSaving || calculatedData.length === 0}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                保存云端
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />模板下载
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={exportData} disabled={calculatedData.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />导出报表
              </Button>
              <Button variant="destructive" className="bg-red-500/80 hover:bg-red-500" onClick={clearData} disabled={uploadedData.length === 0 && !hasCloudData}>
                <Trash2 className="w-4 h-4 mr-2" />清空数据
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 上传区域 */}
        <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <label className="cursor-pointer group">
                <div className="flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
                  <FileUp className="w-8 h-8" />
                  <div className="text-left">
                    <span className="text-lg font-bold block">{uploading ? '数据导入中...' : '上传业务数据'}</span>
                    <span className="text-blue-200 text-sm">支持 .xlsx .xls 格式</span>
                  </div>
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
              </label>
              <div className="text-slate-600 space-y-1 text-center md:text-left">
                <p className="font-semibold text-lg">Excel表头要求</p>
                <p className="text-sm">日期 | 时段 | 卸车量 | 集包量 | 环线量</p>
                <p className="text-xs text-slate-500">系统将根据业务量自动分配各环节人数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 班次人数配置 */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              班次人数配置
              <Badge className="ml-auto bg-white/20 text-white">智能分配</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">白</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">白班 (07:00-18:00)</p>
                  <p className="text-sm text-slate-500">日出时段</p>
                </div>
                <Input
                  type="number"
                  value={staffConfig.white}
                  onChange={e => setStaffConfig(s => ({ ...s, white: Number(e.target.value) || 0 }))}
                  className="w-24 text-center font-bold text-lg bg-white"
                />
                <span className="text-slate-500">人</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">夜</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">夜班 (18:00-07:00)</p>
                  <p className="text-sm text-slate-500">夜间时段</p>
                </div>
                <Input
                  type="number"
                  value={staffConfig.night}
                  onChange={e => setStaffConfig(s => ({ ...s, night: Number(e.target.value) || 0 }))}
                  className="w-24 text-center font-bold text-lg bg-white"
                />
                <span className="text-slate-500">人</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 统计卡片 */}
        {uploadedData.length > 0 && (
          <div className="space-y-4">
            {hasCloudData && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                <Cloud className="w-4 h-4" />
                <span>数据已保存到云端</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-blue-100 text-sm">卸车总量</p>
                      <p className="text-2xl font-bold">{stats.totalUnload.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-emerald-100 text-sm">集包总量</p>
                      <p className="text-2xl font-bold">{stats.totalPackage.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-amber-100 text-sm">环线总量</p>
                      <p className="text-2xl font-bold">{stats.totalLoop.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-teal-100 text-sm">总收入</p>
                      <p className="text-2xl font-bold">¥{Math.round(stats.totalRevenue).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-rose-100 text-sm">总薪资</p>
                      <p className="text-2xl font-bold">¥{Math.round(stats.totalSalary).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`shadow-lg ${stats.totalProfit >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-br from-red-500 to-rose-500 text-white'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {stats.totalProfit >= 0 ? <ArrowUp className="w-8 h-8 opacity-80" /> : <ArrowDown className="w-8 h-8 opacity-80" />}
                    <div>
                      <p className="text-white/80 text-sm">总利润</p>
                      <p className="text-2xl font-bold">¥{Math.round(stats.totalProfit).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* 按天汇总 */}
        {uploadedData.length > 0 && (
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                每日汇总
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dailyStats.map(d => (
                  <div key={d.date} className={`p-5 rounded-xl border-2 ${getBgColor(d.profit)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg text-slate-700">{d.date}</span>
                      <Badge className={d.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}>
                        {d.profit >= 0 ? '盈利' : '亏损'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">总收入</span>
                        <span className="font-semibold text-teal-600">¥{Math.round(d.revenue).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">总薪资</span>
                        <span className="font-semibold text-rose-600">¥{Math.round(d.salary).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-semibold text-slate-700">利润</span>
                        <span className={`font-bold text-lg ${getColor(d.profit)}`}>¥{Math.round(d.profit).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 筛选 */}
        {uploadedData.length > 0 && (
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-slate-600">数据筛选</span>
                </div>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="选择日期" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部日期</SelectItem>
                    {availableDates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="选择班次" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班次</SelectItem>
                    <SelectItem value="白班">白班</SelectItem>
                    <SelectItem value="夜班">夜班</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-sm px-3 py-1">{filteredData.length} 条记录</Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 图表区域 - 两列布局 */}
        {uploadedData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左列 */}
            <div className="space-y-6">
              {/* 业务量占比 */}
              <Card className="bg-white shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    业务量占比分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px]">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => v.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* 成本明细 */}
              <Card className="bg-white shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-rose-600 to-rose-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    成本结构分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px]">
                    <ResponsiveContainer>
                      <BarChart data={revenueDetailData.slice(0, 12)} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `¥${v}`} />
                        <Legend />
                        <Bar dataKey="卸车成本" fill={COLORS.unload} stackId="a" />
                        <Bar dataKey="管理成本" fill={COLORS.purple} stackId="a" />
                        <Bar dataKey="其他成本" fill={COLORS.danger} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 右列 */}
            <div className="space-y-6">
              {/* 利润趋势 */}
              <Card className="bg-white shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    利润趋势分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px]">
                    <ResponsiveContainer>
                      <AreaChart data={profitTrendData}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `¥${v}`} />
                        <Legend />
                        <Area type="monotone" dataKey="利润" stroke={COLORS.success} fill="url(#colorProfit)" strokeWidth={2} />
                        <Area type="monotone" dataKey="收入" stroke={COLORS.primary} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* 各时段利润对比 */}
              <Card className="bg-white shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    各时段利润对比
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px]">
                    <ResponsiveContainer>
                      <BarChart data={hourlyProfitData} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `¥${v}`} />
                        <Bar dataKey="利润" fill={COLORS.success}>
                          {hourlyProfitData.map((entry, i) => (
                            <Cell key={i} fill={entry.利润 >= 0 ? COLORS.success : COLORS.danger} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* 收入明细图表 */}
        {uploadedData.length > 0 && (
          <Card className="bg-white shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                收入明细趋势
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px]">
                <ResponsiveContainer>
                  <LineChart data={revenueDetailData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `¥${v}`} />
                    <Legend />
                    <Line type="monotone" dataKey="集包收入" stroke={COLORS.package} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="环线收入" stroke={COLORS.loop} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 数据表格 */}
        {uploadedData.length > 0 && (
          <Card className="bg-white shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6" />
                  完整数据明细
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-emerald-500/20 px-3 py-1 rounded-full">总收入 ¥{Math.round(stats.totalRevenue).toLocaleString()}</span>
                  <span className="bg-rose-500/20 px-3 py-1 rounded-full">总薪资 ¥{Math.round(stats.totalSalary).toLocaleString()}</span>
                  <span className={`px-3 py-1 rounded-full ${stats.totalProfit >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>利润 ¥{Math.round(stats.totalProfit).toLocaleString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-100 z-10">
                    <TableRow>
                      <TableHead className="font-bold">时段</TableHead>
                      <TableHead className="font-bold">班次</TableHead>
                      <TableHead className="text-right font-bold">卸车量</TableHead>
                      <TableHead className="text-right font-bold">卸车人</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">卸车薪</TableHead>
                      <TableHead className="text-right font-bold">集包量</TableHead>
                      <TableHead className="text-right font-bold">集包人</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">集包收</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">集包薪</TableHead>
                      <TableHead className="text-right font-bold">集包盈</TableHead>
                      <TableHead className="text-right font-bold">环线量</TableHead>
                      <TableHead className="text-right font-bold">环线人</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">环线收</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">环线薪</TableHead>
                      <TableHead className="text-right font-bold">环线盈</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">管理薪</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">其他</TableHead>
                      <TableHead className="text-right font-bold">利润</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={18} className="text-center py-12 text-slate-400">暂无数据</TableCell></TableRow>
                    ) : filteredData.map((d, i) => (
                      <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <TableCell className="font-medium">{d.timeSlot}</TableCell>
                        <TableCell><Badge className={d.shift === '白班' ? 'bg-amber-500' : 'bg-slate-600'}>{d.shift}</Badge></TableCell>
                        <TableCell className="text-right">{d.unloadCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.unloadStaff}</TableCell>
                        <TableCell className="text-right text-rose-600">¥{d.unloadSalary.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{d.packageCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.packageStaff}</TableCell>
                        <TableCell className="text-right text-emerald-600">¥{d.packageRevenue.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-rose-600">¥{d.packageSalary.toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-medium ${getColor(d.packageProfit)}`}>¥{d.packageProfit.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{d.loopCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{d.loopStaff}</TableCell>
                        <TableCell className="text-right text-emerald-600">¥{d.loopRevenue.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-rose-600">¥{d.loopSalary.toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-medium ${getColor(d.loopProfit)}`}>¥{d.loopProfit.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-rose-600">¥{d.manageSalary.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-rose-600">¥{d.otherCost.toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-bold text-lg ${getColor(d.totalProfit)}`}>¥{d.totalProfit.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      <footer className="bg-slate-900 text-slate-400 mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <span className="font-semibold text-white">物流绩效分析系统</span>
            </div>
            <p className="text-sm text-slate-500">智能排班自动盈亏计算 · 数据驱动决策</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
