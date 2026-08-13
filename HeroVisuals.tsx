'use client';

import { useEffect, useState } from "react";
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
import { api } from "../../../lib/api-client";

export interface HeroVisual {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm: Partial<HeroVisual> = {
  imageUrl: "",
  title: "",
  subtitle: "",
  isActive: true,
  sortOrder: 0,
};

export default function HeroVisuals() {
  const [heroVisuals, setHeroVisuals] = useState<HeroVisual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHeroVisual, setEditingHeroVisual] = useState<HeroVisual | null>(null);
  const [newHeroVisual, setNewHeroVisual] = useState<Partial<HeroVisual>>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHeroVisuals = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<HeroVisual[]>("/hero-visuals");
      setHeroVisuals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load hero visuals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroVisuals();
  }, []);

  const resetForm = () => {
    setNewHeroVisual({ ...emptyForm, sortOrder: heroVisuals.length });
    setEditingHeroVisual(null);
  };

  const handleSaveHeroVisual = async () => {
    if (!newHeroVisual.imageUrl) {
      toast.error("Please provide an image");
      return;
    }
    setIsSaving(true);
    try {
      if (editingHeroVisual) {
        const updated = await api.put<HeroVisual>(
          `/hero-visuals/${editingHeroVisual.id}`,
          newHeroVisual
        );
        setHeroVisuals((prev) =>
          prev.map((v) => (v.id === editingHeroVisual.id ? updated : v))
        );
        toast.success("Hero visual updated successfully!");
      } else {
        const created = await api.post<HeroVisual>("/hero-visuals", newHeroVisual);
        setHeroVisuals((prev) => [...prev, created]);
        toast.success("Hero visual added successfully!");
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save hero visual");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditHeroVisual = (heroVisual: HeroVisual) => {
    setEditingHeroVisual(heroVisual);
    setNewHeroVisual(heroVisual);
    setIsAddDialogOpen(true);
  };

  const handleDeleteHeroVisual = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/hero-visuals/${id}`);
      setHeroVisuals((prev) => prev.filter((v) => v.id !== id));
      toast.success("Hero visual deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete hero visual");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Hero Visuals
          </h1>
          <p className="text-[#78746e] mt-1">Manage the visuals for the hero section of your homepage</p>
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
                className="bg-[#2d5a3d] hover:bg-[#234832] text-white w-full md:w-auto"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Visual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  placeholder="https://example.com/image.jpg"
                  id="hero-image"
                  required
                />
                <div className="grid gap-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={newHeroVisual.title}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, title: e.target.value })}
                    placeholder="Premium Green Tea"
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                  <Input
                    id="subtitle"
                    value={newHeroVisual.subtitle}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, subtitle: e.target.value })}
                    placeholder="Hand-picked from the Himalayas"
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={newHeroVisual.sortOrder}
                    onChange={(e) => setNewHeroVisual({ ...newHeroVisual, sortOrder: Number(e.target.value) })}
                    placeholder="0"
                    disabled={isSaving}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={newHeroVisual.isActive}
                    onCheckedChange={(checked) => setNewHeroVisual({ ...newHeroVisual, isActive: checked })}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#2d5a3d] hover:bg-[#234832] min-w-[120px]"
                  onClick={handleSaveHeroVisual}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Visual"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium">Preview</th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Sort Order</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading &&
                [...heroVisuals]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((heroVisual) => (
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
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          heroVisual.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {heroVisual.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#1c1917]">{heroVisual.sortOrder}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditHeroVisual(heroVisual)}
                            className="hover:bg-[#f0ede8]"
                            disabled={deletingId === heroVisual.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === heroVisual.id}
                              >
                                {deletingId === heroVisual.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Hero Visual?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this visual? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteHeroVisual(heroVisual.id)} className="bg-red-600">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && heroVisuals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    No hero visuals found
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
