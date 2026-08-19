'use client';

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  Bell,
  BellOff,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Home,
  Trash2,
  Eye,
  BookOpen,
  Tag,
  Star,
  Warehouse,
  FileText,
  Shield,
  Check,
  Image,
  HelpCircle,
  ChefHat,
  Layers,
  BriefcaseBusiness,
  ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api-client";
import Images from "next/image";
import {
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  playNotificationSound,
} from "@/lib/sound";

interface LiveNotification {
  id: number;
  title: string;
  message: string;
  orderId: string;
  timestamp: string;
  read: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t, lang: selectedLang, setLang } = useTranslation();
  const { logout, currentUser, userType } = useAuth();
  const { orders, addOrder, products } = useStore();
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);
  const [soundMuted, setSoundMuted] = useState(true);
  const lastSeenTimestampRef = useRef<number>(0);
  const isFirstPollRef = useRef(true);
  const router = useRouter();

  // Load persisted mute preference on mount (defaults to muted until explicitly enabled)
  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
  }, []);

  const toggleSoundMuted = () => {
    setSoundMuted((prev) => {
      const next = !prev;
      setNotificationSoundMuted(next);
      return next;
    });
  };

  const newOrdersCount = useMemo(() => {
    if (!Array.isArray(orders)) return 0;
    const newStatuses = new Set(["AWAITING_PAYMENT", "CONFIRMED", "Pending", "Processing", "PROCESSING"]);
    return orders.filter((o: any) => {
      const created = new Date(o.createdAt || o.orderDate || Date.now());
      const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      return newStatuses.has(o.status) && ageHours < 48;
    }).length;
  }, [orders]);

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const result = await api.get<{ success: boolean; data: LiveNotification[] }>('/admin/notifications');
        if (!cancelled && result?.success && Array.isArray(result.data)) {
          const incoming = result.data;

          if (isFirstPollRef.current) {
            // Establish the baseline on the initial load without playing a sound.
            isFirstPollRef.current = false;
            const latest = incoming.reduce(
              (max, n) => Math.max(max, new Date(n.timestamp).getTime() || 0),
              0,
            );
            lastSeenTimestampRef.current = latest;
          } else {
            const newestInBatch = incoming.reduce(
              (max, n) => Math.max(max, new Date(n.timestamp).getTime() || 0),
              0,
            );
            const hasNewNotifications = incoming.some(
              (n) => (new Date(n.timestamp).getTime() || 0) > lastSeenTimestampRef.current,
            );
            if (hasNewNotifications) {
              // Play once per poll batch, regardless of how many notifications arrived.
              playNotificationSound();
            }
            if (newestInBatch > lastSeenTimestampRef.current) {
              lastSeenTimestampRef.current = newestInBatch;
            }
          }

          setLiveNotifications(incoming);
        }
      } catch (_err) {
        // silent — transient errors, will retry on next interval
      }
    };
    fetchNotifications();
    const id = setInterval(fetchNotifications, 25_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const markNotificationRead = async (id: number) => {
    try {
      await api.patch('/admin/notifications', { id });
      setLiveNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (_err) { /* noop */ }
  };

  const clearNotifications = async () => {
    try {
      await api.delete('/admin/notifications');
      setLiveNotifications([]);
    } catch (_err) { /* noop */ }
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete('/admin/notifications', { data: { id } });
      setLiveNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_err) { /* noop */ }
  };
  const notifications = liveNotifications;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const navigation = [
    { 
      name: t("dashboard.nav.dashboard"), 
      href: "/himmat_admin_8526/dashboard", 
      icon: LayoutDashboard 
    },
    { 
      name: t("dashboard.nav.inventory"), 
      href: "/himmat_admin_8526/dashboard/inventory", 
      icon: Warehouse 
    },
    { 
      name: t("dashboard.nav.products"), 
      href: "/himmat_admin_8526/dashboard/products", 
      icon: Package 
    },
    { 
      name: t("dashboard.nav.productLines"), 
      href: "/himmat_admin_8526/dashboard/product-lines", 
      icon: Layers 
    },
    { 
      name: t("dashboard.nav.heroVisuals"), 
      href: "/himmat_admin_8526/dashboard/hero-visuals", 
      icon: Image 
    },
    { 
      name: t("dashboard.nav.faqs"), 
      href: "/himmat_admin_8526/dashboard/faqs", 
      icon: HelpCircle 
    },
 { 
  name: t("dashboard.nav.brewingGuides"), 
  href: "/himmat_admin_8526/dashboard/brewing-guides", 
  icon: ChefHat 
},
{ 
  name: t("dashboard.nav.careers"), 
  href: "/himmat_admin_8526/dashboard/careers", 
  icon: BriefcaseBusiness 
},
{ 
  name: t("dashboard.nav.careerApplications"), 
  href: "/himmat_admin_8526/dashboard/career-applications", 
  icon: ClipboardList 
},
{ 
  name: t("dashboard.nav.collections"), 
  href: "/himmat_admin_8526/dashboard/collections", 
  icon: LayoutDashboard 
},
    { 
      name: t("dashboard.nav.orders"), 
      href: "/himmat_admin_8526/dashboard/orders", 
      icon: ShoppingBag,
      badge: newOrdersCount > 0 ? newOrdersCount : undefined
    },
    { 
      name: t("dashboard.nav.purchaseOrders"), 
      href: "/himmat_admin_8526/dashboard/purchase-orders", 
      icon: FileText 
    },
    { 
      name: t("dashboard.nav.customers"), 
      href: "/himmat_admin_8526/dashboard/customers", 
      icon: Users 
    },
    { 
      name: t("dashboard.nav.coupons"), 
      href: "/himmat_admin_8526/dashboard/coupons", 
      icon: Tag 
    },
    { 
      name: t("dashboard.nav.reviews"), 
      href: "/himmat_admin_8526/dashboard/reviews", 
      icon: Star 
    },
    { 
      name: t("dashboard.nav.blog"), 
      href: "/himmat_admin_8526/dashboard/blog", 
      icon: BookOpen 
    },
    { 
      name: t("dashboard.nav.analytics"), 
      href: "/himmat_admin_8526/dashboard/analytics", 
      icon: BarChart3 
    },
    ...(userType === "admin" && (currentUser as any)?.role === "superadmin" ? [
      { 
        name: t("dashboard.nav.adminUsers"), 
        href: "/himmat_admin_8526/dashboard/admin-users", 
        icon: Shield 
      }
    ] : []),
    { 
      name: t("dashboard.nav.settings"), 
      href: "/himmat_admin_8526/dashboard/settings", 
      icon: Settings 
    },
  ];

  const isActive = (path: string) => {
    if (path === "/himmat_admin_8526/dashboard") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <style>
        {`
          .dashboard-sidebar-scroll::-webkit-scrollbar {
            display: none;
          }
          .dashboard-sidebar-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#2d5a3d]/10 shadow-sm">
        <div className="h-16 px-4 sm:h-20 sm:px-6 flex items-center justify-between">
          {/* Left Section - Logo & Menu Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden p-2 rounded-lg hover:bg-[#f0ede8] transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-6 w-6 text-[#1c1917]" /> : <Menu className="h-6 w-6 text-[#1c1917]" />}
            </Button>
            <Link 
              href="/himmat_admin_8526/dashboard" 
              className="flex items-center gap-3"
            >
                  <Images
              src="/logo.svg"
              alt={"GodGifted"}
              width={100}
              height={100}
              className="w-[100px] sm:w-[150px] h-[100%]"
             
            />
            </Link>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back to Website */}
            <Link 
              href="/" 
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-[#1c1917] hover:bg-[#f0ede8] transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="text-sm font-medium">{t("dashboard.viewWebsite")}</span>
            </Link>

            {/* Language Toggle */}
            <div ref={langDropdownRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex cursor-pointer items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-[#f0ede8] transition-colors text-[#1c1917]"
              >
                <span className="inline-flex cursor-pointer items-center justify-center px-1.5 py-0.5 rounded-md bg-[#1c1917] text-white text-[9.5px] font-bold tracking-[0.08em] min-w-[22px]">
                  {langMeta[selectedLang].country}
                </span>
                <span className="text-[11px] font-semibold text-[#78746e] uppercase tracking-wide">
                  {langMeta[selectedLang].code}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-[#78746e] transition-transform duration-200 ${
                    langOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {langOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[rgba(28,25,23,0.08)] py-1.5 px-1.5 min-w-[190px] z-50">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#78746e] font-semibold px-3 pt-1 pb-2">
                    {t("dashboard.language")}
                  </p>
                  {Object.entries(langMeta).map(([code, meta]) => (
                    <button
                      key={code}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedLang === code
                          ? "bg-[#f0f9f4] text-[#2d5a3d] font-semibold"
                          : "hover:bg-[#f0ede8] text-[#1c1917]"
                      }`}
                      onClick={() => {
                        setLang(code);
                        localStorage.setItem("himmat_lang", code);
                        setLangOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#1c1917] text-white text-[9px] font-bold tracking-[0.08em] min-w-[22px]">
                            {meta.country}
                          </span>
                          <span
                            className={`text-[10px] font-bold tracking-wider ${
                              selectedLang === code
                                ? "text-[#2d5a3d]"
                                : "text-[#78746e]"
                            }`}
                          >
                            {meta.code}
                          </span>
                        </span>
                        <span>{meta.name}</span>
                      </span>
                      {selectedLang === code && (
                        <Check className="h-3.5 w-3.5 text-[#2d5a3d] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sound mute toggle */}
            <button
              type="button"
              onClick={toggleSoundMuted}
              className="p-2 rounded-lg hover:bg-[#f0ede8] transition-colors text-[#1c1917]"
              aria-label={soundMuted ? "Unmute notification sound" : "Mute notification sound"}
              aria-pressed={!soundMuted}
              title={soundMuted ? "Notification sound muted" : "Notification sound on"}
            >
              {soundMuted ? (
                <BellOff className="h-5 w-5 text-[#78746e]" />
              ) : (
                <Bell className="h-5 w-5 text-[#2d5a3d]" />
              )}
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-[#f0ede8] transition-colors text-[#1c1917]">
                  <Bell className="h-5 w-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-[#c8a96e] rounded-full border border-white flex items-center justify-center text-xs font-bold text-[#1c1917]">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96">
                <div className="flex items-center justify-between p-4">
                  <DropdownMenuLabel className="font-semibold text-[#1c1917] p-0 m-0">{t("dashboard.notifications")}</DropdownMenuLabel>
                  {notifications.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={clearNotifications}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#78746e]">{t("dashboard.noNotifications")}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          onClick={() => {
                            markNotificationRead(notification.id);
                            router.push("/himmat_admin_8526/dashboard/orders");
                          }}
                          className={`p-3 rounded-lg text-sm cursor-pointer transition-colors ${
                            notification.read 
                              ? "hover:bg-[#f0ede8]" 
                              : "bg-[#f0f9f4] hover:bg-[#e8f5ed]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#1c1917]">{notification.title}</p>
                              <p className="text-[#78746e] text-xs mt-0.5">{notification.message}</p>
                              <p className="text-[#c8a96e] font-bold mt-1">{notification.orderId}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-[#2d5a3d]" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="p-1.5 rounded-md text-[#78746e] hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label={t('a11y.deleteNotification')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[#78746e] text-xs mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#f0ede8] transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-[#2d5a3d]/10">
                    <AvatarImage src="" alt={t('dashboard.adminUsers.admin')} />
                    <AvatarFallback className="bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] text-white font-semibold">
                      GG
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-[#1c1917]">{t('dashboard.adminUsers.admin')}</p>
                    <p className="text-xs text-[#78746e]">admin@godgifted.com</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#78746e] hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[#1c1917] font-semibold">{t("dashboard.myAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[#1c1917] cursor-pointer hover:bg-[#f0ede8]">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("dashboard.nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 cursor-pointer hover:bg-red-50"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("dashboard.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#1c1917]/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 sm:top-20 left-0 bottom-0 w-72 bg-white border-r border-[#2d5a3d]/10 z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full p-4">
          <nav className="flex-1 space-y-2 overflow-y-auto py-4 dashboard-sidebar-scroll">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[#2d5a3d] to-[#0b7c33] text-white shadow-md shadow-[#2d5a3d]/20"
                      : "text-[#78746e] hover:bg-[#f0f9f4] hover:text-[#1c1917]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${active ? "text-white" : "text-[#78746e]"}`} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge className={active ? "bg-white text-[#2d5a3d]" : "bg-[#c8a96e] text-[#1c1917]"}>
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-[#2d5a3d]/10">
            <div className="bg-[#f0f9f4] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-xl">☕</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c1917]">{t("dashboard.proTip")}</p>
                  <p className="text-xs text-[#78746e]">{t("dashboard.checkAnalytics")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 sm:pt-20">
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
