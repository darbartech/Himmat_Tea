'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  LayoutDashboard,
  Globe,
  Truck,
  Sparkles,
  Tag,
  ArrowRight,
  Star,
  Leaf,
  Coffee,
  Flame,
  LogOut,
  Heart,
  User,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useStore } from "@/context/StoreContext";
import { BRAND } from '@/config/brand';
import { AuthModal } from '@/modules/auth';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

/* ─────────────────────────────────────────────────────────
   Announcement messages  (auto-rotate every 4 s)
───────────────────────────────────────────────────────── */
const ANNOUNCEMENTS = [
  {
    icon: Truck,
    text: "Free shipping on orders over Rs. 3,000 — Use code",
    code: "GODGIFTED",
    link: "/shipping-returns",
  },
  {
    icon: Sparkles,
    text: "Spring Harvest 2026 is here — Limited lots, shop before they're gone",
    code: "",
    link: "/collections/seasonal",
  },
  {
    icon: Tag,
    text: "Wholesale pricing for cafés, hotels & retailers — Apply today",
    code: "",
    link: "/wholesale",
  },
];

/* ─────────────────────────────────────────────────────────
   Products catalogue — used for search
───────────────────────────────────────────────────────── */
const SEARCH_PRODUCTS = [
  {
    id: "1",
    name: "Dragon Well Longjing",
    type: "Green Tea",
    origin: "Zhejiang, China",
    price: 1850,
    image:
      "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "2",
    name: "First Flush Darjeeling",
    type: "Black Tea",
    origin: "West Bengal, India",
    price: 2200,
    image:
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "3",
    name: "Himalayan Herbal Blend",
    type: "Herbal",
    origin: "Ilam, Nepal",
    price: 1400,
    image:
      "https://images.unsplash.com/photo-1596344084757-b83f2081da8b?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "4",
    name: "Wuyi Rock Oolong",
    type: "Oolong",
    origin: "Fujian, China",
    price: 2600,
    image:
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "5",
    name: "Silver Needle White Tea",
    type: "White Tea",
    origin: "Fujian, China",
    price: 3200,
    image:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "6",
    name: "Nepal Green Ilam",
    type: "Green Tea",
    origin: "Ilam, Nepal",
    price: 1200,
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "7",
    name: "Assam CTC Breakfast",
    type: "Black Tea",
    origin: "Assam, India",
    price: 950,
    image:
      "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "8",
    name: "Chamomile Calm",
    type: "Herbal",
    origin: "Egypt",
    price: 1100,
    image:
      "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=80&h=80&fit=crop",
    productLine: "Himmat Tea"
  },
  {
    id: "9",
    name: "Premium Toor Dal",
    type: "Toor Dal",
    origin: "Terai, Nepal",
    price: 189,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop",
    productLine: "Godgifted Dal"
  },
  {
    id: "10",
    name: "Organic Moong Dal",
    type: "Moong Dal",
    origin: "Haryana, India",
    price: 219,
    image:
      "https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=80&h=80&fit=crop",
    productLine: "Godgifted Dal"
  },
];

/* ─────────────────────────────────────────────────────────
   Quick links for search default state
───────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  { icon: Leaf, label: "Green Tea", href: "/products?category=green" },
  { icon: Coffee, label: "Black Tea", href: "/products?category=black" },
  { icon: Flame, label: "Oolong Tea", href: "/products?category=oolong" },
  { icon: Star, label: "Best Sellers", href: "/collections/best-sellers" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { lang: selectedLang, setLang, t } = useTranslation();
  const { cartCount } = useCart();
  const { isLoggedIn, logout, userType } = useAuth();
  const { wishlist } = useWishlist();
  const { productLines, products } = useStore();

  /* Auto-focus input when modal opens */
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = "hidden";
    } else {
      setSearchQuery("");
      document.body.style.overflow = "";
    }
  }, [searchOpen]);

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchResults =
    searchQuery.trim().length > 0
      ? SEARCH_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.origin.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  const handleResultClick = (id: string) => {
    setSearchOpen(false);
    router.push(`/products/${id}`);
  };

  /* Auto-rotate announcements */
  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(
      () => setAnnouncementIdx((i) => (i + 1) % ANNOUNCEMENTS.length),
      4500,
    );
    return () => clearInterval(id);
  }, [dismissed]);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Nav links */
  const navLinks = [
    {
      label: "Products",
      href: "/products",
      children: [
        // Product lines
        ...productLines.filter(pl => pl.isActive).map(pl => ({
          label: pl.name,
          sub: pl.description.slice(0, 50) + (pl.description.length > 50 ? "..." : ""),
          href: `/${pl.slug}`,
        })),
        // Divider (represented by null for now, but we'll handle it in rendering)
        // All products
        {
          label: "All Products",
          sub: "Browse our complete product catalog",
          href: "/products",
        },
      ],
    },
    {
      label: t("nav.collections"),
      href: "/collections",
      children: [
        {
          label: t("nav.seasonalPicks"),
          sub: t("nav.seasonalPicksSub"),
          href: "/collections/seasonal",
        },
        {
          label: t("nav.wellnessRange"),
          sub: t("nav.wellnessRangeSub"),
          href: "/collections/wellness",
        },
        {
          label: t("nav.giftSets"),
          sub: t("nav.giftSetsSub"),
          href: "/collections/gift-sets",
        },
      ],
    },
    { label: t("nav.wholesale"), href: "/wholesale" },
    { label: t("nav.ourStory"), href: "/about" },
    { label: t("nav.blog"), href: "/blog" },
  ];

  const langMeta: Record<
    string,
    { country: string; code: string; name: string }
  > = {
    en: { country: "GB", code: "EN", name: "English" },
    ne: { country: "NP", code: "NE", name: "नेपाली" },
    hi: { country: "IN", code: "HI", name: "हिन्दी" },
    zh: { country: "CN", code: "ZH", name: "中文" },
    ja: { country: "JP", code: "JA", name: "日本語" },
  };

  const prev = () =>
    setAnnouncementIdx(
      (i) => (i - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length,
    );
  const next = () => setAnnouncementIdx((i) => (i + 1) % ANNOUNCEMENTS.length);

  const current = ANNOUNCEMENTS[announcementIdx];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
          scrolled
            ? "bg-card shadow-[var(--shadow-md)] border-b border-border/60"
            : "bg-card/80 backdrop-blur-[10px]"
        }`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ══════════════════════════════════════════════════
            ANNOUNCEMENT BAR  —  rotating carousel
        ══════════════════════════════════════════════════ */}
        {!dismissed && (
          <div className="relative bg-primary text-primary-foreground select-none overflow-hidden">
            <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]" aria-hidden />
            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
              <div className="flex items-center h-9">
                {/* Prev arrow */}
                <button
                  onClick={prev}
                  aria-label="Previous announcement"
                  className="shrink-0 p-1.5 rounded-[var(--radius-sm)] hover:bg-white/15 transition-colors duration-[var(--duration-fast)] mr-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {/* Message — centered flex-1 */}
                <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0">
                  {/* Icon badge */}
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/12 flex items-center justify-center ring-1 ring-white/20">
                    <current.icon className="h-3 w-3 text-primary-foreground" />
                  </span>

                  {/* Text */}
                  <Link
                    href={current.link}
                    className="text-[12.5px] font-light tracking-wide truncate hover:text-primary-foreground/80 transition-colors duration-[var(--duration-fast)]"
                  >
                    {current.text}
                  </Link>

                  {/* Code chip */}
                  {current.code && (
                    <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-sm)] bg-accent/15 border border-accent/40 text-[10.5px] font-bold tracking-[0.12em] text-accent">
                      {current.code}
                    </span>
                  )}
                </div>

                {/* Next arrow */}
                <button
                  onClick={next}
                  aria-label="Next announcement"
                  className="shrink-0 p-1.5 rounded-[var(--radius-sm)] hover:bg-white/15 transition-colors duration-[var(--duration-fast)] ml-2.5"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {/* Dismiss */}
                <button
                  onClick={() => setDismissed(true)}
                  aria-label="Dismiss"
                  className="shrink-0 p-1.5 rounded-[var(--radius-sm)] hover:bg-white/15 transition-colors duration-[var(--duration-fast)] ml-1"
                >
                  <X className="h-3.5 w-3.5 opacity-70" />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {ANNOUNCEMENTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setAnnouncementIdx(i)}
                    aria-label={`Go to announcement ${i + 1}`}
                    className={`rounded-full transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
                      i === announcementIdx
                        ? "w-3.5 h-1.5 bg-accent"
                        : "w-1.5 h-1.5 bg-white/25 hover:bg-white/45"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            MAIN NAV BAR
        ══════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ── Logo ── */}
            <Link
                href="/"
                className="flex items-center gap-2.5 shrink-0 group"
                onClick={() => setMobileOpen(false)}
              >
              <div className="relative transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden="true"
                  className="drop-shadow-[0_1px_2px_rgba(45,90,61,0.2)]"
                >
                  <rect width="32" height="32" rx="8" className="fill-primary" />
                  <path
                    d="M16 6C16 6 8 12 8 19a8 8 0 0016 0c0-7-8-13-8-13z"
                    className="fill-accent"
                    opacity="0.92"
                  />
                  <path
                    d="M16 10C16 10 11 15 11 20a5 5 0 0010 0c0-5-5-10-5-10z"
                    fill="white"
                    opacity="0.28"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[1.1rem] font-semibold tracking-[-0.01em] text-foreground leading-none"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {BRAND.companyName}
                </span>
                <span className="text-[10px] text-muted-foreground -mt-0.5 tracking-wide">
                  Home of Himmat Tea
                </span>
              </div>
            </Link>

            {/* ── Desktop Nav links ── */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) =>
                link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(link.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      href={link.href}
                      className="flex items-center gap-1 px-3.5 py-2 text-[14.5px] text-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-md)] hover:bg-secondary relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-0 after:bg-accent after:transition-all after:duration-[var(--duration-base)] after:ease-[var(--ease-out-expo)] hover:after:w-5"
                    >
                      {link.label}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] text-muted-foreground ${
                          activeDropdown === link.label ? "rotate-180" : ""
                        }`}
                      />
                    </Link>

                    {activeDropdown === link.label && (
                      <div className="absolute top-full left-0 pt-1.5 z-50 animate-[scale-in_180ms_ease-out]">
                        <div className="bg-card rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-border p-1.5 min-w-[240px]">
                          {link.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="relative flex flex-col px-3.5 py-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] group pl-4"
                            >
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 rounded-r-full bg-accent transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] group-hover:h-5" />
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-[var(--duration-fast)]">
                                {child.label}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {child.sub}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="px-3.5 py-2 text-[14.5px] text-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-md)] hover:bg-secondary relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-0 after:bg-accent after:transition-all after:duration-[var(--duration-base)] after:ease-[var(--ease-out-expo)] hover:after:w-5"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>

            {/* ══════════════════════════════════════════════
                RIGHT SIDE ACTIONS  (desktop)
            ══════════════════════════════════════════════ */}
            <div className="hidden lg:flex items-center gap-1">

               {/* ── Language selector ── */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex cursor-pointer items-center gap-1.5 px-2.5 py-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground"
                >
                  {/* Country badge */}
                  <span className="inline-flex cursor-pointer items-center justify-center px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-foreground text-background text-[9.5px] font-bold tracking-[0.08em] min-w-[22px]">
                    {langMeta[selectedLang].country}
                  </span>
                  {/* Language code */}
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {langMeta[selectedLang].code}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
                      langOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {langOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-card rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-border py-1.5 px-1.5 min-w-[190px] z-50 animate-[scale-in_160ms_ease-out]">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                      Language
                    </p>
                    {Object.entries(langMeta).map(([code, meta]) => (
                      <button
                        key={code}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors duration-[var(--duration-fast)] ${
                          selectedLang === code
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-secondary text-foreground"
                        }`}
                        onClick={() => {
                          setLang(code);
                          setLangOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          {/* Country + code badge */}
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-foreground text-background text-[9px] font-bold tracking-[0.08em] min-w-[22px]">
                              {meta.country}
                            </span>
                            <span
                              className={`text-[10px] font-bold tracking-wider ${
                                selectedLang === code
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {meta.code}
                            </span>
                          </span>
                          <span>{meta.name}</span>
                        </span>
                        {selectedLang === code && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                title="Search products  (Press /)"
                className="p-2.5 cursor-pointer rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-muted-foreground hover:text-foreground"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground cursor-pointer"
              >
                <div className="relative cursor-pointer">
                  <Heart className="h-[18px] w-[18px]" />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 leading-none shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                      {wishlist.length}
                    </span>
                  )}
                </div>
              </Link>

             

              {/* ── Cart ── */}
              <Link
                href="/cart"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground"
              >
                <div className="relative">
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 leading-none shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-[var(--duration-fast)] font-medium">
                  {cartCount > 0 ? `Cart (${cartCount})` : "Cart"}
                </span>
              </Link>

              {isLoggedIn ? (
                <>
                  {userType === 'admin' ? (
                    <Link href="/himmat_admin_8526/dashboard" asChild>
                      <Button variant="secondary" size="sm" className="gap-1.5 ml-1">
                        <LayoutDashboard className="h-3.5 w-3.5 opacity-80" />
                        {t("nav.dashboard")}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/account" asChild>
                      <Button variant="primary" size="sm" className="gap-1.5 ml-1">
                        <User className="h-3.5 w-3.5 opacity-80" />
                        Account
                      </Button>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-foreground text-sm font-semibold rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] group ml-0.5"
                  >
                    <LogOut className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100 transition-opacity" />
                    Logout
                  </button>
                </>
              ) : (
                <Button variant="elevated" size="sm" className="gap-1.5 ml-1" onClick={() => setAuthModalOpen(true)}>
                  <User className="h-3.5 w-3.5 opacity-80" />
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile cart */}
              <Link
                href="/cart"
                className="relative p-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                    {cartCount}
                  </span>
                )}
              </Link>
              {/* Mobile wishlist */}
              <Link
                href="/wishlist"
                className="relative p-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground"
              >
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                    {wishlist.length}
                  </span>
                )}
              </Link>
              <button
                className="p-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-foreground"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════
          MOBILE MENU — right-side drawer
      ═════════════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[59] lg:hidden transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
          mobileOpen
            ? "bg-foreground/45 backdrop-blur-[4px] pointer-events-auto"
            : "bg-transparent pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Drawer panel — slides in from the right */}
      <div
        className={`fixed top-0 right-0 h-full w-[310px] bg-card z-[60] lg:hidden flex flex-col shadow-[var(--shadow-2xl)] border-l border-border/50 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-expo)] ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Drawer header — brand + close ── */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden
              className="drop-shadow-[0_1px_2px_rgba(45,90,61,0.2)]"
            >
              <rect width="32" height="32" rx="8" className="fill-primary" />
              <path
                d="M16 6C16 6 8 12 8 19a8 8 0 0016 0c0-7-8-13-8-13z"
                className="fill-accent"
                opacity="0.92"
              />
              <path
                d="M16 10C16 10 11 15 11 20a5 5 0 0010 0c0-5-5-10-5-10z"
                fill="white"
                opacity="0.28"
              />
            </svg>
            <span
              className="text-[1rem] font-semibold tracking-[-0.01em] text-foreground"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {BRAND.companyName}
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable nav area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label}>
                <button
                  onClick={() =>
                    setMobileExpanded(
                      mobileExpanded === link.label ? null : link.label,
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-3 text-[15px] font-medium text-foreground rounded-[var(--radius-lg)] hover:bg-secondary transition-colors duration-[var(--duration-fast)]"
                >
                  {link.label}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
                      mobileExpanded === link.label ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {mobileExpanded === link.label && (
                  <div className="ml-2 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-2">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 text-sm rounded-[var(--radius-md)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] group"
                      >
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-[var(--duration-fast)]">
                          {child.label}
                        </span>
                        <span className="text-xs text-muted-foreground/80">
                          {child.sub}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 text-[15px] font-medium text-foreground rounded-[var(--radius-lg)] hover:bg-secondary transition-colors duration-[var(--duration-fast)]"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>

        {/* ── Drawer footer — language + dashboard/login ── */}
        <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border space-y-2">
          {/* Language */}
          <div>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-[var(--radius-lg)] hover:bg-secondary transition-colors duration-[var(--duration-fast)]"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Language
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-foreground text-background text-[9px] font-bold tracking-[0.08em] min-w-[22px]">
                  {langMeta[selectedLang].country}
                </span>
                <span className="font-bold uppercase text-[10px] tracking-wider text-muted-foreground">
                  {langMeta[selectedLang].code}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
                    langOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>

            {langOpen && (
              <div className="mt-1 mx-2 bg-secondary rounded-[var(--radius-xl)] border-border/60 border p-1.5">
                {Object.entries(langMeta).map(([code, meta]) => (
                  <button
                    key={code}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors duration-[var(--duration-fast)] ${
                      selectedLang === code
                        ? "bg-card text-primary font-semibold shadow-[var(--shadow-xs)]"
                        : "hover:bg-card text-foreground"
                    }`}
                    onClick={() => {
                      setLang(code);
                      setLangOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-foreground text-background text-[9px] font-bold tracking-[0.08em] min-w-[22px]">
                          {meta.country}
                        </span>
                        <span
                          className={`text-[10px] font-bold tracking-wider ${
                            selectedLang === code
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {meta.code}
                        </span>
                      </span>
                      <span>{meta.name}</span>
                    </span>
                    {selectedLang === code && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <>
              {userType === 'admin' ? (
                <Link href="/himmat_admin_8526/dashboard" asChild onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" size="sm" className="w-full gap-2 h-11">
                    <LayoutDashboard className="h-4 w-4 opacity-80" />
                    {t("nav.dashboard")}
                  </Button>
                </Link>
              ) : (
                <Link href="/account" asChild onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full gap-2 h-11">
                    <User className="h-4 w-4 opacity-80" />
                    Account
                  </Button>
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                  router.push("/");
                }}
                className="flex items-center justify-center gap-2 w-full px-4 h-11 text-foreground text-sm font-semibold rounded-[var(--radius-lg)] hover:bg-secondary transition-colors duration-[var(--duration-fast)]"
              >
                <LogOut className="h-4 w-4 opacity-80" />
                Logout
              </button>
            </>
          ) : (
            <Button variant="primary" size="sm" className="w-full gap-2 h-11"
              onClick={() => {
                setMobileOpen(false);
                setAuthModalOpen(true);
              }}
            >
              <User className="h-4 w-4 opacity-80" />
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════
          SEARCH MODAL
      ═════════════════════════════════════════════════ */}
      {searchOpen && (
        <>
          {/* Dark backdrop — click to close */}
          <div
            className="fixed inset-0 z-[100] bg-foreground/50 backdrop-blur-[4px] animate-[fade-in_150ms_ease-out]"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal panel */}
          <div className="fixed top-0 left-0 right-0 z-[101] flex justify-center px-4 pt-[88px] sm:pt-[110px]">
            <div
              className="w-full max-w-2xl bg-card rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] border border-border overflow-hidden animate-[slide-down_220ms_ease-[var(--ease-out-expo)]]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {/* ── Search input row ── */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <Search className="h-5 w-5 text-primary shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teas, origins, types…"
                  className="flex-1 text-[1.0625rem] text-foreground placeholder:text-muted-foreground/70 outline-none bg-transparent"
                />
                {/* Clear query button — only when typing */}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    title="Clear"
                    className="shrink-0 p-1.5 rounded-full hover:bg-secondary transition-colors duration-[var(--duration-fast)]"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}

                {/* Divider */}
                <div className="w-px h-5 bg-border shrink-0" />

                {/* Close modal button — always visible */}
                <button
                  onClick={() => setSearchOpen(false)}
                  title="Close search  (Esc)"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] bg-secondary border border-border hover:bg-secondary/80 hover:border-border/80 transition-all duration-[var(--duration-fast)]"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              </div>

              {/* ── Scrollable body ── */}
              <div className="max-h-[60vh] overflow-y-auto">
                {/* ── Matching results ── */}
                {searchResults.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 py-1.5 mb-1">
                      Products — {searchResults.length} found
                    </p>
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleResultClick(product.id)}
                        className="w-full flex items-center gap-4 px-3 py-3 rounded-[var(--radius-lg)] hover:bg-secondary transition-colors duration-[var(--duration-fast)] group text-left"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-[var(--radius-lg)] object-cover shrink-0 bg-secondary"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-foreground text-[0.9375rem] group-hover:text-primary transition-colors duration-[var(--duration-fast)] truncate leading-snug"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {product.productLine}
                            </span>
                            <span className="text-border text-xs">·</span>
                            <span className="text-xs text-muted-foreground">
                              {product.type}
                            </span>
                            <span className="text-border text-xs">·</span>
                            <span className="text-xs text-muted-foreground">
                              {product.origin}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-primary text-sm">
                            Rs.&nbsp;{product.price.toLocaleString()}
                          </p>
                          <ArrowRight className="h-3.5 w-3.5 text-accent ml-auto mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)]" />
                        </div>
                      </button>
                    ))}

                    {/* View all results link */}
                    <Link
                      href="/products"
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-center gap-2 mt-2 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)]"
                    >
                      Browse all teas
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {/* ── No results ── */}
                {searchQuery.trim().length > 0 &&
                  searchResults.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-8 w-8 text-primary/60" />
                      </div>
                      <p className="font-semibold text-foreground mb-1 text-[1.0625rem]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        No teas found for “{searchQuery}”
                      </p>
                      <p className="text-sm text-muted-foreground mb-5">
                        Try “green”, “Nepal”, or “herbal”
                      </p>
                      <Link href="/products" asChild onClick={() => setSearchOpen(false)}>
                        <Button variant="elevated" size="sm" className="gap-2">
                          View All Teas
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}

                {/* ── Default state (no query) ── */}
                {searchQuery.trim().length === 0 && (
                  <div className="p-4 space-y-5">
                    {/* Quick category links */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 mb-3">
                        Browse by Category
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_LINKS.map(({ icon: Icon, label, href }) => (
                          <Link
                            key={label}
                            href={href}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] bg-secondary hover:bg-primary/5 border border-border/40 hover:border-primary/25 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] group"
                          >
                            <span className="w-9 h-9 rounded-[var(--radius-md)] bg-card flex items-center justify-center shadow-[var(--shadow-xs)] border border-border/60 group-hover:bg-primary transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-expo)] shrink-0">
                              <Icon className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-expo)]" />
                            </span>
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-[var(--duration-fast)]">
                              {label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Trending search terms */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 mb-2.5">
                        Trending Searches
                      </p>
                      <div className="flex flex-wrap gap-2 px-1">
                        {[
                          "Dragon Well",
                          "Darjeeling",
                          "Himalayan Herbal",
                          "Silver Needle",
                          "Oolong",
                          "Chamomile",
                        ].map((term) => (
                          <button
                            key={term}
                            onClick={() => setSearchQuery(term)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary border border-border/50 text-sm text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-[var(--duration-fast)]"
                          >
                            <Search className="h-3 w-3 text-muted-foreground/70" />
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════
          AUTH MODAL
      ═════════════════════════════════════════════════ */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
