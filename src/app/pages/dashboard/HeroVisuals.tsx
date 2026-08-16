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

import { useTranslation } from "@/hooks/useTranslation";
type HeroVisual = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const EmptyHV: Omit<HeroVisual, "id" | "createdAt" | "updatedAt"> = {
  imageUrl: "",
  title: "",
  subtitle: "",
  isActive: true,
  sortOrder: 0,
};

export default function HeroVisuals() {
  const [heroVisuals, setHeroVisuals] = useState<HeroVisual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroVisual | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHeroVisual, setEditingHeroVisual] = useState<HeroVisual | null>(null);
  const [newHeroVisual, setNewHeroVisual] = useState<Partial<HeroVisual>>({ ...EmptyHV });
  const { t } = useTranslation();

  const fetchHeroVisuals = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<HeroVisual[]>("/hero-visuals");
      const data: HeroVisual[] = Array.isArray(res)
        ? res
        : ((res as any)?.data ?? []);
      setHeroVisuals(data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load hero visuals";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroVisuals();
  }, []);

  const handleSaveHeroVisual = async () => {
    if (!newHeroVisual.imageUrl) {
      toast.error("Please provide an image");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        imageUrl: newHeroVisual.imageUrl,
        title: newHeroVisual.title || "",
        subtitle: newHeroVisual.subtitle || "",
        isActive: typeof newHeroVisual.isActive === "boolean" ? newHeroVisual.isActive : true,
        sortOrder: typeof newHeroVisual.sortOrder === "number" ? newHeroVisual.sortOrder : heroVisuals.length,
      };
      let createdOrUpdated: HeroVisual;

      if (editingHeroVisual) {
        createdOrUpdated = await api.put<HeroVisual>(
          `/hero-visuals/${editingHeroVisual.id}`,
          payload
        );
        const resolved: HeroVisual = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setHeroVisuals((prev) =>
          prev.map((h) => (h.id === resolved.id ? resolved : h)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
        toast.success("Hero visual updated successfully!");
      } else {
        createdOrUpdated = await api.post<HeroVisual>("/hero-visuals", payload);
        const resolved: HeroVisual = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setHeroVisuals((prev) => [...prev, resolved].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        toast.success("Hero visual created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingHeroVisual(null);
      setNewHeroVisual({ ...EmptyHV, sortOrder: heroVisuals.length + 1 });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save hero visual";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditHeroVisual = (heroVisual: HeroVisual) => {
    setEditingHeroVisual(heroVisual);
    setNewHeroVisual({ ...heroVisual });
    setIsAddDialogOpen(true);
  };

  const requestDelete = (heroVisual: HeroVisual) => {
    setDeleteTarget(heroVisual);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/hero-visuals/${deleteTarget.id}`);
      setHeroVisuals((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      toast.success("Hero visual deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete hero visual";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setEditingHeroVisual(null);
    setNewHeroVisual({ ...EmptyHV, sortOrder: heroVisuals.length + 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Hero Visuals
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.heroVisuals.manageDesc')}</p>
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
              <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Visual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>{editingHeroVisual ? "Edit Hero Visual" : "Add New Hero Visual"}</DialogTitle>
                <DialogDescription>
                  {editingHeroVisual ? "Update visual details" : "Add a new visual to your hero section"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <ImageUploadField
                  label="Hero Image"
                  value={newHeroVisual.imageUrl || ""}
                  onChange={(v) => setNewHeroVisual({ ...newHeroVisual, imageUrl: v })}
                  folder="hero-visuals"
                  placeholder={t('dashboard.heroVisuals.imageUrlPlaceholder')}
                  id="hero-image"
                  required
                />
                <div className="grid gap-2">
                  <Label htmlFor="hv-title">{t('common.titleOptional')}</Label>
                  <Input
                    id="hv-title"
                    value={newHeroVisual.title || ""}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, title: e.target.value })}
                    placeholder={t('dashboard.heroVisuals.titlePlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hv-subtitle">{t('common.subtitleOptional')}</Label>
                  <Input
                    id="hv-subtitle"
                    value={newHeroVisual.subtitle || ""}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, subtitle: e.target.value })}
                    placeholder={t('dashboard.heroVisuals.subtitlePlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hv-sortOrder">{t('common.sortOrder')}</Label>
                  <Input
                    id="hv-sortOrder"
                    type="number"
                    value={typeof newHeroVisual.sortOrder === "number" ? newHeroVisual.sortOrder : 0}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, sortOrder: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#2d5a3d]/10 p-3 bg-[#f9f7f4]">
                  <Label htmlFor="hv-isActive" className="font-medium">{t('dashboard.customers.active')}</Label>
                  <Switch
                    id="hv-isActive"
                    checked={typeof newHeroVisual.isActive === "boolean" ? newHeroVisual.isActive : true}
                    onCheckedChange={(checked) => setNewHeroVisual({ ...newHeroVisual, isActive: checked })}
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
                  onClick={handleSaveHeroVisual}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingHeroVisual ? "Saving..." : "Creating..."}
                    </>
                  ) : editingHeroVisual ? (
                    "Save Changes"
                  ) : (
                    "Add Visual"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('common.preview')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('common.title')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.products.status')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('common.sortOrder')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">{t('dashboard.orders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                    Loading hero visuals...
                  </td>
                </tr>
              ) : heroVisuals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    No hero visuals found
                  </td>
                </tr>
              ) : (
                heroVisuals.map((heroVisual) => (
                  <tr key={heroVisual.id} className="group hover:bg-[#f9f7f4] transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-20 h-12 rounded-lg overflow-hidden border border-[#2d5a3d]/10">
                        <img src={heroVisual.imageUrl} alt={heroVisual.title || "Hero Visual"} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[#1c1917]">{heroVisual.title || "Untitled"}</p>
                        {heroVisual.subtitle && (
                          <p className="text-xs text-[#78746e] truncate max-w-[200px]">{heroVisual.subtitle}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        heroVisual.isActive
                          ? "bg-[#e8f5ed] text-[#2d5a3d]"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {heroVisual.isActive ? t('common.active') : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-[#1c1917] whitespace-nowrap">
                      {heroVisual.sortOrder ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditHeroVisual(heroVisual)}
                          disabled={isSaving || deletingId !== null}
                          className="hover:bg-[#f0ede8]"
                          title={t('dashboard.products.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => requestDelete(heroVisual)}
                              disabled={deletingId === heroVisual.id}
                              title={t('dashboard.products.delete')}
                            >
                              {deletingId === heroVisual.id ? (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.heroVisuals.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visual? This action cannot be undone.
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
