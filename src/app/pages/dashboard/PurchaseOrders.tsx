'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, CheckCircle, Truck, Clock, Package, XCircle, Loader2 } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { notify } from "@/lib/notify";
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
import { useTranslation } from "@/hooks/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

type Product = {
  id: number;
  name: string;
  category?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
};

type POItem = {
  id?: number;
  purchaseOrderId?: number;
  productId: number;
  productName?: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total?: number;
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  supplier: string;
  status: "Draft" | "Sent" | "Received" | "Cancelled" | string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items?: POItem[];
  total?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

const statuses: readonly string[] = ["Draft", "Sent", "Received", "Cancelled"] as const;

export default function PurchaseOrders() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [newPO, setNewPO] = useState<{
    poNumber: string;
    supplier: string;
    status: string;
    orderDate: string;
    expectedDeliveryDate: string;
    items: POItem[];
    notes?: string;
  }>({
    poNumber: "",
    supplier: "",
    status: "Draft",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    items: [],
  });
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);
  const [itemRemovingId, setItemRemovingId] = useState<number | null>(null);

  const { t } = useTranslation();

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [productsRes, posRes] = await Promise.all([
        api.get<any>("/products"),
        api.get<any>("/purchase-orders"),
      ]);
      const productsData: Product[] = Array.isArray(productsRes)
        ? productsRes
        : (productsRes?.data ?? productsRes?.products ?? []);
      const posData: PurchaseOrder[] = Array.isArray(posRes)
        ? posRes
        : (posRes?.data ?? posRes?.purchaseOrders ?? []);
      setProducts(productsData);
      setPurchaseOrders(posData);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load purchase orders";
      notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "received":
        return CheckCircle;
      case "sent":
        return Truck;
      case "draft":
        return Clock;
      case "cancelled":
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "received":
        return "bg-[#e8f5ed] text-[#2d5a3d]";
      case "sent":
        return "bg-[#e0f2fe] text-[#0369a1]";
      case "draft":
        return "bg-[#fef3c7] text-[#92400e]";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getItemName = (item: POItem): string => {
    if (item.productName) return item.productName;
    if (item.product?.name) return item.product.name;
    const p = products.find((pp) => pp.id === item.productId);
    return p?.name || `Product #${item.productId}`;
  };

  const getPOTotal = (items: POItem[]): number => {
    return items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  };

  const filteredPOs = purchaseOrders.filter((po) =>
    (po.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (po.supplier || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItemToPO = () => {
    const product = products.find((p) => p.id === Number(selectedProduct));
    if (!product || itemQuantity <= 0 || itemUnitPrice <= 0) {
      notify.error("Please select a product and enter valid quantity and price");
      return;
    }

    const lineTotal = itemQuantity * itemUnitPrice;
    const tempId = -Date.now();
    setNewPO((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: tempId,
          productId: product.id,
          productName: product.name,
          quantity: itemQuantity,
          unitPrice: itemUnitPrice,
          total: lineTotal,
        },
      ],
    }));

    setSelectedProduct("");
    setItemQuantity(0);
    setItemUnitPrice(0);
  };

  const removeItemFromPO = (itemId: number) => {
    setItemRemovingId(itemId);
    setTimeout(() => {
      setNewPO((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
      }));
      setItemRemovingId(null);
    }, 0);
  };

  const handleSavePO = async () => {
    if (!newPO.poNumber || !newPO.supplier) {
      notify.error("Please fill in PO Number and Supplier");
      return;
    }
    if (newPO.items.length === 0) {
      notify.error("Please add at least one item to the purchase order");
      return;
    }
    try {
      setIsSaving(true);
      const total = getPOTotal(newPO.items);
      const payload = {
        poNumber: newPO.poNumber,
        supplier: newPO.supplier,
        status: newPO.status,
        orderDate: newPO.orderDate,
        expectedDeliveryDate: newPO.expectedDeliveryDate || null,
        notes: newPO.notes || "",
        total,
        items: newPO.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };

      let saved: PurchaseOrder;
      if (editingPO) {
        saved = await api.put<PurchaseOrder>(`/purchase-orders/${editingPO.id}`, payload);
        const resolved: PurchaseOrder = (saved as any)?.data ?? saved;
        setPurchaseOrders((prev) =>
          prev.map((p) => (p.id === resolved.id ? resolved : p))
        );
        notify.success("Purchase order updated successfully!");
      } else {
        saved = await api.post<PurchaseOrder>("/purchase-orders", payload);
        const resolved: PurchaseOrder = (saved as any)?.data ?? saved;
        setPurchaseOrders((prev) => [resolved, ...prev]);
        notify.success("Purchase order created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingPO(null);
      setNewPO({
        poNumber: "",
        supplier: "",
        status: "Draft",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: "",
        items: [],
      });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save purchase order";
      notify.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    const poItems: POItem[] = (po.items || []).map((i) => ({
      ...i,
      productName: getItemName(i),
      total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    }));
    setNewPO({
      poNumber: po.poNumber,
      supplier: po.supplier,
      status: po.status,
      orderDate: po.orderDate ? new Date(po.orderDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      expectedDeliveryDate: po.expectedDeliveryDate
        ? new Date(po.expectedDeliveryDate).toISOString().split("T")[0]
        : "",
      items: poItems,
      notes: po.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    try {
      setReceivingId(po.id);
      const updated = await api.put<PurchaseOrder>(`/purchase-orders/${po.id}`, {
        status: "Received",
      });
      const resolved: PurchaseOrder = (updated as any)?.data ?? updated;
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === resolved.id ? resolved : p))
      );
      notify.success(`PO #${po.poNumber} marked as Received! Stock updated.`);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to receive purchase order";
      notify.error(msg);
    } finally {
      setReceivingId(null);
    }
  };

  const handleRequestDelete = (po: PurchaseOrder) => {
    setDeleteTarget(po);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/purchase-orders/${deleteTarget.id}`);
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      notify.success("Purchase order deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete purchase order";
      notify.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setIsAddDialogOpen(false);
    setEditingPO(null);
    setNewPO({
      poNumber: "",
      supplier: "",
      status: "Draft",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      items: [],
    });
    setSelectedProduct("");
    setItemQuantity(0);
    setItemUnitPrice(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Purchase Orders
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.purchaseOrders.subtitle')}</p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingPO ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
              <DialogDescription>
                {editingPO
                  ? "Update purchase order details"
                  : "Create a new purchase order to restock inventory"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="poNumber">{t('dashboard.purchaseOrders.fields.poNumber')}</Label>
                  <Input
                    id="poNumber"
                    value={newPO.poNumber}
                    onChange={(e) => setNewPO((prev) => ({ ...prev, poNumber: e.target.value }))}
                    placeholder={t('dashboard.purchaseOrders.poNumberPlaceholder')}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">{t('dashboard.purchaseOrders.fields.supplier')}</Label>
                  <Input
                    id="supplier"
                    value={newPO.supplier}
                    onChange={(e) => setNewPO((prev) => ({ ...prev, supplier: e.target.value }))}
                    placeholder={t('dashboard.purchaseOrders.enterSupplier')}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="po-status">{t('dashboard.products.status')}</Label>
                  <Select
                    value={newPO.status}
                    onValueChange={(value: string) => setNewPO((prev) => ({ ...prev, status: value }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="po-status">
                      <SelectValue placeholder={t('common.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderDate">{t('dashboard.orders.date')}</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={newPO.orderDate}
                    onChange={(e) => setNewPO((prev) => ({ ...prev, orderDate: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDeliveryDate">{t('dashboard.purchaseOrders.expectedDelivery')}</Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={newPO.expectedDeliveryDate}
                    onChange={(e) =>
                      setNewPO((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-medium">{t('dashboard.purchaseOrders.items')}</Label>

                <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 lg:col-span-5 grid gap-2">
                    <Label htmlFor="po-product">{t('dashboard.inventory.product')}</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="po-product">
                        <SelectValue placeholder={t('dashboard.purchaseOrders.selectProduct')} />
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
                  <div className="sm:col-span-2 lg:col-span-3 grid gap-2">
                    <Label htmlFor="po-qty">{t('dashboard.inventory.quantity')}</Label>
                    <Input
                      id="po-qty"
                      type="number"
                      placeholder={t('dashboard.invoice.qty')}
                      min={0}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 grid gap-2">
                    <Label htmlFor="po-price">{t('dashboard.purchaseOrders.fields.unitPrice')}</Label>
                    <Input
                      id="po-price"
                      type="number"
                      placeholder={t('dashboard.products.price')}
                      min={0}
                      step="0.01"
                      value={itemUnitPrice}
                      onChange={(e) => setItemUnitPrice(Number(e.target.value))}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-full lg:col-span-1 flex sm:justify-end">
                    <Button
                      onClick={addItemToPO}
                      disabled={isSaving}
                      className="bg-[#2d5a3d] hover:bg-[#234832] w-full sm:w-auto"
                      aria-label={t('a11y.addItem')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="sm:hidden lg:inline">{t('dashboard.inventory.add')}</span>
                    </Button>
                  </div>
                </div>

                {newPO.items.length > 0 && (
                  <div className="bg-[#f9f7f4] rounded-xl p-3 sm:p-4 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-[#78746e] border-b border-[#2d5a3d]/10">
                          <th className="py-2 pr-2 font-medium">{t('dashboard.inventory.product')}</th>
                          <th className="py-2 px-2 font-medium text-right w-20">{t('dashboard.invoice.qty')}</th>
                          <th className="py-2 px-2 font-medium text-right w-28">{t('common.unit')}</th>
                          <th className="py-2 px-2 font-medium text-right w-28">{t('dashboard.invoice.total')}</th>
                          <th className="py-2 pl-2 w-14"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPO.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-[#2d5a3d]/10 last:border-0"
                          >
                            <td className="py-2 pr-2 font-medium text-[#1c1917]">
                              {getItemName(item)}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums">{item.quantity}</td>
                            <td className="py-2 px-2 text-right tabular-nums">
                              ₹{Number(item.unitPrice).toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums">
                              ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItemFromPO(item.id!)}
                                aria-label={`Remove ${getItemName(item)}`}
                                className="h-8 w-8 p-0"
                                disabled={itemRemovingId === item.id}
                              >
                                {itemRemovingId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="py-3 pr-2 font-bold text-right">
                            Order Total:
                          </td>
                          <td className="py-3 px-2 font-bold tabular-nums text-right">
                            ₹{getPOTotal(newPO.items).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {newPO.items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#2d5a3d]/15 bg-white/60 p-6 text-center text-sm text-[#78746e]">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No items yet — select a product above and click Add.
                  </div>
                )}
              </div>

              <div className="grid gap-2 border-t pt-4">
                <Label htmlFor="po-notes">{t('common.notesOptional')}</Label>
                <Textarea
                  id="po-notes"
                  rows={2}
                  value={newPO.notes || ""}
                  onChange={(e) => setNewPO((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('dashboard.purchaseOrders.notesPlaceholder')}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button variant="secondary" disabled={isSaving} onClick={resetForm}>
                Cancel
              </Button>
              <Button
                className="bg-[#2d5a3d] hover:bg-[#234832]"
                disabled={isSaving}
                onClick={handleSavePO}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingPO ? "Saving..." : "Creating..."}
                  </>
                ) : editingPO ? (
                  "Update Purchase Order"
                ) : (
                  "Create Purchase Order"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t('dashboard.purchaseOrders.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.purchaseOrders.poNumber')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.inventory.supplier')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.invoice.date')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.invoice.total')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.products.status')}</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">{t('dashboard.orders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#78746e]">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#78746e]">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const StatusIcon = getStatusIcon(po.status);
                  const poTotal =
                    typeof po.total === "number" ? po.total : getPOTotal(po.items || []);
                  const rowBusy = receivingId === po.id || deletingId === po.id;
                  return (
                    <tr key={po.id} className="group hover:bg-[#f9f7f4] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-[#1c1917]">{po.poNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#78746e]">{po.supplier}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#78746e]">
                          {new Date(po.orderDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[#1c1917] tabular-nums">
                          ₹{Number(poTotal).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusStyles(
                            po.status
                          )}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {po.status !== "Received" && po.status !== "Cancelled" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReceivePO(po)}
                              title={t('dashboard.purchaseOrders.markReceived')}
                              disabled={rowBusy || isSaving}
                            >
                              {receivingId === po.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditPO(po)}
                            className="hover:bg-[#f0ede8]"
                            title={t('dashboard.products.edit')}
                            disabled={rowBusy || isSaving}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRequestDelete(po)}
                                title={t('dashboard.products.delete')}
                                disabled={rowBusy}
                              >
                                {deletingId === po.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.purchaseOrders.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#1c1917]">
                {deleteTarget?.poNumber || "this purchase order"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>{t('dashboard.products.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
