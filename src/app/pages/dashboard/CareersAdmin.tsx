'use client';

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Loader2, Briefcase, X } from "lucide-react";
import { notify } from "@/lib/notify";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";

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
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CareerJob | null>(null);
  const [form, setForm] = useState<Omit<CareerJob, "id">>(emptyJob);
  const [open, setOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result: any = await api.get("/careers?admin=true");
      setJobs(Array.isArray(result) ? result : result?.data ?? []);
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : "Failed to load career jobs");
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
      notify.error("Title and description are required");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await api.put(`/careers/${editing.id}`, form);
        notify.success("Career role updated successfully");
      } else {
        await api.post("/careers", form);
        notify.success("Career role created successfully");
      }
      setOpen(false);
      await fetchJobs();
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : "Failed to save career role");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (job: CareerJob) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/careers/${job.id}`);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      notify.success("Career role deleted");
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : "Failed to delete career role");
    }
  };

  const toggleActive = async (job: CareerJob, active: boolean) => {
    try {
      const result: any = await api.put(`/careers/${job.id}`, { isActive: active });
      const updated = result?.data ?? result;
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      notify.success(active ? "Role published" : "Role unpublished");
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : "Failed to update role");
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
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>Careers</h1>
          <p className="mt-1 text-[#78746e]">Manage the jobs displayed on the public Careers page.</p>
        </div>
        <Button onClick={openAdd} className="bg-[#2d5a3d] text-white hover:bg-[#234832]">
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        {jobs.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-[#78746e]" />
            <p className="font-medium text-[#1c1917]">No career roles yet.</p>
            <p className="mt-1 text-sm text-[#78746e]">Add your first opening to publish it on the website.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {jobs.map(job => (
              <div key={job.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#1c1917]">{job.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${job.isActive ? "bg-[#f0f9f4] text-[#2d5a3d]" : "bg-gray-100 text-gray-500"}`}>
                      {job.isActive ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78746e]">{job.department} · {job.location} · {job.type} · {job.level}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={job.isActive} onCheckedChange={(v) => toggleActive(job, v)} />
                  <Button variant="outline" size="sm" onClick={() => openEdit(job)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(job)} className="text-red-600 hover:text-red-700"><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Career Role" : "Add Career Role"}</DialogTitle>
            <DialogDescription>Only published roles appear on the public Careers page.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Job Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Head of Tea Sourcing" /></div>
              <div className="space-y-2"><Label>Department</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>{departments.map(v => <option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="space-y-2"><Label>Employment Type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{types.map(v => <option key={v}>{v}</option>)}</select></div>
              <div className="space-y-2"><Label>Level</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.level} onChange={e => setForm({...form, level: e.target.value})}>{levels.map(v => <option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Posted Date</Label><Input value={form.posted} onChange={e => setForm({...form, posted: e.target.value})} placeholder="August 18, 2026" /></div>
              <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: Number(e.target.value) || 0})} /></div>
            </div>
            <div className="space-y-2"><Label>Description *</Label><Textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <Textarea rows={7} value={form.responsibilities.join("\n")} onChange={e => updateList("responsibilities", e.target.value)} placeholder={"One responsibility per line\nLead seasonal buying trips...\nMaintain quality standards..."} />
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea rows={7} value={form.requirements.join("\n")} onChange={e => updateList("requirements", e.target.value)} placeholder={"One requirement per line\n3+ years of experience...\nStrong communication skills..."} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f9f7f4] p-4">
              <div><p className="font-medium text-[#1c1917]">Publish role</p><p className="text-sm text-[#78746e]">Visible to visitors when enabled.</p></div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-[#2d5a3d] text-white hover:bg-[#234832]">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editing ? "Save Changes" : "Create Role"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
