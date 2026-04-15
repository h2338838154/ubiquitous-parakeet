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
  Cloud, CloudOff, RefreshCw, Save, Loader2, Menu, X, BarChart3, Sun, Moon, Sliders
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  saveLogisticsData, loadLogisticsData,
  loadShiftConfigCloud, saveAllShiftConfigsCloud, saveShiftConfigLocal,
  clearLogisticsData, clearShiftConfigs, clearAllCloudData,
  type LogisticsDataRow, dateToExcelSerial, excelSerialToDate
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
  middle: number;
  night: number;
}

type DailyStaffConfig = Record<string, StaffConfig>;

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  unload: '#3b82f6',
  package: '#10b981',
  loop: '#f59e0b',
  packageCost: '#ec4899',
  loopCost: '#f97316'
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
  isWhite: boolean,
  isMiddle: boolean = false
): { unload: number; package: number; loop: number; file: number; inspect: number; service: number; receive: number } {
  const total = unloadCount + packageCount + loopCount;
  const file = isWhite ? 0 : isMiddle ? 2 : 4;
  const inspect = isWhite ? 2 : isMiddle ? 2 : 3;
  const service = isWhite ? 2 : isMiddle ? 1 : 0;
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
  const [staffConfig, setStaffConfig] = useState<DailyStaffConfig>({});
  const [configDate, setConfigDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCloudData, setHasCloudData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'daily' | 'charts'>('config');
  
  // 检查云端连接并自动加载数据
  useEffect(() => {
    const checkCloudAndLoad = async () => {
      try {
        const { data, error } = await loadLogisticsData();
        if (error) {
          setIsCloudConnected(false);
        } else {
          setIsCloudConnected(true);
          
          // 无论是否有业务数据，都尝试加载班次配置
          const cloudConfig = await loadShiftConfigCloud();
          const savedStaffConfig = cloudConfig.data || {};
          console.log('[checkCloudAndLoad] 云端班次配置:', savedStaffConfig);
          
          if (data && data.length > 0) {
            // 解析日期（可能是Excel序列号或字符串）
            const parseDateValue = (val: unknown): string => {
              if (typeof val === 'number') {
                return excelSerialToDate(val);
              } else if (typeof val === 'string') {
                const num = parseInt(val, 10);
                if (!isNaN(num) && val.match(/^\d+$/)) {
                  return excelSerialToDate(num);
                }
                return val;
              }
              return String(val);
            };
            
            const parsed: UploadedData[] = data.map((row: LogisticsDataRow) => ({
              date: parseDateValue(row['日期']),
              timeSlot: row['时段'],
              shift: row['班次'] || '白班',
              freq: row['频次'] || '',
              unloadCount: row['卸车量'] || 0,
              loopCount: row['环线量'] || 0,
              packageCount: row['集包量'] || 0,
              manageCount: row['管理'] || 4,
              unloadStaff: row['卸车人数'] || 0,
              packageStaff: row['集包人数'] || 0,
              loopStaff: row['环线人数'] || 0,
              fileStaff: row['文件人数'] || 0,
              inspectStaff: row['发验人数'] || 0,
              serviceStaff: row['客服人数'] || 0,
              receiveStaff: 0
            }));
            setUploadedData(parsed);
            setHasCloudData(true);
            setSelectedDate('all');
            
            // 为每个日期创建班次配置，优先使用云端配置
            const dates = [...new Set(parsed.map(d => d.date))].sort();
            dates.forEach(date => {
              if (!savedStaffConfig[date]) {
                savedStaffConfig[date] = { white: 70, middle: 0, night: 95 };
              }
            });
            
            setStaffConfig(savedStaffConfig);
            console.log('[checkCloudAndLoad] 设置 staffConfig:', savedStaffConfig);
            
            // 设置配置日期为第一个有数据的日期
            if (dates.length > 0) {
              setConfigDate(dates[0]);
            }
          } else {
            setHasCloudData(false);
            // 即使没有业务数据，也设置已加载的班次配置
            if (Object.keys(savedStaffConfig).length > 0) {
              setStaffConfig(savedStaffConfig);
            }
          }
        }
      } catch {
        setIsCloudConnected(false);
        setHasCloudData(false);
      }
    };
    checkCloudAndLoad();
  }, []);
  
  // 从云端加载数据
  const loadFromCloud = async () => {
    if (!isCloudConnected) {
      setNotification({ type: 'error', message: '云端连接不可用，请检查配置' });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await loadLogisticsData();
      if (error) {
        setNotification({ type: 'error', message: `加载失败: ${error}` });
        return;
      }
      
      if (data && data.length > 0) {
        // 适配中文列名，日期可能是数字(Excel序列号)或字符串
        const parsed: UploadedData[] = data.map((row: LogisticsDataRow) => {
          const rawDate = row['日期'];
          let dateStr: string;
          if (typeof rawDate === 'number') {
            dateStr = excelSerialToDate(rawDate);
          } else if (typeof rawDate === 'string') {
            // 可能是纯数字字符串
            const num = parseInt(rawDate, 10);
            if (!isNaN(num) && rawDate.match(/^\d+$/)) {
              dateStr = excelSerialToDate(num);
            } else {
              dateStr = rawDate;
            }
          } else {
            dateStr = String(rawDate);
          }
          return {
            date: dateStr,
            timeSlot: row['时段'],
            shift: row['班次'] || '白班',
            freq: row['频次'] || '',
            unloadCount: row['卸车量'] || 0,
            loopCount: row['环线量'] || 0,
            packageCount: row['集包量'] || 0,
            manageCount: row['管理'] || 4,
            unloadStaff: row['卸车人数'] || 0,
            packageStaff: row['集包人数'] || 0,
            loopStaff: row['环线人数'] || 0,
            fileStaff: row['文件人数'] || 0,
            inspectStaff: row['发验人数'] || 0,
            serviceStaff: row['客服人数'] || 0,
            receiveStaff: 0
          };
        });
        setUploadedData(parsed);
        setHasCloudData(true);
        setNotification({ type: 'success', message: `成功加载 ${parsed.length} 条云端数据` });
        
        // 为每个日期创建班次配置，优先使用云端配置
        const dates = [...new Set(parsed.map(d => d.date))];
        const defaultConfig: DailyStaffConfig = {};
        
        // 先尝试从云端加载班次配置
        const cloudConfig = await loadShiftConfigCloud();
        console.log('[loadFromCloud] 云端班次配置:', cloudConfig.data);
        if (cloudConfig.data) {
          Object.entries(cloudConfig.data).forEach(([date, config]) => {
            defaultConfig[date] = config;
          });
        }
        
        // 为没有云端配置的日期填充默认值
        dates.forEach(date => {
          if (!defaultConfig[date]) {
            defaultConfig[date] = { white: 70, middle: 0, night: 95 };
          }
        });
        
        console.log('[loadFromCloud] 最终 staffConfig:', defaultConfig);
        setStaffConfig(defaultConfig);
        
        // 设置配置日期为第一个有数据的日期
        if (dates.length > 0) {
          setConfigDate(dates.sort()[0]);
        }
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
    
    if (!isCloudConnected) {
      setNotification({ type: 'error', message: '云端连接不可用，请检查配置' });
      return;
    }
    
    setIsSaving(true);
    try {
      // 保存业务数据（使用中文列名适配现有表结构）
      // 日期需要转换为Excel序列号格式
      const logisticsRecords = calculatedData.map(d => ({
        sync_id: `${d.date}_${d.timeSlot}`,
        '日期': dateToExcelSerial(d.date),
        '时段': d.timeSlot,
        '班次': d.shift,
        '频次': d.freq,
        '卸车量': d.unloadCount,
        '环线量': d.loopCount,
        '集包量': d.packageCount,
        '管理': d.manageCount,
        '管理薪资': Math.round(d.manageSalary * 100) / 100,
        '卸车人数': d.unloadStaff,
        '卸车薪资': Math.round(d.unloadSalary * 100) / 100,
        '卸车盈亏': Math.round(d.unloadProfit * 100) / 100,
        '集包人数': d.packageStaff,
        '集包单价': PACKAGE_UNIT_PRICE,
        '集包收入': Math.round(d.packageRevenue * 100) / 100,
        '集包薪资': Math.round(d.packageSalary * 100) / 100,
        '集包盈亏': Math.round(d.packageProfit * 100) / 100,
        '环线人数': d.loopStaff,
        '环线单价': LOOP_UNIT_PRICE,
        '环线收入': Math.round(d.loopRevenue * 100) / 100,
        '环线薪资': Math.round(d.loopSalary * 100) / 100,
        '环线盈亏': Math.round(d.loopProfit * 100) / 100,
        '文件人数': d.fileStaff,
        '发验人数': d.inspectStaff,
        '客服人数': d.serviceStaff,
        '其他成本': Math.round(d.otherCost * 100) / 100,
        '总盈亏': Math.round(d.totalProfit * 100) / 100,
        '总表人数': d.unloadStaff + d.packageStaff + d.loopStaff + d.manageCount + d.fileStaff + d.inspectStaff + d.serviceStaff + d.receiveStaff
      }));
      
      // 先清除云端旧数据，再保存新数据（确保数据一致）
      await clearLogisticsData();
      
      const saveResult = await saveLogisticsData(logisticsRecords);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      // 保存班次配置到 localStorage (按日期存储)
      saveShiftConfigLocal(staffConfig);
      
      // 同时保存班次配置到云端
      const cloudConfigResult = await saveAllShiftConfigsCloud(staffConfig);
      if (!cloudConfigResult.success) {
        console.warn('班次配置保存到云端失败:', cloudConfigResult.error);
      }
      
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
    
    // 为每个日期创建默认班次配置
    const dates = [...new Set(EXAMPLE_DATA.map(d => d.date))];
    const defaultConfig: DailyStaffConfig = {};
    dates.forEach(date => {
      defaultConfig[date] = { white: 70, middle: 0, night: 95 };
    });
    setStaffConfig(defaultConfig);
    
    // 设置配置日期为第一个有数据的日期
    if (dates.length > 0) {
      setConfigDate(dates.sort()[0]);
    }
    
    setNotification({ type: 'success', message: `已加载示例数据 ${EXAMPLE_DATA.length} 条` });
  };
  
  // 计算数据
  useEffect(() => {
    if (uploadedData.length > 0) {
      const calculated = uploadedData.map(row => {
        currentTimeSlot = row.timeSlot;
        const isWhite = row.shift === '白班';
        const isMiddle = row.shift === '中班';
        
        // 获取该日期的班次配置，如果没有则使用默认值
        const dateConfig = staffConfig[row.date] || { white: 70, middle: 0, night: 95 };
        const totalStaff = isWhite ? dateConfig.white : isMiddle ? dateConfig.middle : dateConfig.night;
        const allocation = smartAllocate(totalStaff, row.unloadCount, row.packageCount, row.loopCount, isWhite, isMiddle);
        
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
  
  // 切换日期时自动从云端加载班次配置
  useEffect(() => {
    const loadConfigForDate = async () => {
      if (!configDate || !isCloudConnected) return;
      
      try {
        const cloudConfig = await loadShiftConfigCloud();
        if (cloudConfig.data && cloudConfig.data[configDate]) {
          // 从云端加载该日期的配置
          setStaffConfig(prev => ({
            ...prev,
            [configDate]: cloudConfig.data![configDate]
          }));
        }
      } catch (err) {
        console.warn('加载日期配置失败:', err);
      }
    };
    
    loadConfigForDate();
  }, [configDate, isCloudConnected]);
  
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
    集包成本: Math.round(d.packageSalary),
    环线成本: Math.round(d.loopSalary),
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
        const shiftCol = findCol(['班次', 'shift']);
        const unloadCountCol = findCol(['卸车量']);
        const loopCountCol = findCol(['环线量']);
        const packageCountCol = findCol(['集包量']);
        
        if (!dateCol || !timeCol) { setNotification({ type: 'error', message: '必须包含"日期"和"时段"列' }); return; }
        
        const parsed: UploadedData[] = json.map(row => {
          const timeSlot = String(row[timeCol!] || '').trim();
          const hour = parseInt(timeSlot.split('-')[0]);
          
          // 优先使用班次列，否则根据时间自动判断
          let shift: string;
          if (shiftCol && row[shiftCol]) {
            const shiftValue = String(row[shiftCol!]).trim();
            if (shiftValue.includes('白')) shift = '白班';
            else if (shiftValue.includes('中')) shift = '中班';
            else if (shiftValue.includes('夜')) shift = '夜班';
            else shift = hour >= 7 && hour < 14 ? '白班' : hour >= 14 && hour < 18 ? '中班' : '夜班';
          } else {
            // 自动判断: 白班(7-14), 中班(14-18), 夜班(其他)
            shift = hour >= 7 && hour < 14 ? '白班' : hour >= 14 && hour < 18 ? '中班' : '夜班';
          }
          
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
        
        // 合并数据：同一日期的数据会被新数据覆盖
        const uploadDates = [...new Set(parsed.map(d => d.date))];
        const existingData = uploadedData.filter(d => !uploadDates.includes(d.date));
        const newData = [...existingData, ...parsed];
        
        setUploadedData(newData);
        setSelectedDate('all');
        
        // 更新班次配置（为新增的日期添加默认配置）
        const newDates = uploadDates.filter(d => !staffConfig[d]);
        if (newDates.length > 0) {
          setStaffConfig(prev => {
            const updated = { ...prev };
            newDates.forEach(date => {
              updated[date] = { white: 70, middle: 0, night: 95 };
            });
            return updated;
          });
        }
        
        // 设置配置日期为第一个上传的日期
        if (uploadDates.length > 0) {
          setConfigDate(uploadDates[0]);
        }
        
        const isOverwrite = existingData.length > 0 && existingData.length < uploadedData.length;
        setNotification({ type: 'success', message: isOverwrite ? `覆盖导入 ${parsed.length} 条数据` : `成功导入 ${parsed.length} 条数据` });
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
    if (!confirm('确定要清除所有云端数据吗？包括业务数据和班次配置！')) return;
    const result = await clearAllCloudData();
    if (result.success) {
      setHasCloudData(false);
      setUploadedData([]);
      setCalculatedData([]);
      setStaffConfig({});
      setNotification({ type: 'success', message: '云端数据已全部清除' });
    } else {
      setNotification({ type: 'error', message: '清除失败' });
    }
  };
  
  useEffect(() => {
    if (notification) { const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t); }
  }, [notification]);
  
  const getColor = (v: number) => v >= 0 ? 'text-emerald-400' : 'text-red-400';
  const getBgColor = (v: number) => v >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30';
  
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2544 50%, #0f1729 100%)' }}>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl ${notification.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-red-600 to-rose-600'} text-white`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
      
      {/* 头部 */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl sticky top-0 z-40 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo区域 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">物流绩效分析</h1>
                <p className="text-slate-400 text-xs sm:text-sm hidden md:block">智能排班 · 数据驱动</p>
              </div>
            </div>
            
            {/* 桌面端按钮 */}
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500" onClick={loadExampleData}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />示例
              </Button>
              <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500" onClick={loadFromCloud} disabled={isLoading || !isCloudConnected}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}加载
              </Button>
              <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500" onClick={saveToCloud} disabled={isSaving || calculatedData.length === 0 || !isCloudConnected}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}保存
              </Button>
              <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" />模板
              </Button>
              <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500" onClick={exportData} disabled={calculatedData.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />导出
              </Button>
              <Button variant="destructive" size="sm" className="bg-red-600/80 hover:bg-red-600" onClick={clearData} disabled={uploadedData.length === 0 && !hasCloudData}>
                <Trash2 className="w-4 h-4 mr-1" />清空
              </Button>
            </div>
            
            {/* 移动端菜单按钮 */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-xs">
                {isCloudConnected ? (
                  <Cloud className="w-4 h-4 text-emerald-400" />
                ) : (
                  <CloudOff className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {/* 移动端菜单 */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-slate-700/50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => { loadExampleData(); setMobileMenuOpen(false); }}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />示例数据
                </Button>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => { loadFromCloud(); setMobileMenuOpen(false); }} disabled={isLoading || !isCloudConnected}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}云端加载
                </Button>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => { saveToCloud(); setMobileMenuOpen(false); }} disabled={isSaving || calculatedData.length === 0 || !isCloudConnected}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}保存云端
                </Button>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => { downloadTemplate(); setMobileMenuOpen(false); }}>
                  <Download className="w-4 h-4 mr-1" />模板下载
                </Button>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => { exportData(); setMobileMenuOpen(false); }} disabled={calculatedData.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />导出报表
                </Button>
                <Button variant="destructive" size="sm" className="bg-red-600/80 hover:bg-red-600" onClick={() => { clearData(); setMobileMenuOpen(false); }} disabled={uploadedData.length === 0 && !hasCloudData}>
                  <Trash2 className="w-4 h-4 mr-1" />清空数据
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* 上传区域 */}
        <Card className="border-2 border-dashed border-indigo-500/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
              <label className="cursor-pointer group w-full md:w-auto">
                <div className="flex items-center justify-center gap-3 sm:gap-4 px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl sm:rounded-2xl shadow-xl group-hover:shadow-2xl group-hover:scale-[1.02] transition-all duration-300">
                  <FileUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  <div className="text-left">
                    <span className="text-base sm:text-lg font-bold block">{uploading ? '导入中...' : '上传业务数据'}</span>
                    <span className="text-indigo-200 text-xs sm:text-sm">.xlsx .xls 格式</span>
                  </div>
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
              </label>
              <div className="text-slate-300 space-y-1 text-center md:text-left text-sm">
                <p className="font-semibold">表头要求</p>
                <p className="text-xs sm:text-sm">日期 | 时段 | 卸车量 | 集包量 | 环线量</p>
                <p className="text-xs text-slate-500">系统将根据业务量自动分配人数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 左侧Tab导航 + 筛选 + 内容区域 */}
        {uploadedData.length > 0 && (
          <div className="flex gap-4">
            {/* 左侧Tab导航 - 竖向排列 */}
            <Card className="w-20 sm:w-24 flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/50 shadow-xl overflow-hidden">
              <CardContent className="p-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('config')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'config' 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="text-xs font-medium">班次配置</span>
                </button>
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'daily' 
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="text-xs font-medium">每日汇总</span>
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'charts' 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs font-medium">数据看板</span>
                </button>
              </CardContent>
            </Card>
            
            {/* 右侧内容区域 */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* 班次配置 - 仅config tab显示 */}
              {activeTab === 'config' && (
                <>
                  {/* 筛选区域 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-lg">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-slate-200 text-sm">筛选</span>
                        </div>
                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                          <SelectTrigger className="w-32 sm:w-40 bg-slate-700/50 border-slate-600 text-slate-200">
                            <SelectValue placeholder="日期" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-slate-200 hover:bg-slate-700">全部日期</SelectItem>
                            {availableDates.map(d => <SelectItem key={d} value={d} className="text-slate-200 hover:bg-slate-700">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={selectedShift} onValueChange={setSelectedShift}>
                          <SelectTrigger className="w-28 sm:w-32 bg-slate-700/50 border-slate-600 text-slate-200">
                            <SelectValue placeholder="班次" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-slate-200 hover:bg-slate-700">全部班次</SelectItem>
                            <SelectItem value="白班" className="text-slate-200 hover:bg-slate-700">白班</SelectItem>
                            <SelectItem value="中班" className="text-slate-200 hover:bg-slate-700">中班</SelectItem>
                            <SelectItem value="夜班" className="text-slate-200 hover:bg-slate-700">夜班</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* 白班/夜班快捷筛选 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedShift(selectedShift === '白班' ? 'all' : '白班')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedShift === '白班' 
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30' 
                                : 'bg-slate-700 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5" />
                            白班
                          </button>
                          <button
                            onClick={() => setSelectedShift(selectedShift === '夜班' ? 'all' : '夜班')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedShift === '夜班' 
                                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md shadow-slate-500/30' 
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5" />
                            夜班
                          </button>
                        </div>
                        <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs sm:text-sm px-2 sm:px-3 py-1">{filteredData.length}条</Badge>
                        
                        {/* 清除云端数据按钮 */}
                        {isCloudConnected && hasCloudData && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="ml-auto border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400"
                            onClick={clearCloudData}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">清除云端</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 班次配置卡片 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white rounded-t-xl py-3 px-4 border-b border-slate-700/30">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        班次配置
                        <Badge className="ml-auto bg-white/20 text-white text-xs">按日期区分</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* 日期选择 + 应用按钮 */}
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-300 text-sm flex-shrink-0">配置日期</span>
                        <Select value={configDate} onValueChange={setConfigDate}>
                          <SelectTrigger className="flex-1 min-w-0 bg-slate-700/50 border-slate-600 text-slate-200">
                            <SelectValue placeholder="选择日期" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {availableDates.map(d => (
                              <SelectItem key={d} value={d} className="text-slate-200 hover:bg-slate-700">{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-md flex-shrink-0"
                          onClick={() => {
                            // 将当前配置的班次人数同步到当天所有班次
                            const currentConfig = staffConfig[configDate] || { white: 70, middle: 0, night: 95 };
                            // 保持当前配置不变，只是标记已应用
                            setNotification({ type: 'success', message: `班次配置已更新: 白班${currentConfig.white}人/中班${currentConfig.middle}人/夜班${currentConfig.night}人` });
                          }}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          应用到当天
                        </Button>
                      </div>
                      {/* 当前日期的班次配置 */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/30">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                            <span className="text-white font-bold text-sm">白</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 text-sm">白班</p>
                            <p className="text-xs text-slate-400 hidden sm:block">07:00-18:00</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={staffConfig[configDate]?.white ?? 70}
                              onChange={e => setStaffConfig(s => ({
                                ...s,
                                [configDate]: { ...s[configDate] || { white: 70, middle: 0, night: 95 }, white: Number(e.target.value) || 0 }
                              }))}
                              className="w-16 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200 focus:border-amber-500"
                            />
                            <span className="text-slate-400 text-xs">人</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-500/10 to-green-600/5 rounded-xl border border-green-500/30">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-green-500/30">
                            <span className="text-white font-bold text-sm">中</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 text-sm">中班</p>
                            <p className="text-xs text-slate-400 hidden sm:block">可选</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={staffConfig[configDate]?.middle ?? 0}
                              onChange={e => setStaffConfig(s => ({
                                ...s,
                                [configDate]: { ...s[configDate] || { white: 70, middle: 0, night: 95 }, middle: Number(e.target.value) || 0 }
                              }))}
                              className="w-16 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200 focus:border-green-500"
                            />
                            <span className="text-slate-400 text-xs">人</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-slate-600/20 to-slate-700/10 rounded-xl border border-slate-600/30 xs:col-span-2 md:col-span-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-white font-bold text-sm">夜</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 text-sm">夜班</p>
                            <p className="text-xs text-slate-400 hidden sm:block">18:00-07:00</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={staffConfig[configDate]?.night ?? 95}
                              onChange={e => setStaffConfig(s => ({
                                ...s,
                                [configDate]: { ...s[configDate] || { white: 70, middle: 0, night: 95 }, night: Number(e.target.value) || 0 }
                              }))}
                              className="w-16 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200 focus:border-indigo-500"
                            />
                            <span className="text-slate-400 text-xs">人</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 保存班次配置按钮 */}
                      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md"
                          onClick={async () => {
                            // 保存班次配置到云端
                            const result = await saveAllShiftConfigsCloud(staffConfig);
                            if (result.success) {
                              setNotification({ type: 'success', message: '班次配置已保存到云端' });
                            } else {
                              setNotification({ type: 'error', message: '保存失败: ' + result.error });
                            }
                          }}
                        >
                          <Cloud className="w-4 h-4 mr-1" />
                          仅保存班次配置
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 统计卡片 */}
                  <div className="space-y-4">
                    {hasCloudData && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/30">
                        <Cloud className="w-4 h-4" />
                        <span>数据已保存到云端</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      <Card className="stat-card-blue shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-blue-200 text-xs sm:text-sm">卸车量</p>
                              <p className="text-lg sm:text-xl font-bold truncate">{stats.totalUnload.toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="stat-card-purple shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-purple-200 text-xs sm:text-sm">集包量</p>
                              <p className="text-lg sm:text-xl font-bold truncate">{stats.totalPackage.toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="stat-card-amber shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-amber-200 text-xs sm:text-sm">环线量</p>
                              <p className="text-lg sm:text-xl font-bold truncate">{stats.totalLoop.toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="stat-card-cyan shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-cyan-200 text-xs sm:text-sm">总收入</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalRevenue).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-red-200 text-xs sm:text-sm">总薪资</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalSalary).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className={`shadow-lg hover:shadow-xl transition-shadow ${stats.totalProfit >= 0 ? 'stat-card-profit' : 'stat-card-loss'}`}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {stats.totalProfit >= 0 ? <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" /> : <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />}
                            <div className="min-w-0">
                              <p className="text-white/80 text-xs sm:text-sm">利润</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalProfit).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  {/* 数据表格 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileSpreadsheet className="w-5 h-5" />
                          数据明细
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">收 ¥{Math.round(stats.totalRevenue).toLocaleString()}</span>
                          <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full">薪 ¥{Math.round(stats.totalSalary).toLocaleString()}</span>
                          <span className={`px-2 py-1 rounded-full ${stats.totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>利 ¥{Math.round(stats.totalProfit).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[400px] sm:max-h-[500px] overflow-y-auto touch-pan-x">
                        <Table>
                          <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
                            <TableRow className="border-slate-700/50">
                              <TableHead className="font-bold text-xs px-2 py-2 text-slate-300">时段</TableHead>
                              <TableHead className="font-bold text-xs px-2 py-2 text-slate-300">班</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">卸量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">卸人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-red-400">卸薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">包量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">包人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-emerald-400">包收</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-red-400">包薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">包盈</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">环量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">环人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-emerald-400">环收</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-red-400">环薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">环盈</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-red-400">管薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-red-400">其他</TableHead>
                              <TableHead className="text-right font-bold text-xs px-2 py-2 text-slate-300">利润</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length === 0 ? (
                              <TableRow><TableCell colSpan={18} className="text-center py-8 text-slate-400">暂无数据</TableCell></TableRow>
                            ) : filteredData.map((d, i) => (
                              <TableRow key={i} className={i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10 hover:bg-slate-700/50'}>
                                <TableCell className="font-medium text-xs px-2 py-2 text-slate-200">{d.timeSlot}</TableCell>
                                <TableCell className="px-2 py-2"><Badge className={`text-xs ${d.shift === '白班' ? 'bg-amber-500' : 'bg-slate-600'}`}>{d.shift === '白班' ? '白' : d.shift === '中班' ? '中' : '夜'}</Badge></TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.unloadCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.unloadStaff}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-red-400">¥{d.unloadSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.packageCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.packageStaff}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-emerald-400">¥{d.packageRevenue.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-red-400">¥{d.packageSalary.toFixed(0)}</TableCell>
                                <TableCell className={`text-right font-medium text-xs px-2 py-2 ${getColor(d.packageProfit)}`}>¥{d.packageProfit.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.loopCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-slate-300">{d.loopStaff}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-emerald-400">¥{d.loopRevenue.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-red-400">¥{d.loopSalary.toFixed(0)}</TableCell>
                                <TableCell className={`text-right font-medium text-xs px-2 py-2 ${getColor(d.loopProfit)}`}>¥{d.loopProfit.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-red-400">¥{d.manageSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-2 py-2 text-red-400">¥{d.otherCost.toFixed(0)}</TableCell>
                                <TableCell className={`text-right font-bold text-sm px-2 py-2 ${getColor(d.totalProfit)}`}>¥{d.totalProfit.toFixed(0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              
              {/* 每日汇总 - 仅daily tab显示，无筛选 */}
              {activeTab === 'daily' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailyStats.map(d => (
                    <Card key={d.date} className={`bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-lg overflow-hidden ${getBgColor(d.profit)}`}>
                      <CardHeader className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="w-5 h-5" />
                            {d.date}
                          </CardTitle>
                          <Badge className={`text-xs ${d.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {d.profit >= 0 ? '盈利' : '亏损'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                            <span className="text-slate-400 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-cyan-400" />
                              收入
                            </span>
                            <span className="font-semibold text-cyan-400">¥{Math.round(d.revenue).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                            <span className="text-slate-400 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-red-400" />
                              薪资
                            </span>
                            <span className="font-semibold text-red-400">¥{Math.round(d.salary).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-slate-700/30 -mx-4 px-4 rounded-lg mt-2">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              利润
                            </span>
                            <span className={`font-bold text-lg ${getColor(d.profit)}`}>¥{Math.round(d.profit).toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* 数据看板 - 仅charts tab显示 */}
              {activeTab === 'charts' && (
                <>
                  {/* 图表筛选区域 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-lg">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-slate-200 text-sm">图表筛选</span>
                        </div>
                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                          <SelectTrigger className="w-32 sm:w-40 bg-slate-700/50 border-slate-600 text-slate-200">
                            <SelectValue placeholder="日期" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-slate-200 hover:bg-slate-700">全部日期</SelectItem>
                            {availableDates.map(d => <SelectItem key={d} value={d} className="text-slate-200 hover:bg-slate-700">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={selectedShift} onValueChange={setSelectedShift}>
                          <SelectTrigger className="w-28 sm:w-32 bg-slate-700/50 border-slate-600 text-slate-200">
                            <SelectValue placeholder="班次" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-slate-200 hover:bg-slate-700">全部班次</SelectItem>
                            <SelectItem value="白班" className="text-slate-200 hover:bg-slate-700">白班</SelectItem>
                            <SelectItem value="中班" className="text-slate-200 hover:bg-slate-700">中班</SelectItem>
                            <SelectItem value="夜班" className="text-slate-200 hover:bg-slate-700">夜班</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* 白班/夜班快捷筛选 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedShift(selectedShift === '白班' ? 'all' : '白班')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedShift === '白班' 
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30' 
                                : 'bg-slate-700 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5" />
                            白班
                          </button>
                          <button
                            onClick={() => setSelectedShift(selectedShift === '夜班' ? 'all' : '夜班')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedShift === '夜班' 
                                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md shadow-slate-500/30' 
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5" />
                            夜班
                          </button>
                        </div>
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs sm:text-sm px-2 sm:px-3 py-1">{filteredData.length}条</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 图表区域 - 两列布局 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* 左列 */}
                    <div className="space-y-4 sm:space-y-6">
                      {/* 业务量占比 */}
                      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-600/80 to-cyan-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                            业务量占比
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius="70%" innerRadius="40%" paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* 成本结构 - 折线图 */}
                      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-rose-600/80 to-red-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                            成本结构趋势
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                            <ResponsiveContainer>
                              <LineChart data={revenueDetailData.slice(0, 12)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                                <Tooltip formatter={(v: number) => `¥${v}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                                <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                                <Line type="monotone" dataKey="卸车成本" stroke={COLORS.unload} strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="集包成本" stroke={COLORS.packageCost} strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="环线成本" stroke={COLORS.loopCost} strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="管理成本" stroke={COLORS.purple} strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="其他成本" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* 右列 */}
                    <div className="space-y-4 sm:space-y-6">
                      {/* 收入明细趋势 */}
                      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cyan-600/80 to-teal-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                            收入明细趋势
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                            <ResponsiveContainer>
                              <LineChart data={revenueDetailData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                                <Tooltip formatter={(v: number) => `¥${v}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                                <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                                <Line type="monotone" dataKey="集包收入" stroke={COLORS.package} strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="环线收入" stroke={COLORS.loop} strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* 利润趋势 */}
                      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-emerald-600/80 to-green-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                            利润趋势
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                                <Tooltip formatter={(v: number) => `¥${v}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                                <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                                <Area type="monotone" dataKey="利润" stroke={COLORS.success} fill="url(#colorProfit)" strokeWidth={2} />
                                <Area type="monotone" dataKey="收入" stroke={COLORS.primary} fill="url(#colorRevenue)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* 各时段利润对比 */}
                      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-amber-600/80 to-orange-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                            时段利润对比
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                            <ResponsiveContainer>
                              <BarChart data={hourlyProfitData} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                                <Tooltip formatter={(v: number) => `¥${v}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
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
                </>
              )}
            </div>
          </div>
        )}
        
        {/* 页面底部 */}
      </main>
      
      <footer className="bg-slate-900 text-slate-400 mt-6 sm:mt-8 md:mt-12 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-white text-sm">物流绩效分析</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">智能排班 · 数据驱动</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
