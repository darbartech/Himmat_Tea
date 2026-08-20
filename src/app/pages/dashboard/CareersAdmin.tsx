'use client';

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Loader2, Briefcase, X } from "lucide-react";
import { notify } from "@/lib/notify";
import { api, ApiError } from "@/lib/api-client";
import { useTranslation } from '@/context/TranslationContext';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

type CareerJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  level: string;
  posted: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  isActive: boolean;
  sortOrder: number;
};

const emptyJob: Omit<CareerJob, "id"> = {
  title: "", department: "Sourcing", location: "Kathmandu, Nepal",
  type: "Full-time", level: "Mid-level", posted: "",
  description: "", responsibilities: [], requirements: [],
  isActive: true, sortOrder: 0,
};

const departments = ["Sourcing", "Marketing", "Operations", "Customer Success", "Finance", "Production", "Other"];
const types = ["Full-time", "Part-time", "Contract", "Internship"];
const levels = ["Intern", "Junior", "Junior / Mid", "Mid-level", "Mid / Senior", "Senior", "Lead"];

export default function CareersAdmin() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CareerJob | null>(null);
  const [form, setForm] = useState<Omit<CareerJob, "id">>(emptyJob);
  const [open, setOpen] = useState(false);
  const [deletingJob, setDeletingJob] = useState<CareerJob | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result: any = await api.get("/careers?admin=true");
      setJobs(Array.isArray(result) ? result : result?.data ?? []);
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careersAdmin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyJob, sortOrder: jobs.length });
    setOpen(true);
  };

  const openEdit = (job: CareerJob) => {
    setEditing(job);
    setForm({
      title: job.title, department: job.department, location: job.location,
      type: job.type, level: job.level, posted: job.posted,
      description: job.description,
      responsibilities: [...job.responsibilities],
      requirements: [...job.requirements],
      isActive: job.isActive, sortOrder: job.sortOrder,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      notify.error(t('careersAdmin.validation.titleDescriptionRequired'));
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await api.put(`/careers/${editing.id}`, form);
        notify.success(t('careersAdmin.notifications.updated'));
      } else {
        await api.post("/careers", form);
        notify.success(t('careersAdmin.notifications.created'));
      }
      setOpen(false);
      await fetchJobs();
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careersAdmin.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const job = deletingJob;
    if (!job) return;
    setDeletingJob(null);
    try {
      await api.delete(`/careers/${job.id}`);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      notify.success(t('careersAdmin.notifications.deleted'));
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careersAdmin.errors.deleteFailed'));
    }
  };

  const toggleActive = async (job: CareerJob, active: boolean) => {
    try {
      const result: any = await api.put(`/careers/${job.id}`, { isActive: active });
      const updated = result?.data ?? result;
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      notify.success(active ? t('careersAdmin.notifications.published') : t('careersAdmin.notifications.unpublished'));
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careersAdmin.errors.toggleFailed'));
    }
  };

  const updateList = (field: "responsibilities" | "requirements", value: string) => {
    setForm(prev => ({ ...prev, [field]: value.split("\n").map(v => v.trim()).filter(Boolean) }));
  };

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#2d5a3d]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>{t('careersAdmin.heading')}</h1>
          <p className="mt-1 text-[#78746e]">{t('careersAdmin.subtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-[#2d5a3d] text-white hover:bg-[#234832]">
          <Plus className="mr-2 h-4 w-4" /> {t('careersAdmin.addRole')}
        </Button>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        {jobs.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-[#78746e]" />
            <p className="font-medium text-[#1c1917]">{t('careersAdmin.empty.heading')}</p>
            <p className="mt-1 text-sm text-[#78746e]">{t('careersAdmin.empty.subtitle')}</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {jobs.map(job => (
              <div key={job.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#1c1917]">{job.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${job.isActive ? "bg-[#f0f9f4] text-[#2d5a3d]" : "bg-gray-100 text-gray-500"}`}>
                      {job.isActive ? t('careersAdmin.status.published') : t('careersAdmin.status.hidden')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78746e]">{job.department} · {job.location} · {job.type} · {job.level}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={job.isActive} onCheckedChange={(v) => toggleActive(job, v)} />
                  <Button variant="outline" size="sm" onClick={() => openEdit(job)}><Edit className="mr-1.5 h-4 w-4" /> {t('careersAdmin.actions.edit')}</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(job)} className="text-red-600 hover:text-red-700"><Trash2 className="mr-1.5 h-4 w-4" /> {t('careersAdmin.actions.delete')}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('careersAdmin.dialog.editTitle') : t('careersAdmin.dialog.addTitle')}</DialogTitle>
            <DialogDescription>{t('careersAdmin.dialog.helper')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>{t('careersAdmin.fields.title')}</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('careersAdmin.placeholders.title')} /></div>
              <div className="space-y-2"><Label>{t('careersAdmin.fields.department')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>{departments.map(v => <option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>{t('careersAdmin.fields.location')}</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="space-y-2"><Label>{t('careersAdmin.fields.employmentType')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{types.map(v => <option key={v}>{v}</option>)}</select></div>
              <div className="space-y-2"><Label>{t('careersAdmin.fields.level')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.level} onChange={e => setForm({...form, level: e.target.value})}>{levels.map(v => <option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>{t('careersAdmin.fields.postedDate')}</Label><Input value={form.posted} onChange={e => setForm({...form, posted: e.target.value})} placeholder={t('careersAdmin.placeholders.postedDate')} /></div>
              <div className="space-y-2"><Label>{t('careersAdmin.fields.sortOrder')}</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: Number(e.target.value) || 0})} /></div>
            </div>
            <div className="space-y-2"><Label>{t('careersAdmin.fields.description')}</Label><Textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>{t('careersAdmin.fields.responsibilities')}</Label>
              <Textarea rows={7} value={form.responsibilities.join("\n")} onChange={e => updateList("responsibilities", e.target.value)} placeholder={t('careersAdmin.placeholders.responsibilities')} />
            </div>
            <div className="space-y-2">
              <Label>{t('careersAdmin.fields.requirements')}</Label>
              <Textarea rows={7} value={form.requirements.join("\n")} onChange={e => updateList("requirements", e.target.value)} placeholder={t('careersAdmin.placeholders.requirements')} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f9f7f4] p-4">
              <div><p className="font-medium text-[#1c1917]">{t('careersAdmin.toggle.label')}</p><p className="text-sm text-[#78746e]">{t('careersAdmin.toggle.helper')}</p></div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}><X className="mr-1.5 h-4 w-4" /> {t('careersAdmin.actions.cancel')}</Button>
              <Button onClick={save} disabled={saving} className="bg-[#2d5a3d] text-white hover:bg-[#234832]">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editing ? t('careersAdmin.actions.save') : t('careersAdmin.actions.create')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
