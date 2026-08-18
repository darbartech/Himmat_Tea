import { useState, useEffect } from "react";
import { api, ApiError } from "../../../lib/api-client";
import { notify } from "@/lib/notify";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
  Save,
  ArrowRight,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Filter,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Info,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";

import { useTranslation } from "@/hooks/useTranslation";
type Product = any;
type InventoryTransaction = any;
type Settings = any;

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "info" | "warning" | "destructive"; message: string } | null>(null);

  const [selectedProductForBatch, setSelectedProductForBatch] = useState<any>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchNumber: "",
    quantity: 0,
    receivedDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    supplier: "",
    costPrice: 0,
  });
  const [editBatchId, setEditBatchId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    reason: "",
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTransactionProduct, setSelectedTransactionProduct] = useState<number | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchDeletingId, setBatchDeletingId] = useState<number | null>(null);

  const { t } = useTranslation();

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, transactionsRes, settingsRes] = await Promise.all([
        api.get<any>('/products'),
        api.get<any>('/inventory/transactions'),
        api.get<any>('/settings'),
      ]);

      const productsData: Product[] = Array.isArray(productsRes)
        ? productsRes
        : (productsRes?.data ?? productsRes?.products ?? []);
      const transactionsData: InventoryTransaction[] = Array.isArray(transactionsRes)
        ? transactionsRes
        : (transactionsRes?.data ?? transactionsRes?.inventoryTransactions ?? []);
      const settingsData: Settings =
        settingsRes && typeof settingsRes === 'object' && !Array.isArray(settingsRes)
          ? (settingsRes?.data ?? settingsRes)
          : {};

      setProducts(productsData);
      setInventoryTransactions(transactionsData);
      setSettings(settingsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (bannerMessage) {
      const timer = setTimeout(() => setBannerMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [bannerMessage]);

  const showBackendAlert = (actionLabel: string) => {
    setBannerMessage({
      type: "warning",
      message: `${actionLabel} — Operation requires backend route — please use the Products page to edit inventory.`,
    });
  };

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filteredProducts = products.filter((product) =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === "All" || product.category === selectedCategory)
  );

  const lowStockProducts = products.filter(
    (p) => (p.stock ?? 0) <= (settings.lowStockThreshold ?? 30)
  );
  const inventoryValue = products.reduce(
    (sum: number, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
    0
  );
  const totalProducts = products.length;
  const outOfStockProducts = products.filter((p) => (p.stock ?? 0) === 0).length;
  const inStockProducts = products.filter(
    (p) => (p.isActive ?? true) && (p.stock ?? 0) > (settings.lowStockThreshold ?? 30)
  ).length;

  const expiringBatches = (() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now + thirtyDaysMs);
    const result: { product: Product; batch: any }[] = [];
    for (const product of products) {
      const batches = product.batches || [];
      for (const batch of batches) {
        if (!batch.expiryDate) continue;
        const exp = new Date(batch.expiryDate);
        if (exp <= cutoff) {
          result.push({ product, batch });
        }
      }
    }
    result.sort(
      (a, b) =>
        new Date(a.batch.expiryDate).getTime() - new Date(b.batch.expiryDate).getTime()
    );
    return result;
  })();

  const getProductStatus = (p: Product): string => {
    const stock = p.stock ?? 0;
    if (stock === 0) return "Out of Stock";
    if (stock <= (settings.lowStockThreshold ?? 30)) return "Low Stock";
    return "In Stock";
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-[#e8f5ed] text-[#2d5a3d]";
      case "Low Stock":
        return "bg-[#fef3c7] text-[#92400e]";
      case "Out of Stock":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionTypeStyles = (type: string) => {
    switch (type) {
      case "in":
        return "bg-[#e8f5ed] text-[#2d5a3d]";
      case "out":
        return "bg-red-100 text-red-700";
      case "adjustment":
        return "bg-[#fef3c7] text-[#92400e]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowUp className="h-4 w-4" />;
      case "out":
        return <ArrowDown className="h-4 w-4" />;
      case "adjustment":
        return <Edit className="h-4 w-4" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getTransactionProductName = (tx: InventoryTransaction): string => {
    if (tx.productName) return tx.productName;
    if (tx.product?.name) return tx.product.name;
    const p = products.find((pp) => pp.id === tx.productId);
    return p?.name ?? "Unknown Product";
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || stockAdjustment.quantity === 0 || !stockAdjustment.reason) {
      if (stockAdjustment.quantity === 0) notify.error("Quantity cannot be zero");
      if (!stockAdjustment.reason) notify.error("Please enter a reason");
      return;
    }
    try {
      setIsAdjusting(true);
      const qty = Number(stockAdjustment.quantity);
      const type = qty > 0 ? "in" : "out";
      await api.post("/inventory/transactions", {
        productId: Number(selectedProduct.id),
        type,
        quantity: Math.abs(qty),
        reason: stockAdjustment.reason,
      });
      notify.success(
        `Stock adjusted for ${selectedProduct.name}: ${qty > 0 ? "+" : ""}${qty} units`
      );
      setSelectedProduct(null);
      setStockAdjustment({ quantity: 0, reason: "" });
      await loadAll();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to adjust stock";
      notify.error(msg);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedProductForBatch) return;
    if (!batchForm.batchNumber || !batchForm.quantity || !batchForm.receivedDate) {
      notify.error("Batch Number, Quantity, and Received Date are required");
      return;
    }
    try {
      setIsBatchSaving(true);
      const payload = {
        productId: Number(selectedProductForBatch.id),
        batchNumber: batchForm.batchNumber,
        quantity: Number(batchForm.quantity),
        receivedDate: batchForm.receivedDate,
        expiryDate: batchForm.expiryDate || null,
        supplier: batchForm.supplier || null,
        costPrice: Number(batchForm.costPrice) || 0,
      };
      if (editBatchId) {
        await api.put(`/batches/${editBatchId}`, payload);
        notify.success("Batch updated successfully!");
      } else {
        await api.post("/batches", payload);
        notify.success("Batch added successfully! Stock updated.");
      }
      setBatchModalOpen(false);
      setSelectedProductForBatch(null);
      setEditBatchId(null);
      await loadAll();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save batch";
      notify.error(msg);
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleDeleteBatch = async (product: any, batch: any) => {
    try {
      setBatchDeletingId(batch.id);
      await api.delete(`/batches/${batch.id}`);
      notify.success(`Batch ${batch.batchNumber} deleted`);
      await loadAll();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete batch";
      notify.error(msg);
    } finally {
      setBatchDeletingId(null);
    }
  };

  const filteredTransactions = selectedTransactionProduct
    ? inventoryTransactions.filter(
        (tx) =>
          tx.productId === selectedTransactionProduct ||
          tx.product?.id === selectedTransactionProduct
      )
    : inventoryTransactions;

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2d5a3d]/5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-200" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );

  const SkeletonTable = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden animate-pulse">
      <div className="p-6 border-b border-[#2d5a3d]/5 space-y-2">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="divide-y divide-[#2d5a3d]/5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );

  const stats = [
    {
      title: "Total Inventory Value",
      value: (settings.currency || "₹") + inventoryValue.toLocaleString(),
      icon: DollarSign,
      color: "from-[#2d5a3d] to-[#0b7c33]",
      bg: "bg-[#2d5a3d]/10",
      badge: "Current",
    },
    {
      title: "Total Products",
      value: totalProducts.toString(),
      icon: Package,
      color: "from-[#c8a96e] to-[#a88b55]",
      bg: "bg-[#c8a96e]/10",
      badge: "In catalog",
    },
    {
      title: "In Stock",
      value: inStockProducts.toString(),
      icon: TrendingUp,
      color: "from-[#4a9d7a] to-[#3a8d6a]",
      bg: "bg-[#4a9d7a]/10",
      badge: "Available",
    },
    {
      title: "Out of Stock",
      value: outOfStockProducts.toString(),
      icon: TrendingDown,
      color: "from-red-500 to-red-700",
      bg: "bg-red-100",
      badge: "Need restock",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Inventory Management
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.inventory.subtitle')}</p>
        </div>
      </div>

      {bannerMessage && (
        <Alert
          className={
            bannerMessage.type === "destructive"
              ? "bg-red-50 border-red-400 text-red-800"
              : bannerMessage.type === "warning"
              ? "bg-[#fef3c7] border-[#f59e0b] text-[#78350f]"
              : "bg-blue-50 border-blue-400 text-blue-800"
          }
          variant={bannerMessage.type === "destructive" ? "destructive" : "default"}
        >
          <Info className="h-4 w-4" />
          <AlertTitle className="font-semibold">{t('common.notice')}</AlertTitle>
          <AlertDescription>{bannerMessage.message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-400 text-red-800" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">{t('common.failedToLoadData')}</AlertTitle>
          <AlertDescription className="flex items-center gap-3 flex-wrap">
            <span>{error}</span>
            <Button size="sm" variant="secondary" onClick={loadAll}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((stat) => {
              const Icon = stat.icon;
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
                  </div>
                </div>
              );
            })}
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4 mb-6 bg-[#f9f7f4] p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Products
          </TabsTrigger>
          <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Batches
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <>
              <SkeletonTable />
              <SkeletonTable />
            </>
          ) : (
            <>
              {expiringBatches.length > 0 && (
                <div className="bg-orange-50 border border-orange-400 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-orange-800">
                        Expiring Soon!
                      </h3>
                      <p className="text-orange-700 mt-1">
                        You have {expiringBatches.length} batch{expiringBatches.length > 1 ? "es" : ""} expiring in the next 30 days.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {expiringBatches.slice(0, 5).map(({ product, batch }) => (
                          <span
                            key={batch.id}
                            className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-[#1c1917] border border-orange-300"
                          >
                            {product.name} - {batch.batchNumber} ({new Date(batch.expiryDate!).toLocaleDateString()})
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => setActiveTab("batches")}
                    >
                      View All
                    </Button>
                  </div>
                </div>
              )}
              {lowStockProducts.length > 0 && (
                <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-[#92400e] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#92400e]">
                        Low Stock Alert!
                      </h3>
                      <p className="text-[#78350f] mt-1">
                        You have {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} running low on stock.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {lowStockProducts.map((product) => (
                          <span
                            key={product.id}
                            className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-[#1c1917] border border-[#f59e0b]/30"
                          >
                            {product.name} ({product.stock ?? 0} units)
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="bg-[#92400e] hover:bg-[#78350f] text-white"
                      onClick={() => setActiveTab("products")}
                    >
                      View All
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
                <div className="p-6 border-b border-[#2d5a3d]/5">
                  <h2 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.inventory.stockStatusOverview')}</h2>
                  <p className="text-sm text-[#78746e]">{t('dashboard.inventory.currentStockLevels')}</p>
                </div>
                <div className="overflow-x-auto shadow-[inset_-12px_0_16px_-12px_rgba(45,90,61,0.18)]">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                        <th className="px-6 py-4 font-medium">{t('dashboard.inventory.product')}</th>
                        <th className="px-6 py-4 font-medium">{t('dashboard.products.category')}</th>
                        <th className="px-6 py-4 font-medium">{t('dashboard.products.price')}</th>
                        <th className="px-6 py-4 font-medium">{t('dashboard.products.stock')}</th>
                        <th className="px-6 py-4 font-medium">{t('dashboard.products.status')}</th>
                        <th className="px-6 py-4 font-medium text-right">{t('dashboard.inventory.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d5a3d]/5">
                      {filteredProducts.slice(0, 8).map((product) => {
                        const status = getProductStatus(product);
                        return (
                          <tr key={product.id} className="group hover:bg-[#f9f7f4] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2d5a3d]/10">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center text-white">
                                      🍃
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-[#1c1917]">{product.name}</p>
                                  {product.description && (
                                    <p className="text-xs text-[#78746e] truncate max-w-[200px]">
                                      {product.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#78746e]">{product.category}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-[#1c1917]">{settings.currency || "₹"}{product.price}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#1c1917]">{product.stock ?? 0} units</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyles(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="hover:bg-[#f0ede8]"
                                    onClick={() => setSelectedProduct(product)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Adjust
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Adjust Stock for {selectedProduct?.name}</DialogTitle>
                                    <DialogDescription>
                                      Current stock: {selectedProduct?.stock ?? 0} units
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="quantity">{t('dashboard.inventory.quantityPositiveAddNegativeRemove')}</Label>
                                      <Input
                                        id="quantity"
                                        type="number"
                                        value={stockAdjustment.quantity}
                                        onChange={(e) =>
                                          setStockAdjustment({ ...stockAdjustment, quantity: Number(e.target.value) })
                                        }
                                        placeholder={t('dashboard.inventory.quantityHelpPlaceholder')}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="reason">{t('dashboard.inventory.reason')}</Label>
                                      <Textarea
                                        id="reason"
                                        value={stockAdjustment.reason}
                                        onChange={(e) =>
                                          setStockAdjustment({ ...stockAdjustment, reason: e.target.value })
                                        }
                                        placeholder={t('dashboard.inventory.reasonPlaceholder')}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3">
                                    <Button
                                      variant="secondary"
                                      onClick={() => {
                                        setSelectedProduct(null);
                                        setStockAdjustment({ quantity: 0, reason: "" });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className="bg-[#2d5a3d] hover:bg-[#234832]"
                                      onClick={handleAdjustStock}
                                      disabled={isAdjusting}
                                    >
                                      {isAdjusting ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-4 w-4 mr-2" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-[#78746e]">
                            No products found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredProducts.length > 8 && (
                  <div className="p-6 border-t border-[#2d5a3d]/5">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => setActiveTab("products")}
                    >
                      View All Products
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
              <Input
                type="text"
                placeholder={t('dashboard.products.searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('dashboard.products.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
              <div className="overflow-x-auto shadow-[inset_-12px_0_16px_-12px_rgba(45,90,61,0.18)]">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.product')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.products.category')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.products.price')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.products.stock')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.products.status')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.value')}</th>
                      <th className="px-6 py-4 font-medium text-right">{t('dashboard.inventory.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d5a3d]/5">
                    {filteredProducts.map((product) => {
                      const status = getProductStatus(product);
                      const value = (Number(product.price) || 0) * (Number(product.stock) || 0);
                      return (
                        <tr key={product.id} className="group hover:bg-[#f9f7f4] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2d5a3d]/10">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center text-white">
                                    🍃
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-[#1c1917]">{product.name}</p>
                                {product.description && (
                                  <p className="text-xs text-[#78746e] truncate max-w-[200px]">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[#78746e]">{product.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-[#1c1917]">{settings.currency || "₹"}{product.price}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[#1c1917]">{product.stock ?? 0} units</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyles(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-[#1c1917]">
                              {(settings.currency || "₹")}{value.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="hover:bg-[#f0ede8]"
                                  onClick={() => setSelectedProduct(product)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Adjust Stock
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Adjust Stock for {selectedProduct?.name}</DialogTitle>
                                  <DialogDescription>
                                    Current stock: {selectedProduct?.stock ?? 0} units
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="quantity">{t('dashboard.inventory.quantityPositiveAddNegativeRemove')}</Label>
                                    <Input
                                      id="quantity"
                                      type="number"
                                      value={stockAdjustment.quantity}
                                      onChange={(e) =>
                                        setStockAdjustment({ ...stockAdjustment, quantity: Number(e.target.value) })
                                      }
                                      placeholder={t('dashboard.inventory.quantityHelpPlaceholder')}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="reason">{t('dashboard.inventory.reason')}</Label>
                                    <Textarea
                                      id="reason"
                                      value={stockAdjustment.reason}
                                      onChange={(e) =>
                                        setStockAdjustment({ ...stockAdjustment, reason: e.target.value })
                                      }
                                      placeholder={t('dashboard.inventory.reasonPlaceholder')}
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                  <Button
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedProduct(null);
                                      setStockAdjustment({ quantity: 0, reason: "" });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    className="bg-[#2d5a3d] hover:bg-[#234832]"
                                    onClick={handleAdjustStock}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#78746e]">
                          No products found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1c1917]">{t('dashboard.inventory.batchManagement')}</h2>
              <p className="text-sm text-[#78746e]">{t('dashboard.inventory.trackInventoryBatches')}</p>
            </div>
            <Select onValueChange={(val) => {
              const product = products.find(p => p.id === Number(val));
              if (product) {
                setSelectedProductForBatch(product);
                setEditBatchId(null);
                setBatchForm({
                  batchNumber: `BATCH-${Date.now()}`,
                  quantity: 0,
                  receivedDate: new Date().toISOString().split('T')[0],
                  expiryDate: "",
                  supplier: "",
                  costPrice: (Number(product.price) || 0) * 0.5,
                });
                setBatchModalOpen(true);
              }
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('dashboard.inventory.addBatch')} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
              <div className="overflow-x-auto shadow-[inset_-12px_0_16px_-12px_rgba(45,90,61,0.18)]">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.product')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.batchNumber')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.quantity')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.received')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.expiry')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.supplier')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.products.status')}</th>
                      <th className="px-6 py-4 font-medium text-right">{t('dashboard.orders.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d5a3d]/5">
                    {products.flatMap((product) =>
                      (product.batches || []).map((batch: any) => {
                        const isExpiring = batch.expiryDate && new Date(batch.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                        
                        return (
                          <tr key={`${product.id}-${batch.id}`} className="hover:bg-[#f9f7f4] transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-medium text-[#1c1917]">{product.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#1c1917] font-mono">{batch.batchNumber}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#1c1917]">{batch.quantity} units</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#78746e]">{new Date(batch.receivedDate).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">
                              {batch.expiryDate ? (
                                <span className={isExpired ? "text-red-600" : isExpiring ? "text-orange-600" : "text-[#78746e]"}>
                                  {new Date(batch.expiryDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-[#78746e]">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#78746e]">{batch.supplier || "-"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isExpired ? "bg-red-100 text-red-700" :
                                isExpiring ? "bg-orange-100 text-orange-700" :
                                "bg-[#e8f5ed] text-[#2d5a3d]"
                              }`}>
                                {isExpired ? "Expired" : isExpiring ? "Expiring Soon" : "Active"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProductForBatch(product);
                                    setEditBatchId(batch.id);
                                    setBatchForm({
                                      batchNumber: batch.batchNumber,
                                      quantity: batch.quantity,
                                      receivedDate: new Date(batch.receivedDate).toISOString().split('T')[0],
                                      expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : "",
                                      supplier: batch.supplier || "",
                                      costPrice: batch.costPrice,
                                    });
                                    setBatchModalOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteBatch(product, batch)}
                                  disabled={batchDeletingId === batch.id}
                                >
                                  {batchDeletingId === batch.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {products.every(p => !p.batches || p.batches.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-[#78746e]">
                          No batches yet. Add a batch to track inventory with expiry dates.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editBatchId ? "Edit Batch" : "Add New Batch"}
                </DialogTitle>
                <DialogDescription>
                  {selectedProductForBatch?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="batchNumber">{t('dashboard.inventory.batchNumber')}</Label>
                  <Input
                    id="batchNumber"
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    placeholder={t('dashboard.inventory.batchNumberPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">{t('dashboard.inventory.quantity')}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="receivedDate">{t('dashboard.inventory.receivedDate')}</Label>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={batchForm.receivedDate}
                    onChange={(e) => setBatchForm({ ...batchForm, receivedDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiryDate">{t('dashboard.inventory.expiryDateOptional')}</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">{t('dashboard.inventory.supplierOptional')}</Label>
                  <Input
                    id="supplier"
                    value={batchForm.supplier}
                    onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
                    placeholder={t('dashboard.purchaseOrders.enterSupplier')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">{t('dashboard.inventory.costPrice')}</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    value={batchForm.costPrice}
                    onChange={(e) => setBatchForm({ ...batchForm, costPrice: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBatchModalOpen(false);
                    setSelectedProductForBatch(null);
                    setEditBatchId(null);
                  }}
                  disabled={isBatchSaving}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#2d5a3d] hover:bg-[#234832]"
                  onClick={handleSaveBatch}
                  disabled={isBatchSaving}
                >
                  {isBatchSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editBatchId ? "Saving..." : "Adding..."}
                    </>
                  ) : (
                    editBatchId ? "Update" : "Add"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-[#78746e] shrink-0" />
              <Label htmlFor="product-filter" className="text-sm font-medium text-[#1c1917] shrink-0">
                Filter by product:
              </Label>
              <Select
                value={selectedTransactionProduct?.toString() || "all"}
                onValueChange={(val) =>
                  setSelectedTransactionProduct(val === "all" ? null : Number(val))
                }
              >
                <SelectTrigger id="product-filter" className="w-full sm:w-[250px]">
                  <SelectValue placeholder={t('dashboard.inventory.allProducts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.inventory.allProducts')}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
              <div className="overflow-x-auto shadow-[inset_-12px_0_16px_-12px_rgba(45,90,61,0.18)]">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.product')}</th>
                      <th className="px-6 py-4 font-medium">{t('common.type')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.quantity')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.stockChange')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.inventory.reason')}</th>
                      <th className="px-6 py-4 font-medium">{t('common.reference')}</th>
                      <th className="px-6 py-4 font-medium">{t('dashboard.invoice.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d5a3d]/5">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-[#f9f7f4] transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-[#1c1917]">{getTransactionProductName(transaction)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getTransactionTypeStyles(
                              transaction.type
                            )}`}
                          >
                            {getTransactionIcon(transaction.type)}
                            {(transaction.type || "").charAt(0).toUpperCase() + (transaction.type || "").slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#1c1917]">{transaction.quantity} units</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#78746e]">
                            {transaction.previousStock ?? "-"} → {transaction.newStock ?? "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#1c1917] max-w-[200px] truncate">
                            {transaction.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {transaction.referenceId ? (
                            <span className="text-[#2d5a3d] font-medium">
                              {transaction.referenceId}
                            </span>
                          ) : (
                            <span className="text-[#78746e]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#78746e]">
                            {new Date(transaction.timestamp || transaction.createdAt || Date.now()).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#78746e]">
                          No transactions yet. Transactions will appear here when stock is adjusted or orders are placed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
