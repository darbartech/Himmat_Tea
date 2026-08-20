'use client';

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Coffee, ChefHat } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, ApiError } from "../../../lib/api-client";

import { useTranslation } from "@/hooks/useTranslation";
type BrewingGuide = {
  id: string;
  title: string;
  slug: string;
  teaType: string;
  description: string;
  waterTemp: string;
  steepingTime: string;
  leafQuantity: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const TEA_TYPES = ["Green Tea", "Black Tea", "Oolong Tea", "White Tea", "Herbal Tea", "Masala Chai", "Pu-erh", "Matcha"];

const EmptyGuide: Omit<BrewingGuide, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  slug: "",
  teaType: "Green Tea",
  description: "",
  waterTemp: "80°C",
  steepingTime: "3 min",
  leafQuantity: "2g per 200ml",
  image: "",
  isActive: true,
};

const generateSlug = (title: string): string => {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

export default function BrewingGuidesAdmin() {
  const [guides, setGuides] = useState<BrewingGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrewingGuide | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<BrewingGuide | null>(null);
  const [newGuide, setNewGuide] = useState<Partial<BrewingGuide>>({ ...EmptyGuide });
  const [filterTeaType, setFilterTeaType] = useState<string>("All");
  const { t } = useTranslation();

  const fetchGuides = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<BrewingGuide[]>("/brewing-guides?admin=true");
      const data: BrewingGuide[] = Array.isArray(res)
        ? res
        : ((res as any)?.data ?? []);
      setGuides(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load brewing guides";
      notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const handleSaveGuide = async () => {
    if (!newGuide.title || !newGuide.slug || !newGuide.description) {
      notify.error("Please fill in title, slug, and description");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        title: newGuide.title,
        slug: newGuide.slug,
        teaType: newGuide.teaType || "Green Tea",
        description: newGuide.description,
        waterTemp: newGuide.waterTemp || "",
        steepingTime: newGuide.steepingTime || "",
        leafQuantity: newGuide.leafQuantity || "",
        image: newGuide.image || "",
        isActive: typeof newGuide.isActive === "boolean" ? newGuide.isActive : true,
      };
      let createdOrUpdated: BrewingGuide;

      if (editingGuide) {
        createdOrUpdated = await api.put<BrewingGuide>(`/brewing-guides/${editingGuide.id}`, payload);
        const resolved: BrewingGuide = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setGuides((prev) =>
          prev.map((g) => (g.id === resolved.id ? resolved : g))
        );
        notify.success("Brewing guide updated successfully!");
      } else {
        createdOrUpdated = await api.post<BrewingGuide>("/brewing-guides", payload);
        const resolved: BrewingGuide = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setGuides((prev) => [resolved, ...prev]);
        notify.success("Brewing guide created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingGuide(null);
      setNewGuide({ ...EmptyGuide });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save brewing guide";
      notify.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGuide = (guide: BrewingGuide) => {
    setEditingGuide(guide);
    setNewGuide({ ...guide });
    setIsAddDialogOpen(true);
  };

  const requestDelete = (guide: BrewingGuide) => {
    setDeleteTarget(guide);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/brewing-guides/${deleteTarget.id}`);
      setGuides((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      notify.success("Brewing guide deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete brewing guide";
      notify.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setEditingGuide(null);
    setNewGuide({ ...EmptyGuide });
  };

  const filteredGuides = filterTeaType === "All"
    ? guides
    : guides.filter((g) => g.teaType === filterTeaType);

  const teaTypes = ["All", ...Array.from(new Set(guides.map((g) => g.teaType).filter(Boolean)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Brewing Guides
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.brewingGuides.manageDesc')}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <Select value={filterTeaType} onValueChange={setFilterTeaType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('dashboard.brewingGuides.allTeaTypes')} />
            </SelectTrigger>
            <SelectContent>
              {teaTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                Add Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingGuide ? "Edit Brewing Guide" : "Add New Brewing Guide"}
                </DialogTitle>
                <DialogDescription>
                  {editingGuide ? "Update guide details below." : "Add a new tea brewing instruction guide."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bg-title">{t('dashboard.brewingGuides.fields.title')}</Label>
                    <Input
                      id="bg-title"
                      value={newGuide.title || ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        setNewGuide((prev) => ({
                          ...prev,
                          title,
                          slug: prev.slug || generateSlug(title),
                        }));
                      }}
                      placeholder={t('dashboard.brewingGuides.titlePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bg-slug">{t('dashboard.brewingGuides.fields.slug')}</Label>
                    <Input
                      id="bg-slug"
                      value={newGuide.slug || ""}
                      onChange={(e) => setNewGuide({ ...newGuide, slug: e.target.value })}
                      placeholder={t('dashboard.brewingGuides.slugPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bg-description">{t('dashboard.brewingGuides.fields.description')}</Label>
                  <Textarea
                    id="bg-description"
                    rows={3}
                    value={newGuide.description || ""}
                    onChange={(e) => setNewGuide({ ...newGuide, description: e.target.value })}
                    placeholder={t('dashboard.brewingGuides.excerptPlaceholder')}
                  />
                </div>

                <ImageUploadField
                  label={t('dashboard.brewingGuides.fields.featuredImage')}
                  value={newGuide.image || ""}
                  onChange={(v) => setNewGuide({ ...newGuide, image: v })}
                  folder="brewing-guides"
                  placeholder={t('dashboard.blogAdmin.imageUrlPlaceholder')}
                  id="bg-image"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bg-teaType">{t('dashboard.brewingGuides.teaType')}</Label>
                    <Select
                      value={newGuide.teaType || "Green Tea"}
                      onValueChange={(v) => setNewGuide({ ...newGuide, teaType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.brewingGuides.selectTeaType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TEA_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bg-waterTemp">{t('dashboard.brewingGuides.waterTemperature')}</Label>
                    <Input
                      id="bg-waterTemp"
                      value={newGuide.waterTemp || ""}
                      onChange={(e) => setNewGuide({ ...newGuide, waterTemp: e.target.value })}
                      placeholder={t('dashboard.brewingGuides.placeholders.waterTemp')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bg-steepingTime">{t('dashboard.brewingGuides.steepingTime')}</Label>
                    <Input
                      id="bg-steepingTime"
                      value={newGuide.steepingTime || ""}
                      onChange={(e) => setNewGuide({ ...newGuide, steepingTime: e.target.value })}
                      placeholder={t('dashboard.brewingGuides.placeholders.steepingTime')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bg-leafQuantity">{t('dashboard.brewingGuides.leafQuantity')}</Label>
                    <Input
                      id="bg-leafQuantity"
                      value={newGuide.leafQuantity || ""}
                      onChange={(e) => setNewGuide({ ...newGuide, leafQuantity: e.target.value })}
                      placeholder={t('dashboard.brewingGuides.placeholders.leafQuantity')}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#2d5a3d]/10 p-3 bg-[#f9f7f4]">
                    <Label htmlFor="bg-isActive" className="font-medium">{t('common.activeVisible')}</Label>
                    <Switch
                      id="bg-isActive"
                      checked={typeof newGuide.isActive === "boolean" ? newGuide.isActive : true}
                      onCheckedChange={(c) => setNewGuide({ ...newGuide, isActive: c })}
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
                  onClick={handleSaveGuide}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingGuide ? "Saving..." : "Creating..."}
                    </>
                  ) : editingGuide ? (
                    "Save Changes"
                  ) : (
                    "Create Guide"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 p-4">
              <div className="h-40 bg-[#f9f7f4] rounded-xl animate-pulse mb-4" />
              <div className="h-5 bg-[#f9f7f4] rounded animate-pulse mb-2 w-3/4" />
              <div className="h-4 bg-[#f9f7f4] rounded animate-pulse w-1/2" />
            </div>
          ))
        ) : filteredGuides.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#78746e] bg-white rounded-2xl border border-[#2d5a3d]/5">
            <ChefHat className="h-10 w-10 mx-auto mb-3 text-[#2d5a3d]/30" />
            <p className="font-medium mb-1">{t('dashboard.brewingGuides.noneFound')}</p>
            <p className="text-sm">{t('dashboard.brewingGuides.noneFoundDesc')}</p>
          </div>
        ) : (
          filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 bg-[#f9f7f4]">
                {guide.image ? (
                  <img
                    src={guide.image}
                    alt={guide.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d5a3d]/10 to-[#c8a96e]/10">
                    <Coffee className="h-12 w-12 text-[#2d5a3d]/40" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      guide.isActive
                        ? "bg-[#e8f5ed] text-[#2d5a3d]"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {guide.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditGuide(guide)}
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
                        onClick={() => requestDelete(guide)}
                        disabled={deletingId === guide.id}
                        className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm shadow hover:bg-red-50"
                      >
                        {deletingId === guide.id ? (
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
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-[#1c1917] line-clamp-1">{guide.title}</h3>
                  <span className="text-xs font-medium text-[#2d5a3d] bg-[#2d5a3d]/5 px-2 py-0.5 rounded shrink-0">
                    {guide.teaType}
                  </span>
                </div>
                <p className="text-sm text-[#78746e] line-clamp-2 mb-3 min-h-[2.5rem]">
                  {guide.description}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-[#2d5a3d]/5">
                  <div>
                    <p className="text-[#78746e] uppercase tracking-wider text-[10px] font-semibold mb-0.5">{t('dashboard.brewingGuides.temp')}</p>
                    <p className="font-medium text-[#1c1917]">{guide.waterTemp || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#78746e] uppercase tracking-wider text-[10px] font-semibold mb-0.5">{t('dashboard.invoice.time')}</p>
                    <p className="font-medium text-[#1c1917]">{guide.steepingTime || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#78746e] uppercase tracking-wider text-[10px] font-semibold mb-0.5">{t('dashboard.brewingGuides.leaves')}</p>
                    <p className="font-medium text-[#1c1917] truncate">{guide.leafQuantity || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.brewingGuides.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action cannot be undone.
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
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
