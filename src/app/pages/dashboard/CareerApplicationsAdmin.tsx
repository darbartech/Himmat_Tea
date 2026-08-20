'use client';

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, Eye, Trash2, Download, X, Briefcase,
  Mail, Phone, MapPin as MapPinIcon, Calendar, FileText,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { api, ApiError } from "@/lib/api-client";
import { useTranslation } from '@/context/TranslationContext';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

const STATUSES = ["New", "Reviewing", "Shortlisted", "Interview", "Selected", "Rejected"] as const;
type ApplicationStatus = typeof STATUSES[number];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  New: "bg-[#f0f4ff] text-[#3b5bdb]",
  Reviewing: "bg-[#fdf6ec] text-[#b07d2a]",
  Shortlisted: "bg-[#f0f9f4] text-[#2d5a3d]",
  Interview: "bg-[#faf0ff] text-[#7c3aed]",
  Selected: "bg-[#f0f9f4] text-[#15803d]",
  Rejected: "bg-red-50 text-red-600",
};

type CareerApplication = {
  id: string;
  careerJobId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  coverLetter: string;
  resumeUrl: string;
  status: ApplicationStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  careerJob: {
    id: string;
    title: string;
    department: string;
    location: string;
  };
};

export default function CareerApplicationsAdmin() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");

  const [selected, setSelected] = useState<CareerApplication | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const result: any = await api.get("/career-applications");
      setApplications(Array.isArray(result) ? result : result?.data ?? []);
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careerApplicationsAdmin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  const positions = useMemo(
    () => Array.from(new Set(applications.map(a => a.careerJob?.title).filter(Boolean))),
    [applications]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter(a => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (positionFilter !== "All" && a.careerJob?.title !== positionFilter) return false;
      if (q && !(
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [applications, searchQuery, statusFilter, positionFilter]);

  const openView = (application: CareerApplication) => {
    setSelected(application);
    setNotesDraft(application.adminNotes || "");
    setViewOpen(true);
  };

  const updateStatus = async (status: ApplicationStatus) => {
    if (!selected) return;
    try {
      setSavingStatus(true);
      const updated: any = await api.patch(`/career-applications/${selected.id}`, { status });
      const applied = updated?.data ?? updated;
      setApplications(prev => prev.map(a => a.id === selected.id ? { ...a, status: applied.status } : a));
      setSelected(prev => prev ? { ...prev, status: applied.status } : prev);
      notify.success(t('careerApplicationsAdmin.notifications.statusUpdated'));
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careerApplicationsAdmin.errors.statusFailed'));
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    try {
      setSavingNotes(true);
      const updated: any = await api.patch(`/career-applications/${selected.id}`, { adminNotes: notesDraft });
      const applied = updated?.data ?? updated;
      setApplications(prev => prev.map(a => a.id === selected.id ? { ...a, adminNotes: applied.adminNotes } : a));
      setSelected(prev => prev ? { ...prev, adminNotes: applied.adminNotes } : prev);
      notify.success(t('careerApplicationsAdmin.notifications.notesSaved'));
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careerApplicationsAdmin.errors.notesFailed'));
    } finally {
      setSavingNotes(false);
    }
  };

  const remove = async (application: CareerApplication) => {
    try {
      setDeletingId(application.id);
      await api.delete(`/career-applications/${application.id}`);
      setApplications(prev => prev.filter(a => a.id !== application.id));
      if (selected?.id === application.id) {
        setViewOpen(false);
        setSelected(null);
      }
      notify.success(t('careerApplicationsAdmin.notifications.deleted'));
    } catch (err: any) {
      notify.error(err instanceof ApiError ? err.message : t('careerApplicationsAdmin.errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#2d5a3d]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t('careerApplicationsAdmin.heading')}
        </h1>
        <p className="mt-1 text-[#78746e]">{t('careerApplicationsAdmin.subtitle')}</p>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t('careerApplicationsAdmin.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t('careerApplicationsAdmin.filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{t('careerApplicationsAdmin.filters.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder={t('careerApplicationsAdmin.filters.allPositions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{t('careerApplicationsAdmin.filters.allPositions')}</SelectItem>
            {positions.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-[#78746e]" />
            <p className="font-medium text-[#1c1917]">{t('careerApplicationsAdmin.empty.heading')}</p>
            <p className="mt-1 text-sm text-[#78746e]">{t('careerApplicationsAdmin.empty.subtitle')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#f9f7f4]">
                <tr className="text-left text-sm text-[#78746e] border-b border-[#2d5a3d]/5">
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.applicant')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.position')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.email')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.phone')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.applied')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">{t('careerApplicationsAdmin.table.status')}</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap text-right">{t('careerApplicationsAdmin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d5a3d]/5">
                {filtered.map((a) => (
                  <tr key={a.id} className="text-sm hover:bg-[#f9f7f4]/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#1c1917] whitespace-nowrap">{a.fullName}</td>
                    <td className="px-6 py-4 text-[#78746e] whitespace-nowrap">{a.careerJob?.title || "—"}</td>
                    <td className="px-6 py-4 text-[#78746e] whitespace-nowrap">{a.email}</td>
                    <td className="px-6 py-4 text-[#78746e] whitespace-nowrap">{a.phone}</td>
                    <td className="px-6 py-4 text-[#78746e] whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openView(a)}>
                          <Eye className="mr-1.5 h-4 w-4" /> {t('careerApplicationsAdmin.actions.view')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('careerApplicationsAdmin.confirmDelete.title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('careerApplicationsAdmin.confirmDelete.description', { name: a.fullName })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('careerApplicationsAdmin.actions.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove(a)}
                                disabled={deletingId === a.id}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deletingId === a.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('careerApplicationsAdmin.actions.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View / manage dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.fullName}</DialogTitle>
                <DialogDescription>
                  Applied for {selected.careerJob?.title || "a role"} · {selected.careerJob?.department} · {selected.careerJob?.location}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-[#1c1917]">
                    <Mail className="h-4 w-4 text-[#78746e]" /> {selected.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#1c1917]">
                    <Phone className="h-4 w-4 text-[#78746e]" /> {selected.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#1c1917] sm:col-span-2">
                    <MapPinIcon className="h-4 w-4 text-[#78746e] shrink-0" /> {selected.address}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#1c1917]">
                    <Calendar className="h-4 w-4 text-[#78746e]" /> Applied {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>

                <a
                  href={selected.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f9f7f4] border border-[#2d5a3d]/10 text-sm font-medium text-[#2d5a3d] hover:bg-[#f0f9f4] transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {t('careerApplicationsAdmin.view.resumeAction')}
                  <Download className="h-4 w-4" />
                </a>

                {selected.coverLetter && (
                  <div className="space-y-1.5">
                    <Label>{t('careerApplicationsAdmin.view.coverLetter')}</Label>
                    <p className="text-sm text-[#1c1917] whitespace-pre-wrap rounded-xl border border-black/5 bg-[#f9f7f4] p-4">
                      {selected.coverLetter}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>{t('careerApplicationsAdmin.view.status')}</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => updateStatus(v as ApplicationStatus)}
                    disabled={savingStatus}
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t('careerApplicationsAdmin.view.adminNotes')}</Label>
                  <Textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder={t('careerApplicationsAdmin.view.notesPlaceholder')}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={saveNotes}
                      disabled={savingNotes || notesDraft === (selected.adminNotes || "")}
                      className="bg-[#2d5a3d] text-white hover:bg-[#234832]"
                    >
                      {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('careerApplicationsAdmin.actions.saveNotes')}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewOpen(false)}>
                    <X className="mr-1.5 h-4 w-4" /> {t('careerApplicationsAdmin.actions.close')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
