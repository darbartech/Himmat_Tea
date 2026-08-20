'use client';

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, HelpCircle, ArrowUp, ArrowDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, ApiError } from "../../../lib/api-client";

import { useTranslation } from "@/hooks/useTranslation";
type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

const FAQ_CATEGORIES = ["General", "Shipping", "Returns", "Payment", "Products", "Brewing", "Account"];

const EmptyFAQ: Omit<FAQ, "id" | "createdAt" | "updatedAt"> = {
  question: "",
  answer: "",
  category: "General",
  isActive: true,
  order: 0,
};

export default function FAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [newFAQ, setNewFAQ] = useState<Partial<FAQ>>({ ...EmptyFAQ });
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const { t } = useTranslation();

  const fetchFAQs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<FAQ[]>("/faqs?admin=true");
      const data: FAQ[] = Array.isArray(res)
        ? res
        : ((res as any)?.data ?? []);
      setFaqs(data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load FAQs";
      notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleSaveFAQ = async () => {
    if (!newFAQ.question || !newFAQ.answer) {
      notify.error("Please fill in question and answer");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        question: newFAQ.question,
        answer: newFAQ.answer,
        category: newFAQ.category || "General",
        isActive: typeof newFAQ.isActive === "boolean" ? newFAQ.isActive : true,
        order: typeof newFAQ.order === "number" ? newFAQ.order : faqs.length,
      };
      let createdOrUpdated: FAQ;

      if (editingFAQ) {
        createdOrUpdated = await api.put<FAQ>(`/faqs/${editingFAQ.id}`, payload);
        const resolved: FAQ = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setFaqs((prev) =>
          prev.map((f) => (f.id === resolved.id ? resolved : f)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
        notify.success("FAQ updated successfully!");
      } else {
        createdOrUpdated = await api.post<FAQ>("/faqs", payload);
        const resolved: FAQ = (createdOrUpdated as any)?.data ?? createdOrUpdated;
        setFaqs((prev) => [...prev, resolved].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        notify.success("FAQ created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingFAQ(null);
      setNewFAQ({ ...EmptyFAQ, order: faqs.length });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to save FAQ";
      notify.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFAQ = (faq: FAQ) => {
    setEditingFAQ(faq);
    setNewFAQ({ ...faq });
    setIsAddDialogOpen(true);
  };

  const requestDelete = (faq: FAQ) => {
    setDeleteTarget(faq);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/faqs/${deleteTarget.id}`);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      notify.success("FAQ deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete FAQ";
      notify.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setEditingFAQ(null);
    setNewFAQ({ ...EmptyFAQ, order: faqs.length });
  };

  const filteredFAQs = filterCategory === "All"
    ? faqs
    : faqs.filter((f) => f.category === filterCategory);

  const categories = ["All", ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            FAQs
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.faqs.manageDesc')}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('dashboard.products.allCategories')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingFAQ ? "Edit FAQ" : "Add New FAQ"}
                </DialogTitle>
                <DialogDescription>
                  {editingFAQ ? "Update FAQ details below." : "Add a new frequently asked question."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="faq-question">{t('dashboard.faqs.fields.question')}</Label>
                  <Input
                    id="faq-question"
                    value={newFAQ.question || ""}
                    onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                    placeholder={t('dashboard.faqs.questionPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="faq-answer">{t('dashboard.faqs.fields.answer')}</Label>
                  <Textarea
                    id="faq-answer"
                    rows={6}
                    value={newFAQ.answer || ""}
                    onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                    placeholder={t('dashboard.faqs.answerPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="faq-category">{t('dashboard.products.category')}</Label>
                    <Select
                      value={newFAQ.category || "General"}
                      onValueChange={(v) => setNewFAQ({ ...newFAQ, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {FAQ_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="faq-order">{t('dashboard.faqs.displayOrder')}</Label>
                    <Input
                      id="faq-order"
                      type="number"
                      value={typeof newFAQ.order === "number" ? newFAQ.order : 0}
                      onChange={(e) => setNewFAQ({ ...newFAQ, order: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#2d5a3d]/10 p-3 bg-[#f9f7f4]">
                  <Label htmlFor="faq-isActive" className="font-medium">{t('common.activeVisibleOnSite')}</Label>
                  <Switch
                    id="faq-isActive"
                    checked={typeof newFAQ.isActive === "boolean" ? newFAQ.isActive : true}
                    onCheckedChange={(c) => setNewFAQ({ ...newFAQ, isActive: c })}
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
                  onClick={handleSaveFAQ}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingFAQ ? "Saving..." : "Creating..."}
                    </>
                  ) : editingFAQ ? (
                    "Save Changes"
                  ) : (
                    "Create FAQ"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-sm text-[#78746e] bg-[#f9f7f4] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap w-16">{t('common.order')}</th>
                <th className="px-6 py-4 font-medium">{t('dashboard.faqs.question')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.products.category')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t('dashboard.products.status')}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">{t('dashboard.orders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                    Loading FAQs...
                  </td>
                </tr>
              ) : filteredFAQs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#78746e]">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 text-[#2d5a3d]/30" />
                    No FAQs found
                  </td>
                </tr>
              ) : (
                filteredFAQs.map((faq) => (
                  <tr key={faq.id} className="group hover:bg-[#f9f7f4] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap tabular-nums text-[#78746e]">
                      <div className="flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" />
                        <ArrowDown className="h-3 w-3" />
                        <span className="ml-1 font-medium text-[#1c1917]">{faq.order ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-[#1c1917] truncate max-w-[380px]">{faq.question}</p>
                        <p className="text-xs text-[#78746e] truncate max-w-[380px] mt-0.5">{faq.answer}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#2d5a3d] font-medium bg-[#2d5a3d]/5 px-2 py-1 rounded-md">
                        {faq.category || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          faq.isActive
                            ? "bg-[#e8f5ed] text-[#2d5a3d]"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {faq.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditFAQ(faq)}
                          disabled={isSaving || deletingId !== null}
                          title={t('dashboard.products.edit')}
                          className="hover:bg-[#f0ede8]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => requestDelete(faq)}
                              disabled={deletingId === faq.id}
                              title={t('dashboard.products.delete')}
                            >
                              {deletingId === faq.id ? (
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
            <AlertDialogTitle>{t('dashboard.faqs.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
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
