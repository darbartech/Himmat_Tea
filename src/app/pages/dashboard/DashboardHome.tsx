import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  MoreHorizontal,
  Coffee,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../lib/api-client";
import { useTranslation } from "../../../hooks/useTranslation";
import { BRAND } from "../../../config/brand";

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
  return customers.filter((customer) => {
    return true;
  }).length;
};

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
};

const getTopProductsBySales = (products: any[], orders: any[], limit: number = 4) => {
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

  const headers = ["Order ID", "Customer Name", "Email", "Phone", "Date", "Total (₹)", "Status", "Payment Status"];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        api.get('/orders'),
        api.get('/products'),
        api.get('/customers'),
      ]);
      setOrders(normalizeData<any>(ordersRes));
      setProducts(normalizeData<any>(productsRes));
      setCustomers(normalizeData<any>(customersRes));
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const lowStockThreshold = 30;
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
      value: "₹" + currentMonthRevenue.toLocaleString(),
      change: revenueChange,
      trend: revenueChange.startsWith("+") ? "up" : "down",
      icon: DollarSign,
      color: "from-[#2d5a3d] to-[#0b7c33]",
      bg: "bg-[#2d5a3d]/10",
      badge: t("dashboard.home.thisMonth"),
    },
    {
      title: t("dashboard.home.totalOrders"),
      value: currentMonthOrders.toString(),
      change: ordersChange,
      trend: ordersChange.startsWith("+") ? "up" : "down",
      icon: ShoppingBag,
      color: "from-[#c8a96e] to-[#a88b55]",
      bg: "bg-[#c8a96e]/10",
      badge: `${pendingOrders} ${t("dashboard.home.pending")}`,
    },
    {
      title: t("dashboard.home.customers"),
      value: currentMonthCustomers.toString(),
      change: customersChange,
      trend: customersChange.startsWith("+") ? "up" : "down",
      icon: Users,
      color: "from-[#4a9d7a] to-[#3a8d6a]",
      bg: "bg-[#4a9d7a]/10",
      badge: t("dashboard.home.active"),
    },
    {
      title: t("dashboard.home.products"),
      value: products.length.toString(),
      change: productsChange,
      trend: "up",
      icon: Package,
      color: "from-[#6b7280] to-[#4b5563]",
      bg: "bg-[#6b7280]/10",
      badge: `${lowStockProducts.length} ${t("dashboard.home.lowStock")}`,
    },
  ];

  const orderStatusSummary = [
    { label: t("dashboard.status.pending"), count: pendingOrders, color: "text-[#92400e]", bg: "bg-[#fef3c7]", icon: Clock },
    { label: t("dashboard.status.processing"), count: processingOrders, color: "text-[#0369a1]", bg: "bg-[#e0f2fe]", icon: Zap },
    { label: t("dashboard.status.shipped"), count: shippedOrders, color: "text-[#7e22ce]", bg: "bg-[#f0e7ff]", icon: Truck },
    { label: t("dashboard.status.delivered"), count: deliveredOrders, color: "text-[#2d5a3d]", bg: "bg-[#e8f5ed]", icon: CheckCircle },
  ];

  const getStatusStyles = (status: string) => {
    switch (String(status).toLowerCase()) {
      case "completed":
      case "delivered":
        return "bg-[#e8f5ed] text-[#2d5a3d]";
      case "processing":
        return "bg-[#e0f2fe] text-[#0369a1]";
      case "shipped":
        return "bg-[#f0e7ff] text-[#7e22ce]";
      case "pending":
        return "bg-[#fef3c7] text-[#92400e]";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t("dashboard.home.title")}
          </h1>
          <p className="text-[#78746e] mt-1">{t("dashboard.home.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              try {
                console.log("Downloading report, orders count:", orders.length);
                downloadReport(orders);
                toast.success(t("dashboard.home.reportDownloaded"));
              } catch (error) {
                console.error("Download failed:", error);
                toast.error("Failed to download report. Please try again.");
              }
            }}
            className="px-4 py-2.5 rounded-xl border border-[#2d5a3d]/20 text-[#1c1917] font-medium hover:bg-[#f0f9f4] transition-all duration-200 flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            {t("dashboard.home.downloadReport")}
          </button>
          <button 
            onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a3d] text-white font-medium hover:bg-[#234832] transition-all duration-200 shadow-md shadow-[#2d5a3d]/20"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.home.newOrder")}
          </button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${
          error
            ? 'bg-red-50 border-red-200'
            : 'bg-[#2d5a3d]/5 border-[#2d5a3d]/15'
        }`}>
          {error ? (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-[#2d5a3d]/30 border-t-[#2d5a3d] animate-spin shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-[#1c1917]'}`}>
              {loading && !error ? 'Loading dashboard…' : 'Could not load dashboard data'}
            </p>
            {error && <p className="text-sm text-red-700 mt-1 break-words">{error}</p>}
          </div>
          {error && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadAll()}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && lowStockProducts.length > 0 && (
        <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-[#92400e] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#92400e]">
                {t("dashboard.home.lowStockAlertTitle")}
              </h3>
              <p className="text-[#78350f] mt-1">
                {lowStockProducts.length === 1 
                  ? t("dashboard.home.lowStockProductsText.singular", { count: lowStockProducts.length })
                  : t("dashboard.home.lowStockProductsText.plural", { count: lowStockProducts.length })
                }
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <span
                    key={product.id}
                    className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-[#1c1917] border border-[#f59e0b]/30"
                  >
                    {product.name} ({product.stock} {t("dashboard.common.units")})
                  </span>
                ))}
                {lowStockProducts.length > 5 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-[#78350f] border border-[#f59e0b]/30">
                    +{lowStockProducts.length - 5} {t("dashboard.common.more")}
                  </span>
                )}
              </div>
            </div>
            <Button
              className="bg-[#92400e] hover:bg-[#78350f] text-white"
              onClick={() => router.push("/himmat_admin_8526/dashboard/inventory")}
            >
              {t("dashboard.home.manageInventory")}
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5">
            <h3 className="text-sm font-semibold text-[#1c1917] mb-4">{t("dashboard.home.orderStatus")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {orderStatusSummary.map((status) => {
                const Icon = status.icon;
                return (
                  <div key={status.label} className="flex items-center gap-3 p-4 rounded-xl bg-[#f9f7f4] hover:bg-[#f0ede8] transition-colors cursor-pointer" onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}>
                    <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${status.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-[#78746e] font-medium">{status.label}</p>
                      <p className={`text-2xl font-bold ${status.color}`}>{status.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
              return (
                <div 
                  key={stat.title} 
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-[#2d5a3d]/5 hover:border-[#2d5a3d]/15"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f9f7f4] text-[#78746e]">
                      {stat.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                      <p className="text-sm text-[#78746e] font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-[#1c1917]">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${
                          stat.trend === "up" ? "text-[#2d5a3d]" : "text-red-600"
                        }`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{stat.change}</span>
                        </div>
                        <span className="text-sm text-[#78746e]">{t("dashboard.home.vsLastMonth")}</span>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
              <div className="p-6 border-b border-[#2d5a3d]/5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1c1917]">{t("dashboard.home.recentOrders")}</h2>
                  <p className="text-sm text-[#78746e]">{t("dashboard.home.latestOrders")}</p>
                </div>
                <button 
                  onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                  className="flex items-center gap-2 text-[#2d5a3d] font-medium hover:text-[#234832] transition-colors"
                >
                  {t("dashboard.home.viewAll")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-[#78746e] border-b border-[#2d5a3d]/5">
                        <th className="pb-3 font-medium">{t("dashboard.home.orderId")}</th>
                        <th className="pb-3 font-medium">{t("dashboard.home.customer")}</th>
                        <th className="pb-3 font-medium">{t("dashboard.home.date")}</th>
                        <th className="pb-3 font-medium">{t("dashboard.home.total")}</th>
                        <th className="pb-3 font-medium">{t("dashboard.home.status")}</th>
                        <th className="pb-3 font-medium">{t("dashboard.home.action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d5a3d]/5">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="group hover:bg-[#f9f7f4] transition-colors">
                          <td className="py-4">
                            <span className="font-medium text-[#1c1917]">{order.id}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[#1c1917]">{order.customerName}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[#78746e]">{new Date(order.orderDate || order.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="py-4">
                            <span className="font-semibold text-[#1c1917]">₹{(Number(order.grandTotal) || 0).toFixed(2)}</span>
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusStyles(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <button className="p-2 rounded-lg hover:bg-[#f0ede8] transition-colors text-[#78746e]">
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
                <div className="p-6 border-b border-[#2d5a3d]/5">
                  <h2 className="text-lg font-semibold text-[#1c1917]">{t("dashboard.home.topProducts")}</h2>
                  <p className="text-sm text-[#78746e]">{t("dashboard.home.thisMonthBestSellers")}</p>
                </div>
                <div className="p-6 space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                          index === 0 ? "from-[#c8a96e] to-[#a88b55]" : 
                          index === 1 ? "from-[#6b7280] to-[#4b5563]" : 
                          index === 2 ? "from-[#92400e] to-[#78350f]" : 
                          "from-[#4a9d7a] to-[#3a8d6a]"
                        } flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-[#1c1917] group-hover:text-[#2d5a3d] transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#78746e]">₹{product.totalRevenue.toLocaleString()} ({product.totalSold} units)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          (Number(product.stock) || 0) > lowStockThreshold ? "bg-[#e8f5ed] text-[#2d5a3d]" : 
                          (Number(product.stock) || 0) > 0 ? "bg-[#fef3c7] text-[#92400e]" : 
                          "bg-red-100 text-red-700"
                        }`}>
                          {(Number(product.stock) || 0) > lowStockThreshold ? "In Stock" : 
                           (Number(product.stock) || 0) > 0 ? "Low Stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 pb-6">
                  <button 
                    onClick={() => router.push("/himmat_admin_8526/dashboard/products")}
                    className="w-full py-2.5 rounded-xl bg-[#f0f9f4] text-[#2d5a3d] font-medium hover:bg-[#e8f5ed] transition-colors flex items-center justify-center gap-2"
                  >
                    {t("dashboard.home.viewAllProducts")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Coffee className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{t("dashboard.home.quickActions")}</h2>
                    <p className="text-sm text-white/80">Manage your {BRAND.companyName} business</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push("/himmat_admin_8526/dashboard/products")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                  >
                    <span className="font-medium flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t("dashboard.home.addNewProduct")}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => router.push("/himmat_admin_8526/dashboard/orders")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                  >
                    <span className="font-medium flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {t("dashboard.home.processOrders")}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
