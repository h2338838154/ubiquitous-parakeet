'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  Download, FileSpreadsheet, Calendar, FileUp, Users, TrendingUp, DollarSign, Package,
  Cloud, Sun, Moon
} from 'lucide-react';

// 示例数据
const EXAMPLE_DATA = [
  { date: '2024-03-01', timeSlot: '08:00-10:00', shift: '白班', unloadCount: 1200, loopCount: 3500, packageCount: 2800 },
  { date: '2024-03-01', timeSlot: '10:00-12:00', shift: '白班', unloadCount: 1500, loopCount: 4200, packageCount: 3500 },
  { date: '2024-03-01', timeSlot: '14:00-16:00', shift: '白班', unloadCount: 1100, loopCount: 3800, packageCount: 3000 },
  { date: '2024-03-01', timeSlot: '16:00-18:00', shift: '白班', unloadCount: 1300, loopCount: 4000, packageCount: 3200 },
  { date: '2024-03-01', timeSlot: '18:00-20:00', shift: '夜班', unloadCount: 800, loopCount: 2500, packageCount: 2000 },
  { date: '2024-03-01', timeSlot: '20:00-22:00', shift: '夜班', unloadCount: 900, loopCount: 2800, packageCount: 2200 },
  { date: '2024-03-02', timeSlot: '08:00-10:00', shift: '白班', unloadCount: 1350, loopCount: 3900, packageCount: 3100 },
  { date: '2024-03-02', timeSlot: '10:00-12:00', shift: '白班', unloadCount: 1600, loopCount: 4500, packageCount: 3700 },
  { date: '2024-03-02', timeSlot: '14:00-16:00', shift: '白班', unloadCount: 1200, loopCount: 3600, packageCount: 2900 },
  { date: '2024-03-02', timeSlot: '16:00-18:00', shift: '白班', unloadCount: 1400, loopCount: 4100, packageCount: 3300 },
  { date: '2024-03-02', timeSlot: '18:00-20:00', shift: '夜班', unloadCount: 850, loopCount: 2600, packageCount: 2100 },
  { date: '2024-03-02', timeSlot: '20:00-22:00', shift: '夜班', unloadCount: 950, loopCount: 2900, packageCount: 2300 },
  { date: '2024-03-03', timeSlot: '08:00-10:00', shift: '白班', unloadCount: 1100, loopCount: 3200, packageCount: 2600 },
  { date: '2024-03-03', timeSlot: '10:00-12:00', shift: '白班', unloadCount: 1450, loopCount: 4300, packageCount: 3400 },
  { date: '2024-03-03', timeSlot: '14:00-16:00', shift: '白班', unloadCount: 1050, loopCount: 3400, packageCount: 2700 },
  { date: '2024-03-03', timeSlot: '16:00-18:00', shift: '白班', unloadCount: 1250, loopCount: 3800, packageCount: 3000 },
  { date: '2024-03-03', timeSlot: '18:00-20:00', shift: '夜班', unloadCount: 750, loopCount: 2400, packageCount: 1900 },
  { date: '2024-03-03', timeSlot: '20:00-22:00', shift: '夜班', unloadCount: 850, loopCount: 2700, packageCount: 2100 },
];

const SHIFT_CONFIG = {
  '2024-03-01': { white: 70, middle: 0, night: 95 },
  '2024-03-02': { white: 75, middle: 0, night: 90 },
  '2024-03-03': { white: 68, middle: 0, night: 92 },
};

const STATS_CONFIG = {
  salaryBase: 180, manageSalary: 350, targetPackage: 400, targetLoop: 300, pricePackage: 0.35, priceLoop: 0.25
};

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'daily' | 'charts'>('config');
  const [uploadedData] = useState(EXAMPLE_DATA);
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const staffConfig: Record<string, { white: number; middle: number; night: number }> = SHIFT_CONFIG;
  const [configDate, setConfigDate] = useState('2024-03-01');

  const filteredData = uploadedData.filter(d => {
    if (selectedDate !== 'all' && d.date !== selectedDate) return false;
    if (selectedShift !== 'all' && d.shift !== selectedShift) return false;
    return true;
  });

  const dates = [...new Set(uploadedData.map(d => d.date))].sort();

  const totals = filteredData.reduce((acc, d) => ({
    unload: acc.unload + d.unloadCount,
    loop: acc.loop + d.loopCount,
    package: acc.package + d.packageCount
  }), { unload: 0, loop: 0, package: 0 });

  const stats = {
    totalUnload: totals.unload,
    totalLoop: totals.loop,
    totalPackage: totals.package,
    manageCost: dates.length * STATS_CONFIG.manageSalary * 4,
    loopSalary: totals.loop * STATS_CONFIG.priceLoop,
    packageSalary: totals.package * STATS_CONFIG.pricePackage,
    loopRevenue: totals.loop * STATS_CONFIG.targetLoop,
    packageRevenue: totals.package * STATS_CONFIG.targetPackage,
    totalSalary: totals.loop * STATS_CONFIG.priceLoop + totals.package * STATS_CONFIG.pricePackage + dates.length * STATS_CONFIG.manageSalary * 4,
    totalRevenue: totals.loop * STATS_CONFIG.targetLoop + totals.package * STATS_CONFIG.targetPackage,
    totalProfit: totals.loop * (STATS_CONFIG.targetLoop - STATS_CONFIG.priceLoop) + totals.package * (STATS_CONFIG.targetPackage - STATS_CONFIG.pricePackage) - dates.length * STATS_CONFIG.manageSalary * 4,
  };

  const pieData = [
    { name: '卸车量', value: totals.unload, color: '#6366f1' },
    { name: '环线量', value: totals.loop, color: '#8b5cf6' },
    { name: '集包量', value: totals.package, color: '#06b6d4' },
  ];

  const costTrendData = dates.map(d => {
    const dayData = uploadedData.filter(data => data.date === d);
    const dayTotals = dayData.reduce((acc, dd) => ({ unload: acc.unload + dd.unloadCount, loop: acc.loop + dd.loopCount, package: acc.package + dd.packageCount }), { unload: 0, loop: 0, package: 0 });
    return {
      date: d.slice(5),
      卸车成本: Math.round(dayTotals.unload * 0.25),
      环线成本: Math.round(dayTotals.loop * STATS_CONFIG.priceLoop),
      集包成本: Math.round(dayTotals.package * STATS_CONFIG.pricePackage),
      管理成本: STATS_CONFIG.manageSalary * 4
    };
  });

  const revenueData = dates.map(d => {
    const dayData = uploadedData.filter(data => data.date === d);
    const dayTotals = dayData.reduce((acc, dd) => ({ loop: acc.loop + dd.loopCount, package: acc.package + dd.packageCount }), { loop: 0, package: 0 });
    return {
      date: d.slice(5),
      环线收入: Math.round(dayTotals.loop * STATS_CONFIG.targetLoop),
      集包收入: Math.round(dayTotals.package * STATS_CONFIG.targetPackage)
    };
  });

  const profitData = dates.map(d => {
    const dayData = uploadedData.filter(data => data.date === d);
    const dayTotals = dayData.reduce((acc, dd) => ({ loop: acc.loop + dd.loopCount, package: acc.package + dd.packageCount }), { loop: 0, package: 0 });
    const dayProfit = dayTotals.loop * (STATS_CONFIG.targetLoop - STATS_CONFIG.priceLoop) + dayTotals.package * (STATS_CONFIG.targetPackage - STATS_CONFIG.pricePackage) - STATS_CONFIG.manageSalary * 4;
    return { date: d.slice(5), 收入: Math.round(dayTotals.loop * STATS_CONFIG.targetLoop + dayTotals.package * STATS_CONFIG.targetPackage), 利润: Math.round(dayProfit) };
  });

  const profitByShift = ['白班', '夜班'].map(shift => {
    const shiftData = uploadedData.filter(d => d.shift === shift);
    const totals = shiftData.reduce((acc, d) => ({ loop: acc.loop + d.loopCount, package: acc.package + d.packageCount }), { loop: 0, package: 0 });
    const profit = totals.loop * (STATS_CONFIG.targetLoop - STATS_CONFIG.priceLoop) + totals.package * (STATS_CONFIG.targetPackage - STATS_CONFIG.pricePackage) - dates.length * STATS_CONFIG.manageSalary * 2;
    return { shift, profit: Math.round(profit) };
  });

  const dailyStats = dates.map(d => {
    const dayData = uploadedData.filter(data => data.date === d);
    const dayTotals = dayData.reduce((acc, dd) => ({ loop: acc.loop + dd.loopCount, package: acc.package + dd.packageCount }), { loop: 0, package: 0 });
    const profit = dayTotals.loop * (STATS_CONFIG.targetLoop - STATS_CONFIG.priceLoop) + dayTotals.package * (STATS_CONFIG.targetPackage - STATS_CONFIG.pricePackage) - STATS_CONFIG.manageSalary * 4;
    return { date: d, profit: Math.round(profit), revenue: Math.round(dayTotals.loop * STATS_CONFIG.targetLoop + dayTotals.package * STATS_CONFIG.targetPackage), salary: Math.round(dayTotals.loop * STATS_CONFIG.priceLoop + dayTotals.package * STATS_CONFIG.pricePackage + STATS_CONFIG.manageSalary * 4) };
  });

  const config = staffConfig[configDate] || { white: 70, middle: 0, night: 95 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              智能物流绩效分析系统
            </h1>
            <p className="text-slate-400 mt-1">数据驱动 · 智能排班 · 绩效可视化</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-300">本地演示模式</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: 'config', label: '班次配置', icon: Package },
            { id: 'daily', label: '每日汇总', icon: Calendar },
            { id: 'charts', label: '数据看板', icon: TrendingUp },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`gap-2 ${activeTab === tab.id ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-white">筛选条件</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">日期</label>
                      <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部日期</SelectItem>
                          {dates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">班次</label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部班次</SelectItem>
                          <SelectItem value="白班"><span className="flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-400" />白班</span></SelectItem>
                          <SelectItem value="夜班"><span className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-400" />夜班</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 bg-slate-700 border-slate-600 text-slate-300" onClick={() => setSelectedShift('白班')}>
                        <Sun className="w-4 h-4 mr-1 text-yellow-400" />白班
                      </Button>
                      <Button variant="outline" className="flex-1 bg-slate-700 border-slate-600 text-slate-300" onClick={() => setSelectedShift('夜班')}>
                        <Moon className="w-4 h-4 mr-1 text-blue-400" />夜班
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-white">数据明细</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-700/50">
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">日期</TableHead>
                          <TableHead className="text-slate-300">时段</TableHead>
                          <TableHead className="text-slate-300">班次</TableHead>
                          <TableHead className="text-cyan-400">卸车量</TableHead>
                          <TableHead className="text-purple-400">环线量</TableHead>
                          <TableHead className="text-blue-400">集包量</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row, i) => (
                          <TableRow key={i} className="border-slate-700 hover:bg-slate-700/30">
                            <TableCell className="text-slate-300">{row.date}</TableCell>
                            <TableCell className="text-slate-300">{row.timeSlot}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${row.shift === '白班' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {row.shift}
                              </span>
                            </TableCell>
                            <TableCell className="text-cyan-400 font-medium">{row.unloadCount.toLocaleString()}</TableCell>
                            <TableCell className="text-purple-400 font-medium">{row.loopCount.toLocaleString()}</TableCell>
                            <TableCell className="text-blue-400 font-medium">{row.packageCount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-white">班次配置</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <label className="text-sm text-slate-400 mb-2 block">配置日期</label>
                    <Select value={configDate} onValueChange={setConfigDate}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400 font-medium">白班</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">{config.white}人</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-5 h-5 text-blue-400" />
                        <span className="text-blue-400 font-medium">夜班</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{config.night}人</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-white">统计卡片</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-cyan-500/10 rounded-lg p-3">
                      <div className="text-xs text-slate-400">卸车总量</div>
                      <div className="text-xl font-bold text-cyan-400">{stats.totalUnload.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-3">
                      <div className="text-xs text-slate-400">环线总量</div>
                      <div className="text-xl font-bold text-purple-400">{stats.totalLoop.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-3">
                      <div className="text-xs text-slate-400">集包总量</div>
                      <div className="text-xl font-bold text-blue-400">{stats.totalPackage.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-3">
                      <div className="text-xs text-slate-400">总利润</div>
                      <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'daily' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">每日汇总</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-700/50">
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">日期</TableHead>
                      <TableHead className="text-green-400">总收入</TableHead>
                      <TableHead className="text-orange-400">总薪资</TableHead>
                      <TableHead className="text-cyan-400">总利润</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map((row, i) => (
                      <TableRow key={i} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell className="text-slate-300 font-medium">{row.date}</TableCell>
                        <TableCell className="text-green-400">¥{row.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-orange-400">¥{row.salary.toLocaleString()}</TableCell>
                        <TableCell className={`font-bold ${row.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.profit >= 0 ? '+' : ''}¥{row.profit.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white">业务量占比</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white">成本结构趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="卸车成本" stroke="#6366f1" strokeWidth={2} />
                    <Line type="monotone" dataKey="环线成本" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="集包成本" stroke="#06b6d4" strokeWidth={2} />
                    <Line type="monotone" dataKey="管理成本" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white">收入明细趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="环线收入" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="集包收入" stroke="#06b6d4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white">利润趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="收入" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="利润" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white">时段利润对比</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitByShift}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="shift" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="profit" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                      {profitByShift.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
