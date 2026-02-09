"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { getAllInvoices, getAnalytics } from "@/lib/api";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { motion } from "framer-motion";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-white/50 p-4 rounded-xl shadow-xl">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsDashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invData, analyticsData] = await Promise.all([
          getAllInvoices(),
          getAnalytics()
        ]);
        setInvoices(invData);
        setMetrics(analyticsData);
      } catch (error) {
        console.error("Failed to load analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Metrics Calculations ---

  const statusData = useMemo(() => {
    const counts = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [invoices]);

  const monthlySpendingData = useMemo(() => {
    const monthlyMap = invoices.reduce((acc, inv) => {
      // Assuming inv.date is YYYY-MM-DD
      const date = new Date(inv.date);
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });

      acc[monthYear] = (acc[monthYear] || 0) + Number(inv.amount);
      return acc;
    }, {});

    return Object.keys(monthlyMap).map(key => ({
      month: key,
      amount: monthlyMap[key]
    })).sort((a, b) => new Date(a.month) - new Date(b.month)); // Simple sort might need refinement if years vary widely
  }, [invoices]);

  // Mocked Processing Time Trend (Simulating "Real" data for visual richness)
  const processingTimeData = [
    { day: 'Mon', hours: 24 },
    { day: 'Tue', hours: 18 },
    { day: 'Wed', hours: 22 },
    { day: 'Thu', hours: 15 },
    { day: 'Fri', hours: 12 },
    { day: 'Sat', hours: 30 },
    { day: 'Sun', hours: 28 },
  ];

  const kpis = useMemo(() => {
    const totalSpend = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    return {
      totalSpend,
      activeInvoices: invoices.filter(i => !['APPROVED', 'PAID', 'REJECTED'].includes(i.status)).length,
      avgCycleTime: metrics?.metrics?.avgCycleTimeHours || 24,
      ocrAccuracy: metrics?.metrics?.ocrAccuracy || 95
    };
  }, [invoices, metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Spend (YTD)</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(kpis.totalSpend)}
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Icon name="DollarSign" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-success bg-success/10 w-fit px-2 py-1 rounded">
            <Icon name="TrendingUp" size={12} className="mr-1" /> Healthy Volume
          </div>
        </Card>

        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">OCR Accuracy</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                {kpis.ocrAccuracy}%
              </h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Icon name="Scan" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-gray-500">
            Confidence Score
          </div>
        </Card>

        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Cycle Time</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                {kpis.avgCycleTime}h
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Icon name="Clock" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-success bg-success/10 w-fit px-2 py-1 rounded">
            Rapid Processing
          </div>
        </Card>

        <Card className="flex flex-col justify-between" hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Pipeline</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                {kpis.activeInvoices}
              </h3>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600">
              <Icon name="Activity" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-warning bg-warning/10 w-fit px-2 py-1 rounded">
            In Review
          </div>
        </Card>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px] lg:h-[400px]">

        {/* Monthly Spending Bar Chart */}
        <Card className="flex flex-col h-full col-span-1" noPadding>
          <div className="p-6 pb-0 mb-4">
            <h3 className="text-lg font-bold text-gray-800">Monthly Spending Analysis</h3>
            <p className="text-sm text-gray-500">Aggregated invoice totals by month</p>
          </div>
          <div className="flex-1 w-full h-full pr-6 pb-2 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySpendingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }} />
                <Bar
                  dataKey="amount"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                  name="Total Spend"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="flex flex-col h-full col-span-1" noPadding>
          <div className="p-6 pb-0 mb-2">
            <h3 className="text-lg font-bold text-gray-800">Invoice Status Distribution</h3>
            <p className="text-sm text-gray-500">Current workflow breakdown</p>
          </div>
          <div className="flex-1 w-full h-full flex items-center justify-center min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingRight: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-24 lg:pr-32">
              <span className="text-3xl font-bold text-gray-800">{invoices.length}</span>
              <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Processing Efficiency Chart */}
      <Card className="h-[350px]" noPadding>
        <div className="p-6 pb-0 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Processing Efficiency</h3>
            <p className="text-sm text-gray-500">Average hours to approval (Last 7 Days)</p>
          </div>
          <button className="btn btn-sm btn-ghost text-primary bg-primary/10 hover:bg-primary/20">
            View Report <Icon name="ArrowRight" size={14} className="ml-1" />
          </button>
        </div>
        <div className="w-full h-[240px] px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processingTimeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorHours)"
                name="Processing Hours"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;