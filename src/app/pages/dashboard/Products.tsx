'use client';

import { useState, useRef, useEffect } from "react";
import { Plus, Search, Edit, Trash2, MoreHorizontal, X, Save, Package } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "../../components/ui/switch";
import { ExportButtons, exportToPDF, exportToCSV, printElement } from "../../components/ExportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api-client";
import { BRAND } from "../../../config/brand";

type ProductLineRef = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  heroHeadline?: string | null;
  heroImage?: string | null;
  color?: string | null;
  categories?: string | null;
  ctaTitle?: string | null;
  ctaDescription?: string | null;
  ctaLinkText?: string | null;
  ctaLink?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string;
  imageUrl: string;
  sku?: string | null;
  reorderPoint?: number | null;
  hasVariants: boolean;
  variantOptions?: any;
  isBestseller: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  productLineId: number | null;
  productLine?: ProductLineRef | string | null;
};

function getProductLineName(product: Product, storeProductLines: any[]): string {
  if (!product) return "";
  if (product.productLine && typeof product.productLine === "object") {
    return (product.productLine as ProductLineRef).name || "";
  }
  if (typeof product.productLine === "string") {
    return product.productLine;
  }
  if (product.productLineId != null) {
    const pl = storeProductLines.find((l: any) => l.id === product.productLineId);
    return pl?.name || "";
  }
  return "";
}

function getProductLineId(product: Product): number | null {
  if (product.productLineId != null) return product.productLineId;
  if (product.productLine && typeof product.productLine === "object") {
    return (product.productLine as ProductLineRef).id || null;
  }
  return null;
}

export default function Products() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductLine, setSelectedProductLine] = useState<string>("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);
  const [stockSaving, setStockSaving] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<any>('/products');
      return response.data || response;
    }
  });

  const { data: storeProductLines = [] } = useQuery({
    queryKey: ['product-lines'],
    queryFn: async () => {
      const response = await api.get<any>('/product-lines');
      return response.data || response;
    }
  });

  const firstActiveLineId = storeProductLines.find((pl: any) => pl.isActive)?.id
    ?? storeProductLines[0]?.id
    ?? null;

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "green",
    price: 0,
    stock: 0,
    description: "",
    imageUrl: "",
    sku: "",
    reorderPoint: 20,
    hasVariants: false,
    isBestseller: false,
    status: "In Stock",
    productLineId: firstActiveLineId,
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    reason: "",
  });

  useEffect(() => {
    if (firstActiveLineId != null && newProduct.productLineId == null) {
      setNewProduct(prev => ({ ...prev, productLineId: firstActiveLineId }));
    }
  }, [firstActiveLineId]);

  const productLineOptions = ["All", ...storeProductLines
    .filter((pl: any) => pl.isActive)
    .map((pl: any) => String(pl.id))];

  const filteredProducts = products.filter((product: Product) => {
    const matchesName = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const plId = getProductLineId(product);
    const matchesLine = selectedProductLine === "All"
      ? true
      : plId != null && String(plId) === String(selectedProductLine);
    return matchesName && matchesLine;
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: any) => {
      const payload = { ...product };
      if (payload.productLineId != null && typeof payload.productLineId !== "number") {
        payload.productLineId = Number(payload.productLineId);
      }
      if (payload.productLine) delete payload.productLine;
      const response = await api.post<any>('/products', payload);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product added successfully!");
    },
    onError: () => {
      toast.error("Failed to add product");
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, product }: { id: number; product: any }) => {
      const payload = { ...product };
      if (payload.productLineId != null && typeof payload.productLineId !== "number") {
        payload.productLineId = Number(payload.productLineId);
      }
      if (payload.productLine) delete payload.productLine;
      const response = await api.put<any>(`/products/${id}`, payload);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

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

  const handleExportPDF = () => {
    if (tableRef.current) {
      exportToPDF(tableRef.current, { filename: "products", title: "Products List" });
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredProducts.map((product: Product) => ({
      "Product ID": product.id,
      "Name": product.name,
      "Category": product.category,
      "Price": product.price,
      "Stock": product.stock,
      "Status": product.status,
      "Description": product.description
    }));
    exportToCSV(csvData, { filename: "products" });
  };

  const handlePrint = () => {
    if (tableRef.current) {
      printElement(tableRef.current, { title: "Products List" });
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: "",
      category: "green",
      price: 0,
      stock: 0,
      description: "",
      imageUrl: "",
      sku: "",
      reorderPoint: 20,
      hasVariants: false,
      isBestseller: false,
      status: "In Stock",
      productLineId: firstActiveLineId,
    });
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.description || !newProduct.imageUrl || newProduct.price <= 0) {
      toast.error("Please fill in all required fields (Name, Description, Image URL, Price)");
      return;
    }
    const status = newProduct.stock === 0 ? "Out of Stock" : newProduct.stock <= 30 ? "Low Stock" : "In Stock";
    
    try {
      setSaving(true);
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          product: {
            ...newProduct,
            status
          }
        });
      } else {
        await addProductMutation.mutateAsync({
          ...newProduct,
          status,
          reviews: [],
          batches: [],
          productVariants: [],
          variantOptions: []
        });
      }
      setIsAddDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    } catch (error) {
      console.error("Error saving product", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedStockProduct || stockAdjustment.quantity === 0 || !stockAdjustment.reason) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      setStockSaving(true);
      const newStock = selectedStockProduct.stock + stockAdjustment.quantity;
      const status = newStock === 0 ? "Out of Stock" : newStock <= 30 ? "Low Stock" : "In Stock";
      
      await updateProductMutation.mutateAsync({
        id: selectedStockProduct.id,
        product: {
          id: selectedStockProduct.id,
          stock: newStock,
          status
        }
      });
      
      setIsStockDialogOpen(false);
      setSelectedStockProduct(null);
      setStockAdjustment({ quantity: 0, reason: "" });
    } catch (error) {
      console.error("Error updating stock", error);
    } finally {
      setStockSaving(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    const lineId = getProductLineId(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description,
      imageUrl: product.imageUrl,
      sku: product.sku || "",
      reorderPoint: product.reorderPoint || 20,
      hasVariants: product.hasVariants,
      isBestseller: product.isBestseller,
      status: product.status,
      productLineId: lineId ?? firstActiveLineId,
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProductMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting product", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Products
          </h1>
          <p className="text-[#78746e] mt-1">Manage your {BRAND.companyName} products and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons 
            onExportPDF={handleExportPDF} 
            onExportCSV={handleExportCSV} 
            onPrint={handlePrint}
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update product details" : "Add a new product to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g., Premium Green Tea"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="productLine">Product Line</Label>
                    <Select
                      value={newProduct.productLineId != null ? String(newProduct.productLineId) : ""}
                      onValueChange={(value) => {
                        const id = value ? Number(value) : null;
                        setNewProduct({ ...newProduct, productLineId: id });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product line" />
                      </SelectTrigger>
                      <SelectContent>
                        {storeProductLines.filter((pl: any) => pl.isActive).map((pl: any) => (
                          <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {["green", "black", "herbal", "oolong", "white", "toor", "moong", "chana", "masoor", "urad", "gift-hampers", "tea-sets"].map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price (Rs.)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      placeholder="249"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder="TEA-001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      value={newProduct.reorderPoint}
                      onChange={(e) => setNewProduct({ ...newProduct, reorderPoint: Number(e.target.value) })}
                      placeholder="20"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    value={newProduct.imageUrl}
                    onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isBestseller">Mark as Bestseller</Label>
                  <Switch
                    id="isBestseller"
                    checked={newProduct.isBestseller}
                    onCheckedChange={(checked) => setNewProduct({ ...newProduct, isBestseller: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }} disabled={saving}>
                  Cancel
                </Button>
                <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSaveProduct} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Saving..." : "Save Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select
          value={selectedProductLine}
          onValueChange={setSelectedProductLine}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Product Lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Product Lines</SelectItem>
            {storeProductLines.filter((pl: any) => pl.isActive).map((pl: any) => (
              <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto" ref={tableRef}>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Product Line</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {filteredProducts.map((product: Product) => (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#1c1917]">{product.name}</p>
                          {product.isBestseller && (
                            <span className="px-2 py-0.5 bg-[#c8a96e] text-[#1c1917] text-xs font-semibold rounded-full">
                              Bestseller
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-[#78746e] truncate max-w-[200px]">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#2d5a3d] font-medium">
                      {getProductLineName(product, storeProductLines) || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#78746e]">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-[#1c1917]">Rs.{product.price}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#1c1917]">{product.stock} units</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyles(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={isStockDialogOpen && selectedStockProduct?.id === product.id} onOpenChange={setIsStockDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedStockProduct(product);
                              setIsStockDialogOpen(true);
                            }}
                            className="hover:bg-[#f0ede8]"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Adjust Stock for {selectedStockProduct?.name}</DialogTitle>
                            <DialogDescription>
                              Current stock: {selectedStockProduct?.stock} units
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="quantity">Quantity (positive to add, negative to remove)</Label>
                              <Input
                                id="quantity"
                                type="number"
                                value={stockAdjustment.quantity}
                                onChange={(e) =>
                                  setStockAdjustment({ ...stockAdjustment, quantity: Number(e.target.value) })
                                }
                                placeholder="e.g., 50 or -10"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="reason">Reason</Label>
                              <Textarea
                                id="reason"
                                value={stockAdjustment.reason}
                                onChange={(e) =>
                                  setStockAdjustment({ ...stockAdjustment, reason: e.target.value })
                                }
                                placeholder="e.g., Restock from supplier, Return, etc."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setIsStockDialogOpen(false);
                                setSelectedStockProduct(null);
                                setStockAdjustment({ quantity: 0, reason: "" });
                              }}
                              disabled={stockSaving}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-[#2d5a3d] hover:bg-[#234832]"
                              onClick={handleAdjustStock}
                              disabled={stockSaving}
                            >
                              {stockSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              {stockSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="hover:bg-[#f0ede8]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-red-600">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#78746e]">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
