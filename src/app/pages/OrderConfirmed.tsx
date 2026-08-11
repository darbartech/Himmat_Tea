'use client';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { CheckCircle2, QrCode, Copy, Check, ChevronRight, ShoppingBag, Clock, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

type OrderItemT = {
  id?: string;
  orderId?: string;
  productId: number;
  variantId?: number | null;
  productName: string;
  quantity: number;
  weight?: string;
  price?: number;
  amount?: number;
};

type PaymentT = {
  method: string;
  status: string;
  amount: number;
  transactionReference?: string | null;
};

type OrderT = {
  id: string;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  total: number;
  shippingCost: number;
  tax: number;
  grandTotal: number;
  status: string;
  orderDate: string;
  trackingNumber?: string | null;
  courierPartner?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemT[];
  payment: PaymentT | null;
};

type SettingsT = {
  qrImageUrl?: string | null;
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  currency: string;
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    AWAITING_PAYMENT: 'bg-amber-100 text-amber-800 border-amber-200',
    CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    SHIPPED: 'bg-sky-100 text-sky-800 border-sky-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    REFUNDED: 'bg-rose-100 text-rose-800 border-rose-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Shipped: 'bg-sky-100 text-sky-800 border-sky-200',
    Delivered: 'bg-green-100 text-green-800 border-green-200',
    Cancelled: 'bg-red-100 text-red-800 border-red-200',
    Refunded: 'bg-rose-100 text-rose-800 border-rose-200',
  };
  return map[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

function displayStatus(status: string) {
  const map: Record<string, string> = {
    AWAITING_PAYMENT: 'Awaiting Payment',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    Pending: 'Pending',
    Processing: 'Processing',
    Shipped: 'Shipped',
    Delivered: 'Delivered',
    Cancelled: 'Cancelled',
    Refunded: 'Refunded',
  };
  return map[status] || status;
}

export default function OrderConfirmed() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <Navigation />
          <main className="pt-[180px] pb-24">
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
                <div className="w-5 h-5 rounded-full border-2 border-[#2d5a3d]/30 border-t-[#2d5a3d] animate-spin" />
                <p className="text-sm text-[#78746e]">Loading your order…</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <OrderConfirmedInner />
    </Suspense>
  );
}

function OrderConfirmedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderRef = searchParams.get('ref');

  const [order, setOrder] = useState<OrderT | null>(null);
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedOrderNum, setCopiedOrderNum] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orderRef) {
          setError('No order reference. Please complete checkout again.');
          return;
        }

        const decoded = decodeURIComponent(orderRef);
        const isCuid = decoded.length > 10 && !decoded.startsWith('HT-');
        interface ApiEnvelope { success?: boolean; data?: unknown; message?: string }
        let orderRes: ApiEnvelope | OrderT | null = null;

        try {
          orderRes = await api.get<ApiEnvelope | OrderT>(`/orders/${decoded}`);
        } catch (err: unknown) {
          if (err instanceof ApiError && err.status === 404 && isCuid === false && decoded.startsWith('HT-') === false) {
            setError('We could not locate your order.');
            return;
          }
          throw err;
        }

        if (!cancelled) {
          if ((orderRes as ApiEnvelope)?.success && (orderRes as ApiEnvelope).data) {
            setOrder((orderRes as ApiEnvelope).data as OrderT);
          } else if (orderRes && !(orderRes as ApiEnvelope).success && (orderRes as ApiEnvelope).message) {
            setError((orderRes as ApiEnvelope).message || 'We could not locate your order.');
            return;
          } else if (orderRes) {
            setOrder(orderRes as OrderT);
          }
        }

        try {
          const sres = await api.get<ApiEnvelope | SettingsT>('/settings');
          if (!cancelled && (sres as ApiEnvelope)?.success && (sres as ApiEnvelope).data) {
            setSettings((sres as ApiEnvelope).data as SettingsT);
          } else if (!cancelled && sres) {
            setSettings(sres as SettingsT);
          }
        } catch (_) { /* noop - optional */ }
      } catch (err: unknown) {
        console.error('Order confirmed fetch error:', err);
        setError(
          err instanceof ApiError
            ? err.status === 401
              ? 'Please sign in to view your order details.'
              : err.status === 404
                ? 'We could not locate your order.'
                : (err.message || 'We could not load your order.')
            : 'A network error occurred. Please try again.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderRef, router]);

  const copyOrderNum = async () => {
    if (!order) return;
    try {
      if (navigator.clipboard && 'writeText' in navigator.clipboard) {
        await navigator.clipboard.writeText(order.orderNumber);
      }
      setCopiedOrderNum(true);
      setTimeout(() => setCopiedOrderNum(false), 1800);
    } catch (_) { /* noop */ }
  };

  const paymentStatus = order?.payment?.status;
  const stillNeedsPayment =
    order?.status === 'AWAITING_PAYMENT' ||
    order?.status === 'Pending' ||
    paymentStatus === 'PENDING';

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {loading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
                <div className="w-5 h-5 rounded-full border-2 border-[#2d5a3d]/30 border-t-[#2d5a3d] animate-spin" />
                <p className="text-sm text-[#78746e]">Loading your order…</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
                <AlertTriangle className="h-14 w-14 text-red-600 mx-auto mb-5" />
                <h1 className="text-2xl font-semibold text-[#1c1917] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Could not load order
                </h1>
                <p className="text-[#78746e] mb-8">{error}</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
                  >
                    Continue Shopping
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && order && (
            <>
              <div className="flex items-start gap-4 mb-8">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#2d5a3d]/10 flex items-center justify-center">
                  {stillNeedsPayment ? (
                    <Clock className="h-7 w-7 text-[#2d5a3d]" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-[#2d5a3d]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-2">
                    {stillNeedsPayment ? 'Payment Required' : 'Order Received'}
                  </p>
                  <h1
                    className="text-[clamp(1.8rem,4vw,2.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Thank you, {order.customerName.split(' ')[0]}.
                  </h1>
                  <p className="text-[#78746e] leading-relaxed max-w-2xl">
                    {stillNeedsPayment
                      ? 'Your order has been placed. Please complete the QR transfer below, quoting your order number in the payment remark, so we can confirm and ship it.'
                      : 'Your order has been confirmed. We will notify you when it is processing and on the way.'}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-5">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-[#78746e] font-semibold mb-1">
                    Order Number
                  </p>
                  <button
                    onClick={copyOrderNum}
                    className="inline-flex items-center gap-2 group"
                  >
                    <p className="font-mono text-lg font-semibold text-[#1c1917] tracking-wide group-hover:text-[#2d5a3d] transition-colors">
                      {order.orderNumber}
                    </p>
                    {copiedOrderNum ? (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="h-4 w-4 text-[#78746e] group-hover:text-[#2d5a3d] transition-colors shrink-0" />
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border ${statusBadge(order.status)}`}>
                    Order: {displayStatus(order.status)}
                  </span>
                  {order.payment && (
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border ${statusBadge(order.payment.status)}`}>
                      Payment: {displayStatus(order.payment.status)}
                    </span>
                  )}
                </div>
              </div>

              {stillNeedsPayment && (
                <div className="mb-8 rounded-2xl border border-[#c8a96e]/30 bg-gradient-to-br from-[#fff9ee] via-[#fffdf6] to-white p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#c8a96e]/15 flex items-center justify-center shrink-0">
                      <QrCode className="h-6 w-6 text-[#8a6a2f]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-[#1c1917] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Make the transfer with this order number
                      </h2>
                      <p className="text-sm text-[#6f5e3d] leading-relaxed mb-5">
                        Scan the QR code with any bank app, eSewa, Khalti, or your digital wallet. When prompted for a note or remark, paste order number{' '}
                        <button
                          onClick={copyOrderNum}
                          className="font-mono font-semibold text-[#8a6a2f] underline decoration-dotted"
                        >
                          {order.orderNumber}
                        </button>
                        . Admin will confirm within a few hours on business days.
                      </p>

                      <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                        <div className="mx-auto md:mx-0">
                          {!qrFailed ? (
                            <div className="bg-white border border-[#c8a96e]/30 rounded-2xl p-4 inline-block shadow-sm">
                              <img
                                src={settings?.qrImageUrl || '/payment-qr.png'}
                                alt={`${settings?.storeName || 'Himmat Tea'} payment QR`}
                                className="w-56 h-56 object-contain rounded-xl bg-white"
                                onError={(e) => {
                                  const el = e.currentTarget as HTMLImageElement;
                                  const fallback = '/payment-qr.png';
                                  if (el.getAttribute('data-fallback-tried') === '1') {
                                    setQrFailed(true);
                                  } else {
                                    el.setAttribute('data-fallback-tried', '1');
                                    el.src = fallback;
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-56 h-56 bg-white border border-[#c8a96e]/30 rounded-2xl flex flex-col items-center justify-center text-center p-5 shadow-sm">
                              <QrCode className="h-12 w-12 text-[#c8a96e]/60 mb-3" />
                              <p className="text-xs text-[#78746e] leading-relaxed">
                                QR code not yet configured.
                                <br />
                                Please pay using the bank details listed on the right.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl border border-[rgba(28,25,23,0.08)] p-4">
                              <p className="text-[11px] uppercase tracking-widest text-[#78746e] font-semibold mb-1.5">
                                Amount
                              </p>
                              <p className="text-xl font-bold text-[#1c1917]">
                                {settings?.currency || 'Rs.'}&nbsp;{order.grandTotal.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-white rounded-xl border border-[rgba(28,25,23,0.08)] p-4">
                              <p className="text-[11px] uppercase tracking-widest text-[#78746e] font-semibold mb-1.5">
                                Remark
                              </p>
                              <p className="font-mono text-sm font-semibold text-[#1c1917] break-all">
                                {order.orderNumber}
                              </p>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border border-[rgba(28,25,23,0.08)] p-4">
                            <p className="text-[11px] uppercase tracking-widest text-[#78746e] font-semibold mb-2.5">
                              Where to send
                            </p>
                            <ul className="text-sm text-[#1c1917] space-y-1.5">
                              <li className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-[#2d5a3d] shrink-0" />
                                <span className="font-semibold">{settings?.storeName || 'Himmat Tea'}</span>
                              </li>
                              {settings?.storePhone && (
                                <li className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-[#2d5a3d]/10 text-[#2d5a3d] text-[10px] font-bold flex items-center justify-center shrink-0">P</span>
                                  <span className="text-[#78746e]">{settings.storePhone}</span>
                                </li>
                              )}
                              {settings?.storeEmail && (
                                <li className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-[#2d5a3d]/10 text-[#2d5a3d] text-[10px] font-bold flex items-center justify-center shrink-0">E</span>
                                  <span className="text-[#78746e]">{settings.storeEmail}</span>
                                </li>
                              )}
                            </ul>
                          </div>

                          <p className="text-xs text-[#78746e] leading-relaxed">
                            After the transfer is complete, no further action is required. You can close this page.
                            We will send a confirmation email/SMS once admin verifies your payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-[#2d5a3d]/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-4 w-4 text-[#2d5a3d]" />
                      </div>
                      <h2 className="font-semibold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Items ({order.items.length})
                      </h2>
                    </div>
                    <div className="divide-y divide-[rgba(28,25,23,0.06)]">
                      {order.items.map((it, idx) => {
                        const unit = it.price ?? (it.amount ? it.amount / Math.max(it.quantity, 1) : 0);
                        const lineTotal = it.amount ?? (unit * it.quantity);
                        return (
                          <div key={(it.id || idx) + ''} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-[#2d5a3d] text-white flex items-center justify-center shrink-0 font-serif text-sm">
                              {(it.productName || ' ')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1c1917] truncate">{it.productName}</p>
                              <p className="text-xs text-[#78746e]">
                                {it.weight ? `${it.weight} · ` : ''}Qty {it.quantity}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-[#1c1917]">
                                {settings?.currency || 'Rs.'}&nbsp;{Math.round(lineTotal).toLocaleString()}
                              </p>
                              {unit > 0 && (
                                <p className="text-xs text-[#78746e]">
                                  {settings?.currency || 'Rs.'}&nbsp;{Math.round(unit).toLocaleString()} each
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6">
                      <h3 className="font-semibold text-[#1c1917] mb-4 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Shipping To
                      </h3>
                      <p className="text-sm font-medium text-[#1c1917] mb-1">{order.customerName}</p>
                      <p className="text-sm text-[#78746e] mb-2">{order.customerPhone}</p>
                      <p className="text-sm text-[#78746e] leading-relaxed break-words whitespace-pre-line">
                        {order.shippingAddress}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6">
                      <h3 className="font-semibold text-[#1c1917] mb-4 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Timeline
                      </h3>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#2d5a3d] mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[#1c1917] font-medium">Order placed</p>
                            <p className="text-xs text-[#78746e]">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </li>
                        {(order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#2d5a3d] mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#1c1917] font-medium">Payment confirmed</p>
                              <p className="text-xs text-[#78746e]">Order status: {displayStatus(order.status)}</p>
                            </div>
                          </li>
                        )}
                        {(order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#2d5a3d] mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#1c1917] font-medium">Processing at warehouse</p>
                              <p className="text-xs text-[#78746e]">Preparing your shipment</p>
                            </div>
                          </li>
                        )}
                        {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#2d5a3d] mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#1c1917] font-medium">
                                {order.courierPartner ? `Shipped via ${order.courierPartner}` : 'Shipped'}
                              </p>
                              {order.trackingNumber && (
                                <p className="text-xs text-[#78746e] font-mono">{order.trackingNumber}</p>
                              )}
                            </div>
                          </li>
                        )}
                        {order.status === 'DELIVERED' && (
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#1c1917] font-medium">Delivered</p>
                              <p className="text-xs text-[#78746e]">Enjoy your Himmat Tea!</p>
                            </div>
                          </li>
                        )}
                        {(order.status === 'CANCELLED' || order.status === 'Cancelled' || order.status === 'REFUNDED' || order.status === 'Refunded') && (
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#1c1917] font-medium">{displayStatus(order.status)}</p>
                              <p className="text-xs text-[#78746e]">Contact support for more info.</p>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 sticky top-32">
                    <h2 className="font-semibold text-[#1c1917] mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Summary
                    </h2>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>Subtotal</span>
                        <span>{settings?.currency || 'Rs.'}&nbsp;{Math.round(order.total).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>Shipping</span>
                        <span className={order.shippingCost > 0 ? 'text-[#1c1917] font-medium' : 'text-[#2d5a3d] font-medium'}>
                          {order.shippingCost > 0
                            ? `${settings?.currency || 'Rs.'} ${Math.round(order.shippingCost).toLocaleString()}`
                            : 'Free'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>Tax</span>
                        <span>{settings?.currency || 'Rs.'}&nbsp;{Math.round(order.tax).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-px bg-[rgba(28,25,23,0.08)] mb-4" />
                    <div className="flex justify-between items-baseline mb-6">
                      <span className="text-[#78746e] text-sm">Grand Total</span>
                      <span className="text-xl font-bold text-[#1c1917]">
                        {settings?.currency || 'Rs.'}&nbsp;{Math.round(order.grandTotal).toLocaleString()}
                      </span>
                    </div>

                    {order.payment && (
                      <div className="pt-5 border-t border-[rgba(28,25,23,0.08)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-widest text-[#78746e] font-semibold">
                            Payment
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border ${statusBadge(order.payment.status)}`}>
                            {displayStatus(order.payment.status)}
                          </span>
                        </div>
                        <p className="text-sm text-[#1c1917]">
                          Method: <span className="font-medium">{order.payment.method === 'MANUAL_QR' ? 'Manual QR Transfer' : order.payment.method}</span>
                        </p>
                        {order.payment.transactionReference && (
                          <p className="text-xs text-[#78746e] mt-1 font-mono break-all">
                            {order.payment.transactionReference}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-6 space-y-2">
                      <Link
                        href="/shop"
                        className="block text-center w-full px-5 py-3 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
                      >
                        Continue Shopping
                      </Link>
                      <Link
                        href="/customer-account?tab=orders"
                        className="block text-center w-full px-5 py-3 bg-white border border-[rgba(28,25,23,0.12)] text-[#1c1917] font-semibold rounded-xl hover:bg-[#f9f7f4] transition-colors"
                      >
                        View my orders
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
