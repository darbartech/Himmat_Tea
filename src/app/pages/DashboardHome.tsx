"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { Button } from "../../components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Eye,
  Coffee,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  Sparkles,
  CircleDot,
} from "lucide-react";
import { api } from "../../../lib/api-client";
import { useTranslation } from "../../../hooks/useTranslation";
import { BRAND } from "../../../config/brand";
import { formatCurrency, BASE_CURRENCY, isSupportedCurrency } from "../../../lib/currency";

/** Currency an order was placed/paid in, falling back safely to the base currency. */
const orderCurrency = (order: any): string => {
  const code = order?.customerCurrency || order?.baseCurrency || BASE_CURRENCY;
  return isSupportedCurrency(code) ? code : BASE_CURRENCY;
};

const getMonthDate = (monthsAgo: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
};

const getMonthRevenue = (monthDate: Date, orders: any[]) => {
  return orders.reduce((sum, order) => {
    const orderDate = new Date(order.orderDate || order.createdAt);
    if (
      orderDate.getFullYear() === monthDate.getFullYear() &&
      orderDate.getMonth() === monthDate.getMonth()
    ) {
      return sum + (Number(order.grandTotal) || 0);
    }
    return sum;
  }, 0);
};

const getMonthOrders = (monthDate: Date, orders: any[]) => {
  return orders.filter((order) => {
    const orderDate = new Date(order.orderDate || order.createdAt);
    return (
      orderDate.getFullYear() === monthDate.getFullYear() &&
      orderDate.getMonth() === monthDate.getMonth()
    );
  }).length;
};

const getMonthCustomers = (monthDate: Date, customers: any[]) => {
  return customers.length;
};

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
};

const getTopProductsBySales = (products: any[], orders: any[], limit: number = 5) => {
  const productSales = products.map((product) => {
    const totalSold = orders.reduce((sum, order) => {
      const productItems = (order.items || []).filter((item: any) => String(item.productId) === String(product.id));
      return sum + productItems.reduce((itemSum: number, item: any) => itemSum + (Number(item.quantity) || 0), 0);
    }, 0);
    const totalRevenue = orders.reduce((sum, order) => {
      const productItems = (order.items || []).filter((item: any) => String(item.productId) === String(product.id));
      return sum + productItems.reduce((itemSum: number, item: any) => itemSum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
    }, 0);
    return { ...product, totalSold, totalRevenue };
  });
  
  return productSales.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit);
};

const downloadReport = (orders: any[]) => {
  const escapeCSV = (value: any): string => {
    if (value == null) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const getPaymentStatus = (order: any): string => {
    if (order.payment?.status) {
      const s = String(order.payment.status);
      if (s === 'PAID') return 'Paid';
      if (s === 'PENDING') return 'Unpaid';
      if (s === 'FAILED') return 'Failed';
      if (s === 'REFUNDED') return 'Refunded';
      return s;
    }
    return order.paymentStatus || 'Unpaid';
  };

  const headers = ["Order Number", "Customer Name", "Email", "Phone", "Order Date", `Total (${BASE_CURRENCY})`, "Order Status", "Payment Status"];
  const rows = orders.map(order => [
    order.id,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    new Date(order.orderDate || order.createdAt).toLocaleString(),
    (Number(order.grandTotal) || 0).toFixed(2),
    order.status,
    getPaymentStatus(order)
  ]);
  
  const BOM = "\uFEFF";
  const csvContent = BOM + [
    headers.map(escapeCSV).join(","), 
    ...rows.map(row => row.map(escapeCSV).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${BRAND.companyName.replace(/ /g, '_')}_Orders_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function normalizeData<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data as T[];
    if (Array.isArray(raw.orders)) return raw.orders as T[];
    if (Array.isArray(raw.products)) return raw.products as T[];
    if (Array.isArray(raw.customers)) return raw.customers as T[];
    if (raw.success && Array.isArray(raw.data)) return raw.data as T[];
  }
  return [];
}

export default function DashboardHome() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, productsRes, customersRes, settingsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/products'),
        api.get('/customers'),
        api.get<any>('/settings'),
      ]);
      setOrders(normalizeData<any>(ordersRes));
      setProducts(normalizeData<any>(productsRes));
      setCustomers(normalizeData<any>(customersRes));
      const settingsData =
        settingsRes && typeof settingsRes === 'object' && !Array.isArray(settingsRes)
          ? ((settingsRes as any)?.data ?? settingsRes)
          : {};
      setSettings(settingsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const lowStockThreshold = settings?.lowStockThreshold ?? 30;
  const inventoryValue = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
  const lowStockProducts = products.filter(p => (Number(p.stock) || 0) <= lowStockThreshold);
  
  const currentMonth = getMonthDate(0);
  const previousMonth = getMonthDate(1);
  
  const currentMonthRevenue = getMonthRevenue(currentMonth, orders);
  const previousMonthRevenue = getMonthRevenue(previousMonth, orders);
  const revenueChange = calculateChange(currentMonthRevenue, previousMonthRevenue);
  
  const currentMonthOrders = getMonthOrders(currentMonth, orders);
  const previousMonthOrders = getMonthOrders(previousMonth, orders);
  const ordersChange = calculateChange(currentMonthOrders, previousMonthOrders);
  
  const currentMonthCustomers = getMonthCustomers(currentMonth, customers);
  const previousMonthCustomers = getMonthCustomers(previousMonth, customers);
  const customersChange = calculateChange(currentMonthCustomers, previousMonthCustomers);
  
  const productsChange = "0.0%";
  
  const topProducts = getTopProductsBySales(products, orders);

  const pendingOrders = orders.filter(o => String(o.status).toLowerCase() === "pending").length;
  const processingOrders = orders.filter(o => String(o.status).toLowerCase() === "processing").length;
  const shippedOrders = orders.filter(o => String(o.status).toLowerCase() === "shipped").length;
  const deliveredOrders = orders.filter(o => String(o.status).toLowerCase() === "delivered" || String(o.status).toLowerCase() === "completed").length;

  const stats = [
    {
      title: t("dashboard.home.totalRevenue"),
      value: formatCurrency(currentMonthRevenue, BASE_CURRENCY),
      change: revenueChange,
      trend: revenueChange.startsWith("+") ? "up" : "down",
      icon: DollarSign,
      iconBg: "bg-emerald-500",
      iconBgSoft: "bg-emerald-50",
      iconColor: "text-emerald-500",
      badge: t("dashboard.home.thisMonth"),
    },
    {
      title: t("dashboard.home.totalOrders"),
      value: currentMonthOrders.toString(),
      change: ordersChange,
      trend: ordersChange.startsWith("+") ? "up" : "down",
      icon: ShoppingBag,
      iconBg: "bg-amber-500",
      iconBgSoft: "bg-amber-50",
      iconColor: "text-amber-500",
      badge: `${pendingOrders} ${t("dashboard.home.pending")}`,
    },
    {
      title: t("dashboard.home.customers"),
      value: currentMonthCustomers.toString(),
      change: customersChange,
      trend: customersChange.startsWith("+") ? "up" : "down",
      icon: Users,
      iconBg: "bg-sky-500",
      iconBgSoft: "bg-sky-50",
      iconColor: "text-sky-500",
      badge: t("dashboard.home.active"),
    },
    {
      title: t("dashboard.home.products"),
      value: products.length.toString(),
      change: productsChange,
      trend: "up",
      icon: Package,
      iconBg: "bg-violet-500",
      iconBgSoft: "bg-violet-50",
      iconColor: "text-violet-500",
      badge: `${lowStockProducts.length} ${t("dashboard.home.lowStock")}`,
    },
  ];

  const orderStatusSummary = [
    { label: t("dashboard.status.pending"), count: pendingOrders, color: "text-amber-700", bg: "bg-amber-100", bgSoft: "bg-amber-50", icon: Clock },
    { label: t("dashboard.status.processing"), count: processingOrders, color: "text-sky-700", bg: "bg-sky-100", bgSoft: "bg-sky-50", icon: CircleDot },
    { label: t("dashboard.status.shipped"), count: shippedOrders, color: "text-violet-700", bg: "bg-violet-100", bgSoft: "bg-violet-50", icon: Truck },
    { label: t("dashboard.status.delivered"), count: deliveredOrders, color: "text-emerald-700", bg: "bg-emerald-100", bgSoft: "bg-emerald-50", icon: CheckCircle },
  ];

  const getStatusStyles = (status: string) => {
    switch (String(status).toLowerCase()) {
      case "completed":
      case "delivered":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "processing":
        return "bg-sky-50 text-sky-700 border border-sky-100";
      case "shipped":
        return "bg-violet-50 text-violet-700 border border-violet-100";
      case "pending":
        return "bg-amber-50 text-amber-700 border border-amber-100";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-100";
      case "refunded":
        return "bg-orange-50 text-orange-700 border border-orange-100";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-100";
    }
  };

  const recentOrders = orders.slice(0, 6);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2d5a3d]/10 text-[#2d5a3d]">
              <Sparkles className="h-3.5 w-3.5" />
              {today}
            </span>
          </div>
          <h1
            className="text-3xl lg:text-4xl font-bold text-[#1c1917] tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {t("dashboard.home.title")}
          </h1>
          <p className="text-[#5e5b53] mt-2 text-base">{t("dashboard.home.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              try {
                downloadReport(orders);
                notify.success(t("dashboard.home.reportDownloaded"));
              } catch (error) {
                console.error("Download failed:", error);
                notify.error("Failed to download report. Please try again.");
              }
            }}
            className="px-4 py-3 rounded-2xl border border-[#e8e9e5] bg-white text-[#1c1917] font-medium hover:bg-[#fafaf8] hover:border-[#d4d6cf] transition-all duration-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t("dashboard.home.downloadReport")}
          </button>
          <button
            onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2d5a3d] text-white font-medium hover:bg-[#234832] transition-colors duration-200 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.home.newOrder")}
          </button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-3xl p-5 flex items-start gap-4 border ${
          error
            ? 'bg-red-50 border-red-200'
            : 'bg-emerald-50 border-emerald-100'
        }`}>
          {error ? (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-[#2d5a3d]/30 border-t-[#2d5a3d] animate-spin shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-[#1c1917]'}`}>
              {loading && !error ? t('dashboard.home.loadingDashboard') : t('dashboard.home.failedToLoad')}
            </p>
            {error && <p className="text-sm text-red-700 mt-1 break-words">{error}</p>}
          </div>
          {error && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadAll()}
              className="rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {t('dashboard.home.retry')}
            </Button>
          )}
        </div>
      )}

      {!loading && !error && lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
          <div className="flex items-start gap-4 flex-col sm:flex-row">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-7 w-7 text-white shrink-0" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-amber-900 mb-1">
                {t("dashboard.home.lowStockAlertTitle")}
              </h3>
              <p className="text-amber-800/90">
                {lowStockProducts.length === 1
                  ? t("dashboard.home.lowStockProductsText.singular", { count: lowStockProducts.length })
                  : t("dashboard.home.lowStockProductsText.plural", { count: lowStockProducts.length })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <span
                    key={product.id}
                    className="px-3.5 py-2 bg-white rounded-xl text-sm font-medium text-amber-900 border border-amber-200"
                  >
                    {product.name} <span className="text-amber-700 font-semibold">({product.stock})</span>
                  </span>
                ))}
                {lowStockProducts.length > 5 && (
                  <span className="px-3.5 py-2 bg-white rounded-xl text-sm font-semibold text-amber-800 border border-amber-200">
                    +{lowStockProducts.length - 5} {t("dashboard.common.more")}
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={() => router.push("/himmat_admin_8526/dashboard/inventory")}
              className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 font-medium"
            >
              {t("dashboard.home.manageInventory")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
              const isUp = stat.trend === "up";
              return (
                <div
                  key={stat.title}
                  className="bg-white rounded-3xl p-6 border border-gray-100"
                >
                  <div>
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${stat.iconBgSoft} ${stat.iconColor} flex items-center justify-center`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 text-[#5e5b53] border border-gray-100">
                        {stat.badge}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-sm text-[#5e5b53] font-medium">{stat.title}</p>
                      <p className="text-3xl lg:text-4xl font-bold text-[#1c1917] tracking-tight">{stat.value}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          <TrendIcon className="h-3.5 w-3.5" />
                          <span>{stat.change}</span>
                        </div>
                        <span className="text-xs text-[#78746e] font-medium">{t("dashboard.home.vsLastMonth")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="px-7 py-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#1c1917]">{t("dashboard.home.orderStatus")}</h3>
                <p className="text-sm text-[#5e5b53] mt-1">{t("dashboard.home.orderStatusDesc")}</p>
              </div>
              <button
                onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2d5a3d] hover:text-[#234832] transition-colors px-3 py-1.5 rounded-xl hover:bg-[#2d5a3d]/5"
              >
                <Filter className="h-4 w-4" />
                {t("dashboard.home.viewAll")}
              </button>
            </div>
            <div className="p-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {orderStatusSummary.map((status) => {
                  const Icon = status.icon;
                  return (
                    <button
                      key={status.label}
                      onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                      className={`flex items-center gap-4 p-5 rounded-2xl ${status.bgSoft} transition-colors duration-200 border border-transparent hover:border-gray-100 text-left`}
                    >
                      <div className={`w-14 h-14 rounded-2xl ${status.bg} ${status.color} flex items-center justify-center`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#5e5b53]">{status.label}</p>
                        <div className="flex items-end gap-2 mt-1">
                          <p className={`text-3xl font-bold ${status.color} tracking-tight`}>{status.count}</p>
                          <ArrowUpRight className={`h-4 w-4 mb-2 ${status.color} opacity-0 hover:opacity-100 transition-opacity duration-200`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 overflow-hidden">
              <div className="px-7 py-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1c1917]">{t("dashboard.home.recentOrders")}</h2>
                  <p className="text-sm text-[#5e5b53] mt-1">{t("dashboard.home.latestOrders")}</p>
                </div>
                <button
                  onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a3d] hover:text-[#234832] transition-colors px-4 py-2 rounded-2xl hover:bg-[#2d5a3d]/5"
                >
                  {t("dashboard.home.viewAll")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#5e5b53] bg-gray-50/50">
                      <th className="px-7 py-4 font-semibold">{t("dashboard.home.orderId")}</th>
                      <th className="px-7 py-4 font-semibold">{t("dashboard.home.customer")}</th>
                      <th className="px-7 py-4 font-semibold">{t("dashboard.home.date")}</th>
                      <th className="px-7 py-4 font-semibold">{t("dashboard.home.total")}</th>
                      <th className="px-7 py-4 font-semibold">{t("dashboard.home.status")}</th>
                      <th className="px-7 py-4 font-semibold text-right">{t("dashboard.home.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="group hover:bg-emerald-50/30 transition-colors duration-200">
                        <td className="px-7 py-5">
                          <span className="font-bold text-[#1c1917]">#{order.id}</span>
                        </td>
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#2d5a3d] flex items-center justify-center text-white text-sm font-bold">
                              {(order.customerName || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[#1c1917]">{order.customerName}</p>
                              <p className="text-xs text-[#78746e]">{order.customerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-5">
                          <span className="text-sm text-[#5e5b53] font-medium">{new Date(order.orderDate || order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </td>
                        <td className="px-7 py-5">
                          <span className="font-bold text-[#1c1917] text-lg">{formatCurrency(Number(order.convertedGrandTotal ?? order.grandTotal) || 0, orderCurrency(order))}</span>
                        </td>
                        <td className="px-7 py-5">
                          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold ${getStatusStyles(order.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-60" />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-7 py-5 text-right">
                          <button className="inline-flex items-center justify-center p-2.5 rounded-xl hover:bg-[#2d5a3d]/10 transition-colors text-[#5e5b53] hover:text-[#2d5a3d]">
                            <Eye className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                <div className="px-7 py-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1c1917]">{t("dashboard.home.topProducts")}</h2>
                    <p className="text-sm text-[#5e5b53] mt-1">{t("dashboard.home.thisMonthBestSellers")}</p>
                  </div>
                </div>
                <div className="p-7 space-y-4">
                  {topProducts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-[#78746e]">{t("dashboard.home.noSalesData")}</p>
                    </div>
                  ) : (
                    topProducts.map((product, index) => (
                      <div key={product.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <div className={`relative w-12 h-12 rounded-2xl ${
                            index === 0 ? "bg-amber-500" :
                            index === 1 ? "bg-gray-500" :
                            index === 2 ? "bg-orange-500" :
                            index === 3 ? "bg-sky-500" :
                            "bg-violet-500"
                          } flex items-center justify-center text-white font-bold`}>
                            {index + 1}
                            {index < 3 && (
                              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1c1917] group-hover:text-[#2d5a3d] transition-colors line-clamp-1 max-w-[180px]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[#78746e] mt-0.5 font-medium">
                              {formatCurrency(product.totalRevenue, BASE_CURRENCY)} · {product.totalSold} sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-bold ${
                            (Number(product.stock) || 0) > lowStockThreshold ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            (Number(product.stock) || 0) > 0 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                            {(Number(product.stock) || 0) > lowStockThreshold ? "In Stock" :
                             (Number(product.stock) || 0) > 0 ? "Low Stock" : "Out"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {topProducts.length > 0 && (
                  <div className="px-7 pb-7">
                    <button
                      onClick={() => router.push("/himmat_admin_8526/dashboard/products")}
                      className="w-full py-3.5 rounded-2xl bg-emerald-50 text-[#2d5a3d] font-semibold hover:bg-emerald-100 transition-colors duration-200 flex items-center justify-center gap-2 border border-emerald-100"
                    >
                      {t("dashboard.home.viewAllProducts")}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[#2d5a3d] rounded-3xl p-7 text-white">
                <div>
                  <div className="flex items-center gap-4 mb-7">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                      <Coffee className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{t("dashboard.home.quickActions")}</h2>
                      <p className="text-sm text-white/80 mt-1">{t('dashboard.home.shortcuts')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push("/himmat_admin_8526/dashboard/products")}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors duration-200 border border-white/10 hover:border-white/20 group"
                    >
                      <span className="font-semibold flex items-center gap-3 text-white">
                        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                          <Plus className="h-4 w-4" />
                        </div>
                        {t("dashboard.home.addNewProduct")}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                    </button>
                    <button
                      onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors duration-200 border border-white/10 hover:border-white/20 group"
                    >
                      <span className="font-semibold flex items-center gap-3 text-white">
                        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        {t("dashboard.home.processOrders")}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                    </button>
                    <button
                      onClick={() => router.push("/himmat_admin_8526/dashboard/customers")}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors duration-200 border border-white/10 hover:border-white/20 group"
                    >
                      <span className="font-semibold flex items-center gap-3 text-white">
                        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        View customers
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
