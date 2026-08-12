# Himmat Tea — Platform Audit & Remediation Plan

**Scope:** Order flow, QR payment notifications, order status system, login/signup, responsiveness, data security (incl. localStorage usage)
**Stack found:** Next.js (App Router) + Prisma (PostgreSQL) + JWT cookie auth + Tailwind CSS
**Method:** Full static read-through of `src/app/api/**`, `src/lib/**`, `src/context/**`, `src/modules/auth/**`, `prisma/schema.prisma`, and the checkout/order/invoice UI.

---

## 0. Executive Summary

The **backend order/payment engine is genuinely well built** — better than a typical first pass. It already has:

- A `Payment` model separate from `Order`, with a manual-QR verification flow.
- A real order **state machine** enforced server-side (`AWAITING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, with `CANCELLED`/`REFUNDED` branches) — this is effectively what you asked for in "pending, processing, cancelled, delivered, like a popular system." It just needs to be **finished off with notifications**, not rebuilt.
- httpOnly, signed JWT cookies for both admin and customer sessions (not naive localStorage tokens).
- Zod validation, idempotency keys, transactional stock updates, and rate limiting on auth/order endpoints.

However, three serious problems block your requirements:

1. **No notification ever fires.** Neither the admin (when a customer reaches the QR page) nor the customer (when admin approves payment) is emailed or alerted. The hooks exist in the schema (`Notification` model, `Payment.status`) but nothing writes to them or sends mail.
2. **A second, parallel "fake backend" exists purely in the browser.** `StoreContext.tsx` (1,900 lines) keeps its own copy of orders, customers, admin users, products and settings **entirely in `localStorage`**, and it is wired into the whole app via `layout.tsx`. On checkout, the real order (name, email, phone, full shipping address, totals) is pushed into this local copy and persisted to `localStorage` in plaintext. Some of its "email sent" behavior is a **fake toast**, not a real email.
3. **A password-reset bearer token is stored in `sessionStorage`**, and the customer invoice component is a fixed 794px-wide block dropped straight into a dialog with no responsive handling.

None of this requires a rewrite. It requires: (a) finishing the notification/email wiring that the schema already anticipates, (b) removing the parallel localStorage store for anything real, and (c) a handful of targeted fixes. Details and code below.

---

## 1. Critical Findings

### 1.1 Sensitive order & customer data persisted in `localStorage` (Critical)

**Problem.**
`src/context/StoreContext.tsx` is wrapped around the entire app in `src/app/layout.tsx`:

```tsx
<StoreProvider>
  <CartProvider>
    <WishlistProvider>
      <AuthProvider>{children}</AuthProvider>
```

It hydrates from, and continuously writes to, `localStorage` under keys like `godgifted_orders`, `godgifted_customers`, `godgifted_admin_users`, `godgifted_settings`, `godgifted_notifications`, etc. (`StoreContext.tsx`, ~lines 763–1032).

Critically, `Checkout.tsx` creates the **real** order through the secure API (`api.post('/orders', ...)`) and then also calls:

```tsx
const response: any = await api.post('/orders', orderData);
const createdOrder = response?.data || response;
if (addOrder && createdOrder) {
  try { addOrder(createdOrder) } catch (_) { /* noop */ }
}
```

`addOrder` (in `StoreContext.tsx`) takes that real order — full customer name, email, phone, shipping address, order total — and writes it straight into `localStorage` as plain JSON. `localStorage` has no expiry, no encryption, is readable by any script on the origin (including a future XSS bug or a malicious browser extension), and persists indefinitely on shared/public/kiosk devices even after logout.

The admin side of this store is worse: `godgifted_admin_users` implies admin account records are also intended to sit in browser storage.

**Why it matters.** This is a direct violation of "data must not be stored in local storage," and it's a real PII exposure: anyone with script execution on the page (or physical/browser access to the device) can read every order ever placed on that browser — name, phone, address, email, order value — in cleartext, indefinitely.

**Solution.**
1. **Remove `StoreContext` from the live order/customer/admin path entirely.** The real Prisma-backed API (`/api/orders`, `/api/admin/orders/*`, `/api/customers`, `/api/admin-users`) already does everything `StoreContext` fakes — correctly, server-side, and with proper auth checks (confirmed in `middleware.ts`).
2. Delete the `addOrder(createdOrder)` call in `Checkout.tsx` — it's dead weight now that the order is already persisted server-side.
3. Delete the `localStorage` hydrate/persist `useEffect` pairs in `StoreContext.tsx` for **orders, customers, admin users, purchase orders, inventory transactions, notifications, and settings** — none of these should ever live client-side unencrypted. If some of `StoreContext`'s non-sensitive UI-only state (e.g. transient filters) is still wanted, keep it in plain React state, not `localStorage`.
4. Any admin dashboard page still importing `useStore()` for orders/customers should be pointed at the same React Query hooks already used elsewhere (`api.get('/orders')`, etc. — see `Orders.tsx`, which already does this correctly for its main table).
5. Audit is complete for `CartContext`/`WishlistContext` too — these store only product IDs/quantities (not PII), which is an acceptable, industry-standard use of `localStorage`. **No change required there.**

---

### 1.2 Password-reset token stored in `sessionStorage` (High)

**Problem.** In `src/modules/auth/VerifyResetForm/VerifyResetForm.tsx`:

```ts
export const RESET_TOKEN_STORAGE_KEY = 'himmat_reset_token';
...
sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, result.resetToken);
```

and then read back in `ResetPasswordForm.tsx` to authorize the actual password change. This token is short-lived and server-verified (`src/lib/password-reset.ts` signs a scoped JWT with a 15-minute expiry — good design there), but the **transport/storage choice** is wrong: any script running on the page (XSS, malicious browser extension, dev tools left open on a shared machine) can read it and hijack the reset flow while it's valid.

**Solution.** Have `/api/auth/verify-reset-otp` set the reset token as a **short-lived, httpOnly, `Secure`, `SameSite=Lax` cookie** (`himmat_resetToken`, 15 min max-age — mirroring the existing pattern already used correctly in `src/lib/auth.ts` for the session cookie), instead of returning it in the JSON body for the client to store. `reset-password/route.ts` then reads the cookie server-side instead of accepting `resetToken` in the request body. This removes the token from JS-readable storage entirely and reuses a pattern already proven correct elsewhere in this codebase.

---

### 1.3 No admin alert/email when a customer reaches the QR payment page (Critical — your requirement)

**Problem.** `POST /api/orders` (`src/app/api/orders/route.ts`) creates the `Order` (`status: AWAITING_PAYMENT`) and its `Payment` (`status: PENDING`, `method: MANUAL_QR`) inside a DB transaction — this **is** the moment the customer lands on the QR payment / order-confirmed page. Nothing after that transaction notifies anyone. The `Notification` Prisma model exists in `schema.prisma` but is **never written to** by any API route (confirmed — zero references to `prisma.notification` anywhere in `src/app/api`). `lib/email.ts` only implements `sendPasswordResetEmail`; there is no order-related email function at all.

**Solution.** Add two things directly after the order transaction succeeds in `POST /api/orders`:

**a) In-app admin alert** — write a `Notification` row (table already exists, just unused):

```ts
// after the $transaction block succeeds, alongside the existing
// inventoryTransaction / customer.update calls:
await prisma.notification.create({
  data: {
    title: 'New order awaiting payment',
    message: `${data.customerName} placed order ${orderNumber} — ₹${grandTotal} — awaiting QR payment verification.`,
    orderId: createdOrderId,
  }
}).catch(() => {})
```

Then add a small, authenticated polling endpoint for the dashboard bell icon:

```ts
// src/app/api/admin/notifications/route.ts
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return createErrorResponse('Unauthorized', 401)
  const notifications = await prisma.notification.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  })
  return createResponse({ success: true, data: notifications })
}
```

Poll this every 20–30s from `DashboardLayout.tsx` (simplest option, no new infra) or, if you want true real-time, use Server-Sent Events (`ReadableStream` from a Next.js route) since your deployment target likely doesn't have a persistent WebSocket server. Polling is the pragmatic choice for a Next.js serverless deployment and is what most "popular systems" (Shopify admin, WooCommerce) also effectively do.

**b) Admin email** — add a real function to `lib/email.ts` (it already has all the SMTP plumbing, deliverability headers, and error handling built — it just needs an order-specific template, mirroring `sendPasswordResetEmail`):

```ts
export async function sendAdminOrderAlertEmail(order: {
  orderNumber: string; customerName: string; customerEmail: string;
  grandTotal: number; currency?: string;
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(`[email:dev] Skipping admin alert email — ${v.reason}`)
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const to = process.env.ADMIN_ALERT_EMAIL || BRAND.supportEmail
  const headers = buildDeliverabilityHeaders(cfg, to, 'order')
  const subject = `New order ${order.orderNumber} — awaiting payment verification`
  const text = `Order ${order.orderNumber} from ${order.customerName} (${order.customerEmail}) ` +
    `for ${order.currency || ''}${order.grandTotal} is awaiting QR payment verification. ` +
    `Review it in the admin dashboard.`
  await transporter.sendMail({ from: cfg.from, to, replyTo: cfg.from, subject, text, headers })
}
```

Call it (fire-and-forget, don't block the customer's checkout response on SMTP latency):

```ts
sendAdminOrderAlertEmail({
  orderNumber, customerName: data.customerName, customerEmail: data.customerEmail, grandTotal,
}).catch(err => console.error('[order] admin alert email failed', err))
```

---

### 1.4 No customer email/alert when admin approves payment (Critical — your requirement)

**Problem.** `PATCH /api/admin/orders/[id]/payment` (`src/app/api/admin/orders/[id]/payment/route.ts`) already correctly transitions `Payment.status → PAID` and `Order.status → CONFIRMED`, inside a transaction, with an internal audit note. But — same gap — nothing notifies the customer.

**Solution.** Inside that route, right after the `$transaction` returns `updated` (for the `decision === 'PAID'` branch only):

```ts
if (decision === 'PAID') {
  sendCustomerPaymentApprovedEmail({
    to: updated.customerEmail,
    customerName: updated.customerName,
    orderNumber: updated.orderNumber,
    grandTotal: updated.grandTotal,
  }).catch(err => console.error('[payment] customer email failed', err))

  await prisma.notification.create({
    data: {
      title: 'Payment verified',
      message: `Payment confirmed for order ${updated.orderNumber}.`,
      orderId: orderId,
    }
  }).catch(() => {})
}
```

with a matching template added to `lib/email.ts`:

```ts
export async function sendCustomerPaymentApprovedEmail(params: {
  to: string; customerName: string; orderNumber: string; grandTotal: number;
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) { console.log(`[email:dev] Skipping payment-approved email — ${v.reason}`); return }
  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, params.to, 'order')
  const subject = `Payment confirmed — order ${params.orderNumber}`
  const text = `Hi ${params.customerName},\n\nWe've confirmed your payment of ` +
    `${params.grandTotal} for order ${params.orderNumber}. Your order is now being processed.\n\n` +
    `— The ${BRAND.companyName} Team`
  await transporter.sendMail({ from: cfg.from, to: params.to, replyTo: cfg.from, subject, text, headers })
}
```

(Use the same HTML-styled card pattern already in `sendPasswordResetEmail` for a branded version — the scaffolding is identical, just swap the copy.)

For **customer-side alerts** (not just email), add a lightweight `GET /api/customer/notifications` in the same shape as the admin one, filtered by `orderId IN (customer's orders)`, and surface it as a bell icon on `/account`.

**Do the same for every other transition an actual customer cares about** — `PROCESSING`, `SHIPPED` (with tracking number), `DELIVERED`, `CANCELLED`, `REFUNDED` — by adding the same two calls (email + `Notification` row) inside `PATCH /api/admin/orders/[id]/status` (`src/app/api/admin/orders/[id]/status/route.ts`), which already has all these transitions correctly gated by the `ORDER_STATUS_TRANSITIONS` state machine. This is a small, mechanical repeat of the pattern above per status — not new architecture.

---

### 1.5 Order status system — already correct, just needs to be the *only* system

**Good news:** you asked for an order flow with "pending, processing, cancelled, delivered, like a popular system." That state machine **already exists** and is enforced server-side:

```
AWAITING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → REFUNDED
       ↓                ↓            ↓            ↓
   CANCELLED        CANCELLED   CANCELLED    CANCELLED
```
(`ORDER_STATUS_TRANSITIONS` in `src/app/api/admin/orders/[id]/status/route.ts`, and the parallel `ALLOWED_PAYMENT_TRANSITIONS` for `PENDING → PAID/FAILED → REFUNDED` in the payment route.) Illegal transitions are rejected with a 409, stock is correctly restored on cancellation, and every change writes an `InternalNote` audit trail. This is genuinely production-grade order-state design — **do not let anyone "simplify" or replace it with the `StoreContext` version**, which uses a looser, unvalidated `status` string (`"Refunded"`, `"Pending"` — inconsistent casing, no transition guards) and would reintroduce exactly the bugs (double-cancel, stock corruption, skipped states) that the real API already prevents.

**Action:** No new state machine needed. Just (a) wire notifications into it per §1.3/1.4, and (b) make sure the admin dashboard and customer-facing order pages read status **only** from `/api/orders*`, never from `useStore()`.

---

### 1.6 Invoice / dialog is not responsive (Medium)

**Problem.** `OrderInvoice` in `src/app/pages/dashboard/Orders.tsx` is hardcoded to print/PDF dimensions:

```tsx
style={{
  width: "794px",       // A4 at 96dpi
  minHeight: "1123px",
  ...
}}
```

and rendered directly inside the order-details `Dialog`:

```tsx
<div className="p-6 bg-[#f0f0f0]">
  <div className="shadow-xl rounded overflow-hidden">
    <OrderInvoice order={selectedOrder} invoiceRef={invoiceRef} settings={settings} />
  </div>
</div>
```

with no scaling or scroll handling for the containing dialog. On any viewport under ~850px (i.e. most phones/tablets, and the admin dashboard is explicitly meant to be used on mobile too), this either overflows the dialog or gets clipped by `overflow-hidden`.

**Solution.** The 794px fixed canvas is *correct and necessary* for the print/PDF export (A4 pixel-perfect output) — keep it there. Just don't render it 1:1 on-screen. Wrap the on-screen preview in a horizontally-scrollable, width-capped container, or scale it down with CSS on small viewports:

```tsx
<div className="p-3 sm:p-6 bg-[#f0f0f0] overflow-x-auto">
  <div
    className="shadow-xl rounded mx-auto origin-top"
    style={{
      width: 794,
      transform: `scale(${Math.min(1, (typeof window !== 'undefined' ? window.innerWidth - 48 : 794) / 794)})`,
    }}
  >
    <OrderInvoice order={selectedOrder} invoiceRef={invoiceRef} settings={settings} />
  </div>
</div>
```
(Compute the scale factor with a `useEffect`/`resize` listener or a simple CSS `@media` clamp rather than inline `window` access, to stay SSR-safe — the snippet above is illustrative.) The `invoiceRef` used for `html2canvas`/print should stay unscaled (render at native 794px off-screen or in the print window as it already does) so export quality isn't affected.

**Also do a general pass** on: the order-confirmed/QR page (verify the QR image + order summary stack cleanly under ~375px width), and any admin table without `overflow-x-auto` (most already have it — `Orders.tsx`, `Inventory.tsx`, `PurchaseOrders.tsx` mostly do; double-check `PurchaseOrders.tsx`'s first table around line 280, which is missing the wrapper the second one on the page has).

---

## 2. Additional Security Hardening (found during audit, not explicitly requested but relevant to "fully secured")

| # | Finding | Risk | Fix |
|---|---|---|---|
| 2.1 | `rate-limit.ts` is a pure in-memory token bucket, keyed off `x-forwarded-for`. | On serverless/multi-instance hosting, each instance has its own counter, so the effective limit is `N × instances`. The header is also trusted as-is — spoofable unless your proxy strips/overwrites it. | Move to a shared store (Redis/Upstash) for real distributed rate limiting, and make sure your reverse proxy (Vercel, nginx, Cloudflare) is configured to overwrite `x-forwarded-for` rather than pass through client-supplied values. |
| 2.2 | `bcrypt.hash(password, 10)` for both admin and customer accounts. | 10 rounds was reasonable a few years ago; 12 is the current baseline recommendation for interactive login. | Bump to `bcrypt.hash(password, 12)` in `customer/signup/route.ts` (admin creation route too). Low effort, no migration needed — only affects new hashes. |
| 2.3 | No explicit CSRF token; relying solely on `SameSite=Lax` cookies. | `SameSite=Lax` already blocks the classic cross-site `<form>` POST CSRF case, which covers most real risk here — this is **not urgent**, but it's single-layered. | For defense-in-depth on state-changing admin routes (order status/payment changes, refunds), consider a double-submit CSRF token, especially before adding any `SameSite=None` integration (e.g. an embedded payment widget) later. |
| 2.4 | `/api/seed` creates a default admin (`admin` / `admin123`) — correctly disabled when `NODE_ENV=production`. | Low as shipped, but only one env var stands between this and a public, guessable superuser account. | Keep the guard, and additionally delete/rotate this seeded account immediately after first deploy; don't rely solely on `NODE_ENV` being set correctly everywhere. |
| 2.5 | `prisma/schema.prisma` targets `postgresql`, but the repo ships `prisma/dev.db` (a SQLite file) alongside it. | If this file was ever a snapshot of real orders/customers, shipping it in the repo/zip is a data leak; at minimum it's dead weight and a source of confusion about which DB is authoritative. | Confirm `dev.db` contains only seed/test data, then remove it from version control and add `*.db` to `.gitignore`. |
| 2.6 | No HTTP security headers observed (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`). | Increases blast radius of any future XSS (no CSP to contain it) and clickjacking exposure on the admin login. | Add a `headers()` block in `next.config` (or middleware) setting at minimum `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP scoped to your actual script/style/img sources. |
| 2.7 | Admin dashboard reachable at a fixed, guessable-once-known path (`/himmat_admin_8526`). | Obscurity isn't a security boundary — fine as a minor speed bump, but the real protection must (and does) come from `middleware.ts`'s server-side auth check, which is correctly in place. | No change required to auth logic; just don't treat the obscure path itself as a security control in your own mental model. |
| 2.8 | `src/lib/cookie-utils.ts` (client-side `document.cookie` read/write helpers, including a `SESSION_TOKEN` name constant) exists but has zero importers anywhere in the app. | Not currently exploitable since it's unused — but it's a loaded gun sitting in the repo: if anyone ever calls `setCookie(COOKIE_NAMES.SESSION_TOKEN, ...)` from client code "to fix a bug," it would silently reintroduce a JS-readable session token next to the correct httpOnly one. | Delete the file, or at minimum remove `SESSION_TOKEN` from `COOKIE_NAMES` so it can't be reached for for that purpose. |

---

## 3. Login / Signup Review

This part of the codebase is solid; only the item below needs a change (already covered as §1.2, repeated here for completeness of the auth review you asked for):

- ✅ Passwords hashed with bcrypt, never returned in API responses (`SAFE_CUSTOMER_SELECT` / explicit `passwordHash` stripping in `auth/login/route.ts`).
- ✅ Session stored as a signed JWT in an `httpOnly`, `Secure` (prod), `SameSite=Lax` cookie — not `localStorage`, not a JS-readable cookie.
- ✅ Strong password policy enforced server-side via `passwordSchema` (12+ chars, mixed case, number, symbol) — good, this isn't just client-side validation that can be bypassed.
- ✅ Rate limiting on login/signup/reset endpoints (see §2.1 for the one caveat on how it's implemented).
- ✅ Route-level auth enforced centrally in `middleware.ts` for both admin dashboard pages and sensitive API prefixes — not left to each page to remember.
- ❌ Password-reset token in `sessionStorage` — fix per §1.2.
- ⚠️ bcrypt cost factor — bump per §2.2.

---

## 4. Priority & Effort Matrix

| Priority | Item | Effort |
|---|---|---|
| 🔴 Critical | 1.1 — Stop writing orders/customers/admin data to `localStorage` via `StoreContext` | Medium (delete code + retest checkout/dashboard) |
| 🔴 Critical | 1.3 — Admin alert + email when order reaches QR/payment-pending state | Small (pattern given above) |
| 🔴 Critical | 1.4 — Customer alert + email on payment approval (and other status changes) | Small–Medium (repeat pattern across statuses) |
| 🟠 High | 1.2 — Move reset token out of `sessionStorage` into httpOnly cookie | Small |
| 🟡 Medium | 1.6 — Responsive invoice rendering in dialog | Small |
| 🟡 Medium | 2.1 — Distributed rate limiting | Medium (infra dependency) |
| 🟢 Low | 2.2, 2.4, 2.5, 2.6, 2.7, 2.8 — hardening cleanup items | Small each |

---

## 5. Suggested Rollout Order

1. **Notifications first** (§1.3, §1.4) — highest visible value, purely additive, zero risk to existing order logic since it only adds side effects after transactions that already succeed.
2. **Kill the localStorage duplicate order/customer store** (§1.1) — do this right after, since once notifications read from the real `Notification` table, there's no remaining reason for any page to fall back to `useStore()` for orders/customers/admin users.
3. **Reset-token cookie migration** (§1.2) — isolated, low-risk, ship independently.
4. **Invoice responsiveness** (§1.6) — cosmetic, ship whenever convenient.
5. **Hardening pass** (§2) — batch into a follow-up chore ticket; none of these are blockers to the notification/security requirements above.




Read the document "HIMMAT_TEA_AUDIT.md" properly and apply the imporvement as per this document.