'use client';

import { useEffect, useMemo, useState } from "react";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { useTranslation } from '@/hooks/useTranslation';
import {
  MapPin,
  Clock,
  Briefcase,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Globe,
  TrendingUp,
  Leaf,
  Laptop,
  Coffee,
  Shield,
  Zap,
  Users,
  Check,
  X,
  Star,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

const stats = [
  { value: "32", label: "Team Members" },
  { value: "0", label: "Open Roles" },
  { value: "12", label: "Countries We Reach" },
  { value: "2018", label: "Founded" },
];

const values = [
  {
    icon: Leaf,
    title: "Rooted in Craft",
    desc: "We take every detail seriously — from the garden to the package. Quality is never an afterthought.",
  },
  {
    icon: Globe,
    title: "Global Thinking",
    desc: "Our team spans continents. We celebrate diverse perspectives and build for a worldwide community.",
  },
  {
    icon: Heart,
    title: "People First",
    desc: "Farmers, customers, and colleagues all matter equally. We build relationships that last decades.",
  },
  {
    icon: TrendingUp,
    title: "Grow Together",
    desc: "Your career grows when the company grows. We invest in learning, mentorship, and ownership.",
  },
];

const benefits = [
  { icon: Heart, title: "Health Coverage", desc: "Full medical and dental insurance for you and your dependents." },
  { icon: Laptop, title: "Remote Flexibility", desc: "Hybrid and fully remote roles available. Work where you do your best." },
  { icon: Coffee, title: "Unlimited Tea Allowance", desc: "Monthly tea box — explore our entire catalogue on us." },
  { icon: TrendingUp, title: "Equity Programme", desc: "All full-time employees share in the company's growth through equity." },
  { icon: Zap, title: "Learning Budget", desc: "Rs. 50,000/year for courses, books, conferences, and workshops." },
  { icon: Shield, title: "Paid Parental Leave", desc: "16 weeks fully paid for primary caregivers, 8 weeks secondary." },
  { icon: Globe, title: "Sourcing Trips", desc: "Eligible team members join our annual farm tours in Nepal & Asia." },
  { icon: Users, title: "Team Retreats", desc: "Annual full-team gathering in Kathmandu — our home and heartland." },
];

type Job = {
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

const typeColor: Record<string, string> = {
  "Full-time": "bg-[#f0f9f4] text-[#2d5a3d]",
  Contract: "bg-[#fdf6ec] text-[#b07d2a]",
  "Part-time": "bg-[#f0f4ff] text-[#3b5bdb]",
};

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] text-[#1c1917] placeholder:text-[#b0aba4] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/20 focus:border-[#2d5a3d] transition-all";

/* ─────────────────────────────────────────────
   APPLICATION DIALOG
───────────────────────────────────────────── */

function ApplyDialog({
  job,
  open,
  onClose,
}: {
  job: Job | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cover: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const reset = () => {
    setDone(false);
    setError(null);
    setSubmitting(false);
    setResumeFile(null);
    setForm({ name: "", email: "", phone: "", address: "", cover: "" });
    onClose();
  };

  if (!job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!resumeFile) {
      setError("Please attach your resume/CV.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append("careerJobId", job.id);
      payload.append("fullName", form.name.trim());
      payload.append("email", form.email.trim());
      payload.append("phone", form.phone.trim());
      payload.append("address", form.address.trim());
      payload.append("coverLetter", form.cover.trim());
      payload.append("resume", resumeFile);

      const response = await fetch("/api/career-applications", {
        method: "POST",
        body: payload,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit application. Please try again.");
      }

      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-semibold text-[#1c1917]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {done ? "Application Received!" : `Apply — ${job.title}`}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#f0f9f4] border-2 border-[#2d5a3d]/20 flex items-center justify-center mb-5">
              <Check className="h-8 w-8 text-[#2d5a3d]" strokeWidth={2.5} />
            </div>
            <p className="text-[#78746e] leading-relaxed max-w-xs">
              Thank you! We'll review your application and reach out within{" "}
              <strong className="text-[#1c1917]">5 business days</strong>.
            </p>
            <button
              onClick={reset}
              className="mt-6 px-6 py-2.5 bg-[#2d5a3d] text-white text-sm font-semibold rounded-lg hover:bg-[#244a33] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Application form ── */
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Role badge */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[rgba(28,25,23,0.07)]">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#78746e] bg-[#f9f7f4] px-3 py-1.5 rounded-full border border-[rgba(28,25,23,0.08)]">
                <Briefcase className="h-3 w-3" />
                {job.department}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#78746e] bg-[#f9f7f4] px-3 py-1.5 rounded-full border border-[rgba(28,25,23,0.08)]">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
              <span
                className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full ${typeColor[job.type] ?? "bg-gray-100 text-gray-700"}`}
              >
                {job.type}
              </span>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <X className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                Full Name <span className="text-[#c8a96e]">*</span>
              </label>
              <input
                value={form.name}
                onChange={set("name")}
                placeholder={t('careers.fullNamePlaceholder')}
                className={inputCls}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                  Email <span className="text-[#c8a96e]">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={set("email")}
                  type="email"
                  placeholder={t('careers.emailPlaceholder')}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                  Phone <span className="text-[#c8a96e]">*</span>
                </label>
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  type="tel"
                  placeholder="+977 000 0000"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                Address <span className="text-[#c8a96e]">*</span>
              </label>
              <input
                value={form.address}
                onChange={set("address")}
                placeholder="Street, City, Country"
                className={inputCls}
                required
              />
            </div>

            {/* Resume upload */}
            <div>
              <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                Resume / CV <span className="text-[#c8a96e]">*</span>
              </label>
              <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-[rgba(28,25,23,0.15)] bg-[#f9f7f4] text-sm text-[#78746e] cursor-pointer hover:border-[#2d5a3d]/40 hover:bg-[#f0f9f4] transition-all">
                <span className="w-8 h-8 rounded-lg bg-[#f0ede8] flex items-center justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-[#2d5a3d] rotate-[-90deg]" />
                </span>
                <span className="truncate">
                  {resumeFile ? (
                    <span className="font-medium text-[#1c1917]">{resumeFile.name}</span>
                  ) : (
                    <>
                      <span className="font-medium text-[#1c1917]">
                        Click to upload
                      </span>{" "}
                      or drag and drop &nbsp;·&nbsp; PDF, DOC up to 5 MB
                    </>
                  )}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-1.5">
                Cover Letter
              </label>
              <textarea
                value={form.cover}
                onChange={set("cover")}
                rows={4}
                placeholder="Tell us why you're excited about this role and what makes you a great fit for Godgifted..."
                className={inputCls + " resize-none"}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#244a33] transition-all py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 4px 16px rgba(45,90,61,0.2)" }}
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#78746e]">
              We read every application personally. Expect to hear back within 5
              business days.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   JOB CARD
───────────────────────────────────────────── */

function JobCard({ job, onApply }: { job: Job; onApply: (job: Job) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden hover:border-[#2d5a3d]/20 hover:shadow-md transition-all duration-300">
      {/* ── Card header ── */}
      <div className="p-6 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left info */}
          <div className="flex-1">
            {/* Department + type badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#2d5a3d] bg-[#f0f9f4] px-2.5 py-1 rounded-full font-medium">
                <Building2 className="h-3 w-3" />
                {job.department}
              </span>
              <span
                className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${typeColor[job.type] ?? "bg-gray-100 text-gray-700"}`}
              >
                {job.type}
              </span>
              <span className="inline-flex items-center text-xs text-[#78746e] bg-[#f9f7f4] px-2.5 py-1 rounded-full border border-[rgba(28,25,23,0.08)] font-medium">
                {job.level}
              </span>
            </div>

            {/* Title */}
            <h3
              className="font-semibold text-[#1c1917] mb-3 leading-snug"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.2rem",
              }}
            >
              {job.title}
            </h3>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-sm text-[#78746e]">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#c8a96e]" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#c8a96e]" />
                Posted {job.posted}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex sm:flex-col gap-3 shrink-0">
            <button
              onClick={() => onApply(job)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2d5a3d] text-white text-sm font-semibold rounded-lg hover:bg-[#244a33] transition-colors whitespace-nowrap"
              style={{ boxShadow: "0 2px 10px rgba(45,90,61,0.18)" }}
            >
              Apply Now
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 border border-[rgba(28,25,23,0.14)] text-[#1c1917] text-sm font-semibold rounded-lg hover:bg-[#f0ede8] transition-colors"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  View Role <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Brief description — always visible */}
        <p className="text-[#78746e] text-sm leading-relaxed mt-4 max-w-2xl">
          {job.description}
        </p>
      </div>

      {/* ── Expandable details ── */}
      {expanded && (
        <div className="border-t border-[rgba(28,25,23,0.07)] bg-[#fafaf8] px-6 lg:px-7 py-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Responsibilities */}
            <div>
              <h4
                className="font-semibold text-[#1c1917] mb-4 text-sm uppercase tracking-widest"
                style={{ letterSpacing: "0.12em" }}
              >
                What You'll Do
              </h4>
              <ul className="space-y-2.5">
                {job.responsibilities.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-[#444] leading-relaxed"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#f0f9f4] border border-[#2d5a3d]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check
                        className="h-2.5 w-2.5 text-[#2d5a3d]"
                        strokeWidth={3}
                      />
                    </div>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div>
              <h4
                className="font-semibold text-[#1c1917] mb-4 text-sm uppercase tracking-widest"
                style={{ letterSpacing: "0.12em" }}
              >
                What We're Looking For
              </h4>
              <ul className="space-y-2.5">
                {job.requirements.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-[#444] leading-relaxed"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#fdf6ec] border border-[#c8a96e]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="h-2.5 w-2.5 text-[#c8a96e] fill-[#c8a96e]" />
                    </div>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Apply CTA at bottom of expanded section */}
          <div className="mt-6 pt-5 border-t border-[rgba(28,25,23,0.07)] flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={() => onApply(job)}
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#2d5a3d] text-white text-sm font-semibold rounded-lg hover:bg-[#244a33] transition-colors"
              style={{ boxShadow: "0 4px 14px rgba(45,90,61,0.2)" }}
            >
              Apply for This Role
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#78746e]">
              Questions? Email{" "}
              <a
                href="mailto:careers@godgifted.com"
                className="text-[#2d5a3d] font-medium hover:underline"
              >
                careers@godgifted.com
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function Careers() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("All");
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/careers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load careers");
        return res.json();
      })
      .then((result) => {
        if (!cancelled) setJobs(Array.isArray(result) ? result : result?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingJobs(false);
      });
    return () => { cancelled = true; };
  }, []);

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(jobs.map((job) => job.department).filter(Boolean)))],
    [jobs]
  );

  const filtered =
    activeTab === "All" ? jobs : jobs.filter((j) => j.department === activeTab);

  const handleApply = (job: Job) => {
    setApplyJob(job);
    setDialogOpen(true);
  };

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />

      {/* ═══════════════════════════════════════════
          HERO  —  Collections-style white header
      ═══════════════════════════════════════════ */}
      <section className="bg-[#f9f7f4] pt-[180px] pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Centered header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Join Our Team
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Build the Future of Premium Food
            </h1>
            <p className="text-xl text-[#78746e] max-w-2xl mx-auto mb-10">
              We're a small, passionate team on a mission to connect the world's
              finest Himalayan products with the people who love them. Come grow
              with us across both Himmat Tea and Godgifted Dal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#open-roles"
                className="inline-flex items-center gap-2 bg-[#2d5a3d] text-white font-semibold rounded-lg hover:bg-[#244a33] transition-colors px-7 py-3.5 text-[0.9rem]"
                style={{ boxShadow: "0 4px 16px rgba(45,90,61,0.18)" }}
              >
                See Open Roles
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 border border-[rgba(28,25,23,0.18)] text-[#1c1917] font-semibold rounded-lg hover:bg-[#f0ede8] transition-colors px-7 py-3.5 text-[0.9rem]"
              >
                About Godgifted
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[rgba(28,25,23,0.08)] rounded-2xl overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="bg-white px-8 py-7 text-center">
                <div
                  className="text-[#1c1917] font-bold leading-none mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(1.8rem,2.8vw,2.25rem)",
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[#78746e] font-medium"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Hero image */}
          <div className="mt-8 rounded-2xl overflow-hidden h-[260px] lg:h-[360px]">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&h=500&fit=crop"
              alt={t('careers.teamImageAlt')}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          VALUES
      ═══════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.8fr] gap-12 items-end mb-14">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-7 bg-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Our Culture
                </span>
              </div>
              <h2
                className="font-bold text-[#1c1917] leading-[1.1]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.8rem,3vw,2.5rem)",
                }}
              >
                What We Believe In
              </h2>
            </div>
            <p
              className="text-[#78746e] leading-relaxed"
              style={{ fontSize: "1.0625rem" }}
            >
              We're building a company that's good for farmers, customers, and
              the people who work here. These four values guide every decision
              we make.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="group bg-[#f9f7f4] rounded-2xl border border-[rgba(28,25,23,0.06)] p-7 hover:border-[#2d5a3d]/20 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center mb-5 group-hover:bg-[#2d5a3d] transition-colors duration-300 shadow-sm">
                    <Icon className="h-5 w-5 text-[#2d5a3d] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3
                    className="font-semibold text-[#1c1917] mb-2"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.0625rem",
                    }}
                  >
                    {v.title}
                  </h3>
                  <p className="text-[#78746e] text-sm leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENEFITS
      ═══════════════════════════════════════════ */}
      <section className="py-20 bg-[#f9f7f4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-7 bg-[#c8a96e]" />
              <span
                className="text-[#c8a96e] font-semibold"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Perks & Benefits
              </span>
              <div className="h-px w-7 bg-[#c8a96e]" />
            </div>
            <h2
              className="font-bold text-[#1c1917] leading-[1.1] mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.8rem,3vw,2.5rem)",
              }}
            >
              We Take Care of Our People
            </h2>
            <p
              className="text-[#78746e] max-w-xl mx-auto"
              style={{ fontSize: "1.0625rem" }}
            >
              Beyond a competitive salary, here's what comes with being part of
              the Godgifted family.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f0f9f4] flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#2d5a3d]" />
                  </div>
                  <h3 className="font-semibold text-[#1c1917] mb-1.5 text-[0.9375rem]">
                    {b.title}
                  </h3>
                  <p className="text-[#78746e] text-sm leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          OPEN ROLES
      ═══════════════════════════════════════════ */}
      <section id="open-roles" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-7 bg-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Open Positions
                </span>
              </div>
              <h2
                className="font-bold text-[#1c1917] leading-[1.1]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.8rem,3vw,2.5rem)",
                }}
              >
                {filtered.length} Role{filtered.length !== 1 ? "s" : ""}{" "}
                Available
              </h2>
            </div>

            {/* Department filter tabs */}
            <div className="flex flex-wrap gap-2">
              {departments.map((dep) => (
                <button
                  key={dep}
                  onClick={() => setActiveTab(dep)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === dep
                      ? "bg-[#2d5a3d] text-white shadow-sm"
                      : "bg-[#f9f7f4] text-[#1c1917] border border-[rgba(28,25,23,0.10)] hover:border-[#2d5a3d]/30 hover:text-[#2d5a3d]"
                  }`}
                >
                  {dep}
                  {dep === "All" && (
                    <span
                      className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === "All" ? "bg-white/20" : "bg-[#f0ede8]"}`}
                    >
                      {jobs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Job list */}
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} onApply={handleApply} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#f9f7f4] rounded-2xl border border-[rgba(28,25,23,0.06)]">
              <div className="w-14 h-14 rounded-full bg-[#f0ede8] flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-6 w-6 text-[#78746e]" />
              </div>
              <h3 className="font-semibold text-[#1c1917] mb-2">
                No open roles in this department right now
              </h3>
              <p className="text-[#78746e] text-sm mb-6">
                We're always looking for exceptional people. Send us your
                details and we'll be in touch.
              </p>
              <button
                onClick={() => setActiveTab("All")}
                className="text-sm text-[#2d5a3d] font-semibold hover:underline"
              >
                View all open roles
              </button>
            </div>
          )}

          {/* Speculative application */}
          <div className="mt-10 rounded-2xl bg-[#f9f7f4] border border-[rgba(28,25,23,0.07)] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3
                className="font-semibold text-[#1c1917] mb-1.5"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                }}
              >
                Don't see the right role?
              </h3>
              <p className="text-[#78746e] text-sm leading-relaxed max-w-lg">
                We occasionally hire for roles we haven't listed yet. Send us
                your CV and a brief note about what you'd love to work on — we
                read every message.
              </p>
            </div>
            <a
              href="mailto:careers@godgifted.com"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 border-2 border-[#2d5a3d] text-[#2d5a3d] text-sm font-semibold rounded-lg hover:bg-[#2d5a3d] hover:text-white transition-all duration-200 whitespace-nowrap"
            >
              Send Speculative CV
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BOTTOM CTA
      ═══════════════════════════════════════════ */}
      <section className="py-20 bg-[#f9f7f4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#2d5a3d] p-10 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1455853828816-0c301a011711?w=1200&h=400&fit=crop')",
                backgroundSize: "cover",
              }}
            />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-3">
                Life at Godgifted
              </p>
              <h2
                className="font-semibold text-white leading-[1.1] mb-3"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.75rem,3vw,2.5rem)",
                }}
              >
                Questions About Working Here?
              </h2>
              <p className="text-white/70 text-lg max-w-lg">
                Reach out to our People team — we're happy to chat about
                culture, roles, or anything else.
              </p>
            </div>
            <a
              href="mailto:careers@godgifted.com"
              className="relative z-10 shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8995e] transition-colors whitespace-nowrap"
            >
              careers@godgifted.com
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Application dialog */}
      <ApplyDialog
        job={applyJob}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setApplyJob(null);
        }}
      />

      <Footer />
    </div>
  );
}
