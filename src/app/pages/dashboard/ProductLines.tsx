'use client';

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
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
import { api, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../context/AuthContext";
import { Badge } from "../../components/ui/badge";

import { useTranslation } from "@/hooks/useTranslation";
type ProductLineCategory = {
  id: string;
  name: string;
  description: string;
  image: string;
};

type ProductLine = {
  id: number;
  slug: string;
  name: string;
  description: string;
  heroHeadline?: string;
  heroImage?: string;
  color: string;
  categories?: ProductLineCategory[];
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLinkText?: string;
  ctaLink?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const EmptyPL: Omit<ProductLine, "id" | "createdAt" | "updatedAt"> = {
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
  sortOrder: 0,
};

function toCreatePayload(pl: Partial<ProductLine>) {
  return {
    name: pl.name,
    slug: pl.slug,
    description: pl.description,
    heroHeadline: pl.heroHeadline || "",
    heroImage: pl.heroImage || "",
    color: pl.color || "#2d5a3d",
    categories: pl.categories && Array.isArray(pl.categories) ? pl.categories : [],
    ctaTitle: pl.ctaTitle || "",
    ctaDescription: pl.ctaDescription || "",
    ctaLinkText: pl.ctaLinkText || "",
    ctaLink: pl.ctaLink || "",
    isActive: typeof pl.isActive === "boolean" ? pl.isActive : true,
    sortOrder: typeof pl.sortOrder === "number" ? pl.sortOrder : 0,
  };
}

export default function ProductLines() {
  const { currentUser, userType } = useAuth();
  const isSuperAdmin = userType === "admin" && "role" in (currentUser || {}) && (currentUser as any)?.role === "superadmin";
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductLine | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProductLine, setEditingProductLine] = useState<ProductLine | null>(null);
  const [newProductLine, setNewProductLine] = useState<Partial<ProductLine>>({ ...EmptyPL });

  const { t } = useTranslation();

  const fetchProductLines = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<ProductLine[]>("/product-lines");
      const data: ProductLine[] = Array.isArray(res)
        ? res
        : ((res as any)?.data ?? []);
      setProductLines(data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load product lines";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductLines();
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  const handleSaveProductLine = async () => {
    if (!newProductLine.name || !newProductLine.slug || !newProductLine.description) {
      toast.error("Please fill in all required fields (Name, Slug, Description)");
      return;
    }
    try {
      setIsSaving(true);
      const payload = toCreatePayload(newProductLine);
      let createdOrUpdated: ProductLine;

      if (editingProductLine) {
        createdOrUpdated = await api.put<ProductLine>(
          `/product-lines/${editingProductLine.id}`,
          payload
        );
        const resolved: ProductLine = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setProductLines((prev) =>
          prev.map((p) => (p.id === resolved.id ? resolved : p))
        );
        toast.success("Product line updated successfully!");
      } else {
        createdOrUpdated = await api.post<ProductLine>("/product-lines", payload);
        const resolved: ProductLine = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setProductLines((prev) => [...prev, resolved].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        toast.success("Product line created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingProductLine(null);
      setNewProductLine({ ...EmptyPL, sortOrder: productLines.length });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save product line";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProductLine = (productLine: ProductLine) => {
    setEditingProductLine(productLine);
    setNewProductLine({
      ...productLine,
      categories: productLine.categories && Array.isArray(productLine.categories) ? productLine.categories : [],
    });
    setIsAddDialogOpen(true);
  };

  const requestDelete = (productLine: ProductLine) => {
    setDeleteTarget(productLine);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/product-lines/${deleteTarget.id}`);
      setProductLines((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Product line deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete product line";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setEditingProductLine(null);
    setNewProductLine({ ...EmptyPL, sortOrder: productLines.length });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Product Lines
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[#78746e]">{t('dashboard.productLines.manageDesc')}</p>
            {!isSuperAdmin && (
              <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                View only — Super Admin required to edit
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-[#2d5a3d] hover:bg-[#234832] text-white"
                disabled={!isSuperAdmin}
                title={isSuperAdmin ? "Add new product line" : "Only Super Admin can create product lines"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product Line
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingProductLine ? "Edit Product Line" : "Add New Product Line"}
                </DialogTitle>
                <DialogDescription>
                  {editingProductLine
                    ? "Update the product line details below."
                    : "Add a new product line (e.g. Green Tea, Black Tea)."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pl-name">Name *</Label>
                    <Input
                      id="pl-name"
                      value={newProductLine.name || ""}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewProductLine((prev) => ({
                          ...prev,
                          name,
                          slug: prev.slug || generateSlug(name),
                        }));
                      }}
                      placeholder={t('dashboard.productLines.namePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pl-slug">Slug *</Label>
                    <Input
                      id="pl-slug"
                      value={newProductLine.slug || ""}
                      onChange={(e) =>
                        setNewProductLine({ ...newProductLine, slug: e.target.value })
                      }
                      placeholder={t('dashboard.productLines.slugPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pl-description">Description *</Label>
                  <Textarea
                    id="pl-description"
                    rows={3}
                    value={newProductLine.description || ""}
                    onChange={(e) =>
                      setNewProductLine({ ...newProductLine, description: e.target.value })
                    }
                    placeholder={t('dashboard.productLines.descPlaceholder')}
                  />
                </div>

                <ImageUploadField
                  label="Hero Image"
                  value={newProductLine.heroImage || ""}
                  onChange={(v) => setNewProductLine({ ...newProductLine, heroImage: v })}
                  folder="product-lines"
                  placeholder={t('dashboard.blogAdmin.imageUrlPlaceholder')}
                  id="pl-hero-image"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pl-heroHeadline">{t('dashboard.productLines.heroHeadline')}</Label>
                    <Input
                      id="pl-heroHeadline"
                      value={newProductLine.heroHeadline || ""}
                      onChange={(e) =>
                        setNewProductLine({ ...newProductLine, heroHeadline: e.target.value })
                      }
                      placeholder={t('dashboard.productLines.heroHeadlinePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pl-color">{t('dashboard.productLines.themeColor')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="pl-color"
                        value={newProductLine.color || "#2d5a3d"}
                        onChange={(e) =>
                          setNewProductLine({ ...newProductLine, color: e.target.value })
                        }
                        placeholder="#2d5a3d"
                      />
                      <input
                        type="color"
                        className="h-10 w-12 rounded-md border border-[#2d5a3d]/10 bg-white p-1"
                        value={newProductLine.color || "#2d5a3d"}
                        onChange={(e) =>
                          setNewProductLine({ ...newProductLine, color: e.target.value })
                        }
                        aria-label={t('a11y.colorPicker')}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t pt-4">
                  <Label className="text-base font-medium">{t('dashboard.productLines.ctaOptional')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pl-ctaTitle">{t('dashboard.productLines.ctaTitle')}</Label>
                      <Input
                        id="pl-ctaTitle"
                        value={newProductLine.ctaTitle || ""}
                        onChange={(e) =>
                          setNewProductLine({ ...newProductLine, ctaTitle: e.target.value })
                        }
                        placeholder={t('dashboard.productLines.ctaTitlePlaceholder')}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pl-ctaLinkText">{t('dashboard.productLines.ctaButtonText')}</Label>
                      <Input
                        id="pl-ctaLinkText"
                        value={newProductLine.ctaLinkText || ""}
                        onChange={(e) =>
                          setNewProductLine({ ...newProductLine, ctaLinkText: e.target.value })
                        }
                        placeholder={t('dashboard.productLines.ctaButtonPlaceholder')}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pl-ctaDescription">{t('dashboard.productLines.ctaDescription')}</Label>
                    <Textarea
                      id="pl-ctaDescription"
                      rows={2}
                      value={newProductLine.ctaDescription || ""}
                      onChange={(e) =>
                        setNewProductLine({ ...newProductLine, ctaDescription: e.target.value })
                      }
                      placeholder={t('dashboard.productLines.ctaDescPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pl-ctaLink">{t('dashboard.productLines.ctaLink')}</Label>
                    <Input
                      id="pl-ctaLink"
                      value={newProductLine.ctaLink || ""}
                      onChange={(e) =>
                        setNewProductLine({ ...newProductLine, ctaLink: e.target.value })
                      }
                      placeholder="/shop/green-tea"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pl-sortOrder">{t('common.sortOrder')}</Label>
                    <Input
                      id="pl-sortOrder"
                      type="number"
                      value={typeof newProductLine.sortOrder === "number" ? newProductLine.sortOrder : 0}
                      onChange={(e) =>
                        setNewProductLine({ ...newProductLine, sortOrder: Number(e.target.value) })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#2d5a3d]/10 p-3 bg-[#f9f7f4]">
                    <Label htmlFor="pl-isActive" className="font-medium">{t('dashboard.customers.active')}</Label>
                    <Switch
                      id="pl-isActive"
                      checked={typeof newProductLine.isActive === "boolean" ? newProductLine.isActive : true}
                      onCheckedChange={(c) => setNewProductLine({ ...newProductLine, isActive: c })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button variant="secondary" disabled={isSaving} onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#2d5a3d] hover:bg-[#234832]"
                  disabled={isSaving}
                  onClick={handleSaveProductLine}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingProductLine ? "Saving..." : "Creating..."}
                    </>
                  ) : editingProductLine ? (
                    "Save Changes"
                  ) : (
                    "Create Product Line"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.productLines.line')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('common.slug')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.products.status')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('common.order')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">{t('dashboard.orders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                    Loading product lines...
                  </td>
                </tr>
              ) : productLines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    No product lines found — click &ldquo;Add Product Line&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                productLines.map((pl) => (
                  <tr key={pl.id} className="group hover:bg-[#f9f7f4] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg shadow-inner flex-shrink-0 border border-[#2d5a3d]/10"
                          style={{ backgroundColor: pl.color || "#2d5a3d" }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-[#1c1917] truncate">{pl.name}</p>
                          <p className="text-xs text-[#78746e] truncate max-w-[260px]">
                            {pl.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-[#2d5a3d] bg-[#2d5a3d]/5 rounded px-2 py-1 whitespace-nowrap">
                        /{pl.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          pl.isActive
                            ? "bg-[#e8f5ed] text-[#2d5a3d]"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {pl.isActive ? t('common.active') : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-[#1c1917] whitespace-nowrap">
                      {pl.sortOrder ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {isSuperAdmin ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditProductLine(pl)}
                              disabled={isSaving || deletingId !== null}
                              title={t('dashboard.products.edit')}
                              className="hover:bg-[#f0ede8]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => requestDelete(pl)}
                              disabled={deletingId === pl.id}
                              title={t('dashboard.products.delete')}
                            >
                              {deletingId === pl.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-[#78746e] border-[#e7e4df]">
                            Read-only
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.productLines.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#1c1917]">{deleteTarget?.name}</span>? This
              action cannot be undone.
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
