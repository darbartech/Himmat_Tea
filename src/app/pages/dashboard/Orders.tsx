import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Eye, CheckCircle, Truck, Clock,
  Package, XCircle, RefreshCw, Download, Printer, Undo2,
  CheckSquare, Square, ChevronLeft, ChevronRight, AlertTriangle,
  Trash2, MinusCircle
} from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { useTranslation } from "@/hooks/useTranslation";
import { api, ApiError } from "../../../lib/api-client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Textarea } from "../../components/ui/textarea";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "AWAITING_PAYMENT" | "CONFIRMED" | "Pending" | "Processing" | "PROCESSING" | "Shipped" | "SHIPPED" | "Delivered" | "DELIVERED" | "Cancelled" | "CANCELLED" | "Refunded" | "REFUNDED";
type PaymentStatus = "Paid" | "Unpaid" | "Refunded" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

interface PaymentObj {
  id?: string;
  orderId?: string;
  method?: string;
  status: PaymentStatus | string;
  amount?: number;
  transactionReference?: string | null;
  verifiedByAdminId?: number | null;
  verifiedAt?: string | null;
  paidAt?: string | null;
}

interface OrderItem {
  id?: number | string;
  productId: number;
  variantId?: number | null;
  name?: string;
  productName?: string;
  quantity: number;
  price?: number;
  amount?: number;
  weight?: string;
}

interface InternalNote {
  id: string;
  text: string;
  adminId: string;
  adminName: string;
  timestamp: string;
  createdAt?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  orderDate: string;
  items: OrderItem[];
  total: number;
  shippingCost?: number;
  tax: number;
  grandTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment?: PaymentObj | null;
  trackingNumber?: string | null;
  courierPartner?: string | null;
  internalNotes: InternalNote[];
  refundReason?: string;
  refundAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateOrderItem {
  productId: number;
  productName?: string;
  name?: string;
  quantity: number;
  price?: number;
  weight?: string;
}

function generateDefaultOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `HT-${y}${m}${day}-0001`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { icon: React.ElementType; pill: string }> = {
  delivered:         { icon: CheckCircle, pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed:         { icon: CheckCircle, pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  processing:        { icon: Clock,       pill: "bg-sky-50 text-sky-700 border-sky-200" },
  shipped:           { icon: Truck,       pill: "bg-violet-50 text-violet-700 border-violet-200" },
  pending:           { icon: Package,     pill: "bg-amber-50 text-amber-700 border-amber-200" },
  awaiting_payment:  { icon: Clock,       pill: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed:         { icon: CheckCircle, pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:         { icon: XCircle,     pill: "bg-red-50 text-red-700 border-red-200" },
  refunded:          { icon: RefreshCw,   pill: "bg-orange-50 text-orange-700 border-orange-200" },
};

const PAYMENT_PILL: Record<string, string> = {
  Paid:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAID:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Unpaid:   "bg-red-50 text-red-700 border-red-200",
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  FAILED:   "bg-red-50 text-red-700 border-red-200",
  Refunded: "bg-orange-50 text-orange-700 border-orange-200",
  REFUNDED: "bg-orange-50 text-orange-700 border-orange-200",
};

function normalizePaymentStatus(order: Order): PaymentStatus {
  if (order.payment?.status) {
    const s = order.payment.status as string;
    if (s === 'PAID') return 'Paid';
    if (s === 'PENDING') return 'Unpaid';
    if (s === 'FAILED') return 'Unpaid';
    if (s === 'REFUNDED') return 'Refunded';
    if (s === 'Paid' || s === 'Unpaid' || s === 'Refunded') return s;
  }
  return order.paymentStatus || 'Unpaid';
}

function itemName(item: OrderItem): string {
  return item.productName || item.name || `Product ${item.productId}`;
}

function itemPrice(item: OrderItem): number {
  return item.price ?? (item.amount ? item.amount / Math.max(item.quantity, 1) : 0);
}

function itemAmount(item: OrderItem): number {
  return item.amount ?? (item.price ? item.price * item.quantity : 0);
}

function noteTs(note: InternalNote): string {
  return note.timestamp || note.createdAt || new Date().toISOString();
}

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function isNewOrder(order: Order): boolean {
  const processedStatuses = new Set(["DELIVERED", "CANCELLED", "REFUNDED", "SHIPPED", "Delivered", "Cancelled", "Refunded", "Shipped"]);
  if (processedStatuses.has(order.status)) return false;
  const created = new Date(order.orderDate || order.createdAt || Date.now());
  const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
  return ageHours < 48;
}

function isNewCustomerOrder(order: Order): boolean {
  const customerId = Number(order.customerId);
  if (!customerId || isNaN(customerId)) return false;
  const created = new Date(order.orderDate || order.createdAt || Date.now());
  const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
  return ageHours < 168;
}

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
  }
  return convert(Math.floor(num)) || "Zero";
}

// ─── Invoice Component ────────────────────────────────────────────────────────

function OrderInvoice({
  order,
  invoiceRef,
  settings,
}: {
  order: Order;
  invoiceRef: React.RefObject<HTMLDivElement>;
  settings: any;
}) {
  const { t } = useTranslation();
  const cgstRate = settings.taxRate / 2;
  const sgstRate = settings.taxRate / 2;
  const cgstAmount = order.total * (cgstRate / 100);
  const sgstAmount = order.total * (sgstRate / 100);
  const subtotal = order.total;

  const invoiceDate = new Date(order.orderDate);
  const dueDateObj = new Date(invoiceDate);
  dueDateObj.setDate(dueDateObj.getDate() + 30);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div
      ref={invoiceRef}
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        width: "794px",         // A4 at 96dpi
        minHeight: "1123px",
        margin: "0 auto",
        position: "relative",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      {/* ── Accent bar (top) ── */}
      <div style={{
        height: "6px",
        background: "linear-gradient(90deg, #1a3a2a 0%, #2d5a3d 50%, #4a8c5c 100%)",
      }} />

      {/* ── Header ── */}
      <div style={{ padding: "36px 48px 28px", borderBottom: "1px solid #e5e5e5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{
              width: "52px", height: "52px",
              background: "#1a3a2a",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "4px", flexShrink: 0,
            }}>
              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "18px", letterSpacing: "1px" }}>
                {(settings.storeName || "HT").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px" }}>
                {settings.storeName || "Himalayan Teas"}
              </div>
              {settings.storeAddress && (
                <div style={{ fontSize: "12px", color: "#666666", marginTop: "3px", maxWidth: "260px", lineHeight: "1.5" }}>
                  {settings.storeAddress}
                </div>
              )}
              <div style={{ fontSize: "12px", color: "#666666", marginTop: "3px" }}>
                {settings.storeEmail} {settings.storePhone ? `· ${settings.storePhone}` : ""}
              </div>
              {settings.gstNumber && (
                <div style={{ fontSize: "11px", color: "#888888", marginTop: "4px" }}>
                  GSTIN: <strong style={{ color: "#444444" }}>{settings.gstNumber}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Invoice meta */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: "28px", fontWeight: 800, color: "#1a3a2a",
              letterSpacing: "-0.5px", lineHeight: 1,
            }}>
              TAX INVOICE
            </div>
            <div style={{ marginTop: "14px" }}>
              <table style={{ borderCollapse: "collapse", marginLeft: "auto" }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: "11px", color: "#888888", paddingRight: "16px", paddingBottom: "5px", textAlign: "right", whiteSpace: "nowrap" }}>
                      INVOICE NO.
                    </td>
                    <td style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", paddingBottom: "5px", textAlign: "right" }}>
                      {order.orderNumber || order.id}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: "11px", color: "#888888", paddingRight: "16px", paddingBottom: "5px", textAlign: "right" }}>
                      DATE
                    </td>
                    <td style={{ fontSize: "13px", color: "#333333", paddingBottom: "5px", textAlign: "right" }}>
                      {fmtDate(invoiceDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: "11px", color: "#888888", paddingRight: "16px", textAlign: "right" }}>
                      DUE DATE
                    </td>
                    <td style={{ fontSize: "13px", color: "#333333", textAlign: "right" }}>
                      {fmtDate(dueDateObj)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment badge */}
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <span style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "3px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                ...(order.paymentStatus === "Paid"
                  ? { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }
                  : order.paymentStatus === "Refunded"
                  ? { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }
                  : { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }),
              }}>
                {order.paymentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address section ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderBottom: "1px solid #e5e5e5",
        background: "#f9fafb",
      }}>
        {/* Bill To */}
        <div style={{ padding: "24px 32px", borderRight: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", marginBottom: "10px", textTransform: "uppercase" }}>
            Bill To
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>{order.customerName}</div>
          {order.customerEmail && (
            <div style={{ fontSize: "12px", color: "#555555", marginTop: "4px" }}>{order.customerEmail}</div>
          )}
          {order.customerPhone && (
            <div style={{ fontSize: "12px", color: "#555555", marginTop: "2px" }}>{order.customerPhone}</div>
          )}
          {order.shippingAddress && (
            <div style={{ fontSize: "12px", color: "#555555", marginTop: "6px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {order.shippingAddress}
            </div>
          )}
        </div>

        {/* Ship To */}
        <div style={{ padding: "24px 32px", borderRight: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", marginBottom: "10px", textTransform: "uppercase" }}>
            Ship To
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>{order.customerName}</div>
          {order.shippingAddress && (
            <div style={{ fontSize: "12px", color: "#555555", marginTop: "6px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {order.shippingAddress}
            </div>
          )}
        </div>

        {/* Order Info */}
        <div style={{ padding: "24px 32px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", marginBottom: "10px", textTransform: "uppercase" }}>
            Order Info
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {[
                ["Order No.", order.orderNumber || order.id],
                ["Status", order.status],
                ["Items", String(order.items.length)],
                ["Order Date", fmtDate(invoiceDate)],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ fontSize: "11px", color: "#888888", paddingBottom: "5px", paddingRight: "8px", whiteSpace: "nowrap" }}>
                    {label}
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#333333", paddingBottom: "5px" }}>
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Line items table ── */}
      <div style={{ padding: "0 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1a3a2a" }}>
              {[
                { label: "#",           align: "left",   width: "36px" },
                { label: "Description", align: "left",   width: "auto" },
                { label: "HSN/SAC",     align: "center", width: "90px" },
                { label: t('dashboard.orders.qty'),         align: "center", width: "60px" },
                { label: t('dashboard.orders.unitPrice'),  align: "right",  width: "100px" },
                { label: t('dashboard.orders.discount'),    align: "right",  width: "90px" },
                { label: t('dashboard.orders.amountColumn'),      align: "right",  width: "110px" },
              ].map((col) => (
                <th
                  key={col.label}
                  style={{
                    textAlign: col.align as any,
                    width: col.width,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#888888",
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    paddingTop: "18px",
                    paddingBottom: "10px",
                    paddingLeft: col.align === "left" ? "0" : "8px",
                    paddingRight: col.align === "right" ? "0" : "8px",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid #eeeeee",
                  background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                }}
              >
                <td style={{ paddingTop: "13px", paddingBottom: "13px", fontSize: "12px", color: "#aaaaaa", textAlign: "left" }}>
                  {String(idx + 1).padStart(2, "0")}
                </td>
                <td style={{ paddingTop: "13px", paddingBottom: "13px", paddingRight: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{item.name}</div>
                  <div style={{ fontSize: "11px", color: "#999999", marginTop: "2px" }}>SKU: {item.id}</div>
                </td>
                <td style={{ textAlign: "center", paddingTop: "13px", paddingBottom: "13px", fontSize: "12px", color: "#666666" }}>
                  0902
                </td>
                <td style={{ textAlign: "center", paddingTop: "13px", paddingBottom: "13px", fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: "right", paddingTop: "13px", paddingBottom: "13px", paddingLeft: "8px", fontSize: "12px", color: "#555555" }}>
                  ₹{fmt(itemPrice(item))}
                </td>
                <td style={{ textAlign: "right", paddingTop: "13px", paddingBottom: "13px", paddingLeft: "8px", fontSize: "12px", color: "#aaaaaa" }}>
                  —
                </td>
                <td style={{ textAlign: "right", paddingTop: "13px", paddingBottom: "13px", fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>
                  ₹{fmt(itemAmount(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totals + bank details ── */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "28px 48px 0", gap: "32px" }}>

        {/* Bank / notes (left) */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
            Payment Details
          </div>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Bank Name", "State Bank of India"],
                ["Account No.", "XXXX XXXX XXXX 4521"],
                ["IFSC Code", "SBIN0001234"],
                ["Branch", "New Delhi Main"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ fontSize: "11px", color: "#888888", paddingBottom: "4px", paddingRight: "16px", whiteSpace: "nowrap" }}>
                    {label}
                  </td>
                  <td style={{ fontSize: "12px", color: "#333333", fontWeight: 500, paddingBottom: "4px" }}>
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Amount in words */}
          <div style={{
            marginTop: "20px",
            padding: "12px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "4px",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>
              Amount in Words
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#14532d" }}>
              {numberToWords(order.grandTotal)} Rupees Only
            </div>
          </div>
        </div>

        {/* Totals table (right) */}
        <div style={{ minWidth: "260px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", color: "#666666", paddingBottom: "8px" }}>{t('dashboard.invoice.subtotal')}</td>
                <td style={{ fontSize: "13px", textAlign: "right", fontWeight: 500, color: "#1a1a1a", paddingBottom: "8px" }}>₹{fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", color: "#666666", paddingBottom: "8px" }}>{t('common.discount')}</td>
                <td style={{ fontSize: "13px", textAlign: "right", color: "#16a34a", paddingBottom: "8px" }}>— ₹0.00</td>
              </tr>
              {settings.gstNumber ? (
                <>
                  <tr>
                    <td style={{ fontSize: "12px", color: "#666666", paddingBottom: "8px" }}>CGST ({cgstRate}%)</td>
                    <td style={{ fontSize: "13px", textAlign: "right", color: "#1a1a1a", paddingBottom: "8px" }}>₹{fmt(cgstAmount)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: "12px", color: "#666666", paddingBottom: "12px" }}>SGST ({sgstRate}%)</td>
                    <td style={{ fontSize: "13px", textAlign: "right", color: "#1a1a1a", paddingBottom: "12px" }}>₹{fmt(sgstAmount)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ fontSize: "12px", color: "#666666", paddingBottom: "12px" }}>Tax ({settings.taxRate}%)</td>
                  <td style={{ fontSize: "13px", textAlign: "right", color: "#1a1a1a", paddingBottom: "12px" }}>₹{fmt(order.tax)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid #1a3a2a" }}>
                <td style={{ fontSize: "15px", fontWeight: 800, color: "#1a1a1a", paddingTop: "12px" }}>
                  TOTAL DUE
                </td>
                <td style={{
                  fontSize: "18px", fontWeight: 800, textAlign: "right",
                  color: "#1a3a2a", paddingTop: "12px",
                }}>
                  ₹{fmt(order.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature box */}
          <div style={{
            marginTop: "32px",
            borderTop: "1px solid #cccccc",
            paddingTop: "8px",
            textAlign: "center",
          }}>
            <div style={{ height: "36px" }} />
            <div style={{ borderTop: "1px solid #aaaaaa", paddingTop: "6px", fontSize: "11px", color: "#888888" }}>
              Authorised Signatory for {settings.storeName}
            </div>
          </div>
        </div>
      </div>

      {/* ── Terms & notes ── */}
      <div style={{
        margin: "28px 48px 0",
        padding: "18px 20px",
        background: "#fafafa",
        border: "1px solid #e5e5e5",
        borderRadius: "4px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
      }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
            Terms & Conditions
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[
              "Goods once sold cannot be returned without prior approval.",
              "Payment is due within 30 days of the invoice date.",
              "Subject to local jurisdiction.",
            ].map((t, i) => (
              <li key={i} style={{ fontSize: "11px", color: "#666666", marginBottom: "3px" }}>
                {i + 1}. {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
            Notes
          </div>
          <p style={{ fontSize: "11px", color: "#666666", margin: 0 }}>
            Thank you for your business! We appreciate your continued trust in {settings.storeName}.
            For any queries regarding this invoice, please reach us at {settings.storeEmail}.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        margin: "28px 48px 0",
        paddingTop: "14px",
        borderTop: "1px solid #e5e5e5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "28px",
      }}>
        <div style={{ fontSize: "11px", color: "#aaaaaa" }}>
          This is a computer-generated invoice and does not require a physical signature.
        </div>
        <div style={{ fontSize: "11px", color: "#aaaaaa" }}>
          © {new Date().getFullYear()} {settings.storeName} · All rights reserved
        </div>
      </div>

      {/* ── Bottom accent bar ── */}
      <div style={{
        height: "4px",
        background: "linear-gradient(90deg, #1a3a2a 0%, #2d5a3d 50%, #4a8c5c 100%)",
      }} />
    </div>
  );
}

// ─── Print CSS ────────────────────────────────────────────────────────────────

const buildPrintStyles = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: white;
    color: #1a1a1a;
    font-size: 13px;
    line-height: 1.5;
  }
  @media print {
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; }
  }
  table { border-collapse: collapse; }
`;

// ─── Main Orders page ─────────────────────────────────────────────────────────

const FILTER_STATUSES = ["All", "AWAITING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const ORDER_STATUSES = ["AWAITING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const CHANGEABLE_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const ORDER_TRANSITIONS: Record<string, string[]> = {
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

function adaptOrder(raw: any): Order {
  const items: OrderItem[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        ...it,
        name: it.productName || it.name || `Product ${it.productId}`,
      }))
    : [];

  const notes: InternalNote[] = Array.isArray(raw.internalNotes) ? raw.internalNotes : [];
  const order: Order = {
    ...raw,
    items,
    internalNotes: notes,
    orderDate: raw.orderDate || raw.createdAt || new Date().toISOString(),
    paymentStatus: 'Unpaid' as PaymentStatus,
  };
  order.paymentStatus = normalizePaymentStatus(order);
  return order;
}

export default function Orders() {
  const { settings: storeSettings } = useStore();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<any>(storeSettings || {});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshOrders = useCallback(async (showError = false) => {
    try {
      const ordRes: any = await api.get('/orders');
      const list = ordRes?.success ? ordRes.data : (Array.isArray(ordRes) ? ordRes : (ordRes?.data || []));
      const normalized: Order[] = (Array.isArray(list) ? list : []).map(adaptOrder);
      setOrders(normalized);
      return normalized;
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      if (showError) {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load orders');
      }
      return null;
    }
  }, []);

  const refreshOne = useCallback(async (orderId?: string) => {
    try {
      if (orderId) {
        const res: any = await api.get(`/orders/${orderId}`);
        const raw = res?.success ? res.data : res;
        if (raw) {
          const updated = adaptOrder(raw);
          setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } else {
        await refreshOrders();
      }
    } catch (err) {
      console.error('refreshOne failed:', err);
    }
    return undefined;
  }, [refreshOrders]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [settRes, custRes, prodRes] = await Promise.all([
          (async () => {
            try {
              const r: any = await api.get('/settings');
              return r?.success ? r.data : (r && typeof r === 'object' ? r : null);
            } catch {
              return storeSettings;
            }
          })(),
          (async () => {
            try {
              const r: any = await api.get('/customers');
              return r?.success ? (r.data || []) : (Array.isArray(r) ? r : []);
            } catch {
              return [];
            }
          })(),
          (async () => {
            try {
              const r: any = await api.get('/products');
              return r?.success ? (r.data || []) : (Array.isArray(r) ? r : []);
            } catch {
              return [];
            }
          })(),
        ]);
        if (!cancelled) {
          if (settRes) setSettings(settRes);
          if (Array.isArray(custRes)) setAllCustomers(custRes);
          if (Array.isArray(prodRes)) setAllProducts(prodRes);
          await refreshOrders(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshOrders, storeSettings]);

  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [newInternalNote, setNewInternalNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierPartner, setCourierPartner] = useState("");
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("CONFIRMED");
  const [paymentReference, setPaymentReference] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [invoiceScale, setInvoiceScale] = useState<number>(1);
  const invoiceWrapRef = useRef<HTMLDivElement | null>(null);
  
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCustomerId, setCreateCustomerId] = useState<string>("");
  const [createCustomerName, setCreateCustomerName] = useState("");
  const [createCustomerEmail, setCreateCustomerEmail] = useState("");
  const [createCustomerPhone, setCreateCustomerPhone] = useState("");
  const [createShippingAddress, setCreateShippingAddress] = useState("");
  const [createOrderNumber, setCreateOrderNumber] = useState(generateDefaultOrderNumber());
  const [createStatus, setCreateStatus] = useState<string>("AWAITING_PAYMENT");
  const [createItems, setCreateItems] = useState<CreateOrderItem[]>([
    { productId: 0, productName: "", quantity: 1, price: 0, weight: "" }
  ]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => {
      const el = invoiceWrapRef.current;
      const availWidth = el ? el.clientWidth - 24 : (window.innerWidth - 48);
      const A4_WIDTH = 794;
      if (availWidth <= 0) return;
      setInvoiceScale(Math.min(1, availWidth / A4_WIDTH));
    };
    queueMicrotask(compute);
    window.addEventListener('resize', compute);
    const ro = typeof ResizeObserver !== 'undefined' && invoiceWrapRef.current
      ? new ResizeObserver(compute)
      : null;
    if (ro && invoiceWrapRef.current) ro.observe(invoiceWrapRef.current);
    return () => {
      window.removeEventListener('resize', compute);
      if (ro) ro.disconnect();
    };
  }, [isDetailModalOpen]);

  const filteredOrders = orders.filter((o) =>
    (o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedStatus === "All" || o.status === selectedStatus)
  );

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Select all orders
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === paginatedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(paginatedOrders.map(o => o.id));
    }
  };

  // Handle bulk status update
  const handleBulkUpdate = async () => {
    if (selectedOrderIds.length === 0) return;
    let succeeded = 0;
    for (const id of selectedOrderIds) {
      try {
        await api.patch(`/admin/orders/${id}/status`, { status: bulkStatus });
        succeeded++;
      } catch (e: any) {
        console.error(`Bulk update failed for ${id}:`, e);
        alert((e instanceof ApiError ? e.message : 'Failed to update order ' + id));
      }
    }
    setSelectedOrderIds([]);
    if (succeeded > 0) await refreshOrders();
  };

  // Handle adding internal note
  const handleAddInternalNote = async () => {
    if (!selectedOrder || !newInternalNote.trim()) return;
    try {
      await api.post(`/admin/orders/${selectedOrder.id}/notes`, { text: newInternalNote.trim() });
      const refreshed = await refreshOne(selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
      setNewInternalNote("");
    } catch (e: any) {
      console.error('Failed to add note:', e);
      alert(e instanceof ApiError ? e.message : 'Could not add note.');
    }
  };

  // Handle updating tracking info
  const handleUpdateTracking = async () => {
    if (!selectedOrder) return;
    try {
      const payload: any = {
        trackingNumber: trackingNumber || null,
        courierPartner: courierPartner || null,
      };
      if (selectedOrder.status === 'AWAITING_PAYMENT') {
        payload.status = 'CONFIRMED';
      }
      const res: any = await api.patch(`/admin/orders/${selectedOrder.id}/status`, payload);
      const refreshed = res?.success ? adaptOrder(res.data) : await refreshOne(selectedOrder.id) || selectedOrder;
      setSelectedOrder(refreshed);
      await refreshOrders();
    } catch (e: any) {
      console.error('Failed to update tracking:', e);
      alert(e instanceof ApiError ? e.message : 'Could not update tracking info.');
    }
  };

  // Handle refund
  const handleRefund = async (order: Order) => {
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      const payload: any = { status: 'REFUNDED', refundReason: refundReason || 'Admin-initiated refund' };
      if (amount !== undefined && !isNaN(amount)) payload.refundAmount = amount;
      await api.patch(`/admin/orders/${order.id}/status`, payload);
      setRefundReason("");
      setRefundAmount("");
      const refreshed = await refreshOne(order.id);
      if (refreshed && selectedOrder?.id === order.id) setSelectedOrder(refreshed);
      await refreshOrders();
    } catch (e: any) {
      console.error('Failed to refund order:', e);
      alert(e instanceof ApiError ? e.message : 'Could not process refund.');
    }
  };

  // Handle order status change (state-machine validated server-side)
  const handleStatusChange = async (order: Order, nextStatus: string) => {
    if (nextStatus === order.status) return;
    try {
      const res: any = await api.patch(`/admin/orders/${order.id}/status`, { status: nextStatus });
      const refreshed = res?.success ? adaptOrder(res.data) : await refreshOne(order.id) || order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? refreshed : o)));
      if (selectedOrder?.id === order.id) setSelectedOrder(refreshed);
    } catch (e: any) {
      console.error('Failed to update order status:', e);
      alert(e instanceof ApiError ? e.message : 'Could not update order status.');
    }
  };

  // Handle payment verification / rejection (real admin payment actions)
  const handlePaymentDecision = async (order: Order, decision: 'PAID' | 'FAILED') => {
    try {
      const payload: any = { decision };
      if (paymentReference.trim()) payload.transactionReference = paymentReference.trim();
      if (decision === 'FAILED' && rejectReason.trim()) payload.rejectReason = rejectReason.trim();
      const res: any = await api.patch(`/admin/orders/${order.id}/payment`, payload);
      const refreshed = res?.success ? adaptOrder(res.data) : await refreshOne(order.id) || order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? refreshed : o)));
      if (selectedOrder?.id === order.id) setSelectedOrder(refreshed);
      setPaymentReference("");
      setRejectReason("");
      await refreshOrders();
    } catch (e: any) {
      console.error('Failed to update payment:', e);
      alert(e instanceof ApiError ? e.message : 'Could not update payment.');
    }
  };

  // ── Create Order helpers ────────────────────────────────────────────────────

  const openCreateModal = useCallback(async () => {
    setCreateOrderNumber(generateDefaultOrderNumber());
    setCreateCustomerId("");
    setCreateCustomerName("");
    setCreateCustomerEmail("");
    setCreateCustomerPhone("");
    setCreateShippingAddress("");
    setCreateStatus("AWAITING_PAYMENT");
    setCreateItems([{ productId: 0, productName: "", quantity: 1, price: 0, weight: "" }]);
    setCreateSubmitting(false);
    setIsCreateModalOpen(true);
  }, []);

  const handleCustomerSelect = (val: string) => {
    setCreateCustomerId(val);
    const id = parseInt(val);
    if (!isNaN(id)) {
      const c = allCustomers.find((cc) => cc.id === id);
      if (c) {
        setCreateCustomerName(c.name || "");
        setCreateCustomerEmail(c.email || "");
        setCreateCustomerPhone(c.phone || "");
        setCreateShippingAddress(c.address || "");
      }
    }
  };

  const addCreateItem = () => {
    setCreateItems((prev) => [
      ...prev,
      { productId: 0, productName: "", quantity: 1, price: 0, weight: "" },
    ]);
  };

  const removeCreateItem = (idx: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCreateItem = (idx: number, patch: Partial<CreateOrderItem>) => {
    setCreateItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleItemProductSelect = (idx: number, productIdStr: string) => {
    const productId = parseInt(productIdStr);
    if (isNaN(productId)) {
      updateCreateItem(idx, { productId: 0, productName: "", price: 0 });
      return;
    }
    const p = allProducts.find((pp) => pp.id === productId);
    if (p) {
      updateCreateItem(idx, {
        productId,
        productName: p.name,
        name: p.name,
        price: typeof p.price === "number" ? p.price : 0,
      });
    } else {
      updateCreateItem(idx, { productId });
    }
  };

  const createSubtotal = useMemo(
    () => createItems.reduce((s, it) => s + ((it.price ?? 0) * it.quantity), 0),
    [createItems]
  );
  const createTax = useMemo(
    () => Number(((createSubtotal * ((settings.taxRate ?? 0) / 100))).toFixed(2)),
    [createSubtotal, settings.taxRate]
  );
  const createShipping = useMemo(() => Number((settings.shippingFlatRate ?? 0).toFixed(2)), [settings.shippingFlatRate]);
  const createGrandTotal = useMemo(
    () => Number((createSubtotal + createTax + createShipping).toFixed(2)),
    [createSubtotal, createTax, createShipping]
  );

  const handleCreateOrder = async () => {
    try {
      const customerId = parseInt(createCustomerId);
      if (isNaN(customerId) || customerId <= 0) {
        alert("Please select a customer.");
        return;
      }
      if (!createCustomerName.trim()) { alert("Customer name is required."); return; }
      if (!createCustomerEmail.trim()) { alert("Customer email is required."); return; }
      if (!createCustomerPhone.trim()) { alert("Customer phone is required."); return; }
      if (!createShippingAddress.trim()) { alert("Shipping address is required."); return; }
      if (createItems.length === 0) { alert("Add at least one item."); return; }
      for (const it of createItems) {
        if (!it.productId || it.productId <= 0) { alert("Each item must have a product selected."); return; }
        if (!it.quantity || it.quantity < 1) { alert("Item quantity must be at least 1."); return; }
      }

      setCreateSubmitting(true);
      const idempotencyKey = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const payload: any = {
        customerId,
        customerName: createCustomerName.trim(),
        customerEmail: createCustomerEmail.trim(),
        customerPhone: createCustomerPhone.trim(),
        shippingAddress: createShippingAddress.trim(),
        idempotencyKey,
        orderNumber: createOrderNumber.trim() || undefined,
        status: createStatus as any,
        items: createItems.map((it) => ({
          productId: it.productId,
          productName: it.productName || undefined,
          quantity: it.quantity,
          weight: it.weight || undefined,
        })),
      };
      const res: any = await api.post("/orders", payload);
      const createdOrder = res?.success ? res.data : res;
      setIsCreateModalOpen(false);
      await refreshOrders();
      if (createdOrder?.id) {
        const raw: any = await api.get(`/orders/${createdOrder.id}`);
        const ord = raw?.success ? raw.data : raw;
        if (ord) {
          setSelectedOrder(adaptOrder(ord));
          setIsDetailModalOpen(true);
          setTrackingNumber(ord.trackingNumber || "");
          setCourierPartner(ord.courierPartner || "");
        }
      }
    } catch (e: any) {
      console.error("Create order failed:", e);
      alert(e instanceof ApiError ? e.message : "Could not create order.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrintInvoice = () => {
    if (!invoiceRef.current || !selectedOrder) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice – ${selectedOrder.orderNumber || selectedOrder.id}</title>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: white;
          padding: 20px;
        }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
        }
      </style>
    </head><body>${invoiceRef.current.outerHTML}</body></html>`);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 500);
  };

  // ── Download PDF ───────────────────────────────────────────────────────────

  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current || !selectedOrder) return;
    try {
      console.log("Starting PDF export...");
      
      // Ensure all styles are loaded
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: true,
        allowTaint: true,
        windowWidth: 800,
        windowHeight: invoiceRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
      
      console.log("Canvas created successfully, dimensions:", canvas.width, canvas.height);

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;
      
      console.log("Adding image to PDF...");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      
      console.log("Saving PDF...");
      pdf.save(`invoice-${selectedOrder.orderNumber || selectedOrder.id}.pdf`);
      
      console.log("PDF saved successfully!");
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to download invoice. Please try again or use the Print option.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-[#1c1917]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {t("dashboard.orders.title")}
          </h1>
          <p className="text-[#78746e] mt-1">{t("dashboard.orders.subtitle")}</p>
        </div>
        <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("dashboard.home.newOrder")}
        </Button>
      </div>

      {(loading || loadError) && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${
          loadError
            ? 'bg-red-50 border-red-200'
            : 'bg-[#2d5a3d]/5 border-[#2d5a3d]/15'
        }`}>
          {loadError ? (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-[#2d5a3d]/30 border-t-[#2d5a3d] animate-spin shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${loadError ? 'text-red-800' : 'text-[#1c1917]'}`}>
              {loading && !loadError ? 'Loading orders…' : 'Could not load orders'}
            </p>
            {loadError && <p className="text-sm text-red-700 mt-1 break-words">{loadError}</p>}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setLoadError(null);
              await refreshOrders(true);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Search + filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t("dashboard.orders.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t("dashboard.orders.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {FILTER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#2d5a3d]/10 border border-[#2d5a3d]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-[#2d5a3d]">
              {selectedOrderIds.length} {selectedOrderIds.length === 1 ? "order" : "orders"} selected
            </span>
            <Select value={bulkStatus} onValueChange={(val) => setBulkStatus(val as OrderStatus)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                {CHANGEABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-[#2d5a3d] hover:bg-[#234832] text-white w-full sm:w-auto"
              onClick={handleBulkUpdate}
            >
              Update Status
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => setSelectedOrderIds([])}
            className="w-full sm:w-auto"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#2d5a3d]/5 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="sticky top-0 bg-[#f9f7f4] z-10">
              <tr className="text-left text-sm text-[#78746e] border-b border-[#2d5a3d]/5">
                <th className="px-6 py-4 font-medium whitespace-nowrap">
                  <button onClick={toggleSelectAll} className="p-1">
                    {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.orderNumber")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.customer")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.date")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.product")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.totalAmount")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.orderStatus")}</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">{t("dashboard.orders.paymentStatus")}</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">{t("dashboard.orders.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d5a3d]/5">
              {paginatedOrders.map((order) => {
                const meta = STATUS_META[order.status.toLowerCase()];
                const StatusIcon = meta?.icon ?? Clock;
                const isSelected = selectedOrderIds.includes(order.id);
                return (
                  <tr 
                    key={order.id} 
                    className={`group transition-colors ${isSelected ? "bg-[#f0f9f4]" : "hover:bg-[#f9f7f4]"}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleOrderSelection(order.id)} 
                        className="p-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1c1917] font-mono tracking-wide">{order.orderNumber || order.id}</span>
                        {isNewOrder(order) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                            New Order
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#1c1917]">{order.customerName}</p>
                          {isNewCustomerOrder(order) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-sky-100 text-sky-800 border border-sky-200">
                              New Customer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#78746e]">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#78746e]">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#1c1917]">
                      {order.items.length} {order.items.length > 1 ? t("dashboard.home.products") : t("dashboard.invoice.item")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#1c1917]">
                      ₹{order.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${meta?.pill ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={PAYMENT_PILL[order.paymentStatus] ?? "bg-gray-100 text-gray-700"}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { 
                            setSelectedOrder(order); 
                            setIsDetailModalOpen(true); 
                            // Initialize form values
                            setTrackingNumber(order.trackingNumber || "");
                            setCourierPartner(order.courierPartner || "");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {order.status === "DELIVERED" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("dashboard.orders.refundOrder")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("dashboard.orders.refundConfirm", { orderId: order.orderNumber || order.id })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4 space-y-4">
                                <div>
                                  <Label htmlFor="refund-amount">{t('dashboard.orders.refundAmountOptional')}</Label>
                                  <Input
                                    id="refund-amount"
                                    type="number"
                                    placeholder={t('dashboard.orders.fullAmountIfEmpty')}
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="refund-reason">{t("dashboard.orders.refundReason")}</Label>
                                  <Textarea
                                    id="refund-reason"
                                    placeholder={t("dashboard.orders.refundPlaceholder")}
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                                  setRefundReason("");
                                  setRefundAmount("");
                                }}>
                                  {t("dashboard.products.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={!refundReason.trim()}
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleRefund(order)}
                                >
                                  {t("dashboard.orders.refundOrder")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-[#2d5a3d]/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#78746e]">
              Show {paginatedOrders.length} of {filteredOrders.length} orders
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(parseInt(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>{size} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-[#1c1917]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Order detail modal ── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[900px] w-full max-h-[95vh] overflow-y-auto p-0">
          {selectedOrder && (
            <>
              {/* Modal toolbar */}
              <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl font-bold text-[#1c1917]">
                    {t("dashboard.orders.orderDetailsTitle")} {selectedOrder.orderNumber || selectedOrder.id}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-[#78746e] mt-0.5">
                    {t("dashboard.orders.orderDetailsDesc")}
                  </DialogDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    {t("dashboard.orders.printInvoice")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
                    <Download className="h-4 w-4 mr-1.5" />
                    {t("dashboard.orders.download")}
                  </Button>
                </div>
              </div>

              {/* Status editor */}
              <div className="px-6 pt-4 pb-5 bg-[#f9f7f4] border-b border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#78746e] uppercase tracking-wide mb-1.5 block">
                      {t("dashboard.orders.updateOrderStatus")}
                    </Label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(value) => handleStatusChange(selectedOrder, value)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(ORDER_TRANSITIONS[selectedOrder.status] || []).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(ORDER_TRANSITIONS[selectedOrder.status] || []).length === 0 && (
                      <p className="text-xs text-[#78746e] mt-1.5">
                        No further status changes allowed from {selectedOrder.status}.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#78746e] uppercase tracking-wide mb-1.5 block">
                      {t("dashboard.orders.updatePaymentStatus")}
                    </Label>
                    {selectedOrder.payment?.status === 'PENDING' ? (
                      <div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handlePaymentDecision(selectedOrder, 'PAID')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Verify Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handlePaymentDecision(selectedOrder, 'FAILED')}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Reject Payment
                          </Button>
                        </div>
                        <Input
                          type="text"
                          placeholder={t('dashboard.orders.transactionRefOptional')}
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="mt-2 text-sm"
                        />
                        <textarea
                          placeholder={t('dashboard.orders.rejectReasonOptional')}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          maxLength={500}
                          className="mt-2 w-full rounded-md border border-[#e7e4df] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40 focus:border-[#2d5a3d]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className={PAYMENT_PILL[selectedOrder.paymentStatus] ?? "bg-gray-100 text-gray-700"}>
                          {selectedOrder.payment?.status || selectedOrder.paymentStatus}
                        </Badge>
                        {selectedOrder.payment?.status === 'FAILED' && (
                          <span className="text-xs text-[#78746e]">
                            Order was cancelled and stock restored.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tracking Info */}
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-[#1c1917] mb-4">{t('dashboard.orders.trackingInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tracking-number">{t('dashboard.orders.trackingNumber')}</Label>
                    <Input
                      id="tracking-number"
                      placeholder={t('dashboard.orders.trackingNumberPlaceholder')}
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="courier-partner">{t('dashboard.orders.courierPartner')}</Label>
                    <Input
                      id="courier-partner"
                      placeholder={t('dashboard.orders.courierPartnerPlaceholder')}
                      value={courierPartner}
                      onChange={(e) => setCourierPartner(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <Button
                  className="mt-4 bg-[#2d5a3d] hover:bg-[#234832] text-white"
                  onClick={handleUpdateTracking}
                >
                  Update Tracking
                </Button>
                {selectedOrder.trackingNumber && (
                  <div className="mt-4 p-3 bg-[#f0f9f4] rounded-lg">
                    <p className="text-sm text-[#78746e]">
                      Current: <span className="font-medium text-[#1c1917]">{selectedOrder.trackingNumber}</span>
                      {selectedOrder.courierPartner && (
                        <span className="text-[#78746e]"> via {selectedOrder.courierPartner}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-[#1c1917] mb-4">{t('dashboard.orders.internalNotes')}</h3>
                <div className="flex gap-3 mb-4">
                  <Input
                    placeholder={t('dashboard.orders.addNotePlaceholder')}
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                  />
                  <Button
                    className="bg-[#2d5a3d] hover:bg-[#234832] text-white"
                    onClick={handleAddInternalNote}
                    disabled={!newInternalNote.trim()}
                  >
                    Add Note
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedOrder.internalNotes.length === 0 ? (
                    <p className="text-sm text-[#78746e] text-center py-4">
                      No notes yet
                    </p>
                  ) : (
                    [...selectedOrder.internalNotes]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((note) => (
                        <div
                          key={note.id}
                          className="p-3 bg-[#f9f7f4] rounded-lg border border-[#2d5a3d]/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#1c1917]">{note.adminName}</span>
                            <span className="text-xs text-[#78746e]">
                              {new Date(note.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-[#1c1917]">{note.text}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Invoice preview */}
              <div
                ref={invoiceWrapRef}
                className="p-3 sm:p-6 bg-[#f0f0f0] overflow-x-auto"
              >
                <div
                  className="shadow-xl rounded mx-auto origin-top"
                  style={{
                    width: 794,
                    transform: `scale(${invoiceScale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <OrderInvoice
                    order={selectedOrder}
                    invoiceRef={invoiceRef}
                    settings={settings}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Order modal ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-[960px] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1c1917]">{t('dashboard.orders.createNewOrder')}</DialogTitle>
            <DialogDescription className="text-sm text-[#78746e]">
              Enter the order details below. The order number is auto-generated but can be edited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="create-order-number">{t('dashboard.orders.orderId')}</Label>
                <Input
                  id="create-order-number"
                  value={createOrderNumber}
                  onChange={(e) => setCreateOrderNumber(e.target.value)}
                  className="mt-2 font-mono tracking-wide"
                />
                <p className="text-xs text-[#78746e] mt-1.5">
                  Format: <span className="font-mono">HT-YYYYMMDD-####</span>. Leave the server-assigned format for sequential numbering.
                </p>
              </div>

              <div>
                <Label htmlFor="create-order-status">{t('dashboard.orders.initialStatus')}</Label>
                <Select value={createStatus} onValueChange={setCreateStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="create-customer">{t('dashboard.customers.customer')}</Label>
                <Select value={createCustomerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={t('dashboard.orders.selectCustomerPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allCustomers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        #{c.id} · {c.name} {c.email ? `(${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="create-customer-name">{t('dashboard.orders.customer')}</Label>
                <Input
                  id="create-customer-name"
                  value={createCustomerName}
                  onChange={(e) => setCreateCustomerName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="create-customer-email">{t('dashboard.customers.email')}</Label>
                <Input
                  id="create-customer-email"
                  type="email"
                  value={createCustomerEmail}
                  onChange={(e) => setCreateCustomerEmail(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="create-customer-phone">{t('dashboard.customers.phone')}</Label>
                <Input
                  id="create-customer-phone"
                  value={createCustomerPhone}
                  onChange={(e) => setCreateCustomerPhone(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="create-shipping">{t('dashboard.orders.shippingAddress')}</Label>
                <Textarea
                  id="create-shipping"
                  rows={2}
                  value={createShippingAddress}
                  onChange={(e) => setCreateShippingAddress(e.target.value)}
                  className="mt-2"
                  placeholder={t('dashboard.orders.shippingAddressPlaceholder')}
                />
              </div>
            </div>

            {/* ── Items table ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-[#1c1917]">{t('account.orderItems')}</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addCreateItem}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Item
                </Button>
              </div>
              <div className="rounded-xl border border-[#e7e4df] overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[#f9f7f4] text-[#78746e] text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold w-[38%]">{t('dashboard.inventory.product')}</th>
                      <th className="px-3 py-3 text-left font-semibold w-[10%]">{t('dashboard.invoice.qty')}</th>
                      <th className="px-3 py-3 text-left font-semibold w-[14%]">{t('dashboard.purchaseOrders.unitPrice')}</th>
                      <th className="px-3 py-3 text-left font-semibold w-[14%]">{t('dashboard.orders.weight')}</th>
                      <th className="px-3 py-3 text-right font-semibold w-[14%]">{t('dashboard.invoice.amount')}</th>
                      <th className="px-3 py-3 w-[10%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e4df]">
                    {createItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-3 align-top">
                          <Select
                            value={it.productId ? String(it.productId) : ""}
                            onValueChange={(v) => handleItemProductSelect(idx, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('dashboard.orders.selectProductPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {allProducts.filter((p: any) => p.isActive !== false).map((p: any) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  #{p.id} · {p.name} {typeof p.price === "number" ? ` (₹${p.price.toFixed(2)})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => updateCreateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.price ?? 0}
                            onChange={(e) => updateCreateItem(idx, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Input
                            type="text"
                            placeholder="250g"
                            value={it.weight || ""}
                            onChange={(e) => updateCreateItem(idx, { weight: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-3 align-top text-right font-medium text-[#1c1917] tabular-nums">
                          ₹{fmt(((it.price ?? 0) * it.quantity))}
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCreateItem(idx)}
                            disabled={createItems.length <= 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Totals summary ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex justify-end">
                <div className="w-full sm:w-[300px] bg-[#f9f7f4] rounded-xl p-4 border border-[#2d5a3d]/10 space-y-2 text-sm">
                  <div className="flex justify-between text-[#78746e]">
                    <span>{t('dashboard.invoice.subtotal')}</span>
                    <span className="tabular-nums">₹{fmt(createSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#78746e]">
                    <span>{t('dashboard.orders.shippingFlatRate')}</span>
                    <span className="tabular-nums">₹{fmt(createShipping)}</span>
                  </div>
                  <div className="flex justify-between text-[#78746e]">
                    <span>Tax ({settings.taxRate ?? 0}%)</span>
                    <span className="tabular-nums">₹{fmt(createTax)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#2d5a3d]/15 flex justify-between font-bold text-[#1c1917] text-base">
                    <span>{t('dashboard.orders.grandTotal')}</span>
                    <span className="tabular-nums">₹{fmt(createGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-[#e7e4df]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#2d5a3d] hover:bg-[#234832] text-white"
                onClick={handleCreateOrder}
                disabled={createSubmitting}
              >
                {createSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Create Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}