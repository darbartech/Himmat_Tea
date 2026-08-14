'use client';

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Loader2, Layers, Package, Search as SearchIcon, Check, X } from "lucide-react";
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
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { api, ApiError } from "../../../lib/api-client";

type Product = {
  id: number;
  name: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  isActive?: boolean;
};

type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    collectionId: string;
    productId: number;
    product?: Product;
  }>;
};

const EmptyColl: Omit<Collection, "id" | "createdAt" | "updatedAt" | "items"> = {
  title: "",
  slug: "",
  description: "",
  image: "",
  isActive: true,
};

const generateSlug = (title: string): string => {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

export default function CollectionsAdmin() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newCollection, setNewCollection] = useState<Partial<Collection> & { selectedProductIds: number[] }>({
    ...EmptyColl,
    selectedProductIds: [],
  });
  const [productSearch, setProductSearch] = useState("");

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [collsRes, prodsRes] = await Promise.all([
        api.get<any>("/collections?admin=true"),
        api.get<any>("/products"),
      ]);
      const collData: Collection[] = Array.isArray(collsRes)
        ? collsRes
        : ((collsRes as any)?.data ?? []);
      const prodData: Product[] = Array.isArray(prodsRes)
        ? prodsRes
        : ((prodsRes as any)?.data ?? (prodsRes as any)?.products ?? []);
      setCollections(collData);
      setProducts(prodData);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load collections";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleProductId = (pid: number) => {
    setNewCollection((prev) => {
      const current = prev.selectedProductIds || [];
      const has = current.includes(pid);
      return {
        ...prev,
        selectedProductIds: has
          ? current.filter((x) => x !== pid)
          : [...current, pid],
      };
    });
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const handleSave = async () => {
    if (!newCollection.title || !newCollection.slug || !newCollection.description) {
      toast.error("Please fill in title, slug, and description");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        title: newCollection.title,
        slug: newCollection.slug,
        description: newCollection.description,
        image: newCollection.image || "",
        isActive: typeof newCollection.isActive === "boolean" ? newCollection.isActive : true,
        items: (newCollection.selectedProductIds || []).map((pid) => ({ productId: pid })),
      };
      let createdOrUpdated: any;

      if (editingCollection) {
        createdOrUpdated = await api.put(`/collections/${editingCollection.id}`, payload);
      } else {
        createdOrUpdated = await api.post("/collections", payload);
      }
      const resolved: any = (createdOrUpdated as any)?.data ?? createdOrUpdated;
      await fetchAll();
      toast.success(editingCollection ? "Collection updated!" : "Collection created!");
      setIsAddDialogOpen(false);
      setEditingCollection(null);
      setNewCollection({ ...EmptyColl, selectedProductIds: [] });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save collection";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (coll: Collection) => {
    setEditingCollection(coll);
    setNewCollection({
      title: coll.title,
      slug: coll.slug,
      description: coll.description,
      image: coll.image,
      isActive: coll.isActive,
      selectedProductIds: (coll.items || []).map((it) => it.productId),
    });
    setIsAddDialogOpen(true);
  };

  const requestDelete = (coll: Collection) => {
    setDeleteTarget(coll);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/collections/${deleteTarget.id}`);
      setCollections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Collection deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete collection";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setEditingCollection(null);
    setNewCollection({ ...EmptyColl, selectedProductIds: [] });
    setProductSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Collections
          </h1>
          <p className="text-[#78746e] mt-1">Group products into curated collections</p>
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
              Add Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingCollection ? "Edit Collection" : "Add New Collection"}
              </DialogTitle>
              <DialogDescription>
                {editingCollection
                  ? "Update collection details and linked products."
                  : "Create a curated product collection for your store."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="col-title">Title *</Label>
                  <Input
                    id="col-title"
                    value={newCollection.title || ""}
                    onChange={(e) => {
                      const title = e.target.value;
                      setNewCollection((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug || generateSlug(title),
                      }));
                    }}
                    placeholder="Summer Favorites"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="col-slug">Slug *</Label>
                  <Input
                    id="col-slug"
                    value={newCollection.slug || ""}
                    onChange={(e) => setNewCollection({ ...newCollection, slug: e.target.value })}
                    placeholder="summer-favorites"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="col-description">Description *</Label>
                <Textarea
                  id="col-description"
                  rows={3}
                  value={newCollection.description || ""}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  placeholder="Describe this collection..."
                />
              </div>

              <ImageUploadField
                label="Collection Image"
                value={newCollection.image || ""}
                onChange={(v) => setNewCollection({ ...newCollection, image: v })}
                folder="collections"
                placeholder="https://..."
                id="col-image"
              />

              <div className="grid gap-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Products ({newCollection.selectedProductIds?.length || 0} selected)
                  </Label>
                  <div className="relative w-full sm:w-[280px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-[#2d5a3d]/10 bg-[#f9f7f4]">
                  <ScrollArea className="h-64 sm:h-72 rounded-xl">
                    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-[#78746e] text-sm">
                          {products.length === 0 ? "No products found. Create products first." : "No products match your search."}
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const selected = (newCollection.selectedProductIds || []).includes(p.id);
                          return (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => toggleProductId(p.id)}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                                selected
                                  ? "border-[#2d5a3d] bg-white ring-1 ring-[#2d5a3d]/20"
                                  : "border-transparent bg-white/60 hover:bg-white hover:border-[#2d5a3d]/20"
                              }`}
                            >
                              <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                  selected ? "bg-[#2d5a3d] border-[#2d5a3d]" : "border-[#2d5a3d]/30"
                                }`}
                              >
                                {selected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="w-9 h-9 rounded-md overflow-hidden border border-[#2d5a3d]/10 shrink-0 bg-white">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#2d5a3d]/40">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1c1917] truncate">{p.name}</p>
                                <p className="text-xs text-[#78746e] truncate">
                                  {p.category || "General"} · ₹{p.price || 0}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#2d5a3d]/10 p-3 bg-[#f9f7f4]">
                <Label htmlFor="col-isActive" className="font-medium">Active (Visible on site)</Label>
                <Switch
                  id="col-isActive"
                  checked={typeof newCollection.isActive === "boolean" ? newCollection.isActive : true}
                  onCheckedChange={(c) => setNewCollection({ ...newCollection, isActive: c })}
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
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingCollection ? "Saving..." : "Creating..."}
                  </>
                ) : editingCollection ? (
                  "Save Changes"
                ) : (
                  "Create Collection"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 p-4">
              <div className="h-44 bg-[#f9f7f4] rounded-xl animate-pulse mb-4" />
              <div className="h-6 bg-[#f9f7f4] rounded animate-pulse mb-2 w-3/4" />
              <div className="h-4 bg-[#f9f7f4] rounded animate-pulse w-1/2 mb-3" />
              <div className="h-8 bg-[#f9f7f4] rounded-lg animate-pulse w-24" />
            </div>
          ))
        ) : collections.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#78746e] bg-white rounded-2xl border border-[#2d5a3d]/5">
            <Layers className="h-10 w-10 mx-auto mb-3 text-[#2d5a3d]/30" />
            <p className="font-medium mb-1">No collections found</p>
            <p className="text-sm">Create your first collection to group related products together</p>
          </div>
        ) : (
          collections.map((coll) => (
            <div
              key={coll.id}
              className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 bg-[#f9f7f4]">
                {coll.image ? (
                  <img src={coll.image} alt={coll.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d5a3d]/10 to-[#c8a96e]/10">
                    <Layers className="h-12 w-12 text-[#2d5a3d]/40" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      coll.isActive
                        ? "bg-[#e8f5ed] text-[#2d5a3d]"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {coll.isActive ? "Active" : "Inactive"}
                  </span>
                  <Badge variant="outline" className="bg-white/95 backdrop-blur-sm text-[10px]">
                    {coll.items?.length || 0} products
                  </Badge>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(coll)}
                    disabled={isSaving || deletingId !== null}
                    className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm shadow hover:bg-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => requestDelete(coll)}
                        disabled={deletingId === coll.id}
                        className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm shadow hover:bg-red-50"
                      >
                        {deletingId === coll.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                  </AlertDialog>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-[#1c1917] truncate">{coll.title}</h3>
                </div>
                <code className="text-[10px] text-[#2d5a3d] bg-[#2d5a3d]/5 px-1.5 py-0.5 rounded">
                  /collections/{coll.slug}
                </code>
                <p className="text-sm text-[#78746e] line-clamp-2 mt-2 min-h-[2.5rem]">
                  {coll.description}
                </p>
                {coll.items && coll.items.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#2d5a3d]/5">
                    {coll.items.slice(0, 4).map((it) => (
                      <span
                        key={it.id}
                        className="text-[10px] bg-[#f9f7f4] text-[#1c1917] px-2 py-0.5 rounded-md truncate max-w-[120px]"
                        title={it.product?.name || `Product #${it.productId}`}
                      >
                        {it.product?.name || `#${it.productId}`}
                      </span>
                    ))}
                    {coll.items.length > 4 && (
                      <span className="text-[10px] text-[#78746e] px-2 py-0.5">
                        +{coll.items.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? Products will remain in your catalog, only the collection grouping will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
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
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
