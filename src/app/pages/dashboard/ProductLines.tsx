'use client';

import { useState, useRef } from "react";
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
import { ImageUploadField } from "../../components/ui/image-upload-field";
import { useStore } from "../../../context/StoreContext";
import { BRAND } from "../../../config/brand";

type ProductLine = {
  id: string;
  slug: string;
  name: string;
  description: string;
  heroHeadline?: string;
  heroImage?: string;
  color: string;
  categories?: Array<{
    id: string;
    name: string;
    description: string;
    image: string;
  }>;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLinkText?: string;
  ctaLink?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default function ProductLines() {
  const { productLines, addProductLine, updateProductLine, deleteProductLine } = useStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProductLine, setEditingProductLine] = useState<ProductLine | null>(null);
  const [newProductLine, setNewProductLine] = useState<Partial<ProductLine>>({
    name: "",
    slug: "",
    description: "",
    heroHeadline: "",
    heroImage: "",
    color: "#2d5a3d",
    categories: [],
    ctaTitle: "",
    ctaDescription: "",
    ctaLinkText: "",
    ctaLink: "",
    isActive: true,
    sortOrder: productLines.length,
  });

  const handleSaveProductLine = () => {
    if (!newProductLine.name || !newProductLine.slug || !newProductLine.description) {
      toast.error("Please fill in all required fields (Name, Slug, Description)");
      return;
    }
    if (editingProductLine) {
      updateProductLine(editingProductLine.id, newProductLine);
      toast.success("Product line updated successfully!");
    } else {
      addProductLine(newProductLine as Omit<ProductLine, "id" | "createdAt" | "updatedAt">);
    }
    setIsAddDialogOpen(false);
    setEditingProductLine(null);
    setNewProductLine({
      name: "",
      slug: "",
      description: "",
      heroImage: "",
      isActive: true,
      sortOrder: productLines.length,
    });
  };

  const handleEditProductLine = (productLine: ProductLine) => {
    setEditingProductLine(productLine);
    setNewProductLine(productLine);
    setIsAddDialogOpen(true);
  };

  const handleDeleteProductLine = (id: string) => {
    deleteProductLine(id);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Product Lines
          </h1>
          <p className="text-[#78746e] mt-1">Manage your {BRAND.companyName} product lines (shown in navbar)</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Product Line
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProductLine ? "Edit Product Line" : "Add New Product Line"}</DialogTitle>
                <DialogDescription>
                  {editingProductLine ? "Update product line details" : "Add a new product line to your brand"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Line Name</Label>
                  <Input
                    id="name"
                    value={newProductLine.name}
                    onChange={(e) => {
                      setNewProductLine({ 
                        ...newProductLine, 
                        name: e.target.value,
                        slug: editingProductLine ? newProductLine.slug : generateSlug(e.target.value)
                      });
                    }}
                    placeholder="e.g., Himalayan Teas"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug (URL Path)</Label>
                  <Input
                    id="slug"
                    value={newProductLine.slug}
                    onChange={(e) => setNewProductLine({ ...newProductLine, slug: e.target.value })}
                    placeholder="e.g., himalayan-teas"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProductLine.description}
                    onChange={(e) => setNewProductLine({ ...newProductLine, description: e.target.value })}
                    placeholder="Brief description of this product line"
                  />
                </div>
                <ImageUploadField
                  label="Hero Image"
                  value={newProductLine.heroImage || ""}
                  onChange={(v) => setNewProductLine({ ...newProductLine, heroImage: v })}
                  folder="product-lines"
                  placeholder="https://..."
                  id="hero-image"
                />
                <div className="grid gap-2">
                  <Label htmlFor="color">Brand Color</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={newProductLine.color}
                      onChange={(e) => setNewProductLine({ ...newProductLine, color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={newProductLine.color}
                      onChange={(e) => setNewProductLine({ ...newProductLine, color: e.target.value })}
                      placeholder="#2d5a3d"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={newProductLine.sortOrder}
                    onChange={(e) => setNewProductLine({ ...newProductLine, sortOrder: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={newProductLine.isActive}
                    onCheckedChange={(checked) => setNewProductLine({ ...newProductLine, isActive: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingProductLine(null);
                  setNewProductLine({
                    name: "",
                    slug: "",
                    description: "",
                    heroImage: "",
                    color: "#2d5a3d",
                    isActive: true,
                    sortOrder: productLines.length,
                  });
                }}>
                  Cancel
                </Button>
                <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSaveProductLine}>
                  Save Product Line
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Product Lines List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Sort Order</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {productLines
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((productLine) => (
                <tr key={productLine.id} className="group hover:bg-[#f9f7f4] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {productLine.heroImage && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2d5a3d]/10">
                          <img src={productLine.heroImage} alt={productLine.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#1c1917]">{productLine.name}</p>
                        {productLine.description && (
                          <p className="text-xs text-[#78746e] truncate max-w-[200px]">{productLine.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#78746e]">{productLine.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      productLine.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {productLine.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#1c1917]">{productLine.sortOrder}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditProductLine(productLine)}
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
                            <AlertDialogTitle>Delete Product Line?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{productLine.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProductLine(productLine.id)} className="bg-red-600">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {productLines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    No product lines found
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
