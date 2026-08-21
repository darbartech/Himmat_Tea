'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  ChevronDown,
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
  User,
} from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES, COUNTRY_LIST } from "@/lib/currency";
import { BRAND } from "@/config/brand";
import { AuthModal } from "@/modules/auth";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";

/* ============================================================
   ANNOUNCEMENTS
============================================================ */

const ANNOUNCEMENTS = [
  {
    icon: Truck,
    textKey: "announcements.freeShipping.text",
    codeKey: "announcements.freeShipping.code",
    link: "/shipping-returns",
  },
  {
    icon: Sparkles,
    textKey: "announcements.springHarvest.text",
    codeKey: "",
    link: "/collections/seasonal",
  },
  {
    icon: Tag,
    textKey: "announcements.wholesale.text",
    codeKey: "",
    link: "/wholesale",
  },
];

/* ============================================================
   QUICK SEARCH LINKS
============================================================ */

const QUICK_LINKS = [
  {
    icon: Leaf,
    labelKey: "nav.greenTea",
    href: "/products?category=green",
  },
  {
    icon: Coffee,
    labelKey: "nav.blackTea",
    href: "/products?category=black",
  },
  {
    icon: Flame,
    labelKey: "nav.oolongTea",
    href: "/products?category=oolong",
  },
  {
    icon: Star,
    labelKey: "nav.bestSellers",
    href: "/collections/best-sellers",
  },
];

/* ============================================================
   NAVIGATION
============================================================ */

export default function Navigation() {
  /* ----------------------------------------------------------
     UI STATE
  ---------------------------------------------------------- */

  const [mounted, setMounted] = useState(false);

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  /* ----------------------------------------------------------
     REFS
  ---------------------------------------------------------- */

  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  /* ----------------------------------------------------------
     ROUTER
  ---------------------------------------------------------- */

  const router = useRouter();
  const pathname = usePathname();

  /* ----------------------------------------------------------
     CONTEXTS
  ---------------------------------------------------------- */

  const {
    lang: selectedLang,
    setLang,
    t,
  } = useTranslation();

  const {
    cartCount,
  } = useCart();

  const {
    isLoggedIn,
    logout,
    userType,
    currentUser,
    isLoading,
  } = useAuth();

  const {
    productLines,
    products,
  } = useStore();

  const {
    formatPrice,
    currency: selectedCurrency,
    setCurrency,
    country: selectedCountry,
    setCountry,
  } = useCurrency();

  /* ============================================================
     HYDRATION FIX
     
     IMPORTANT:
     cartCount may come from localStorage.
     
     Server:
       cartCount = 0
     
     Client:
       cartCount = actual cart count
     
     Therefore we don't display cartCount until mounted.
  ============================================================ */

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayCartCount = mounted ? cartCount : 0;

  /* ============================================================
     AUTH STATE
  ============================================================ */

  const authReady = !isLoading;

  const showLoggedInState =
    mounted &&
    authReady &&
    isLoggedIn;

  const loggedInUserName = currentUser
    ? userType === "admin"
      ? "username" in currentUser
        ? currentUser.username
        : "Admin"
      : "name" in currentUser
        ? currentUser.name
        : "User"
    : "User";

  const loggedInUserInitial =
    loggedInUserName.trim().charAt(0).toUpperCase() || "U";

  /* ============================================================
     SEARCH MODAL
  ============================================================ */

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);

      document.body.style.overflow = "hidden";

      return () => clearTimeout(timer);
    }

    setSearchQuery("");
    document.body.style.overflow = "";
  }, [searchOpen]);

  /* ============================================================
     ESCAPE KEY
  ============================================================ */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileMenuOpen(false);
        setLangOpen(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ============================================================
     PROFILE CLICK OUTSIDE
  ============================================================ */

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  /* ============================================================
     LANGUAGE CLICK OUTSIDE
  ============================================================ */

  useEffect(() => {
    if (!langOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        langRef.current &&
        !langRef.current.contains(event.target as Node)
      ) {
        setLangOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langOpen]);

  /* ============================================================
     SEARCH RESULTS
  ============================================================ */

  const searchResults =
    searchQuery.trim().length > 0
      ? products
          .filter(
            (product) =>
              product.isActive !== false &&
              (
                product.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                product.category
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                product.description
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              ),
          )
          .slice(0, 20)
          .map((product) => ({
            id: String(product.id),
            name: product.name,
            type: product.category,
            origin: product.sku || "",
            price: product.price,
            image: product.imageUrl,
            productLine: product.productLine?.name || "",
          }))
      : [];

  const handleResultClick = (id: string) => {
    setSearchOpen(false);
    router.push(`/products/${id}`);
  };

  /* ============================================================
     ANNOUNCEMENT ROTATION
  ============================================================ */

  useEffect(() => {
    if (dismissed) return;

    const id = setInterval(() => {
      setAnnouncementIdx(
        (index) =>
          (index + 1) % ANNOUNCEMENTS.length,
      );
    }, 4500);

    return () => clearInterval(id);
  }, [dismissed]);

  /* ============================================================
     SCROLL
  ============================================================ */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* ============================================================
     NAV LINKS
  ============================================================ */

  const navLinks = [
    {
      label: t("nav.products"),
      href: "/products",
      children: [
        ...productLines
          .filter((productLine) => productLine.isActive)
          .map((productLine) => ({
            label: productLine.name,
            href: `/${productLine.slug}`,
          })),
        {
          label: t("nav.allProducts"),
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
          href: "/collections/seasonal",
        },
        {
          label: t("nav.wellnessRange"),
          href: "/collections/wellness",
        },
        {
          label: t("nav.giftSets"),
          href: "/collections/gift-sets",
        },
      ],
    },
    {
      label: t("nav.wholesale"),
      href: "/wholesale",
    },
    {
      label: t("nav.ourStory"),
      href: "/about",
    },
    {
      label: t("nav.blog"),
      href: "/blog",
    },
  ];

  /* ============================================================
     LANGUAGE
  ============================================================ */

  const langMeta: Record<
    string,
    {
      country: string;
      code: string;
      name: string;
    }
  > = {
    en: {
      country: "GB",
      code: "EN",
      name: "English",
    },
    ne: {
      country: "NP",
      code: "NE",
      name: "नेपाली",
    },
    hi: {
      country: "IN",
      code: "HI",
      name: "हिन्दी",
    },
    zh: {
      country: "CN",
      code: "ZH",
      name: "中文",
    },
    ja: {
      country: "JP",
      code: "JA",
      name: "日本語",
    },
  };

  /* ============================================================
     ANNOUNCEMENT CONTROLS
  ============================================================ */

  const current =
    ANNOUNCEMENTS[announcementIdx];

  /* ============================================================
     ACTIVE PATH
  ============================================================ */

  const isActivePath = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
          scrolled
            ? "bg-card shadow-[var(--shadow-md)] border-b border-border/60"
            : "bg-card/80 backdrop-blur-[10px]"
        }`}
        style={{
          fontFamily: "'DM Sans', sans-serif",
        }}
        suppressHydrationWarning
      >

        {/* ====================================================
            ANNOUNCEMENT BAR
        ==================================================== */}

        {!dismissed && (
          <div className="relative bg-primary text-primary-foreground select-none overflow-hidden" suppressHydrationWarning>

            <div
              className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]"
              aria-hidden
            />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">

              <div className="flex items-center h-9">

                <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0 pl-6">

                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/12 flex items-center justify-center ring-1 ring-white/20">
                    <current.icon className="h-3 w-3 text-primary-foreground" />
                  </span>

                  <Link
                    href={current.link}
                    className="text-[12.5px] font-light tracking-wide truncate hover:text-primary-foreground/80 transition-colors duration-[var(--duration-fast)]"
                    suppressHydrationWarning
                  >
                    {t(current.textKey)}
                  </Link>

                  {current.codeKey && (
                    <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-sm)] bg-accent/15 border border-accent/40 text-[10.5px] font-bold tracking-[0.12em] text-accent" suppressHydrationWarning>
                      {t(current.codeKey)}
                    </span>
                  )}

                </div>

                <button
                  onClick={() => setDismissed(true)}
                  aria-label={mounted ? t('a11y.dismiss') : 'Dismiss'}
                  className="shrink-0 p-1.5 rounded-[var(--radius-sm)] hover:bg-white/15 transition-colors duration-[var(--duration-fast)]"
                >
                  <X className="h-3.5 w-3.5 opacity-70" />
                </button>

              </div>

              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5">

                {ANNOUNCEMENTS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setAnnouncementIdx(index)
                    }
                    aria-label={`Go to announcement ${index + 1}`}
                    className={`rounded-full transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] ${
                      index === announcementIdx
                        ? "w-3.5 h-1.5 bg-accent"
                        : "w-1.5 h-1.5 bg-white/25 hover:bg-white/45"
                    }`}
                  />
                ))}

              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            MAIN NAV
        ==================================================== */}

        <div className="max-w-7xl mx-auto px-6 lg:px-8" suppressHydrationWarning>

          <div className="flex items-center justify-between h-16">

            {/* ==================================================
                LOGO
            ================================================== */}

            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0 group"
              onClick={() => setMobileOpen(false)}
              suppressHydrationWarning
            >
              <Image
                src="/logo.svg"
                alt={BRAND.companyName}
                width={100}
                height={100}
                className="w-[150px] h-[100%]"
                priority
                suppressHydrationWarning
              />
            </Link>

            {/* ==================================================
                DESKTOP NAV
            ================================================== */}

            <nav className="hidden lg:flex items-center gap-0.5" suppressHydrationWarning>

              {navLinks.map((link) => {

                const isActive =
                  isActivePath(link.href);

                return link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() =>
                      setActiveDropdown(link.label)
                    }
                    onMouseLeave={() =>
                      setActiveDropdown(null)
                    }
                  >

                    <Link
                      href={link.href}
                      className={`flex items-center gap-1 px-3.5 py-2 text-[14.5px] transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-md)] relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-accent after:transition-all after:duration-[var(--duration-base)] after:ease-[var(--ease-out-expo)] ${
                        isActive
                          ? "text-primary after:w-5"
                          : "text-foreground hover:text-primary after:w-0 hover:after:w-5"
                      }`}
                      suppressHydrationWarning
                    >
                      {link.label}

                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)] text-muted-foreground ${
                          activeDropdown === link.label
                            ? "rotate-180"
                            : ""
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
                              className={`relative flex items-center px-3.5 py-2.5 rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] group pl-4 ${
                                isActivePath(child.href)
                                  ? "bg-secondary text-primary"
                                  : "hover:bg-secondary text-foreground"
                              }`}
                            >

                              <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-accent transition-all duration-[var(--duration-base)] ${
                                  isActivePath(child.href)
                                    ? "h-5"
                                    : "h-0 group-hover:h-5"
                                }`}
                              />

                              <span
                                className={`text-sm font-medium transition-colors ${
                                  isActivePath(child.href)
                                    ? "text-primary"
                                    : "text-foreground group-hover:text-primary"
                                }`}
                              >
                                {child.label}
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
                    className={`cursor-pointer px-3.5 py-2 text-[14.5px] transition-colors duration-[var(--duration-fast)] rounded-[var(--radius-md)] relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-accent after:transition-all duration-[var(--duration-base)] ${
                      isActive
                        ? "text-primary after:w-5"
                        : "text-foreground hover:text-primary after:w-0 hover:after:w-5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

            </nav>

            {/* ==================================================
                DESKTOP ACTIONS
            ================================================== */}

            <div className="hidden lg:flex items-center gap-1">

              {/* LANGUAGE */}

              <div
                ref={langRef}
                className="relative"
              >

                <button
                  type="button"
                  onClick={() =>
                    setLangOpen(!langOpen)
                  }
                  className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-foreground"
                  aria-label={t('a11y.selectLanguage')}
                >
                  <Globe className="h-[18px] w-[18px] text-muted-foreground" />
                </button>

                {langOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-card rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-border py-1.5 px-1.5 min-w-[190px] z-50">

                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                      {t('nav.languageDropdown')}
                    </p>

                    {Object.entries(langMeta).map(
                      ([code, meta]) => (
                        <button
                          type="button"
                          key={code}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-md)] text-sm ${
                            selectedLang === code
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-secondary text-foreground"
                          }`}
                          onClick={() => {
                            setLang(code);

                            if (
                              typeof window !==
                              "undefined"
                            ) {
                              localStorage.setItem(
                                "himmat_lang",
                                code,
                              );
                            }

                            setLangOpen(false);
                          }}
                        >
                          <span>
                            {meta.name}
                          </span>

                          {selectedLang === code && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </button>
                      ),
                    )}

                    <div className="h-px bg-border my-1.5" />

                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                      {t('nav.currencyDropdown') !== 'nav.currencyDropdown' ? t('nav.currencyDropdown') : 'Currency'}
                    </p>

                    <select
                      value={selectedCurrency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 mb-1.5 rounded-[var(--radius-md)] text-sm bg-secondary text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      aria-label={t('a11y.selectCurrency') !== 'a11y.selectCurrency' ? t('a11y.selectCurrency') : 'Select currency'}
                    >
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {code} — {CURRENCY_NAMES[code]}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                      {t('nav.countryDropdown') !== 'nav.countryDropdown' ? t('nav.countryDropdown') : 'Country'}
                    </p>

                    <select
                      value={selectedCountry}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] text-sm bg-secondary text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      aria-label={t('a11y.selectCountry') !== 'a11y.selectCountry' ? t('a11y.selectCountry') : 'Select country'}
                    >
                      {COUNTRY_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                  </div>
                )}

              </div>

              {/* SEARCH */}

              <button
                type="button"
                onClick={() =>
                  setSearchOpen(true)
                }
                title={t('a11y.searchProducts')}
                className="p-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                aria-label={t('a11y.searchProducts')}
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              {/* ==================================================
                  DESKTOP CART
                  
                  HYDRATION FIX:
                  displayCartCount is 0 during SSR and first render.
              ================================================== */}

              <Link
                href="/cart"
                className="group relative flex items-center justify-center p-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-foreground"
                aria-label={t('a11y.cart')}
              >
                <div className="relative">

                  <ShoppingBag className="h-[18px] w-[18px]" />

                  {displayCartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 leading-none shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                      {displayCartCount}
                    </span>
                  )}

                </div>
              </Link>

              <div className="h-6 w-px bg-border/80 mx-1" />

              {/* ==================================================
                  PROFILE
              ================================================== */}

              <div
                ref={profileRef}
                className="relative ml-0.5"
              >

                <button
                  type="button"
                  onClick={() => {
                    if (!showLoggedInState) {
                      router.push('/customer-auth');
                    } else {
                      setProfileMenuOpen((open) => !open);
                    }
                  }}
                  aria-label={
                    showLoggedInState
                      ? t('nav.myAccountLabel')
                      : t('nav.loginLabel')
                  }
                  aria-expanded={
                    profileMenuOpen
                  }
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-border/70 bg-card hover:bg-secondary hover:border-primary/30 text-foreground transition-all"
                >

                  {showLoggedInState ? (
                    <span className="flex items-center justify-center w-full h-full text-sm font-semibold bg-primary text-primary-foreground rounded-full">
                      {loggedInUserInitial}
                    </span>
                  ) : (
                    <User className="h-[18px] w-[18px]" />
                  )}

                </button>

                {profileMenuOpen && showLoggedInState && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-card rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-border p-1.5 z-50">

                    <>
                      {userType === "admin" && (
                        <Link
                          href="/himmat_admin_8526/dashboard"
                          onClick={() =>
                            setProfileMenuOpen(
                              false,
                            )
                          }
                          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-foreground hover:bg-secondary"
                        >
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                          {t("nav.dashboard")}
                        </Link>
                      )}

                      <div className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-semibold text-foreground">

                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {loggedInUserInitial}
                        </div>

                        {loggedInUserName}

                      </div>

                      <Link
                        href="/account"
                        onClick={() =>
                          setProfileMenuOpen(
                            false,
                          )
                        }
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("nav.profileLabel")}
                      </Link>

                      <div className="my-1 border-t border-border" />

                      <button
                        type="button"
                        onClick={async () => {
                          setProfileMenuOpen(false);

                          await logout();

                          router.replace("/");

                          router.refresh();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <LogOut className="h-4 w-4 text-muted-foreground" />
                        {t("dashboard.logout")}
                      </button>
                    </>

                  </div>
                )}

              </div>

            </div>

            {/* ==================================================
                MOBILE ACTIONS
            ================================================== */}

            <div className="lg:hidden flex items-center gap-1.5">

              <button
                type="button"
                className="p-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-foreground"
                onClick={() =>
                  setSearchOpen(true)
                }
                aria-label={t('a11y.searchProducts')}
              >
                <Search className="h-4 w-4" />
              </button>

              {/* MOBILE CART */}

              <Link
                href="/cart"
                className="relative p-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-foreground"
                aria-label={t('a11y.cart')}
              >

                <ShoppingBag className="h-4 w-4" />

                {displayCartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground px-1 shadow-[0_1px_2px_rgba(200,169,110,0.4)]">
                    {displayCartCount}
                  </span>
                )}

              </Link>

              {/* MOBILE MENU */}

              <button
                type="button"
                className="p-2.5 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-foreground"
                onClick={() =>
                  setMobileOpen(!mobileOpen)
                }
                aria-label={t('a11y.toggleMenu')}
                aria-expanded={mobileOpen}
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

      {/* ======================================================
          MOBILE BACKDROP
      ====================================================== */}

      <div
        className={`fixed inset-0 z-[59] lg:hidden transition-all duration-[var(--duration-base)] ${
          mobileOpen
            ? "bg-foreground/45 backdrop-blur-[4px] pointer-events-auto"
            : "bg-transparent pointer-events-none"
        }`}
        onClick={() =>
          setMobileOpen(false)
        }
        aria-hidden={!mobileOpen}
      />

      {/* ======================================================
          MOBILE DRAWER
      ====================================================== */}

      <div
        className={`fixed top-0 right-0 h-full w-[310px] bg-card z-[60] lg:hidden flex flex-col shadow-[var(--shadow-2xl)] border-l border-border/50 transition-transform duration-[var(--duration-slow)] ${
          mobileOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
        style={{
          fontFamily: "'DM Sans', sans-serif",
        }}
      >

        {/* DRAWER HEADER */}

        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">

          <Link
            href="/"
            onClick={() =>
              setMobileOpen(false)
            }
            className="flex items-center gap-2.5 group"
          >
            <Image
              src="/logo.svg"
              alt={BRAND.companyName}
              width={100}
              height={100}
              className="w-[120px] h-auto"
            />
          </Link>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            className="p-2 rounded-[var(--radius-md)] hover:bg-secondary transition-colors text-muted-foreground"
            aria-label={t('a11y.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* DRAWER NAV */}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">

          {navLinks.map((link) => {

            const isActive =
              isActivePath(link.href);

            return link.children ? (
              <div key={link.label}>

                <button
                  type="button"
                  onClick={() =>
                    setMobileExpanded(
                      mobileExpanded ===
                        link.label
                        ? null
                        : link.label,
                    )
                  }
                  className={`w-full flex items-center justify-between px-3 py-3 text-[15px] font-medium rounded-[var(--radius-lg)] ${
                    isActive
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >

                  {link.label}

                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      mobileExpanded ===
                      link.label
                        ? "rotate-180"
                        : ""
                    }`}
                  />

                </button>

                {mobileExpanded ===
                  link.label && (
                    <div className="ml-2 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-2">

                      {link.children.map(
                        (child) => (
                          <Link
                            key={
                              child.label
                            }
                            href={
                              child.href
                            }
                            onClick={() =>
                              setMobileOpen(
                                false,
                              )
                            }
                            className={`block px-3 py-2.5 text-sm rounded-[var(--radius-md)] ${
                              isActivePath(
                                child.href,
                              )
                                ? "text-primary"
                                : "text-foreground"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ),
                      )}

                    </div>
                  )}

              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={`block px-3 py-3 text-[15px] font-medium rounded-[var(--radius-lg)] ${
                  isActive
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

        </div>

        {/* DRAWER FOOTER */}

        <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border space-y-2">

          {/* LANGUAGE */}

          <div>

            <button
              type="button"
              onClick={() =>
                setLangOpen(!langOpen)
              }
              className="w-full flex items-center justify-center px-3 py-3 rounded-[var(--radius-lg)] hover:bg-secondary"
              aria-label={t('a11y.selectLanguage')}
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
            </button>

            {langOpen && (
              <div className="mt-1 mx-2 bg-secondary rounded-[var(--radius-xl)] border border-border p-1.5">

                {Object.entries(langMeta).map(
                  ([code, meta]) => (
                    <button
                      type="button"
                      key={code}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-md)] text-sm ${
                        selectedLang === code
                          ? "bg-card text-primary font-semibold"
                          : "hover:bg-card text-foreground"
                      }`}
                      onClick={() => {
                        setLang(code);

                        if (
                          typeof window !==
                          "undefined"
                        ) {
                          localStorage.setItem(
                            "himmat_lang",
                            code,
                          );
                        }

                        setLangOpen(false);
                      }}
                    >

                      <span className="flex items-center gap-2.5">

                        <span className="inline-flex items-center gap-1">

                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-foreground text-background text-[9px] font-bold min-w-[22px]">
                            {meta.country}
                          </span>

                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                            {meta.code}
                          </span>

                        </span>

                        <span>
                          {meta.name}
                        </span>

                      </span>

                      {selectedLang ===
                        code && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}

                    </button>
                  ),
                )}

                <div className="h-px bg-border my-1.5" />

                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                  {t('nav.currencyDropdown') !== 'nav.currencyDropdown' ? t('nav.currencyDropdown') : 'Currency'}
                </p>

                <select
                  value={selectedCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 mb-1.5 rounded-[var(--radius-md)] text-sm bg-card text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  aria-label={t('a11y.selectCurrency') !== 'a11y.selectCurrency' ? t('a11y.selectCurrency') : 'Select currency'}
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code} — {CURRENCY_NAMES[code]}
                    </option>
                  ))}
                </select>

                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-3 pt-1 pb-2">
                  {t('nav.countryDropdown') !== 'nav.countryDropdown' ? t('nav.countryDropdown') : 'Country'}
                </p>

                <select
                  value={selectedCountry}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] text-sm bg-card text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  aria-label={t('a11y.selectCountry') !== 'a11y.selectCountry' ? t('a11y.selectCountry') : 'Select country'}
                >
                  {COUNTRY_LIST.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>

              </div>
            )}

          </div>

          {!showLoggedInState && (
            <Link
              href="/customer-auth?mode=signup"
              onClick={() =>
                setMobileOpen(false)
              }
              className="inline-flex items-center justify-center gap-2 w-full h-11 px-4 text-sm font-semibold rounded-[var(--radius-lg)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <User className="h-4 w-4 opacity-80" />
              {t("nav.signupLabel")}
            </Link>
          )}

          {showLoggedInState && (
            <Link
              href="/account"
              onClick={() =>
                setMobileOpen(false)
              }
              className="inline-flex items-center justify-center gap-2 w-full h-11 px-4 text-sm font-semibold rounded-[var(--radius-lg)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <User className="h-4 w-4 opacity-80" />
              {t("nav.myAccountLabel")}
            </Link>
          )}

        </div>

      </div>

      {/* ======================================================
          SEARCH MODAL
      ====================================================== */}

      {searchOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-foreground/50 backdrop-blur-[4px]"
            onClick={() =>
              setSearchOpen(false)
            }
          />

          <div className="fixed top-0 left-0 right-0 z-[101] flex justify-center px-4 pt-[88px] sm:pt-[110px]">

            <div
              className="w-full max-w-2xl bg-card rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] border border-border overflow-hidden"
              style={{
                fontFamily:
                  "'DM Sans', sans-serif",
              }}
            >

              {/* SEARCH INPUT */}

              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">

                <Search className="h-5 w-5 text-primary shrink-0" />

                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder={t('nav.searchPlaceholder')}
                  className="flex-1 text-[1.0625rem] text-foreground placeholder:text-muted-foreground/70 outline-none bg-transparent"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery("")
                    }
                    className="shrink-0 p-1.5 rounded-full hover:bg-secondary"
                    aria-label={t('a11y.clearSearch')}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}

                <div className="w-px h-5 bg-border shrink-0" />

                <button
                  type="button"
                  onClick={() =>
                    setSearchOpen(false)
                  }
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] bg-secondary border border-border"
                  aria-label={t('a11y.closeSearch')}
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>

              </div>

              {/* SEARCH BODY */}

              <div className="max-h-[60vh] overflow-y-auto">

                {/* RESULTS */}

                {searchResults.length > 0 && (
                  <div className="p-3">

                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 py-1.5 mb-1">
                      Products —{" "}
                      {searchResults.length}{" "}
                      found
                    </p>

                    {searchResults.map(
                      (product) => (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() =>
                            handleResultClick(
                              product.id,
                            )
                          }
                          className="w-full flex items-center gap-4 px-3 py-3 rounded-[var(--radius-lg)] hover:bg-secondary transition-colors group text-left"
                        >

                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                            className="w-12 h-12 rounded-[var(--radius-lg)] object-cover shrink-0 bg-secondary"
                          />

                          <div className="flex-1 min-w-0">

                            <p
                              className="font-semibold text-foreground text-[0.9375rem] group-hover:text-primary truncate"
                              style={{
                                fontFamily:
                                  "'Playfair Display', serif",
                              }}
                            >
                              {
                                product.name
                              }
                            </p>

                            <div className="flex items-center gap-1.5 mt-0.5">

                              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                {
                                  product.productLine
                                }
                              </span>

                              <span className="text-border text-xs">
                                ·
                              </span>

                              <span className="text-xs text-muted-foreground">
                                {
                                  product.type
                                }
                              </span>

                              <span className="text-border text-xs">
                                ·
                              </span>

                              <span className="text-xs text-muted-foreground">
                                {
                                  product.origin
                                }
                              </span>

                            </div>

                          </div>

                          <div className="shrink-0 text-right">

                            <p className="font-semibold text-primary text-sm">
                              {formatPrice(
                                product.price,
                              )}
                            </p>

                            <ArrowRight className="h-3.5 w-3.5 text-accent ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-all" />

                          </div>

                        </button>
                      ),
                    )}

                    <Link
                      href="/products"
                      onClick={() =>
                        setSearchOpen(false)
                      }
                      className="flex items-center justify-center gap-2 mt-2 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-[var(--radius-lg)]"
                    >
                      Browse all teas
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                  </div>
                )}

                {/* NO RESULTS */}

                {searchQuery.trim().length >
                  0 &&
                  searchResults.length ===
                    0 && (
                    <div className="px-6 py-12 text-center">

                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-8 w-8 text-primary/60" />
                      </div>

                      <p
                        className="font-semibold text-foreground mb-1 text-[1.0625rem]"
                        style={{
                          fontFamily:
                            "'Playfair Display', serif",
                        }}
                      >
                        {t('nav.noTeasFoundPrefix')}{searchQuery}{t('nav.noTeasFoundSuffix')}
                      </p>

                      <p className="text-sm text-muted-foreground mb-5">
                        {t('nav.trySearchSuggestions')}
                      </p>

                      <Button
                        asChild
                        variant="elevated"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          setSearchOpen(false)
                        }
                      >
                        <Link href="/products">
                          {t('nav.viewAllTeas')}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>

                    </div>
                  )}

                {/* DEFAULT SEARCH */}

                {searchQuery.trim().length ===
                  0 && (
                  <div className="p-4 space-y-5">

                    <div>

                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 mb-3">
                        {t('nav.browseByCategory')}
                      </p>

                      <div className="grid grid-cols-2 gap-2">

                        {QUICK_LINKS.map(
                          ({
                            icon: Icon,
                            labelKey,
                            href,
                          }) => (
                            <Link
                              key={labelKey}
                              href={href}
                              onClick={() =>
                                setSearchOpen(
                                  false,
                                )
                              }
                              className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] bg-secondary hover:bg-primary/5 border border-border/40 hover:border-primary/25 transition-all group"
                            >

                              <span className="w-9 h-9 rounded-[var(--radius-md)] bg-card flex items-center justify-center shadow-[var(--shadow-xs)] border border-border/60 group-hover:bg-primary transition-colors shrink-0">
                                <Icon className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                              </span>

                              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                                {t(labelKey)}
                              </span>

                            </Link>
                          ),
                        )}

                      </div>

                    </div>

                    <div>

                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold px-2 mb-2.5">
                        {t('nav.trendingSearches')}
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
                            type="button"
                            key={term}
                            onClick={() =>
                              setSearchQuery(
                                term,
                              )
                            }
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary border border-border/50 text-sm text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
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

      {/* ======================================================
          AUTH MODAL
      ====================================================== */}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() =>
          setAuthModalOpen(false)
        }
      />
    </>
  );
}