import { useState } from "react";
import { Plus, Search, Edit, Trash2, CheckCircle, Truck, Clock, Package, XCircle } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
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

export default function PurchaseOrders() {
  const {
    products,
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editingPO, setEditingPO] = useState<any>(null);
  const [newPO, setNewPO] = useState({
    poNumber: "",
    supplier: "",
    status: "Draft" as const,
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    items: [] as any[],
    total: 0,
  });
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  const statuses = ["Draft", "Sent", "Received", "Cancelled"];

  const filteredPOs = purchaseOrders.filter(po =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const addItemToPO = () => {
    const product = products.find(p => p.id === Number(selectedProduct));
    if (!product || itemQuantity <= 0 || itemUnitPrice <= 0) return;

    const total = itemQuantity * itemUnitPrice;
    setNewPO(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          productId: product.id,
          productName: product.name,
          quantity: itemQuantity,
          unitPrice: itemUnitPrice,
          total: total,
        },
      ],
      total: (prev.total || 0) + total,
    }));

    setSelectedProduct("");
    setItemQuantity(0);
    setItemUnitPrice(0);
  };

  const removeItemFromPO = (itemId: number) => {
    const item = newPO.items.find(i => i.id === itemId);
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
      total: prev.total - (item?.total || 0),
    }));
  };

  const handleSavePO = () => {
    if (!newPO.poNumber || !newPO.supplier) return;
    if (editingPO) {
      updatePurchaseOrder(editingPO.id, { ...newPO, total: newPO.items.reduce((sum, i) => sum + i.total, 0) });
    } else {
      addPurchaseOrder({ ...newPO, total: newPO.items.reduce((sum, i) => sum + i.total, 0) });
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
      total: 0,
    });
  };

  const handleEditPO = (po: any) => {
    setEditingPO(po);
    setNewPO({
      poNumber: po.poNumber,
      supplier: po.supplier,
      status: po.status,
      orderDate: new Date(po.orderDate).toISOString().split("T")[0],
      expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split("T")[0] : "",
      items: [...po.items],
      total: po.total,
    });
    setIsAddDialogOpen(true);
  };

  const handleRequestDelete = (po: any) => {
    setDeleteTarget(po);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deletePurchaseOrder(deleteTarget.id);
    }
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Purchase Orders
          </h1>
          <p className="text-[#78746e] mt-1">Manage your supplier purchase orders</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                {editingPO ? "Update purchase order details" : "Create a new purchase order to restock inventory"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="poNumber">PO Number *</Label>
                  <Input
                    id="poNumber"
                    value={newPO.poNumber}
                    onChange={(e) => setNewPO(prev => ({ ...prev, poNumber: e.target.value }))}
                    placeholder="PO-2024-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={newPO.supplier}
                    onChange={(e) => setNewPO(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newPO.status}
                    onValueChange={(value: any) => setNewPO(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={newPO.orderDate}
                    onChange={(e) => setNewPO(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={newPO.expectedDeliveryDate}
                    onChange={(e) => setNewPO(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-medium">Items</Label>

                <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 lg:col-span-5 grid gap-2">
                    <Label htmlFor="po-product">Product</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger id="po-product">
                        <SelectValue placeholder="Select product" />
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
                    <Label htmlFor="po-qty">Quantity</Label>
                    <Input
                      id="po-qty"
                      type="number"
                      placeholder="Qty"
                      min={0}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 grid gap-2">
                    <Label htmlFor="po-price">Unit Price (₹)</Label>
                    <Input
                      id="po-price"
                      type="number"
                      placeholder="Price"
                      min={0}
                      step="0.01"
                      value={itemUnitPrice}
                      onChange={(e) => setItemUnitPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-full lg:col-span-1 flex sm:justify-end">
                    <Button
                      onClick={addItemToPO}
                      className="bg-[#2d5a3d] hover:bg-[#234832] w-full sm:w-auto"
                      aria-label="Add item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="sm:hidden lg:inline">Add</span>
                    </Button>
                  </div>
                </div>

                {newPO.items.length > 0 && (
                  <div className="bg-[#f9f7f4] rounded-xl p-3 sm:p-4 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-[#78746e] border-b border-[#2d5a3d]/10">
                          <th className="py-2 pr-2 font-medium">Product</th>
                          <th className="py-2 px-2 font-medium text-right w-20">Qty</th>
                          <th className="py-2 px-2 font-medium text-right w-28">Unit</th>
                          <th className="py-2 px-2 font-medium text-right w-28">Total</th>
                          <th className="py-2 pl-2 w-14"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPO.items.map((item) => (
                          <tr key={item.id} className="border-b border-[#2d5a3d]/10 last:border-0">
                            <td className="py-2 pr-2 font-medium text-[#1c1917]">{item.productName}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{item.quantity}</td>
                            <td className="py-2 px-2 text-right tabular-nums">₹{item.unitPrice.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right tabular-nums">₹{item.total.toLocaleString()}</td>
                            <td className="py-2 pl-2 text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItemFromPO(item.id)}
                                aria-label={`Remove ${item.productName}`}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="py-3 pr-2 font-bold text-right">
                            Order Total:
                          </td>
                          <td className="py-3 px-2 font-bold tabular-nums text-right">
                            ₹{newPO.items.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
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
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => {
                setIsAddDialogOpen(false);
                setEditingPO(null);
              }}>
                Cancel
              </Button>
              <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSavePO}>
                {editingPO ? "Update Purchase Order" : "Create Purchase Order"}
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
            placeholder="Search by PO number or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap">PO Number</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Supplier</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Total</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#78746e]">
                    No purchase orders found
                  </td>
                </tr>
              )}
              {filteredPOs.map((po) => {
                const StatusIcon = getStatusIcon(po.status);
                return (
                  <tr key={po.id} className="group hover:bg-[#f9f7f4] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-[#1c1917]">{po.poNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#78746e]">{po.supplier}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#78746e]">{new Date(po.orderDate).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#1c1917] tabular-nums">₹{po.total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusStyles(po.status)}`}>
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
                            onClick={() => receivePurchaseOrder(po.id)}
                            title="Mark as Received"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditPO(po)}
                          className="hover:bg-[#f0ede8]"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRequestDelete(po)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#1c1917]">{deleteTarget?.poNumber || "this purchase order"}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
