'use client';

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Plus, Search, Edit, Trash2, MoreHorizontal, X, Save, Package, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ExportButtons, exportToPDF, exportToCSV, printElement } from "../../components/ExportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api-client";
import { BRAND } from "../../../config/brand";

import { useTranslation } from "@/hooks/useTranslation";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadTab, setImageUploadTab] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

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
      [t('dashboard.faqs.category')]: product.category,
      [t('dashboard.purchaseOrders.pricePlaceholder')]: product.price,
      "Stock": product.stock,
      "Status": product.status,
      [t('dashboard.products.descriptionLabel')]: product.description
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const uploadImage = async () => {
      try {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || result.message || "Upload failed");
        }

        setNewProduct((prev) => ({ ...prev, imageUrl: result.data.url }));
        toast.success("Image uploaded successfully!");
      } catch (err: any) {
        const rawMsg: string = (err?.message || "Failed to upload image. Please try again.").toString();
        let displayMsg = rawMsg;
        if (rawMsg.toLowerCase().includes("timeout")) {
          displayMsg =
            "Upload timed out. For best results, compress the image (save as WebP, reduce resolution to ~2000px wide, or lower JPEG quality to 75-80%) then try again.";
        } else if (rawMsg.toLowerCase().includes("exceeds") || rawMsg.toLowerCase().includes("size limit")) {
          displayMsg = rawMsg;
        }
        toast.error(displayMsg);
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    uploadImage();
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
            <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update product details" : "Add a new product to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('dashboard.products.productName')}</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder={t('dashboard.products.namePlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="productLine">{t('dashboard.products.productLine')}</Label>
                    <Select
                      value={newProduct.productLineId != null ? String(newProduct.productLineId) : ""}
                      onValueChange={(value) => {
                        const id = value ? Number(value) : null;
                        setNewProduct({ ...newProduct, productLineId: id });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.products.selectProductLine')} />
                      </SelectTrigger>
                      <SelectContent>
                        {storeProductLines.filter((pl: any) => pl.isActive).map((pl: any) => (
                          <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">{t('dashboard.products.category')}</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {["green", "black", "herbal", "oolong", "white", "toor", "moong", "chana", "masoor", "urad", "gift-hampers", "tea-sets"].map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">{t('dashboard.products.priceRs')}</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      placeholder="249"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock">{t('dashboard.products.stockQuantity')}</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sku">{t('dashboard.products.sku')}</Label>
                    <Input
                      id="sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder={t('dashboard.products.skuPlaceholderAlt')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reorderPoint">{t('dashboard.products.reorderPoint')}</Label>
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
                  <Label>{t('dashboard.products.productImage')}</Label>
                  <Tabs value={imageUploadTab} onValueChange={(v) => setImageUploadTab(v as "upload" | "url")}>
                    <TabsList className="mb-2">
                      <TabsTrigger value="upload" className="flex items-center gap-1">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        URL
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload">
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          id="imageFile"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="imageFile"
                          className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                            ${uploadingImage 
                              ? 'border-[#2d5a3d]/50 bg-[#2d5a3d]/5' 
                              : 'border-[#2d5a3d]/20 bg-[#f9f7f4] hover:bg-[#2d5a3d]/5 hover:border-[#2d5a3d]/40'
                            }
                          `}
                        >
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-2 text-[#2d5a3d]">
                              <Loader2 className="h-8 w-8 animate-spin" />
                              <p className="text-sm font-medium">{t('common.uploading')}</p>
                            </div>
                          ) : newProduct.imageUrl ? (
                            <div className="relative w-full h-full rounded-xl overflow-hidden">
                              <img
                                src={newProduct.imageUrl}
                                alt={t('common.preview')}
                                className="w-full h-full object-contain p-2"
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (fileInputRef.current) fileInputRef.current.click();
                                  }}
                                  className="p-1.5 rounded-lg bg-white/90 text-[#1c1917] hover:bg-white shadow-sm"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setNewProduct((prev) => ({ ...prev, imageUrl: "" }));
                                  }}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#78746e]">
                              <div className="w-10 h-10 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center">
                                <Upload className="h-5 w-5 text-[#2d5a3d]" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-[#1c1917]">
                                  Click to upload image
                                </p>
                                <p className="text-xs text-[#78746e] mt-0.5">
                                  PNG, JPG, WebP up to 10MB
                                </p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                    </TabsContent>
                    <TabsContent value="url">
                      <div className="space-y-3">
                        <Input
                          id="image"
                          value={newProduct.imageUrl}
                          onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                          placeholder={t('dashboard.blogAdmin.imageUrlPlaceholder')}
                        />
                        {newProduct.imageUrl && (
                          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#2d5a3d]/10">
                            <img
                              src={newProduct.imageUrl}
                              alt={t('common.preview')}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder={t('dashboard.products.descriptionPlaceholder')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isBestseller">{t('dashboard.products.markBestseller')}</Label>
                  <Switch
                    id="isBestseller"
                    checked={newProduct.isBestseller}
                    onCheckedChange={(checked) => setNewProduct({ ...newProduct, isBestseller: checked })}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }} disabled={saving} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button className="bg-[#2d5a3d] hover:bg-[#234832] w-full sm:w-auto" onClick={handleSaveProduct} disabled={saving}>
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
            placeholder={t('dashboard.products.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select
          value={selectedProductLine}
          onValueChange={setSelectedProductLine}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t('dashboard.products.allProductLines')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{t('dashboard.products.allProductLines')}</SelectItem>
            {storeProductLines.filter((pl: any) => pl.isActive).map((pl: any) => (
              <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto" ref={tableRef}>
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium">{t('dashboard.inventory.product')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.products.productLine')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.products.category')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.products.price')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.products.stock')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.products.status')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('dashboard.orders.action')}</th>
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
                        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                          <DialogHeader>
                            <DialogTitle>Adjust Stock for {selectedStockProduct?.name}</DialogTitle>
                            <DialogDescription>
                              Current stock: {selectedStockProduct?.stock} units
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
                          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setIsStockDialogOpen(false);
                                setSelectedStockProduct(null);
                                setStockAdjustment({ quantity: 0, reason: "" });
                              }}
                              disabled={stockSaving}
                              className="w-full sm:w-auto"
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-[#2d5a3d] hover:bg-[#234832] w-full sm:w-auto"
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
                            <AlertDialogTitle>{t('dashboard.products.deleteConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('dashboard.products.cancel')}</AlertDialogCancel>
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
