# QA / Security Audit — Order & Payment System
**Project:** Himmat Tea (Next.js App Router + Prisma)
**Scope:** `POST/GET /api/orders`, `GET/PUT/DELETE /api/orders/[id]`, `src/app/pages/Checkout.tsx`, `src/lib/auth.ts`, `src/middleware.ts`
**Reviewer role:** Senior QA / Application Security Engineer
**Verdict:** ❌ **NOT production-ready.** The order and payment flow currently allows any unauthenticated user to read, modify, or delete any customer's order, and no real payment ever takes place — the app self-reports orders as "Paid" based on a client-side toggle.

---

## 1. Executive Summary

| Severity | Count | Examples |
|---|---|---|
| 🔴 Critical | 4 | No auth on order detail endpoints, forged payment status, client-controlled pricing, no payment gateway |
| 🟠 High | 5 | No stock/inventory enforcement, mass-assignment on order update, PII exposure, IDOR via `customerId`, missing transactions |
| 🟡 Medium | 6 | No idempotency, no rate limiting, weak middleware JWT check, no order-state machine, no audit trail, silent `alert()` error UX |
| 🟢 Low | 4 | No pagination, inconsistent response envelopes, no input validation library, card fields collected but unused |

**The one bug you likely noticed:** `src/app/api/orders/[id]/route.ts` has **no authentication check at all** on `GET`, `PUT`, or `DELETE`. It isn't covered by `middleware.ts` either (only `/api/admin-users`, `/api/customers`, `/api/seed`, and the admin dashboard are protected). That means:

```
GET    /api/orders/<any-id>     → returns full order incl. customer PII + internal admin notes
PUT    /api/orders/<any-id>     → anyone can overwrite status, paymentStatus, grandTotal, tracking...
DELETE /api/orders/<any-id>     → anyone can delete any order, no ownership check
```

This is the core "problem in the order system" and should be fixed before anything else below.

---

## 2. Critical Findings

### 🔴 C-1: `orders/[id]` endpoints have zero authentication/authorization
**File:** `src/app/api/orders/[id]/route.ts`

- `GET` returns `customer`, `items`, and `internalNotes` (admin-only notes) to **anyone**, logged in or not, for **any order ID** — order IDs are sequential-ish `cuid()`s but still enumerable/guessable in practice via response leakage (e.g., order confirmation emails, referrer headers, browser history).
- `PUT` accepts the raw request body and spreads it directly into `prisma.order.update({ data: body })` with **no field allow-list**. Any caller can set `paymentStatus: "Paid"`, `status: "Delivered"`, `grandTotal: 1`, `refundAmount`, `trackingNumber`, etc.
- `DELETE` removes any order permanently with no ownership or role check.

**Impact:** Full IDOR + mass assignment. A competitor or malicious user can mark unpaid orders as paid, void refunds, leak every customer's name/email/phone/address, or wipe the orders table.

**Fix:**
```ts
const currentUser = await getCurrentUser()
if (!currentUser) return createErrorResponse('Unauthorized', 401)

const order = await prisma.order.findUnique({ where: { id }, include: { customer: true } })
if (!order) return createErrorResponse('Order not found', 404)

const isOwner = 'username' in currentUser ? false : order.customerId === currentUser.id
const isAdmin = 'username' in currentUser
if (!isOwner && !isAdmin) return createErrorResponse('Forbidden', 403)

// Customers: only expose their own order, strip internalNotes unless admin
// PUT: allow-list fields by role — customers should NOT be able to set status/paymentStatus/grandTotal at all
```
Also add `/api/orders/:path*` to `middleware.ts`'s matcher (as defense in depth), though the real fix must live in the route handler since middleware alone can't do per-record ownership checks.

---

### 🔴 C-2: No real payment gateway — `paymentStatus` is a client-side lie
**File:** `src/app/pages/Checkout.tsx` (`handlePlaceOrder`), `src/app/api/orders/route.ts`

```ts
paymentStatus: paymentMethod === "card" ? "Paid" : "Unpaid",
```

- Card number/expiry/CVV are collected in the UI, validated with Luhn-less length checks, and then **never sent anywhere** — not to the API, not to eSewa/Khalti/a card processor. They're just discarded.
- There is no eSewa or Khalti redirect/SDK integration, no server-side signature verification, no webhook handler, and no payment intent/transaction record anywhere in the codebase.
- The server (`POST /api/orders`) trusts whatever `paymentStatus` the client sends and stores it verbatim.

**Impact:** Every "card" order is marked `Paid` in the database despite no money ever moving. This is a **financial-integrity-breaking bug**, not a UX gap — the admin dashboard, revenue analytics, and fulfillment queue will all treat unpaid orders as paid.

**Fix:**
- Never trust `paymentStatus` from the client. New orders must always be created as `Pending` / `Unpaid`.
- Integrate real gateways server-side:
  - eSewa/Khalti: redirect to their hosted checkout, verify the callback/webhook signature server-side, then flip `paymentStatus` to `Paid` only after verification.
  - Card: use a PCI-compliant processor (Stripe, etc.) with hosted fields/Elements — **the app must never touch raw PAN/CVV**, which it currently does in local React state.
- Add a `Payment`/`Transaction` table (gateway, reference id, amount, status, raw callback payload, timestamps) instead of a single string field on `Order`.

---

### 🔴 C-3: Order pricing is entirely client-supplied
**File:** `src/app/api/orders/route.ts` (`POST`)

```ts
items: {
  create: items.map((item: any) => ({
    productId: item.productId,
    name: item.productName || item.name,
    quantity: item.quantity,
    price: item.price          // ← trusted from the client
  }))
},
data: { ...orderData, ... }     // total, tax, grandTotal all spread verbatim from client body
```

The server validates that `productId`s exist, but **never re-fetches the authoritative price from `Product.price`** and never recomputes `total`/`tax`/`grandTotal` server-side. `Checkout.tsx` computes these in the browser and posts them as-is.

**Impact:** Trivial price tampering via devtools/curl — a customer can buy Rs. 3,200 tea for Rs. 1. Combined with C-2 (fake "Paid" status), this is a direct revenue-loss vector.

**Fix:**
```ts
const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
const priceMap = new Map(products.map(p => [p.id, p.price]))
const lineItems = items.map(i => ({ ...i, price: priceMap.get(i.productId) }))
const total = lineItems.reduce((s, i) => s + i.price * i.quantity, 0)
const tax = total * (settings.taxRate / 100)
const grandTotal = total + tax
// use these server-computed values; ignore client-sent total/tax/grandTotal
```

---

### 🔴 C-4: `customerId` defaults to `1` when unresolvable
**File:** `src/app/api/orders/route.ts`

```ts
let customerId = orderData.customerId
if (!customerId && currentUser && !('username' in currentUser)) {
  customerId = currentUser.id
}
...
customerId: customerId || 1,
```

Two problems compound here:
1. `orderData.customerId` is read straight from the request body **before** checking the authenticated session — a logged-in customer can pass someone else's `customerId` in the payload and the order (and the `ordersCount`/`totalSpent` increment) will be attributed to that other customer.
2. If no `customerId` resolves at all (e.g., unauthenticated request, malformed body), the code silently falls back to **customer ID `1`** rather than rejecting the request. Every "orphaned" order gets attached to whatever account happens to be ID 1, polluting that customer's order history and stats, and potentially exposing their data if their `totalSpent`/`ordersCount` is used for tier/loyalty logic.

**Fix:**
```ts
if (!currentUser) return createErrorResponse('Unauthorized', 401)
const customerId = 'username' in currentUser ? orderData.customerId : currentUser.id
if (!customerId) return createErrorResponse('customerId is required', 400)
// never fall back to a hardcoded id
```

---

## 3. High-Severity Findings

### 🟠 H-1: No inventory/stock enforcement or decrement
`Product.stock` exists in the schema but `POST /api/orders` never checks `quantity <= stock` and never decrements it on order creation (nor restores it on cancellation/refund). Concurrent checkouts can oversell a limited batch of tea indefinitely.
**Fix:** wrap order creation + stock decrement in a single `prisma.$transaction`, using a conditional update (`WHERE stock >= quantity`) to prevent race conditions, and reject the order (or partially fail) if stock is insufficient.

### 🟠 H-2: Order creation is not atomic
```ts
const order = await prisma.order.create({...})
if (order.customerId) {
  await prisma.customer.update({ ... increment ordersCount/totalSpent ... })
}
```
These are two separate writes. If the process crashes or the second call fails between them, the order exists but the customer's stats silently drift out of sync — and there's no compensating logic anywhere. Combine with H-1's stock decrement, this should all be one `prisma.$transaction([...])`.

### 🟠 H-3: `GET /api/orders` leaks all orders to *any* authenticated admin-shaped object, no role check
```ts
if ('username' in currentUser) {
  orders = await prisma.order.findMany({ include: { customer: true, items: true }, ... })
}
```
Any account where `getCurrentUser()` returns an object with a `username` field (i.e., any admin, regardless of role) can list **every order for every customer**, including PII (`customerEmail`, `customerPhone`, `shippingAddress`). There's no distinction between `admin` and `superadmin`, and no field-level redaction for lower-privileged staff roles if you intend to add them later.

### 🟠 H-4: PII and payment-adjacent data returned unfiltered
`internalNotes` (admin-only order notes, potentially containing sensitive fraud/refund commentary) are returned by `GET /api/orders/[id]` regardless of who's asking (see C-1). Even once auth is added, the response shape should be role-scoped (customers should never see `internalNotes`, `refundReason`, etc. verbatim, or at least these need a product decision).

### 🟠 H-5: Coupons API has no auth
`src/app/api/coupons/route.ts` — `GET`/`POST` have no `getCurrentAdmin()` check. Anyone can create arbitrary discount coupons (`{ code: "FREE100", discountPercent: 100 }`) and apply them at checkout if the checkout flow trusts coupon codes without re-validating server-side. Out of strict "order" scope but directly impacts order economics — flag for the same audit pass.

---

## 4. Medium-Severity Findings

| ID | Issue | Where |
|---|---|---|
| M-1 | No idempotency key on `POST /api/orders` — double-click "Place Order" or a network retry creates duplicate orders (and duplicate `totalSpent` increments). | `Checkout.tsx` / `orders/route.ts` |
| M-2 | No rate limiting on order creation, login, or coupon endpoints — brute-forceable, abusable for stock exhaustion/spam orders. | all `/api` routes |
| M-3 | `middleware.ts`'s `verifyAdminToken` base64-decodes the JWT payload **without verifying the signature** (`decodeTokenBase64` just splits on `.` and calls `atob`). It happens to gate the same routes that separately re-verify with `getCurrentAdmin()` (real `jwt.verify`) inside the handler, so it isn't a full bypass today — but it's a routing-layer trust boundary that *looks* like real auth and isn't. Anyone relying on middleware alone in future routes will introduce a signature-bypass vuln. | `src/middleware.ts` |
| M-4 | No explicit order status state machine — `PUT` accepts any string for `status`/`paymentStatus`, allowing invalid transitions (e.g., `Delivered` → `Pending`, or skipping `Paid` before `Shipped`). | `orders/[id]/route.ts` |
| M-5 | No audit log for who changed an order's status/refund/tracking — `InternalNote` exists but is never written to automatically. | order update flow |
| M-6 | Checkout UX swallows all errors into a generic `alert("Failed to place order...")` — no distinction between validation errors, stock-out, payment failure, or server error, and no Sentry/monitoring hook. | `Checkout.tsx` |

---

## 5. Lower-Severity / Hardening Notes

- **L-1:** Raw card number/expiry/CVV are held in unmasked React state (`cardData`) for the component's lifetime — even though unused today, this is a PCI-DSS red flag the moment a real integration is wired up naively. Use a hosted-fields/iframe solution (Stripe Elements, etc.) so card data never touches app JS.
- **L-2:** API responses are inconsistent — some routes return `{ success, data }`, others return the raw object (`orders/[id]` GET), others `{ error }`. Standardize an envelope for easier client-side and QA automation.
- **L-3:** `GET /api/orders` has no pagination — will degrade badly once order volume grows.
- **L-4:** No schema validation library (e.g., zod, already used in `auth.ts`) on the orders routes — `request.json()` bodies are used with implicit `any` typing throughout `orders/route.ts`.

---

## 6. Recommended Remediation Order

1. **C-1** — Lock down `orders/[id]` (auth + ownership + field allow-list). *Ship this first; it's an active data-exposure/tampering hole in production.*
2. **C-3 + C-4** — Move price/tax/total computation and `customerId` resolution server-side; remove the `|| 1` fallback.
3. **C-2** — Replace the fake payment toggle with real gateway integration (or, as an interim step, force all new orders to `Unpaid`/`Pending` until a human/admin confirms payment out-of-band, if launching before gateway integration is ready).
4. **H-1 + H-2** — Wrap order + stock + customer-stats writes in a Prisma transaction; add stock checks.
5. **H-3 + H-4 + H-5** — Role-scope responses, lock down coupons.
6. **M-1..M-6** — Idempotency key, rate limiting, real JWT verification in middleware, status state machine, audit trail, structured error handling.

---

## 7. Suggested Test Cases for QA Regression Suite

- [ ] Unauthenticated `GET /api/orders/{id}` → expect `401`, not order data.
- [ ] Customer A authenticated, requests `GET /api/orders/{orderOfCustomerB}` → expect `403`.
- [ ] Customer authenticated, `PUT /api/orders/{ownOrderId}` with `{ "paymentStatus": "Paid" }` → expect rejection (customers can't self-mark paid).
- [ ] `POST /api/orders` with a tampered `price` lower than the catalog price → expect server-computed price used, not client price.
- [ ] `POST /api/orders` for a product with `stock = 0` → expect `409/400`, not order creation.
- [ ] Two concurrent `POST /api/orders` for the last unit of stock → expect exactly one success.
- [ ] Double-submit "Place Order" (simulate network retry) → expect one order, not two.
- [ ] `POST /api/orders` without a `customerId` and without a valid session → expect `401`, never falls back to customer id `1`.
- [ ] `DELETE /api/orders/{id}` as a non-admin → expect `403`.
- [ ] Forged JWT with unsigned/invalid signature but a `type: admin` payload → expect rejection at every layer (not just the route handler).

---

*This audit covers the order/payment code paths only. A full pass should also cover `purchase-orders`, `inventory/transactions`, and `coupons` (flagged above) before this system is considered launch-ready.*
