"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  ShoppingBag,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/currency";

import { useTranslation } from '../../context/TranslationContext';
interface OrderItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
  weight?: string | null;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  transactionReference?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
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
  items: OrderItem[];
  payment?: Payment | null;
  // Multi-currency snapshot — all of the above remain NPR (base currency,
  // and the actual amount transferred via bank/wallet QR). These are only
  // for showing the customer what they saw at checkout in their own
  // currency; they never change even if exchange rates move later.
  baseCurrency?: string;
  customerCurrency?: string;
  exchangeRate?: number;
  convertedGrandTotal?: number;
}

interface Settings {
  currency?: string;
  qrImageUrl?: string | null;
}

export default function OrderConfirmed() {
  const { t } = useTranslation();

  const searchParams = useSearchParams();
  const router = useRouter();

  const orderRef = searchParams.get("ref");

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] =
    useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currency = settings?.currency || "₹";

  const hasForeignCurrency =
    !!order?.customerCurrency &&
    order.customerCurrency !== (order.baseCurrency || "NPR") &&
    typeof order.convertedGrandTotal === "number";

  const secondaryTotalLine = order && hasForeignCurrency
    ? `≈ ${formatCurrency(order.convertedGrandTotal as number, order.customerCurrency as string)} at checkout`
    : null;

  /**
   * Load order.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderRef) {
        setError(t('orderConfirmed.referenceMissing'));
        setLoading(false);
        return;
      }

      try {
        const response: any = await api.get(
          `/orders/${encodeURIComponent(orderRef)}`
        );

        if (cancelled) return;

        const data = response?.data || response;

        if (!data) {
          throw new Error("Order not found.");
        }

        setOrder(data);
      } catch (err: any) {
        console.error(
          "Failed to load order confirmation:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load your order details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderRef]);

  /**
   * Load store settings.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response: any =
          await api.get("/settings");

        if (cancelled) return;

        const data =
          response?.data || response;

        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error(
          "Failed to load settings:",
          err
        );
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Copy order number.
   */
  const copyOrderNumber = async () => {
    if (!order?.orderNumber) return;

    try {
      await navigator.clipboard.writeText(
        order.orderNumber
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(
        "Failed to copy order number:",
        err
      );
    }
  };

  /**
   * Loading state.
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#2d5a3d] mx-auto mb-4" />

          <p className="text-sm text-[#78746e]">
            Loading your order...
          </p>
        </div>
      </main>
    );
  }

  /**
   * Error state.
   */
  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-[rgba(28,25,23,0.08)] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>

          <h1
            className="text-2xl font-semibold text-[#1c1917] mb-3"
            style={{
              fontFamily:
                "'Playfair Display', serif",
            }}
          >
            Unable to Load Order
          </h1>

          <p className="text-sm text-[#78746e] mb-7">
            {error ||
              "We could not find this order."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="px-6 py-3 rounded-xl bg-[#2d5a3d] text-white font-semibold hover:bg-[#234832] transition-colors"
            >
              Try Again
            </button>

            <Link
              href="/"
              className="px-6 py-3 rounded-xl border border-[rgba(28,25,23,0.12)] text-[#1c1917] font-semibold hover:bg-[#f9f7f4] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] px-6 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-[#2d5a3d]" />
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-[#c8a96e] font-semibold mb-3">
            Order Successfully Placed
          </p>

          <h1
            className="text-3xl md:text-4xl font-semibold text-[#1c1917] mb-4"
            style={{
              fontFamily:
                "'Playfair Display', serif",
            }}
          >
            Thank You, {order.customerName}
          </h1>

          <p className="text-[#78746e] max-w-xl mx-auto">
            Your order has been received successfully.
            Please complete the payment using the QR
            code below. Our team will verify your payment
            shortly.
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.08)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#78746e] mb-1">
                Order Number
              </p>

              <p className="text-xl font-bold text-[#2d5a3d]">
                {order.orderNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={copyOrderNumber}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(28,25,23,0.12)] text-sm font-medium text-[#1c1917] hover:bg-[#f9f7f4] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#2d5a3d]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Order Number
                </>
              )}
            </button>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-[#c8a96e]/30 overflow-hidden mb-6">
          <div className="p-5 bg-gradient-to-r from-[#fff9ee] to-[#fffdf6] border-b border-[#c8a96e]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/15 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-[#8a6a2f]" />
              </div>

              <div>
                <h2 className="font-semibold text-[#1c1917]">
                  Complete Your Payment
                </h2>

                <p className="text-xs text-[#6f5e3d]">
                  Payment status:{" "}
                  {order.payment?.status ||
                    "PENDING"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* QR */}
              <div className="flex justify-center">
                {settings?.qrImageUrl ? (
                  <div className="bg-white border border-[rgba(28,25,23,0.1)] rounded-2xl p-4">
                    <img
                      src={settings.qrImageUrl}
                      alt={t('dashboard.settings.paymentQrCode')}
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-[rgba(28,25,23,0.15)] flex flex-col items-center justify-center text-center p-6">
                    <QrCode className="h-12 w-12 text-[#78746e] mb-3" />

                    <p className="text-sm font-medium text-[#1c1917]">
                      Payment QR
                    </p>

                    <p className="text-xs text-[#78746e] mt-1">
                      QR code will be available here.
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div>
                <p className="text-sm text-[#78746e] mb-2">
                  Amount to Pay
                </p>

                <p className="text-3xl font-bold text-[#1c1917] mb-6">
                  {currency}&nbsp;
                  {order.grandTotal.toLocaleString()}
                </p>

                {secondaryTotalLine && (
                  <p className="text-xs text-[#78746e] -mt-4 mb-6">
                    {secondaryTotalLine}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78746e]">
                      Payment Method
                    </span>

                    <span className="font-medium text-[#1c1917]">
                      Bank / Wallet QR
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#78746e]">
                      Payment Status
                    </span>

                    <span className="font-medium text-[#8a6a2f]">
                      {order.payment?.status ||
                        "PENDING"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-[#f9f7f4]">
                  <p className="text-xs text-[#78746e] leading-relaxed">
                    After making the payment, use your
                    order number{" "}
                    <strong className="text-[#1c1917]">
                      {order.orderNumber}
                    </strong>{" "}
                    in the payment remark/reference.
                    Our admin team will verify the
                    payment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.08)] overflow-hidden mb-6">
          <div className="p-5 bg-[#f9f7f4] border-b border-[rgba(28,25,23,0.06)] flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-[#2d5a3d]" />

            <h2 className="font-semibold text-[#1c1917]">
              Order Items
            </h2>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[rgba(28,25,23,0.06)] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#1c1917]">
                      {item.name}
                    </p>

                    <p className="text-xs text-[#78746e] mt-1">
                      {item.weight
                        ? `${item.weight} × `
                        : ""}
                      {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold text-[#1c1917] whitespace-nowrap">
                    {currency}&nbsp;
                    {(
                      item.price * item.quantity
                    ).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[rgba(28,25,23,0.08)] mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-[#78746e]">
                <span>{t('dashboard.invoice.subtotal')}</span>

                <span>
                  {currency}&nbsp;
                  {order.total.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm text-[#78746e]">
                <span>{t('dashboard.invoice.tax')}</span>

                <span>
                  {currency}&nbsp;
                  {order.tax.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm text-[#78746e]">
                <span>{t('cart.shipping')}</span>

                <span>
                  {order.shippingCost > 0
                    ? `${currency} ${order.shippingCost.toLocaleString()}`
                    : "Free"}
                </span>
              </div>

              <div className="border-t border-[rgba(28,25,23,0.08)] pt-3 mt-3 flex justify-between text-lg font-bold text-[#1c1917]">
                <span>{t('dashboard.invoice.total')}</span>

                <span>
                  {currency}&nbsp;
                  {order.grandTotal.toLocaleString()}
                </span>
              </div>
              {secondaryTotalLine && (
                <div className="flex justify-end text-xs text-[#78746e]">
                  {secondaryTotalLine}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.08)] p-6 mb-8">
          <h2 className="font-semibold text-[#1c1917] mb-4">
            Delivery Information
          </h2>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[#78746e]">
                Name:
              </span>{" "}
              <span className="text-[#1c1917]">
                {order.customerName}
              </span>
            </p>

            <p>
              <span className="text-[#78746e]">
                Email:
              </span>{" "}
              <span className="text-[#1c1917]">
                {order.customerEmail}
              </span>
            </p>

            <p>
              <span className="text-[#78746e]">
                Phone:
              </span>{" "}
              <span className="text-[#1c1917]">
                {order.customerPhone}
              </span>
            </p>

            <p>
              <span className="text-[#78746e]">
                Address:
              </span>{" "}
              <span className="text-[#1c1917]">
                {order.shippingAddress}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#2d5a3d] text-white font-semibold hover:bg-[#234832] transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/account"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-[rgba(28,25,23,0.12)] text-[#1c1917] font-semibold hover:bg-white transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </main>
  );
}