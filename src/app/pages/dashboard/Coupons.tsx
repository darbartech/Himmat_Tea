'use client';

import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
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
import { Trash2, Edit2, Plus, Copy, CheckCircle2, XCircle, Calendar, Tag, Loader2 } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api-client";
import { toast } from "sonner";

import { useTranslation } from '../../../context/TranslationContext';
type Coupon = {
  id: string;
  code: string;
  discountType: "percent" | "fixed" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const Coupons = () => {
  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    usageLimit: 100,
    isActive: true,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const response = await api.get<any>("/coupons");
      return response.data?.data || response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (coupon: any) => {
      const response = await api.post<any>("/coupons", coupon);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create coupon");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, coupon }: { id: string; coupon: any }) => {
      const response = await api.put<any>(`/coupons?id=${id}`, coupon);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update coupon");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/coupons?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete coupon");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await updateMutation.mutateAsync({ id: editingCoupon.id, coupon: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (err) {
      // error already handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 0,
      minOrderAmount: 0,
      maxDiscount: 0,
      validFrom: new Date().toISOString().split("T")[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      usageLimit: 100,
      isActive: true,
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    const discountType =
      coupon.discountType === "percent" ? "percentage" : (coupon.discountType as "fixed");
    setFormData({
      code: coupon.code,
      discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      validFrom: coupon.validFrom.slice(0, 10),
      validTo: coupon.validTo.slice(0, 10),
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Coupon code copied to clipboard!");
  };

  const getStatusBadge = (coupon: Coupon) => {
    const isExpired = new Date(coupon.validTo) < new Date();
    const isLimitReached = coupon.usedCount >= coupon.usageLimit;
    if (!coupon.isActive) {
      return <Badge className="bg-gray-100 text-gray-800">{t('dashboard.coupons.inactive')}</Badge>;
    }
    if (isExpired) {
      return <Badge className="bg-red-100 text-red-800">{t('dashboard.inventory.expired')}</Badge>;
    }
    if (isLimitReached) {
      return <Badge className="bg-orange-100 text-orange-800">{t('dashboard.coupons.limitReached')}</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">{t('dashboard.customers.active')}</Badge>;
  };

  const formatDiscountType = (type: string) => {
    if (type === "percent" || type === "percentage") return "Percentage";
    return "Fixed Amount";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2d5a3d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-[#1c1917]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Coupons
          </h1>
          <p className="text-[#78746e]">{t('dashboard.coupons.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsAddDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2d5a3d] hover:bg-[#0b7c33]">
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboard.coupons.couponCode')}</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder={t('dashboard.coupons.codePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label>{t('dashboard.coupons.discountType')}</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, discountType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t('dashboard.coupons.percentage')}</SelectItem>
                      <SelectItem value="fixed">{t('dashboard.coupons.fixedAmount')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Discount Value{" "}
                    {formData.discountType === "percentage" ? "(%)" : "(₹)"}
                  </Label>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: Number(e.target.value),
                      })
                    }
                    placeholder={formData.discountType === "percentage" ? "10" : "50"}
                    required
                  />
                </div>
                <div>
                  <Label>Maximum Discount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscount: Number(e.target.value),
                      })
                    }
                    placeholder="200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Order Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderAmount: Number(e.target.value),
                      })
                    }
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label>{t('dashboard.coupons.usageLimit')}</Label>
                  <Input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usageLimit: Number(e.target.value),
                      })
                    }
                    placeholder="100"
                    required
                    min={1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboard.coupons.validFrom')}</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('dashboard.coupons.validTo')}</Label>
                  <Input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label>{t('dashboard.customers.active')}</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2d5a3d] hover:bg-[#0b7c33]"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingCoupon ? "Update" : "Create"} Coupon
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteTargetId}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dashboard.coupons.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this coupon? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('dashboard.products.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-4">
        {coupons.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-[#78746e]">
              <p>{t('dashboard.coupons.noCouponsYet')}</p>
            </CardContent>
          </Card>
        ) : (
          coupons.map((coupon: Coupon) => (
            <Card key={coupon.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#c8a96e] to-[#a08050] flex items-center justify-center">
                        <Tag className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-[#1c1917] font-mono">
                            {coupon.code}
                          </h3>
                          {getStatusBadge(coupon)}
                        </div>
                        <p className="text-sm text-[#78746e]">
                          {coupon.discountType === "percentage" || coupon.discountType === "percent"
                            ? `${coupon.discountValue}% off`
                            : `₹${coupon.discountValue} off`}
                          {coupon.minOrderAmount > 0 &&
                            ` on orders over ₹${coupon.minOrderAmount}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(coupon.code)}
                      title={t('dashboard.coupons.copyCode')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(coupon)}
                      title={t('dashboard.products.edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-600"
                      title={t('dashboard.products.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[#78746e]">{t('dashboard.coupons.usage')}</p>
                    <p className="font-semibold text-[#1c1917]">
                      {coupon.usedCount}/{coupon.usageLimit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#78746e]">{t('dashboard.coupons.maxDiscountColumn')}</p>
                    <p className="font-semibold text-[#1c1917]">₹{coupon.maxDiscount}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-[#78746e]" />
                    <div>
                      <p className="text-[#78746e]">{t('dashboard.coupons.validFrom')}</p>
                      <p className="font-semibold text-[#1c1917]">
                        {new Date(coupon.validFrom).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-[#78746e]" />
                    <div>
                      <p className="text-[#78746e]">{t('dashboard.coupons.validTo')}</p>
                      <p className="font-semibold text-[#1c1917]">
                        {new Date(coupon.validTo).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Coupons;
