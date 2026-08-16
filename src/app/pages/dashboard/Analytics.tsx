'use client';

import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Package, TrendingUp as TrendingUpIcon, AlertTriangle, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api, ApiError } from "../../../lib/api-client";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";

import { useTranslation } from '@/hooks/useTranslation';
const COLORS = ["#2d5a3d", "#4a9d7a", "#c8a96e", "#0b7c33", "#68d391"];

type TimePeriod = "week" | "month" | "quarter" | "year";

const getDateRange = (period: TimePeriod) => {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { start, end: now };
};

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
};

function adaptOrder(raw: any): any {
  const items: any[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        ...it,
        productName: it.productName || it.name || `Product ${it.productId}`,
        name: it.productName || it.name || `Product ${it.productId}`,
        price: it.price ?? (it.amount ? it.amount / Math.max(it.quantity, 1) : 0),
        quantity: it.quantity ?? 0,
      }))
    : [];

  return {
    ...raw,
    items,
    orderDate: raw.orderDate || raw.createdAt || new Date().toISOString(),
    grandTotal: raw.grandTotal ?? raw.total ?? 0,
    status: raw.status || "Pending",
    customerName: raw.customerName || raw.customer?.name || "Unknown",
    id: raw.id || raw.orderId || raw.orderNumber || String(Math.random()),
  };
}

function adaptProduct(raw: any): any {
  return {
    ...raw,
    id: raw.id ?? raw.productId,
    name: raw.name || raw.productName || "Unnamed Product",
    stock: raw.stock ?? raw.quantity ?? 0,
  };
}

function adaptCustomer(raw: any): any {
  return {
    ...raw,
    id: raw.id ?? raw.customerId ?? raw.userId,
    name: raw.name || raw.fullName || raw.customerName || "Unknown",
    email: raw.email || "",
  };
}

function unwrapList(res: any): any[] {
  if (res?.success) return Array.isArray(res.data) ? res.data : [];
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export default function Analytics() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>("month");

  const loadAll = useCallback(async (showError = false) => {
    try {
      setError(null);
      const [ordRes, prodRes, custRes] = await Promise.all([
        api.get<any>('/orders'),
        api.get<any>('/products'),
        api.get<any>('/customers'),
      ]);

      const normalizedOrders = unwrapList(ordRes).map(adaptOrder);
      const normalizedProducts = unwrapList(prodRes).map(adaptProduct);
      const normalizedCustomers = unwrapList(custRes).map(adaptCustomer);

      setOrders(normalizedOrders);
      setProducts(normalizedProducts);
      setCustomers(normalizedCustomers);
      return true;
    } catch (err: any) {
      console.error('Failed to load analytics data:', err);
      if (showError) {
        setError(err instanceof ApiError ? err.message : 'Failed to load analytics data');
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadAll(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadAll]);

  // Calculate period-specific metrics
  const { start, end } = useMemo(() => getDateRange(period), [period]);
  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, start, end]);

  const previousOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= previousStart && orderDate < start;
    });
  }, [orders, previousStart, start]);

  const currentRevenue = filteredOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const revenueChange = calculateChange(currentRevenue, previousRevenue);

  const currentOrdersCount = filteredOrders.length;
  const previousOrdersCount = previousOrders.length;
  const ordersChange = calculateChange(currentOrdersCount, previousOrdersCount);

  const avgOrderValue = currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0;
  const previousAvgOrderValue = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0;
  const avgOrderChange = calculateChange(avgOrderValue, previousAvgOrderValue);

  // Calculate product performance for the current period
  const productPerformance = useMemo(() => {
    return products.map(product => {
      const productItems = filteredOrders.flatMap(order => 
        order.items.filter((item: any) => item.productId === product.id)
      );
      const totalSold = productItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        name: product.name,
        sold: totalSold,
        revenue: totalRevenue,
        stock: product.stock,
      };
    }).filter(p => p.sold > 0).sort((a, b) => b.revenue - a.revenue);
  }, [products, filteredOrders]);

  // Order status distribution for current period
  const orderStatusData = useMemo(() => [
    { name: "AWAITING_PAYMENT", value: filteredOrders.filter(o => o.status === "AWAITING_PAYMENT").length },
    { name: "CONFIRMED", value: filteredOrders.filter(o => o.status === "CONFIRMED").length },
    { name: "PROCESSING", value: filteredOrders.filter(o => o.status === "PROCESSING").length },
    { name: "SHIPPED", value: filteredOrders.filter(o => o.status === "SHIPPED").length },
    { name: "DELIVERED", value: filteredOrders.filter(o => o.status === "DELIVERED").length },
    { name: "CANCELLED", value: filteredOrders.filter(o => o.status === "CANCELLED").length },
    { name: "REFUNDED", value: filteredOrders.filter(o => o.status === "REFUNDED").length },
  ].filter(item => item.value > 0), [filteredOrders]);

  // Prepare period-specific data for charts
  const chartData = useMemo(() => {
    const data: any[] = [];
    const units = period === "year" ? 12 : period === "quarter" ? 13 : period === "month" ? 6 : 8;
    const interval = period === "year" ? "month" : period === "quarter" ? "week" : period === "month" ? "month" : "day";
    
    for (let i = units - 1; i >= 0; i--) {
      const date = new Date(end);
      let label = "";
      let startInterval = new Date(date);
      
      if (interval === "month") {
        startInterval.setMonth(date.getMonth() - i);
        startInterval.setDate(1);
        label = startInterval.toLocaleString("default", { month: "short" });
      } else if (interval === "week") {
        startInterval.setDate(date.getDate() - (i * 7));
        label = `${startInterval.toLocaleString("default", { month: "short" })} ${startInterval.getDate()}`;
      } else { // day
        startInterval.setDate(date.getDate() - i);
        label = startInterval.toLocaleString("default", { month: "short", day: "numeric" });
      }

      const endInterval = new Date(startInterval);
      if (interval === "month") {
        endInterval.setMonth(startInterval.getMonth() + 1);
      } else if (interval === "week") {
        endInterval.setDate(startInterval.getDate() + 7);
      } else {
        endInterval.setDate(startInterval.getDate() + 1);
      }

      const intervalOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= startInterval && orderDate < endInterval;
      });

      data.push({
        [interval]: label,
        revenue: intervalOrders.reduce((sum, order) => sum + order.grandTotal, 0),
        orders: intervalOrders.length,
      });
    }
    return data;
  }, [orders, end, period]);

  const stats = [
    { label: "Total Revenue", value: `₹${currentRevenue.toLocaleString()}`, change: revenueChange, trend: revenueChange.startsWith("+") || revenueChange === "N/A" ? "up" : "down", icon: DollarSign, color: "from-[#2d5a3d] to-[#0b7c33]" },
    { label: "Total Orders", value: currentOrdersCount.toLocaleString(), change: ordersChange, trend: ordersChange.startsWith("+") || ordersChange === "N/A" ? "up" : "down", icon: ShoppingBag, color: "from-[#c8a96e] to-[#a88b55]" },
    { label: "Total Customers", value: customers.length.toLocaleString(), change: "N/A", trend: "up", icon: Users, color: "from-[#4a9d7a] to-[#3a8d6a]" },
    { label: "Avg Order Value", value: `₹${avgOrderValue.toFixed(0)}`, change: avgOrderChange, trend: avgOrderChange.startsWith("+") || avgOrderChange === "N/A" ? "up" : "down", icon: TrendingUpIcon, color: "from-[#68d391] to-[#4a9d7a]" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Analytics
            </h1>
            <p className="text-[#78746e] mt-1">{t('dashboard.analytics.trackPerformance')}</p>
          </div>
          <div className="flex gap-2">
            {(["week", "month", "quarter", "year"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p 
                    ? "bg-[#2d5a3d] text-white" 
                    : "bg-white text-[#1c1917] hover:bg-[#f0f9f4]"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl p-4 flex items-start gap-3 border bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">
              Could not load analytics
            </p>
            <p className="text-sm text-red-700 mt-1 break-words">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await loadAll(true);
              } finally {
                setLoading(false);
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton UI */}
      {loading && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-8 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
              <div className="mb-6 space-y-2">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <Skeleton className="h-72 w-full rounded" />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
              <div className="mb-6 space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
              <Skeleton className="h-72 w-full rounded-full" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
            <div className="mb-6 space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <Skeleton className="h-80 w-full rounded" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
            <div className="mb-6 space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && !error && (
        <>
          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${stat.trend === "up" ? "text-[#2d5a3d]" : "text-red-500"}`}>
                      {stat.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span className="font-semibold">{stat.change}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[#78746e] mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#1c1917]">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue Trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.analytics.revenueTrend')}</h3>
                <p className="text-sm text-[#78746e]">{t('dashboard.analytics.revenueTrendDesc')}</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2d5a3d" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2d5a3d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f9f4" />
                    <XAxis 
                      dataKey={period === "year" ? "month" : period === "quarter" ? "week" : period === "month" ? "month" : "day"} 
                      stroke="#78746e" 
                    />
                    <YAxis stroke="#78746e" tickFormatter={(value) => `₹${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "white", border: "1px solid #2d5a3d20", borderRadius: "8px" }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2d5a3d" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.orders.orderStatus')}</h3>
                <p className="text-sm text-[#78746e]">{t('dashboard.analytics.distributionByStatus')}</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Product Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.analytics.productPerformance')}</h3>
              <p className="text-sm text-[#78746e]">{t('dashboard.home.topSellingProducts')}</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f9f4" />
                  <XAxis dataKey="name" stroke="#78746e" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#78746e" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "white", border: "1px solid #2d5a3d20", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#2d5a3d" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sold" fill="#4a9d7a" name="Units Sold" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.home.recentOrders')}</h3>
              <p className="text-sm text-[#78746e]">{t('dashboard.analytics.latest5Orders')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f0f9f4]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#78746e]">{t('dashboard.invoice.orderId')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#78746e]">{t('dashboard.customers.customer')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#78746e]">{t('dashboard.invoice.date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#78746e]">{t('dashboard.invoice.total')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#78746e]">{t('dashboard.products.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-[#f0f9f4] hover:bg-[#f0f9f4]/30">
                      <td className="py-3 px-4 text-sm font-medium text-[#1c1917]">{order.id}</td>
                      <td className="py-3 px-4 text-sm text-[#1c1917]">{order.customerName}</td>
                      <td className="py-3 px-4 text-sm text-[#78746e]">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#1c1917]">
                        ₹{order.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === "Delivered" ? "bg-green-100 text-green-700" :
                          order.status === "Shipped" ? "bg-blue-100 text-blue-700" :
                          order.status === "Processing" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "Pending" ? "bg-gray-100 text-gray-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
