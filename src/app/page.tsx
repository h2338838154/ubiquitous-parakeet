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
  Cloud, CloudOff, RefreshCw, Save, Loader2, Menu, X, BarChart3, Sun, Moon, Sliders, Calculator
} from 'lucide-react';
import { format, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  saveLogisticsData, loadLogisticsData, saveShiftConfig,
  loadShiftConfigCloud, saveAllShiftConfigsCloud,
  clearLogisticsData, clearShiftConfigs, clearAllCloudData,
  type LogisticsDataRow, dateToExcelSerial, excelSerialToDate
} from '@/lib/supabase-client';

// ============ 类型定义 ============
interface UploadedData {
  date: string;
  timeSlot: string;
  shift: string;
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
  whiteStaff: number;
  middleStaff: number;
  nightStaff: number;
  // 各环节各类型人员
  unloadOwn: number;
  unloadLabor: number;
  unloadDaily: number;
  packageOwn: number;
  packageLabor: number;
  packageDaily: number;
  loopOwn: number;
  loopLabor: number;
  loopDaily: number;
  // 成本项
  manageSalary: number;     // 管理人员工资
  socialSecurity: number;   // 社保
  serviceCost: number;      // 客服人员成本
  commercialInsurance: number; // 商业险
  orderClaim: number;       // 工单理赔
  assessAmount: number;     // 考核金额
  // 业务数据
  unloadSalary: number;
  unloadProfit: number;
  packageRevenue: number;
  packageSalary: number;
  packageProfit: number;
  loopRevenue: number;
  loopSalary: number;
  loopProfit: number;
  totalCost: number;        // 总成本
  totalProfit: number;      // 总利润
}

// 班次配置接口 - 包含所有人员类型
interface StaffConfig {
  // 自有人员
  ownWhite: number;   // 白班自有人员
  ownMiddle: number;  // 中班自有人员
  ownNight: number;   // 夜班自有人员
  // 劳务人员
  laborWhite: number;  // 白班劳务
  laborNight: number;   // 夜班劳务
  // 日结人员
  dailyWhite: number;   // 白班日结人员
  dailyNight: number;   // 夜班日结人员
  // 考核金额
  assessAmount: number;
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

// ============ 常量定义 ============
// 薪资常量
// ============ 费率常量 ============
// 自有人员费率（元/人/小时）
const OWN_WHITE_RATE = 160 / 11;    // 白班自有人员 160元/11小时 ≈ 14.55元/小时
const OWN_NIGHT_RATE = 190 / 13;    // 夜班自有人员 190元/13小时 ≈ 14.62元/小时
// 劳务人员费率（元/人/小时）
const LABOR_RATE = 18;              // 劳务人员 18元/小时
// 日结人员费率（元/人/小时）
const DAILY_WHITE_RATE = 150 / 11;  // 白班日结 150元/11小时 ≈ 13.64元/小时
const DAILY_NIGHT_RATE = 180 / 13;  // 夜班日结 180元/13小时 ≈ 13.85元/小时
// 业务收入费率（元/件）
const PACKAGE_UNIT_PRICE = 0.0686;   // 集包收入 = 集包量 × 0.0686
const LOOP_UNIT_PRICE = 0.2765;     // 环线收入 = 环线量 × 0.2765

// ============ 固定成本常量 ============
// 管理成本（每时段固定）
const MANAGE_SALARY = (110000 + 16600 + 24900) / 30 / 24; // ≈ 209.03元/时段
const SOCIAL_SECURITY = (14 * 1130) / 30 / 24; // ≈ 21.99元/时段
const SERVICE_COST_PER_PERSON = (4200 / 30 * 2) / 9; // ≈ 31.11元/人/时段
const COMMERCIAL_INSURANCE_RATE = 4.5 / 24; // ≈ 0.1875元/人/时段
const ORDER_CLAIM = 20000 / 30 / 24; // ≈ 27.78元/时段

// 班次时间段定义
// 白班：7:00-18:00
// 中班：12:00-00:00（次日）
// 夜班：18:00-次日7:00
type ShiftType = '白班' | '中班' | '夜班';

// 根据时段判断班次
function getShiftType(timeSlot: string): { primary: ShiftType; secondary?: ShiftType; middleRatio?: number } {
  const hour = parseInt(timeSlot.split('-')[0]);
  
  // 00:00-07:00：仅夜班
  if (hour >= 0 && hour < 7) {
    return { primary: '夜班' };
  }
  
  // 07:00-12:00：仅白班
  if (hour >= 7 && hour < 12) {
    return { primary: '白班' };
  }
  
  // 12:00-18:00：白班和中班重叠，中班比例50%
  if (hour >= 12 && hour < 18) {
    return { primary: '白班', secondary: '中班', middleRatio: 0.5 };
  }
  
  // 18:00-24:00：中班和夜班重叠，中班比例50%
  if (hour >= 18 && hour < 24) {
    return { primary: '夜班', secondary: '中班', middleRatio: 0.5 };
  }
  
  return { primary: '白班' };
}

// 计算商业险（总自有人数 * 4.5 / 24）
function calcCommercialInsurance(totalOwnStaff: number): number {
  return totalOwnStaff * COMMERCIAL_INSURANCE_RATE;
}

// 获取该时段各班次的人员配置
// 逻辑：白中夜班自有、劳务、日结人数合计
// 中班根据上班时间分时间段分配到白班和夜班
function getStaffForTimeSlot(
  timeSlot: string,
  config: StaffConfig
): { 
  white: number; middle: number; night: number; 
  totalFormula: number;
  // 各班次各类型人数
  whiteOwn: number; whiteLabor: number; whiteDaily: number;
  middleOwn: number; middleLabor: number; middleDaily: number;
  nightOwn: number; nightLabor: number; nightDaily: number;
} {
  const hour = parseInt(timeSlot.split('-')[0]);
  
  // 合计所有人员
  // 白班人员 = 自有 + 劳务 + 日结
  const whiteFormula = config.ownWhite + config.laborWhite + config.dailyWhite;
  // 中班人员 = 自有
  const middleFormula = config.ownMiddle;
  // 夜班人员 = 自有 + 劳务 + 日结
  const nightFormula = config.ownNight + config.laborNight + config.dailyNight;
  
  // 根据时段分配中班到白班或夜班
  // 07:00-12:00：仅白班（不包含中班）
  if (hour >= 7 && hour < 12) {
    return {
      white: whiteFormula,
      middle: 0,
      night: 0,
      totalFormula: whiteFormula,
      whiteOwn: config.ownWhite, whiteLabor: config.laborWhite, whiteDaily: config.dailyWhite,
      middleOwn: 0, middleLabor: 0, middleDaily: 0,
      nightOwn: 0, nightLabor: 0, nightDaily: 0
    };
  }
  
  // 12:00-18:00：中班分配到白班
  if (hour >= 12 && hour < 18) {
    return {
      white: whiteFormula + middleFormula,
      middle: 0,
      night: 0,
      totalFormula: whiteFormula + middleFormula,
      whiteOwn: config.ownWhite + config.ownMiddle, 
      whiteLabor: config.laborWhite, 
      whiteDaily: config.dailyWhite,
      middleOwn: 0, middleLabor: 0, middleDaily: 0,
      nightOwn: 0, nightLabor: 0, nightDaily: 0
    };
  }
  
  // 18:00-24:00：中班分配到夜班
  if (hour >= 18 && hour < 24) {
    return {
      white: 0,
      middle: 0,
      night: nightFormula + middleFormula,
      totalFormula: nightFormula + middleFormula,
      whiteOwn: 0, whiteLabor: 0, whiteDaily: 0,
      middleOwn: 0, middleLabor: 0, middleDaily: 0,
      nightOwn: config.ownNight + config.ownMiddle, 
      nightLabor: config.laborNight, 
      nightDaily: config.dailyNight
    };
  }
  
  // 00:00-07:00：仅夜班
  return {
    white: 0,
    middle: 0,
    night: nightFormula,
    totalFormula: nightFormula,
    whiteOwn: 0, whiteLabor: 0, whiteDaily: 0,
    middleOwn: 0, middleLabor: 0, middleDaily: 0,
    nightOwn: config.ownNight, nightLabor: config.laborNight, nightDaily: config.dailyNight
  };
}

// 获取班次默认配置
function getDefaultStaffConfig(): StaffConfig {
  return {
    ownWhite: 0,
    ownMiddle: 0,
    ownNight: 0,
    laborWhite: 0,
    laborNight: 0,
    dailyWhite: 0,
    dailyNight: 0,
    assessAmount: 0
  };
}

// ============ 示例数据（默认展示） ============
const EXAMPLE_DATA: UploadedData[] = [
  { date: '2026-04-01', timeSlot: '0000-0100', shift: '夜班', unloadCount: 16991, loopCount: 1608, packageCount: 6568, manageCount: 2, unloadStaff: 18, packageStaff: 22, loopStaff: 28, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0100-0200', shift: '夜班', unloadCount: 12453, loopCount: 1245, packageCount: 4321, manageCount: 2, unloadStaff: 15, packageStaff: 18, loopStaff: 24, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0200-0300', shift: '夜班', unloadCount: 9876, loopCount: 987, packageCount: 3456, manageCount: 2, unloadStaff: 12, packageStaff: 15, loopStaff: 20, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0700-0800', shift: '白班', unloadCount: 1064, loopCount: 1528, packageCount: 246, manageCount: 4, unloadStaff: 5, packageStaff: 3, loopStaff: 6, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0800-0900', shift: '白班', unloadCount: 5592, loopCount: 3243, packageCount: 4179, manageCount: 4, unloadStaff: 8, packageStaff: 10, loopStaff: 12, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '0900-1000', shift: '白班', unloadCount: 4321, loopCount: 2567, packageCount: 3210, manageCount: 4, unloadStaff: 7, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1000-1100', shift: '白班', unloadCount: 3654, loopCount: 1987, packageCount: 2876, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 9, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1100-1200', shift: '白班', unloadCount: 2987, loopCount: 1654, packageCount: 2109, manageCount: 4, unloadStaff: 5, packageStaff: 6, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1200-1300', shift: '白班', unloadCount: 3456, loopCount: 1876, packageCount: 2543, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1300-1400', shift: '白班', unloadCount: 4123, loopCount: 2234, packageCount: 3098, manageCount: 4, unloadStaff: 7, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1400-1500', shift: '白班', unloadCount: 3876, loopCount: 2098, packageCount: 2876, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 9, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1500-1600', shift: '白班', unloadCount: 3543, loopCount: 1876, packageCount: 2654, manageCount: 4, unloadStaff: 6, packageStaff: 7, loopStaff: 8, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1800-1900', shift: '夜班', unloadCount: 5432, loopCount: 2876, packageCount: 3987, manageCount: 2, unloadStaff: 8, packageStaff: 10, loopStaff: 12, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '1900-2000', shift: '夜班', unloadCount: 7654, loopCount: 3876, packageCount: 5432, manageCount: 2, unloadStaff: 10, packageStaff: 12, loopStaff: 15, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '2000-2100', shift: '夜班', unloadCount: 9876, loopCount: 4654, packageCount: 6876, manageCount: 2, unloadStaff: 12, packageStaff: 15, loopStaff: 18, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-01', timeSlot: '2100-2200', shift: '夜班', unloadCount: 11234, loopCount: 5432, packageCount: 7890, manageCount: 2, unloadStaff: 14, packageStaff: 18, loopStaff: 22, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0000-0100', shift: '夜班', unloadCount: 14567, loopCount: 1543, packageCount: 5987, manageCount: 2, unloadStaff: 16, packageStaff: 20, loopStaff: 25, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0800-0900', shift: '白班', unloadCount: 6234, loopCount: 3543, packageCount: 4654, manageCount: 4, unloadStaff: 9, packageStaff: 11, loopStaff: 14, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '0900-1000', shift: '白班', unloadCount: 4876, loopCount: 2765, packageCount: 3543, manageCount: 4, unloadStaff: 7, packageStaff: 9, loopStaff: 11, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '1000-1100', shift: '白班', unloadCount: 4123, loopCount: 2234, packageCount: 2987, manageCount: 4, unloadStaff: 6, packageStaff: 8, loopStaff: 10, fileStaff: 0, inspectStaff: 2, serviceStaff: 2, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '1900-2000', shift: '夜班', unloadCount: 8234, loopCount: 4123, packageCount: 5876, manageCount: 2, unloadStaff: 11, packageStaff: 13, loopStaff: 16, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
  { date: '2026-04-02', timeSlot: '2000-2100', shift: '夜班', unloadCount: 10654, loopCount: 5098, packageCount: 7432, manageCount: 2, unloadStaff: 13, packageStaff: 16, loopStaff: 20, fileStaff: 4, inspectStaff: 3, serviceStaff: 0, receiveStaff: 1 },
];

// ============ 计算公式 ============

// 管理人员工资 = (110000+16600+24900)/30/24
function calcManageSalary(manageCount: number): number {
  return MANAGE_SALARY * manageCount;
}

// 社保 = (14*1130)/30/24 * 人数
function calcSocialSecurity(manageCount: number): number {
  return SOCIAL_SECURITY * manageCount;
}

// 业务收入
function calcPackageRevenue(packageCount: number): number {
  return packageCount * PACKAGE_UNIT_PRICE;
}

function calcLoopRevenue(loopCount: number): number {
  return loopCount * LOOP_UNIT_PRICE;
}

// 客服人员成本 = (4200/30*2)/9 * 人数
function calcServiceCost(serviceStaff: number): number {
  return SERVICE_COST_PER_PERSON * serviceStaff;
}

// ============ 薪资计算函数（新公式）===========
// 自有人员白班：160元/11小时*人数
// 夜班自有人员：190元/13小时*人数
// 劳务人员：18元/小时*人数
// 日结人员：白班150元/11小时*人数，夜班180元/13小时*人数

// 按人员类型和班次计算薪资
function calcOwnWhiteSalary(count: number): number {
  return (160 / 11) * count;
}

function calcOwnNightSalary(count: number): number {
  return (190 / 13) * count;
}

function calcLaborSalary(count: number): number {
  return 18 * count;
}

function calcDailyWhiteSalary(count: number): number {
  return (150 / 11) * count;
}

function calcDailyNightSalary(count: number): number {
  return (180 / 13) * count;
}

// 环节薪资计算：根据环节分配的人数和班次计算该环节的总薪资
function calcUnloadSalary(
  ownCount: number,
  laborCount: number,
  dailyCount: number,
  isWhite: boolean
): number {
  const own = isWhite ? calcOwnWhiteSalary(ownCount) : calcOwnNightSalary(ownCount);
  const labor = calcLaborSalary(laborCount);
  const daily = isWhite ? calcDailyWhiteSalary(dailyCount) : calcDailyNightSalary(dailyCount);
  return own + labor + daily;
}

function calcPackageSalary(
  ownCount: number,
  laborCount: number,
  dailyCount: number,
  isWhite: boolean
): number {
  const own = isWhite ? calcOwnWhiteSalary(ownCount) : calcOwnNightSalary(ownCount);
  const labor = calcLaborSalary(laborCount);
  const daily = isWhite ? calcDailyWhiteSalary(dailyCount) : calcDailyNightSalary(dailyCount);
  return own + labor + daily;
}

function calcLoopSalary(
  ownCount: number,
  laborCount: number,
  dailyCount: number,
  isWhite: boolean
): number {
  const own = isWhite ? calcOwnWhiteSalary(ownCount) : calcOwnNightSalary(ownCount);
  const labor = calcLaborSalary(laborCount);
  const daily = isWhite ? calcDailyWhiteSalary(dailyCount) : calcDailyNightSalary(dailyCount);
  return own + labor + daily;
}

// 全局变量：当前时段（用于智能分配）
let currentTimeSlot = '0800-0900';

// ============ 智能化人员分配函数 ============
// 基于实际作业数据设计的智能分配算法
// 参考：卸车与集包网格作业记录_46113.xlsx 中的实际人员配置

interface StaffAllocation {
  // 各环节总人数
  unload: number;
  package: number;
  loop: number;
  file: number;
  inspect: number;
  service: number;
  receive: number;
  // 各环节各类型人数
  unloadOwn: number; unloadLabor: number; unloadDaily: number;
  packageOwn: number; packageLabor: number; packageDaily: number;
  loopOwn: number; loopLabor: number; loopDaily: number;
  // 复用标记
  reuseFromUnload: number; // 从卸车复用的人数
}

/**
 * 智能人员分配算法
 * 
 * 核心原则：每个时段的总人数 = 班次配置的总人数（自有 + 劳务 + 日结）
 * 
 * 参考 Excel 数据（卸车与集包网格作业记录_46113.xlsx）：
 * - 白班（07:00-12:00）：约 67-74 人/时段
 *   卸车 8-15人，集包 21人，北环 14-19人，南环 14-16人，特快 4人，文件 0人
 * - 中班（12:00-18:00）：约 74 人/时段
 *   卸车 13-20人，集包 4-27人，北环 13-29人，南环 13人，特快 4人，文件 2人
 * - 夜班（18:00-07:00）：约 95-101 人/时段
 *   卸车 17-21人，集包 15-30人，北环 26-39人，南环 18-22人，特快 3人，文件 4人
 * 
 * 分配策略：
 * 1. 总人数 = 自有 + 劳务 + 日结（直接使用）
 * 2. 先计算固定岗位（文件、发验、客服、接发员）
 * 3. 剩余人数按班次比例分配到卸车、集包、北环、南环
 * 4. 特快按班次固定人数
 */
function smartAllocate(
  ownCount: number,
  laborCount: number,
  dailyCount: number,
  _unloadCount: number,
  _packageCount: number,
  _loopCount: number,
  isWhite: boolean,
  isMiddle: boolean = false
): StaffAllocation {
  const hour = parseInt(currentTimeSlot.split('-')[0]);
  
  // ========== 1. 计算总人数 ==========
  const totalStaff = ownCount + laborCount + dailyCount;
  
  // ========== 2. 确定固定岗位人数 ==========
  let documentCount: number;
  let inspectCount: number;
  let serviceCount: number;
  let expressCount: number;
  
  if (isWhite) {
    // 白班
    documentCount = 0;
    inspectCount = 2;
    serviceCount = 2;
    expressCount = 4;
  } else if (isMiddle) {
    // 中班
    documentCount = 2;
    inspectCount = 2;
    serviceCount = 1;
    expressCount = 4;
  } else {
    // 夜班
    documentCount = 4;
    inspectCount = 3;
    serviceCount = 0;
    expressCount = 3;
  }
  
  // ========== 3. 可分配给主要环节的人数 ==========
  const fixedStaff = documentCount + inspectCount + serviceCount + expressCount;
  const mainStaffCount = Math.max(1, totalStaff - fixedStaff);
  
  // ========== 4. 确定各环节比例（基于 Excel 参考数据）==========
  let baseUnloadRatio: number;
  let basePackageRatio: number;
  let baseNorthLoopRatio: number;
  let baseSouthLoopRatio: number;
  
  if (isWhite) {
    // 白班比例
    if (hour >= 7 && hour < 9) {
      baseUnloadRatio = 0.12;
      basePackageRatio = 0.31;
      baseNorthLoopRatio = 0.25;
      baseSouthLoopRatio = 0.24;
    } else if (hour >= 9 && hour < 11) {
      baseUnloadRatio = 0.19;
      basePackageRatio = 0.31;
      baseNorthLoopRatio = 0.21;
      baseSouthLoopRatio = 0.21;
    } else {
      baseUnloadRatio = 0.22;
      basePackageRatio = 0.31;
      baseNorthLoopRatio = 0.28;
      baseSouthLoopRatio = 0.24;
    }
  } else if (isMiddle) {
    // 中班比例
    if (hour >= 12 && hour < 14) {
      baseUnloadRatio = 0.27;
      basePackageRatio = 0.05;
      baseNorthLoopRatio = 0.39;
      baseSouthLoopRatio = 0.18;
    } else if (hour >= 14 && hour < 16) {
      baseUnloadRatio = 0.18;
      basePackageRatio = 0.36;
      baseNorthLoopRatio = 0.22;
      baseSouthLoopRatio = 0.18;
    } else {
      baseUnloadRatio = 0.23;
      basePackageRatio = 0.31;
      baseNorthLoopRatio = 0.22;
      baseSouthLoopRatio = 0.18;
    }
  } else {
    // 夜班比例
    if (hour >= 18 && hour < 20) {
      baseUnloadRatio = 0.20;
      basePackageRatio = 0.28;
      baseNorthLoopRatio = 0.30;
      baseSouthLoopRatio = 0.19;
    } else if (hour >= 20 && hour < 23) {
      baseUnloadRatio = 0.19;
      basePackageRatio = 0.30;
      baseNorthLoopRatio = 0.26;
      baseSouthLoopRatio = 0.18;
    } else {
      baseUnloadRatio = 0.22;
      basePackageRatio = 0.25;
      baseNorthLoopRatio = 0.28;
      baseSouthLoopRatio = 0.20;
    }
  }
  
  // ========== 5. 计算各环节人数 ==========
  const mainRatios = baseUnloadRatio + basePackageRatio + baseNorthLoopRatio + baseSouthLoopRatio;
  let unload = Math.round(mainStaffCount * (baseUnloadRatio / mainRatios));
  let package_ = Math.round(mainStaffCount * (basePackageRatio / mainRatios));
  let northLoop = Math.round(mainStaffCount * (baseNorthLoopRatio / mainRatios));
  let southLoop = Math.round(mainStaffCount * (baseSouthLoopRatio / mainRatios));
  
  // ========== 6. 人员复用逻辑 ==========
  // 卸车人员在完成卸车任务后可协助环线装车
  let reuseFromUnload = 0;
  if (isWhite) {
    if (hour >= 7 && hour < 10) {
      reuseFromUnload = Math.min(Math.floor(unload * 0.15), 5);
    } else if (hour >= 10 && hour < 12) {
      reuseFromUnload = Math.min(Math.floor(unload * 0.20), 7);
    }
  } else if (!isMiddle) {
    // 夜班复用较多
    if (hour >= 18 && hour < 22) {
      reuseFromUnload = Math.min(Math.floor(unload * 0.30), 13);
    } else {
      reuseFromUnload = Math.min(Math.floor(unload * 0.20), 8);
    }
  }
  
  // 复用调整：从卸车转至南环（南环装车需要更多人手）
  unload = Math.max(1, unload - reuseFromUnload);
  southLoop = southLoop + reuseFromUnload;
  
  // ========== 7. 总人数平衡（确保 = 配置总人数）==========
  const fixedTotal = documentCount + inspectCount + serviceCount + expressCount;
  const currentMain = unload + package_ + northLoop + southLoop;
  const diff = mainStaffCount - currentMain;
  if (diff !== 0) {
    // 剩余人数优先分配给集包
    package_ = Math.max(1, package_ + diff);
  }
  
  // ========== 8. 按人员类型分配（自有/劳务/日结）==========
  const totalType = ownCount + laborCount + dailyCount;
  const ownRatio = totalType > 0 ? ownCount / totalType : 0;
  const laborRatio = totalType > 0 ? laborCount / totalType : 0;
  const dailyRatio = totalType > 0 ? dailyCount / totalType : 0;
  
  // 卸车环节
  const unloadOwn = Math.round(unload * ownRatio);
  const unloadLabor = Math.round(unload * laborRatio);
  const unloadDaily = unload - unloadOwn - unloadLabor;
  
  // 集包环节
  const packageOwn = Math.round(package_ * ownRatio);
  const packageLabor = Math.round(package_ * laborRatio);
  const packageDaily = package_ - packageOwn - packageLabor;
  
  // 北环环节
  const northLoopOwn = Math.round(northLoop * ownRatio);
  const northLoopLabor = Math.round(northLoop * laborRatio);
  const northLoopDaily = northLoop - northLoopOwn - northLoopLabor;
  
  // 南环环节
  const southLoopOwn = Math.round(southLoop * ownRatio);
  const southLoopLabor = Math.round(southLoop * laborRatio);
  const southLoopDaily = southLoop - southLoopOwn - southLoopLabor;
  
  // 总人数验证
  const totalAllocated = unload + package_ + northLoop + southLoop + fixedTotal;
  
  return {
    unload,
    package: package_,
    loop: northLoop + southLoop, // 环线 = 北环 + 南环
    file: documentCount,
    inspect: inspectCount,
    service: serviceCount,
    receive: 1,
    unloadOwn: Math.max(0, unloadOwn),
    unloadLabor: Math.max(0, unloadLabor),
    unloadDaily: Math.max(0, unloadDaily),
    packageOwn: Math.max(0, packageOwn),
    packageLabor: Math.max(0, packageLabor),
    packageDaily: Math.max(0, packageDaily),
    loopOwn: Math.max(0, northLoopOwn + southLoopOwn),
    loopLabor: Math.max(0, northLoopLabor + southLoopLabor),
    loopDaily: Math.max(0, northLoopDaily + southLoopDaily),
    reuseFromUnload
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
              receiveStaff: row['接发员'] || 0
            }));
            setUploadedData(parsed);
            setHasCloudData(true);
            setSelectedDate('all');
            
            // 为每个日期创建班次配置，优先使用云端配置
            const dates = [...new Set(parsed.map(d => d.date))].sort();
            dates.forEach(date => {
              if (!savedStaffConfig[date]) {
                savedStaffConfig[date] = { 
                  ownWhite: 0,
                  ownMiddle: 0,
                  ownNight: 0,
                  laborWhite: 0,
                  laborNight: 0,
                  dailyWhite: 0,
                  dailyNight: 0,
                  assessAmount: 0
                };
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
            receiveStaff: row['接发员'] || 0
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
            defaultConfig[date] = getDefaultStaffConfig();
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
        '卸车量': d.unloadCount,
        '环线量': d.loopCount,
        '集包量': d.packageCount,
        '管理': d.manageCount,
        '管理薪资': Math.round(d.manageSalary * 100) / 100,
        '卸车人数': d.unloadStaff,
        '卸车薪资': Math.round(d.unloadSalary * 100) / 100,
        '卸车盈亏': Math.round(d.unloadProfit * 100) / 100,
        '集包人数': d.packageStaff,
        '集包收入': Math.round(d.packageRevenue * 100) / 100,
        '集包薪资': Math.round(d.packageSalary * 100) / 100,
        '集包盈亏': Math.round(d.packageProfit * 100) / 100,
        '环线人数': d.loopStaff,
        '环线收入': Math.round(d.loopRevenue * 100) / 100,
        '环线薪资': Math.round(d.loopSalary * 100) / 100,
        '环线盈亏': Math.round(d.loopProfit * 100) / 100,
        '文件人数': d.fileStaff || 0,
        '发验人数': d.inspectStaff || 0,
        '客服人数': d.serviceStaff || 0,
        '接发员': d.receiveStaff || 0,
        '其他成本': Math.round((d.socialSecurity + d.commercialInsurance + d.orderClaim + d.assessAmount) * 100) / 100,
        '总成本': Math.round(d.totalCost * 100) / 100,
        '总盈亏': Math.round(d.totalProfit * 100) / 100,
        '总表人数': (d.unloadStaff || 0) + (d.packageStaff || 0) + (d.loopStaff || 0) + (d.manageCount || 0) + (d.fileStaff || 0) + (d.inspectStaff || 0) + (d.serviceStaff || 0) + (d.receiveStaff || 0)
      }));
      
      // 先清除云端旧数据，再保存新数据（确保数据一致）
      await clearLogisticsData();
      
      const saveResult = await saveLogisticsData(logisticsRecords);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      // 保存班次配置到 localStorage (按日期存储)
      saveShiftConfig({
        date: configDate,
        configs: staffConfig,
        ownWhite: staffConfig[configDate]?.ownWhite ?? 0,
        ownMiddle: staffConfig[configDate]?.ownMiddle ?? 0,
        ownNight: staffConfig[configDate]?.ownNight ?? 0,
        laborWhite: staffConfig[configDate]?.laborWhite ?? 0,
        laborNight: staffConfig[configDate]?.laborNight ?? 0,
        dailyWhite: staffConfig[configDate]?.dailyWhite ?? 0,
        dailyNight: staffConfig[configDate]?.dailyNight ?? 0,
        assessAmount: staffConfig[configDate]?.assessAmount ?? 0
      });
      
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
      defaultConfig[date] = getDefaultStaffConfig();
    });
    setStaffConfig(defaultConfig);
    
    // 设置配置日期为第一个有数据的日期
    if (dates.length > 0) {
      setConfigDate(dates.sort()[0]);
    }
    
    setNotification({ type: 'success', message: `已加载示例数据 ${EXAMPLE_DATA.length} 条` });
  };
  
  // 计算数据（依赖 uploadedData、staffConfig、selectedDate 确保配置修改后全局重算）
  useEffect(() => {
    if (uploadedData.length > 0) {
      console.log('[DEBUG] staffConfig keys:', Object.keys(staffConfig));
      console.log('[DEBUG] recalculating due to staffConfig change:', JSON.stringify(staffConfig));
      const calculated = uploadedData.map(row => {
        currentTimeSlot = row.timeSlot;
        
        // 获取该日期的班次配置，如果没有则使用默认值
        const dateConfig = staffConfig[row.date] || {
          ownWhite: 0, ownMiddle: 0, ownNight: 0,
          laborWhite: 0, laborNight: 0,
          dailyWhite: 0, dailyNight: 0,
          assessAmount: 0
        };
        
        // 根据时段获取各班次人员配置（已包含所有自有、劳务、日结人员）
        const staffInfo = getStaffForTimeSlot(row.timeSlot, dateConfig);
        console.log('[DEBUG] timeSlot:', row.timeSlot, 'ownNight:', dateConfig.ownNight, 'nightOwn:', staffInfo.nightOwn);
        const { 
          white: whiteStaff, middle: middleStaff, night: nightStaff, 
          totalFormula: totalFormulaStaff,
          whiteOwn, whiteLabor, whiteDaily,
          nightOwn, nightLabor, nightDaily
        } = staffInfo;
        
        // 获取时段类型（用于区分重叠时段）
        const shiftInfo = getShiftType(row.timeSlot);
        const isOverlapping = shiftInfo.secondary === '中班';
        
        // 计算总自有人数（用于商业险计算）
        const totalOwnStaff = dateConfig.ownWhite + dateConfig.ownMiddle + dateConfig.ownNight;
        
        // 使用智能分配函数分配卸车、集包、环线人员（按各类型人员分别分配）
        const isWhitePeriod = shiftInfo.primary === '白班';
        const isMiddlePeriod = shiftInfo.secondary === '中班';
        
        // 根据班次获取当前时段各类型人员数量
        const currentOwn = isWhitePeriod ? whiteOwn : nightOwn;
        const currentLabor = isWhitePeriod ? whiteLabor : nightLabor;
        const currentDaily = isWhitePeriod ? whiteDaily : nightDaily;
        
        const allocation = smartAllocate(
          currentOwn,
          currentLabor,
          currentDaily,
          row.unloadCount,
          row.packageCount,
          row.loopCount,
          isWhitePeriod,
          isMiddlePeriod
        );
        
        // ============ 计算各项成本 ============
        
        // 管理人员工资 = (110000+16600+24900)/30/24 * 人数
        const manageSalary = calcManageSalary(row.manageCount);
        
        // 社保 = (14*1130)/30/24 * 人数
        const socialSecurity = calcSocialSecurity(row.manageCount);
        
        // 卸车薪资 = 各类型人数 × 对应费率
        const unloadSalary = calcUnloadSalary(
          allocation.unloadOwn, allocation.unloadLabor, allocation.unloadDaily, isWhitePeriod
        );
        const unloadProfit = 0 - unloadSalary;
        
        // 集包收入和薪资
        const packageRevenue = calcPackageRevenue(row.packageCount);
        let packageSalary = calcPackageSalary(
          allocation.packageOwn, allocation.packageLabor, allocation.packageDaily, isWhitePeriod
        );
        // 如果是重叠时段，中班承担部分薪资
        if (isOverlapping) {
          packageSalary = packageSalary * (1 - (shiftInfo.middleRatio || 0));
        }
        const packageProfit = packageRevenue - packageSalary;
        
        // 环线收入和薪资
        const loopRevenue = calcLoopRevenue(row.loopCount);
        let loopSalary = calcLoopSalary(
          allocation.loopOwn, allocation.loopLabor, allocation.loopDaily, isWhitePeriod
        );
        // 如果是重叠时段，中班承担部分薪资
        if (isOverlapping) {
          loopSalary = loopSalary * (1 - (shiftInfo.middleRatio || 0));
        }
        const loopProfit = loopRevenue - loopSalary;
        
        // ============ 新增成本项（自有人员单独计算，其他已包含在公式中）===========
        
        // 客服人员成本 = (4200/30*2)/9 * 人数
        const serviceCost = calcServiceCost(allocation.service);
        
        // 商业险 = 总自有人数 * 4.5 / 24
        const commercialInsurance = calcCommercialInsurance(totalOwnStaff);
        
        // 工单理赔 = 20000/30/24
        const orderClaim = ORDER_CLAIM;
        
        // 考核金额（从配置中获取）
        const assessAmount = dateConfig.assessAmount || 0;
        
        // 总成本 = 所有成本项之和（确保都是有效数字）
        // 注：自有、劳务、日结人员薪资已通过环节薪资函数计算
        const totalCost = 
          Number(unloadSalary || 0) + 
          Number(packageSalary || 0) + 
          Number(loopSalary || 0) + 
          Number(manageSalary || 0) + 
          Number(socialSecurity || 0) +
          Number(serviceCost || 0) +
          Number(commercialInsurance || 0) +
          Number(orderClaim || 0) +
          Number(assessAmount || 0);
        
        // 总收入
        const totalRevenue = Number(packageRevenue || 0) + Number(loopRevenue || 0);
        
        // 总利润 = 总收入 - 总成本（确保是有效数字）
        const totalProfit = Number(totalRevenue) - Number(totalCost);
        
        // 班次：优先使用原始上传的班次，如果没有则根据时段自动判断
        const originalShift = row.shift;
        const finalShift = (originalShift && ['白班', '中班', '夜班'].includes(originalShift)) 
          ? originalShift 
          : shiftInfo.primary;
        
        return {
          ...row,
          // 班次：优先使用上传的班次，否则使用自动计算的班次
          shift: finalShift,
          unloadStaff: allocation.unload,
          packageStaff: allocation.package,
          loopStaff: allocation.loop,
          fileStaff: allocation.file,
          inspectStaff: allocation.inspect,
          serviceStaff: allocation.service,
          receiveStaff: allocation.receive,
          // 班次人员（已包含自有、劳务、日结人员）
          whiteStaff,
          middleStaff,
          nightStaff,
          // 各环节各类型人员
          unloadOwn: allocation.unloadOwn,
          unloadLabor: allocation.unloadLabor,
          unloadDaily: allocation.unloadDaily,
          packageOwn: allocation.packageOwn,
          packageLabor: allocation.packageLabor,
          packageDaily: allocation.packageDaily,
          loopOwn: allocation.loopOwn,
          loopLabor: allocation.loopLabor,
          loopDaily: allocation.loopDaily,
          // 成本项
          manageSalary: manageSalary || 0,
          socialSecurity: socialSecurity || 0,
          serviceCost: serviceCost || 0,
          commercialInsurance: commercialInsurance || 0,
          orderClaim: orderClaim || 0,
          assessAmount: assessAmount || 0,
          // 业务数据
          unloadSalary: unloadSalary || 0,
          unloadProfit: unloadProfit || 0,
          packageRevenue: packageRevenue || 0,
          packageSalary: packageSalary || 0,
          packageProfit: packageProfit || 0,
          loopRevenue: loopRevenue || 0,
          loopSalary: loopSalary || 0,
          loopProfit: loopProfit || 0,
          totalCost: totalCost || 0,
          totalProfit: totalProfit || 0
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
    const totalUnload = filteredData.reduce((s, d) => s + (d.unloadCount || 0), 0);
    const totalPackage = filteredData.reduce((s, d) => s + (d.packageCount || 0), 0);
    const totalLoop = filteredData.reduce((s, d) => s + (d.loopCount || 0), 0);
    const totalRevenue = filteredData.reduce((s, d) => s + (d.packageRevenue || 0) + (d.loopRevenue || 0), 0);
    // 业务税金 = 总收入 * 6% (假设税率6%)
    const businessTax = Number(totalRevenue) * 0.06;
    const totalCost = filteredData.reduce((s, d) => s + Number(d.totalCost || 0), 0);
    const totalProfit = filteredData.reduce((s, d) => s + Number(d.totalProfit || 0), 0);
    return { 
      totalUnload, 
      totalPackage, 
      totalLoop, 
      totalRevenue, 
      businessTax, 
      totalCost, 
      totalProfit 
    };
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
    const map = new Map<string, { date: string; profit: number; revenue: number; cost: number }>();
    calculatedData.forEach(d => {
      const existing = map.get(d.date) || { date: d.date, profit: 0, revenue: 0, cost: 0 };
      existing.profit += d.totalProfit || 0;
      existing.revenue += (d.packageRevenue || 0) + (d.loopRevenue || 0);
      existing.cost += d.totalCost || 0;
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
    利润: Math.round(d.totalProfit || 0),
    收入: Math.round((d.packageRevenue || 0) + (d.loopRevenue || 0)),
    成本: Math.round(d.totalCost || 0)
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
    班次: d.shift,
    集包收入: Math.round(d.packageRevenue),
    环线收入: Math.round(d.loopRevenue),
    总收入: Math.round(d.packageRevenue + d.loopRevenue),
    卸车成本: Math.round(d.unloadSalary),
    集包成本: Math.round(d.packageSalary),
    环线成本: Math.round(d.loopSalary),
    管理成本: Math.round(d.manageSalary),
    社保: Math.round(d.socialSecurity),
    客服: Math.round(d.serviceCost),
    商业险: Math.round(d.commercialInsurance),
    工单理赔: Math.round(d.orderClaim),
    考核: Math.round(d.assessAmount),
    总成本: Math.round(d.totalCost),
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
              updated[date] = { 
                // white: 70, 
                // middle: 0, 
                // night: 95,
                ownWhite: 0,
                ownMiddle: 0,
                ownNight: 0,
                laborWhite: 0,
                laborNight: 0,
                dailyWhite: 0,
                dailyNight: 0,
                assessAmount: 0
              };
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
      { '日期': '4月1日', '时段': '0000-0100', '班次': '夜班', '卸车量': 16991, '集包量': 6568, '环线量': 1608 },
      { '日期': '4月1日', '时段': '0700-0800', '班次': '白班', '卸车量': 1064, '集包量': 246, '环线量': 1528 },
      { '日期': '4月1日', '时段': '0800-0900', '班次': '白班', '卸车量': 5592, '集包量': 4179, '环线量': 3243 },
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
      '卸车量': d.unloadCount, '卸车人数': d.unloadStaff,
      '卸车自有': d.unloadOwn, '卸车劳务': d.unloadLabor, '卸车日结': d.unloadDaily,
      '卸车薪资': Number(d.unloadSalary || 0).toFixed(2), '卸车盈亏': Number(d.unloadProfit || 0).toFixed(2),
      '集包量': d.packageCount, '集包人数': d.packageStaff,
      '集包自有': d.packageOwn, '集包劳务': d.packageLabor, '集包日结': d.packageDaily,
      '集包收入': Number(d.packageRevenue || 0).toFixed(2), '集包薪资': Number(d.packageSalary || 0).toFixed(2), '集包盈亏': Number(d.packageProfit || 0).toFixed(2),
      '环线量': d.loopCount, '环线人数': d.loopStaff,
      '环线自有': d.loopOwn, '环线劳务': d.loopLabor, '环线日结': d.loopDaily,
      '环线收入': Number(d.loopRevenue || 0).toFixed(2), '环线薪资': Number(d.loopSalary || 0).toFixed(2), '环线盈亏': Number(d.loopProfit || 0).toFixed(2),
      '管理薪资': Number(d.manageSalary || 0).toFixed(2),
      '社保': Number(d.socialSecurity || 0).toFixed(2),
      '客服成本': Number(d.serviceCost || 0).toFixed(2),
      '商业险': Number(d.commercialInsurance || 0).toFixed(2),
      '工单理赔': Number(d.orderClaim || 0).toFixed(2),
      '考核金额': Number(d.assessAmount || 0).toFixed(2),
      '总成本': Number(d.totalCost || 0).toFixed(2),
      '总收入': (Number(d.packageRevenue || 0) + Number(d.loopRevenue || 0)).toFixed(2),
      '利润': Number(d.totalProfit || 0).toFixed(2)
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
                            const currentConfig = staffConfig[configDate] || getDefaultStaffConfig();
                            // 保持当前配置不变，只是标记已应用
                            setNotification({ type: 'success', message: `班次配置已更新` });
                          }}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          应用到当天
                        </Button>
                      </div>
                      {/* 当前日期的班次配置 */}
                      {(() => {
                        const config = staffConfig[configDate] || getDefaultStaffConfig();
                        // 计算合计人数
                        const totalWhite = config.ownWhite + config.laborWhite + config.dailyWhite;
                        const totalMiddle = config.ownMiddle;
                        const totalNight = config.ownNight + config.laborNight + config.dailyNight;
                        const totalAll = totalWhite + totalMiddle + totalNight;
                        // 计算成本（按小时平均）
                        // 白班费率：日结>劳务>自有
                        const whiteRate = config.dailyWhite > 0 ? 150/11 : (config.laborWhite > 0 ? 18 : (config.ownWhite > 0 ? 160/11 : 0));
                        const whiteCostPerHour = totalWhite * whiteRate;
                        // 夜班费率：日结>劳务>自有
                        const nightRate = config.dailyNight > 0 ? 180/13 : (config.laborNight > 0 ? 18 : (config.ownNight > 0 ? 190/13 : 0));
                        const nightCostPerHour = totalNight * nightRate;
                        // 中班按白班费率
                        const middleCostPerHour = totalMiddle * (160/11); // 中班按白班费率
                        const totalCostPerHour = whiteCostPerHour + nightCostPerHour + middleCostPerHour;
                        return (
                          <div className="space-y-4">
                            {/* 自有人员 */}
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-blue-700/50">
                              <p className="text-xs text-blue-400 mb-3 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                自有人员（160/11元/人/小时）
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">白班</p>
                                  <Input
                                    type="number"
                                    value={config.ownWhite}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], ownWhite: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">中班</p>
                                  <Input
                                    type="number"
                                    value={config.ownMiddle}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], ownMiddle: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">夜班</p>
                                  <Input
                                    type="number"
                                    value={config.ownNight}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], ownNight: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 劳务人员 */}
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-orange-700/50">
                              <p className="text-xs text-orange-400 mb-3 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                劳务人员（18元/人/小时）
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">白班</p>
                                  <Input
                                    type="number"
                                    value={config.laborWhite}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], laborWhite: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">夜班</p>
                                  <Input
                                    type="number"
                                    value={config.laborNight}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], laborNight: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 日结人员 */}
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-purple-700/50">
                              <p className="text-xs text-purple-400 mb-3 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                日结人员（白150/11、夜180/13元/人/小时）
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">白班</p>
                                  <Input
                                    type="number"
                                    value={config.dailyWhite}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], dailyWhite: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-xs text-slate-400">夜班</p>
                                  <Input
                                    type="number"
                                    value={config.dailyNight}
                                    onChange={e => setStaffConfig(s => ({
                                      ...s,
                                      [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], dailyNight: Math.max(0, Number(e.target.value) || 0) }
                                    }))}
                                    className="w-full h-9 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 合计结果 */}
                            <div className="p-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-cyan-700/50 shadow-lg">
                              <p className="text-xs text-cyan-400 mb-3 font-bold flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                合计人数
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                  <p className="text-xs text-slate-400">白班合计</p>
                                  <p className="text-lg font-bold text-amber-400">{totalWhite}</p>
                                  <p className="text-xs text-amber-400/70">¥{whiteCostPerHour.toFixed(0)}/h</p>
                                </div>
                                <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                  <p className="text-xs text-slate-400">中班合计</p>
                                  <p className="text-lg font-bold text-green-400">{totalMiddle}</p>
                                  <p className="text-xs text-green-400/70">¥{middleCostPerHour.toFixed(0)}/h</p>
                                </div>
                                <div className="text-center p-2 bg-slate-500/10 rounded-lg border border-slate-500/20">
                                  <p className="text-xs text-slate-400">夜班合计</p>
                                  <p className="text-lg font-bold text-slate-300">{totalNight}</p>
                                  <p className="text-xs text-slate-400/70">¥{nightCostPerHour.toFixed(0)}/h</p>
                                </div>
                                <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                  <p className="text-xs text-slate-400">总人数</p>
                                  <p className="text-lg font-bold text-cyan-400">{totalAll}</p>
                                  <p className="text-xs text-cyan-400/70">¥{totalCostPerHour.toFixed(0)}/h</p>
                                </div>
                              </div>
                            </div>

                            {/* 考核金额 */}
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-rose-700/50">
                              <p className="text-xs text-rose-400 mb-3 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                                考核金额
                              </p>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  value={config.assessAmount}
                                  onChange={e => setStaffConfig(s => ({
                                    ...s,
                                    [configDate]: { ...getDefaultStaffConfig(), ...s[configDate], assessAmount: Math.max(0, Number(e.target.value) || 0) }
                                  }))}
                                  className="flex-1 h-10 text-center font-bold bg-slate-700/50 border-slate-600 text-slate-200"
                                  placeholder="输入考核金额"
                                />
                                <span className="text-slate-400 text-sm">元/天</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
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
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-red-200 text-xs sm:text-sm">总成本</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalCost || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                            <div className="min-w-0">
                              <p className="text-orange-200 text-xs sm:text-sm">业务税金</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.businessTax || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className={`shadow-lg hover:shadow-xl transition-shadow ${(stats.totalProfit || 0) >= 0 ? 'stat-card-profit' : 'stat-card-loss'}`}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {(stats.totalProfit || 0) >= 0 ? <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" /> : <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />}
                            <div className="min-w-0">
                              <p className="text-white/80 text-xs sm:text-sm">利润</p>
                              <p className="text-lg sm:text-xl font-bold truncate">¥{Math.round(stats.totalProfit || 0).toLocaleString()}</p>
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
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">收 ¥{Math.round(stats.totalRevenue || 0).toLocaleString()}</span>
                          <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full">支 ¥{Math.round(stats.totalCost || 0).toLocaleString()}</span>
                          <span className={`px-2 py-1 rounded-full ${(stats.totalProfit || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>利 ¥{Math.round(stats.totalProfit || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[400px] sm:max-h-[500px] overflow-y-auto touch-pan-x">
                        <Table>
                          <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
                            <TableRow className="border-slate-700/50">
                              <TableHead className="font-bold text-xs px-1 py-1.5 text-slate-300">时段</TableHead>
                              <TableHead className="font-bold text-xs px-1 py-1.5 text-slate-300">班</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">卸量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">卸人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-red-400">卸薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">包量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">包人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-emerald-400">包收</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-red-400">包薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">环量</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">环人</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-emerald-400">环收</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-red-400">环薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-red-400">管薪</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-orange-400">社保</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-orange-400">客服</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-orange-400">商险</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-orange-400">理赔</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-orange-400">考核</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-red-400">总成本</TableHead>
                              <TableHead className="text-right font-bold text-xs px-1 py-1.5 text-slate-300">利润</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length === 0 ? (
                              <TableRow><TableCell colSpan={20} className="text-center py-8 text-slate-400">暂无数据</TableCell></TableRow>
                            ) : filteredData.map((d, i) => (
                              <TableRow key={i} className={i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10 hover:bg-slate-700/50'}>
                                <TableCell className="font-medium text-xs px-1 py-1.5 text-slate-200">{d.timeSlot}</TableCell>
                                <TableCell className="px-1 py-1.5"><Badge className={`text-xs ${d.shift === '白班' ? 'bg-amber-500' : 'bg-slate-600'}`}>{d.shift === '白班' ? '白' : d.shift === '中班' ? '中' : '夜'}</Badge></TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.unloadCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.unloadStaff}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-red-400">¥{d.unloadSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.packageCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.packageStaff}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-emerald-400">¥{d.packageRevenue.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-red-400">¥{d.packageSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.loopCount.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-slate-300">{d.loopStaff}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-emerald-400">¥{d.loopRevenue.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-red-400">¥{d.loopSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-red-400">¥{d.manageSalary.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-orange-400">¥{d.socialSecurity.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-orange-400">¥{d.serviceCost.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-orange-400">¥{d.commercialInsurance.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-orange-400">¥{d.orderClaim.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-orange-400">¥{d.assessAmount.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs px-1 py-1.5 text-red-400">¥{d.totalCost.toFixed(0)}</TableCell>
                                <TableCell className={`text-right font-bold text-xs px-1 py-1.5 ${getColor(d.totalProfit)}`}>¥{d.totalProfit.toFixed(0)}</TableCell>
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
                              成本
                            </span>
                            <span className="font-semibold text-red-400">¥{Math.round(d.cost).toLocaleString()}</span>
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
                          <span className="font-semibold text-slate-200 text-sm">数据看板</span>
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
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs sm:text-sm px-2 sm:px-3 py-1">{filteredData.length}条</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 智能分析概览卡片 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <Card className="bg-gradient-to-br from-cyan-600/80 to-blue-600/80 border-cyan-500/30 shadow-lg">
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">总收入</p>
                        <p className="text-lg font-bold">¥{(stats.totalRevenue || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-600/80 to-rose-600/80 border-red-500/30 shadow-lg">
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">总成本</p>
                        <p className="text-lg font-bold">¥{(stats.totalCost || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className={`bg-gradient-to-br ${(stats.totalProfit || 0) >= 0 ? 'from-emerald-600/80 to-green-600/80 border-emerald-500/30' : 'from-orange-600/80 to-red-600/80 border-orange-500/30'} shadow-lg`}>
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">净利润</p>
                        <p className="text-lg font-bold">¥{(stats.totalProfit || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-600/80 to-orange-600/80 border-amber-500/30 shadow-lg">
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">利润率</p>
                        <p className="text-lg font-bold">{stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-600/80 to-purple-600/80 border-violet-500/30 shadow-lg">
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">人效(件/人)</p>
                        <p className="text-lg font-bold">{stats.totalPackage > 0 && filteredData.reduce((s, d) => s + d.unloadStaff + d.packageStaff + d.loopStaff, 0) > 0 
                          ? Math.round(stats.totalPackage / filteredData.reduce((s, d) => s + d.unloadStaff + d.packageStaff + d.loopStaff, 0)).toLocaleString() 
                          : 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-teal-600/80 to-cyan-600/80 border-teal-500/30 shadow-lg">
                      <CardContent className="p-3 text-center text-white">
                        <p className="text-xs opacity-80">人均利润</p>
                        <p className="text-lg font-bold">{filteredData.reduce((s, d) => s + d.unloadStaff + d.packageStaff + d.loopStaff, 0) > 0 
                          ? Math.round((stats.totalProfit || 0) / filteredData.reduce((s, d) => s + d.unloadStaff + d.packageStaff + d.loopStaff, 0)).toLocaleString() 
                          : 0}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 第一行图表 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 业务量占比 */}
                    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-600/80 to-cyan-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Package className="w-4 h-4" />
                          业务量占比
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="h-[250px]">
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
                    
                    {/* 成本结构占比 */}
                    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-rose-600/80 to-red-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <PieChart className="w-4 h-4" />
                          成本结构占比
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="h-[250px]">
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={[
                                { name: '卸车', value: filteredData.reduce((s, d) => s + d.unloadSalary, 0), color: '#ef4444' },
                                { name: '集包', value: filteredData.reduce((s, d) => s + d.packageSalary, 0), color: '#f97316' },
                                { name: '环线', value: filteredData.reduce((s, d) => s + d.loopSalary, 0), color: '#eab308' },
                                { name: '管理', value: filteredData.reduce((s, d) => s + d.manageSalary, 0), color: '#8b5cf6' },
                                { name: '社保', value: filteredData.reduce((s, d) => s + d.socialSecurity, 0), color: '#06b6d4' },
                                { name: '客服', value: filteredData.reduce((s, d) => s + d.serviceCost, 0), color: '#10b981' },
                                { name: '商业险', value: filteredData.reduce((s, d) => s + d.commercialInsurance, 0), color: '#3b82f6' },
                                { name: '其他', value: filteredData.reduce((s, d) => s + d.orderClaim + d.assessAmount, 0), color: '#6366f1' }
                              ]} cx="50%" cy="50%" outerRadius="70%" innerRadius="40%" paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name}`} labelLine={false}>
                                {[
                                  { name: '卸车', value: filteredData.reduce((s, d) => s + d.unloadSalary, 0), color: '#ef4444' },
                                  { name: '集包', value: filteredData.reduce((s, d) => s + d.packageSalary, 0), color: '#f97316' },
                                  { name: '环线', value: filteredData.reduce((s, d) => s + d.loopSalary, 0), color: '#eab308' },
                                  { name: '管理', value: filteredData.reduce((s, d) => s + d.manageSalary, 0), color: '#8b5cf6' },
                                  { name: '社保', value: filteredData.reduce((s, d) => s + d.socialSecurity, 0), color: '#06b6d4' },
                                  { name: '客服', value: filteredData.reduce((s, d) => s + d.serviceCost, 0), color: '#10b981' },
                                  { name: '商业险', value: filteredData.reduce((s, d) => s + d.commercialInsurance, 0), color: '#3b82f6' },
                                  { name: '其他', value: filteredData.reduce((s, d) => s + d.orderClaim + d.assessAmount, 0), color: '#6366f1' }
                                ].map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                              <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* 收支对比 */}
                    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-emerald-600/80 to-green-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TrendingUp className="w-4 h-4" />
                          收支利润对比
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="h-[250px]">
                          <ResponsiveContainer>
                            <BarChart data={[{
                              name: '汇总',
                              收入: Math.round(stats.totalRevenue || 0),
                              总成本: Math.round(stats.totalCost || 0),
                              薪资成本: Math.round(filteredData.reduce((s, d) => s + d.unloadSalary + d.packageSalary + d.loopSalary, 0)),
                              管理成本: Math.round(filteredData.reduce((s, d) => s + d.manageSalary + d.socialSecurity, 0)),
                              经营成本: Math.round(filteredData.reduce((s, d) => s + d.serviceCost + d.commercialInsurance + d.orderClaim + d.assessAmount, 0)),
                              利润: Math.round(stats.totalProfit || 0)
                            }]} layout="vertical" barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} />
                              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                              <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                              <Bar dataKey="收入" fill="#10b981" stackId="a" />
                              <Bar dataKey="薪资成本" fill="#ef4444" stackId="a" />
                              <Bar dataKey="管理成本" fill="#f97316" stackId="a" />
                              <Bar dataKey="经营成本" fill="#8b5cf6" stackId="a" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 第二行图表 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 收入成本趋势 */}
                    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-cyan-600/80 to-teal-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TrendingUp className="w-4 h-4" />
                          收入成本趋势
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="h-[280px]">
                          <ResponsiveContainer>
                            <AreaChart data={revenueDetailData.slice(0, 16)}>
                              <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={40} />
                              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                              <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 10 }} />
                              <Area type="monotone" dataKey="总收入" stroke="#10b981" fill="url(#colorIncome)" strokeWidth={2} />
                              <Area type="monotone" dataKey="总成本" stroke="#ef4444" fill="url(#colorCost)" strokeWidth={2} />
                              <Area type="monotone" dataKey="利润" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* 时段利润对比 */}
                    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-amber-600/80 to-orange-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4" />
                          各时段利润分布
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="h-[280px]">
                          <ResponsiveContainer>
                            <BarChart data={hourlyProfitData} barCategoryGap="10%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} />
                              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                              <Bar dataKey="利润" fill="#10b981">
                                {hourlyProfitData.map((entry, i) => (
                                  <Cell key={i} fill={entry.利润 >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 第三行图表 - 详细成本分析 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-violet-600/80 to-purple-600/80 text-white py-3 px-4 border-b border-slate-700/30">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4" />
                        详细成本分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="h-[300px]">
                        <ResponsiveContainer>
                          <LineChart data={revenueDetailData.slice(0, 16)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={40} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={50} />
                            <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
                            <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 9 }} />
                            <Line type="monotone" dataKey="卸车成本" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="集包成本" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="环线成本" stroke="#eab308" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="管理成本" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="社保" stroke="#06b6d4" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="客服" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="商业险" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 成本汇总统计 */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-600/80 to-slate-700/80 text-white py-3 px-4 border-b border-slate-700/30">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4" />
                        成本费用汇总
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <div className="text-center p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <p className="text-xs text-slate-400">卸车薪资</p>
                          <p className="text-sm font-bold text-red-400">¥{filteredData.reduce((s, d) => s + d.unloadSalary, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-xs text-slate-400">集包薪资</p>
                          <p className="text-sm font-bold text-orange-400">¥{filteredData.reduce((s, d) => s + d.packageSalary, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <p className="text-xs text-slate-400">环线薪资</p>
                          <p className="text-sm font-bold text-yellow-400">¥{filteredData.reduce((s, d) => s + d.loopSalary, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                          <p className="text-xs text-slate-400">管理薪资</p>
                          <p className="text-sm font-bold text-violet-400">¥{filteredData.reduce((s, d) => s + d.manageSalary, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                          <p className="text-xs text-slate-400">社保</p>
                          <p className="text-sm font-bold text-cyan-400">¥{filteredData.reduce((s, d) => s + d.socialSecurity, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <p className="text-xs text-slate-400">客服成本</p>
                          <p className="text-sm font-bold text-emerald-400">¥{filteredData.reduce((s, d) => s + d.serviceCost, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <p className="text-xs text-slate-400">商业险</p>
                          <p className="text-sm font-bold text-blue-400">¥{filteredData.reduce((s, d) => s + d.commercialInsurance, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                          <p className="text-xs text-slate-400">工单+考核</p>
                          <p className="text-sm font-bold text-indigo-400">¥{filteredData.reduce((s, d) => s + d.orderClaim + d.assessAmount, 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
