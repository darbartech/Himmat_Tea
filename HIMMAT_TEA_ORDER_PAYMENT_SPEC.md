# Himmat Tea — Real Order & Payment Flow System Specification

**Author role:** Senior Full-Stack Architect / E-commerce Engineer / Security Engineer / UX Specialist
**Basis:** Direct inspection of the uploaded `Himmat_Tea.zip` codebase (Next.js App Router, Prisma/PostgreSQL, no external payment SDKs present).
**Guiding priority:** Simplicity → Security → Correctness → Maintainability → Future extensibility.

---

## 1. Executive Summary

Himmat Tea already has a real, working **customer-facing** order pipeline: a cart, a 2-step checkout, a Prisma-backed `Order`/`OrderItem` schema, and a customer-facing "My Orders" page that reads real data from `/api/orders`. That part is closer to done than it looks.

What's broken is not "the UI needs more features" — it's that **the order system currently cannot be trusted as a source of truth**, for three independent reasons:

1. **The admin side of the app is not wired to the real database at all.** The Orders/Analytics/Inventory/Dashboard-home admin screens read and write a per-browser `localStorage` mock (`StoreContext`), while real customer orders are written to Postgres via `/api/orders`. **Admins looking at the "Orders" tab today are not looking at real customer orders.**
2. **Payment is not real.** The checkout UI collects card details that are discarded, and unilaterally decides `paymentStatus: "Paid"` in the browser before sending the order to the server, which stores that value as-is.
3. **The order API trusts the client for money-relevant fields** (price, tax, total, payment status) and has an unauthenticated, unrestricted read/write/delete endpoint for individual orders.

None of this requires a rewrite. It requires: connecting the admin UI to the real API, replacing the fake "Paid" toggle with a manual QR-and-verify flow, and moving all pricing/authorization logic server-side. Everything else in the existing schema (Customer, Order, OrderItem, Settings, InventoryTransaction) is well-shaped and should be **kept and extended**, not replaced.

---

## 2. Existing Project Audit

### 2.1 Frontend — what exists today

| Piece | File(s) | Status |
|---|---|---|
| Cart | `src/context/CartContext.tsx`, `src/app/cart/page.tsx` | Real, client-side state, feeds checkout |
| Checkout | `src/app/pages/Checkout.tsx` (2 steps: Shipping → Payment) | Real form + validation; **payment step is fake** (see §2.4) |
| Customer info collection | Checkout step 1 | Name, email, phone, address, city, province, postal, country — reasonable set, arguably one field too many (postal code is not commonly used/verified in Nepal addresses; see §4) |
| Order summary | Checkout right rail | Real cart data; **shipping is hardcoded to "Free"** with no server-side shipping model at all |
| Payment UI | Checkout step 2 | Three fake "payment methods" (eSewa, Khalti, Card) — none are integrated; card fields are collected and never transmitted anywhere |
| Order confirmation | `src/app/order-confirmed/page.tsx` → `OrderConfirmed.tsx` | **100% static.** No order ID is read from the URL, no API call is made. It shows generic "Order Confirmed" copy and a hardcoded list of "suggested products" regardless of what was actually ordered. The real order created by `/api/orders` is never displayed back to the customer. |
| Order history | `src/app/account/page.tsx` → `CustomerAccount.tsx` | **Real.** Calls `GET /api/orders` and paginates actual DB orders. This is the one part of the customer-facing order UI that is fully wired correctly. |
| Admin order list | `src/app/himmat_admin_8526/dashboard/orders/page.tsx` → `dashboard/Orders.tsx` | **Fake.** Reads/writes exclusively through `useStore()` (`StoreContext`), which is backed by `localStorage`, not the database. |
| Loading/error states | Checkout: none beyond a blocking `alert()`. Account page: has proper loading/error states. | Inconsistent — checkout needs the same treatment as the account page. |
| Dummy/static data | `OrderConfirmed.tsx` suggested products; admin dashboard's entire order/customer-stats view (from localStorage seed data) | Must be removed per the "no dummy order data" requirement. |

### 2.2 Backend — what exists today

| Concern | File | Status |
|---|---|---|
| Order create | `POST /api/orders` (`src/app/api/orders/route.ts`) | Validates that `productId`s exist. **Does not** re-price items, recompute tax/total, check stock, or reject a client-forced `paymentStatus`. Falls back to `customerId: 1` if none resolves — never rejects. |
| Order list | `GET /api/orders` | Branches on admin vs customer correctly (admin sees all, customer sees own) — this part's logic is sound, just needs the admin UI to actually call it. |
| Order detail | `GET/PUT/DELETE /api/orders/[id]` | **No authentication at all.** Anyone can read any order (incl. `internalNotes`), overwrite any field including `status`/`paymentStatus`/`grandTotal`, or delete any order. |
| Product validation | `POST /api/orders` | Existence check only; no price/stock check |
| Stock management | *(nowhere in the order flow)* | `Product.stock` exists in schema but is never read or decremented during checkout. Stock is only ever touched from the admin Inventory screen (itself running on the localStorage mock — see §2.1). |
| Price calculation | Checkout.tsx (client) | Computed entirely in the browser (`cartTotal`, `tax`) and posted as-is; server does not recompute. |
| Tax calculation | Checkout.tsx (client), using `settings.taxRate` from `StoreContext` (localStorage) | Client trusts a **locally cached, potentially stale/tampered** tax rate rather than the server's `Settings` row. |
| Shipping calculation | *(does not exist)* | Hardcoded "Free" in the UI; no field on `Order` for it either. |
| Order creation | `POST /api/orders` | Two non-atomic writes: `order.create` then `customer.update` for stats — no transaction, no rollback on partial failure. |
| Order status | `Order.status` (String, default `"Pending"`) | Free-text string, any value acceptable via `PUT`, no state machine enforcement anywhere. |
| Payment status | `Order.paymentStatus` (String, default `"Unpaid"`) | Set by the **client** at order-creation time; no payment record, no verification step, no gateway, no audit trail. |
| Database schema | `prisma/schema.prisma` | See §2.3 |
| AuthN/AuthZ | `src/lib/auth.ts` (JWT via httpOnly cookie, real `jwt.verify`), `src/middleware.ts` (route-level gate) | Auth primitives are solid (`getCurrentUser`, `getCurrentAdmin`) but **not applied** to `/orders/[id]`, `/coupons`, or `/settings` (PUT). `middleware.ts`'s own admin check decodes the JWT payload with `atob()` **without verifying the signature** — it happens to be backed up by real verification inside the route handlers it gates today, but it's not a safe pattern to keep relying on as more routes are added. |
| Admin order management | `dashboard/Orders.tsx` | Full-featured UI (status changes, notes, export, print) — **all of it operating on fake local data.** The UI/UX design itself is good and largely reusable once pointed at the real API. |

### 2.3 Database — existing models and reuse decision

| Model | Keep / Modify / Add | Notes |
|---|---|---|
| `Product` | **Keep.** | Has `price`, `stock`, `status` — exactly what's needed as the pricing/stock source of truth. No changes required for Phase 1–4. |
| `Customer` | **Keep**, minor addition. | Has `ordersCount`, `totalSpent` already. Add nothing unless guest checkout is introduced later (out of scope — see §21). |
| `Order` | **Modify (additive).** | Keep `id` (cuid), `customerId`, contact fields, `total`/`tax`/`grandTotal`, `status`, `orderDate`, `trackingNumber`, `courierPartner`, `refundReason`/`refundAmount`. **Add:** `orderNumber` (human-readable, unique), `shippingCost` (currently missing — shipping is a silent zero today), `paymentId` relation (see new `Payment` model below). Rename nothing — avoid unnecessary churn. |
| `OrderItem` | **Keep.** | `productId`, `name`, `quantity`, `price`, `weight` already model a correctly-snapshotted line item once the server (not the client) writes `price`. |
| `InternalNote` | **Keep.** | Already a good fit for the admin audit trail requirement (§5 Security, §15 Admin) — currently unused by the API; wire it up. |
| `Settings` | **Keep**, add `shippingFlatRate` (or similar) since shipping is currently unmodeled. Lock `PUT /api/settings` behind `getCurrentAdmin()` — currently open to anyone. |
| `InventoryTransaction` | **Keep.** | Already shaped (`type`, `quantity`, `previousStock`, `newStock`, `reason`, `referenceId`) to log stock movements from real orders — currently only a `GET` route exists; add the `POST` that order creation should call. |
| **`Payment` (new)** | **Add.** | Nothing today records a payment attempt/verification separately from the order. This is the single structural addition this spec requires — see §18. |
| `Coupon` | **Keep**, but lock down `POST /api/coupons` behind admin auth (currently open) — out of core scope but flagged since it affects order totals. |
| `Address` (dedicated model) | **Do not add.** | `Order.shippingAddress` as a formatted string, fed by structured checkout fields, is sufficient for this business's scale. Introducing a normalized `Address` table is unnecessary complexity for "no unnecessary payment complexity" scope — revisit only if repeat-address / multi-address-book becomes a real feature request. |

No existing model needs to be dropped or replaced. This audit found one **missing** model (`Payment`) and one **structural wiring gap** (admin UI ↔ real API), not a broken schema.

### 2.4 The three root causes, stated plainly

1. **Admin dashboard is disconnected from the database.** (`StoreContext` / `localStorage`)
2. **No real payment ever happens; "Paid" is a client-side lie.** (Checkout.tsx `paymentStatus` logic)
3. **The order API is the client's rubber stamp, not a source of truth.** (client-trusted price/tax/total, unauthenticated `[id]` route, silent `customerId` fallback)

Everything in §3 onward is designed to fix these three things with the least amount of new surface area.

---

## 3. Problem & Risk Audit Table

| Area | Existing Behavior | Problem | Risk | Recommended Fix |
|---|---|---|---|---|
| Admin dashboard | Reads/writes `localStorage` via `StoreContext` | Orders admins see are not real customer orders | **Critical** — admins can't fulfill real orders from this screen at all today | Rewire `dashboard/Orders.tsx` (and Analytics/DashboardHome/Inventory) to call `/api/orders`, `/api/inventory/transactions`, etc., same pattern already used correctly in `dashboard/Customers.tsx` and `dashboard/Products.tsx` |
| Order confirmation | Static page, no order fetched | Customer never sees their real order number/total; shown irrelevant "suggested products" | Medium — support/trust issue, not a security bug | Fetch the just-created order by ID (passed via query param or route) and render real data; show QR payment here |
| Payment method selection | Three fake methods (eSewa/Khalti/Card), none integrated | Customer believes they've paid; card data collected and dropped | **Critical** — money/trust issue, possible false sense of PCI handling | Replace with a single real method: Manual QR (§6). Remove card fields entirely until a real gateway is integrated (§22) |
| Payment status | Client sets `paymentStatus: "Paid"` for card orders | Server trusts it | **Critical** — every card order looks paid whether or not it was | Server always creates orders as `PENDING`; only admin verification (or, later, a verified gateway webhook) can set `PAID` |
| Order creation — pricing | Client sends `price`, `total`, `tax`, `grandTotal`; server stores as-is | Trivial price tampering | **Critical** — direct revenue loss | Server re-fetches `Product.price`, recomputes subtotal/tax/shipping/grand total; client-sent money fields ignored |
| Order creation — stock | Never checked or decremented | Overselling, no inventory truth | High | Server checks `stock >= quantity` per item inside the same transaction as order creation; decrement atomically (§14) |
| Order creation — `customerId` | Read from request body first; falls back to hardcoded `1` if unresolved | IDOR (attribute order to another customer) + orphaned orders silently dumped on customer #1 | **Critical** | Require an authenticated session; derive `customerId` from the session, never from the body, for customer-initiated orders; never fall back to a hardcoded ID — reject instead |
| Order detail API | `GET/PUT/DELETE /api/orders/[id]` — no auth check | Anyone can read/edit/delete any order | **Critical** | Require session; customers may only `GET` their own order (no `internalNotes`); only admins may `PUT` status/payment fields (field allow-list) or `DELETE`... in practice, disable hard delete for admins too — use `CANCELLED` status instead (see §16) |
| Duplicate submissions | No idempotency key; double-click "Place Order" possible | Duplicate orders, duplicate stock decrement, duplicate `totalSpent` increment | Medium | Idempotency key generated client-side per checkout attempt, enforced server-side with a unique constraint (§13) |
| Order creation atomicity | `order.create` then separate `customer.update` | Partial failure leaves stats out of sync; also no stock write at all today | Medium–High | Wrap order + order items + stock decrement + inventory transaction + customer stats update in one `prisma.$transaction` |
| Tax/shipping calculation | Tax read from `StoreContext` (localStorage, can be stale/tampered); shipping hardcoded "Free," no field | Wrong or manipulable totals; shipping cost unmodeled entirely | Medium | Server reads `Settings.taxRate` (DB) and a `Settings.shippingFlatRate` (new field) at order-creation time; never from client |
| Order status | Free-text string, any value settable via `PUT` | Invalid transitions (e.g., `DELIVERED → PENDING`), no workflow guarantees | Medium | Enforce the finite state machine in §16 server-side |
| Settings API | `PUT /api/settings` has no auth check | Anyone can change tax rate, store name, currency, low-stock threshold | High (affects every future order's totals) | Require `getCurrentAdmin()` |
| Coupons API | `GET/POST /api/coupons` has no auth check | Anyone can create a 100%-off coupon | High (direct revenue loss if checkout ever auto-applies coupon codes) | Require `getCurrentAdmin()` for `POST`; keep `GET` public only if the storefront needs to validate codes, but validate server-side at order time regardless of what the client claims |
| Currency consistency | `Settings.currency` defaults to `"₹"` (Rupee symbol used for India); Checkout UI hardcodes `"Rs."` | Ambiguous currency for a Nepal-based (Bagmati Province) business; `BRAND` config markets Nepali phone format (`+977`) | Low–Medium (business correctness, not security) | Confirm actual operating currency (likely NPR) and make `Settings.currency` the single source the UI reads, instead of a hardcoded `"Rs."` string |
| Error handling | Checkout: generic `alert()` on any failure | No differentiation between validation, stock-out, payment, or server error; no monitoring hook | Low–Medium | Structured error responses + inline UI states (§19) |
| Sensitive data exposure | `GET /api/orders/[id]` returns `internalNotes` to whoever asks (see above); JWT dev fallback secret hardcoded in `auth.ts` (`'himmat-tea-dev-secret-change-in-production'`) used automatically if `JWT_SECRET` unset outside production | Info leakage; risk of the dev secret shipping to a misconfigured non-"production" deploy | Medium | Field allow-listing by role (above); ensure `JWT_SECRET` is always required outside pure local dev, e.g., fail fast unless `NODE_ENV === 'development'` specifically (not just "not production") |

---

## 4. Recommended Minimal Architecture

No new services, no message queues, no separate payment microservice. Everything stays inside the existing Next.js app + Prisma/Postgres:

```
Next.js App Router (existing)
 ├── Storefront (existing, keep)
 ├── Checkout (existing, simplify payment step)
 ├── /api/orders           (existing, harden)
 ├── /api/orders/[id]      (existing, ADD AUTH — this is the critical fix)
 ├── /api/orders/[id]/payment-proof   (new, optional — §8)
 ├── /api/admin/orders/[id]/payment   (new — admin-only payment verification)
 ├── /api/admin/orders/[id]/status    (new — admin-only status transition)
 ├── Prisma/PostgreSQL (existing schema + Payment model)
 └── Admin dashboard (existing UI, REWIRE to real API instead of localStorage)
```

No eSewa/Khalti/Fonepay/card SDK. No queueing system. No microservices. The existing JWT-cookie auth (`src/lib/auth.ts`) is sufficient and should be reused, not replaced.

---

## 5. Customer Order Flow

```
CART → DELIVERY DETAILS → ORDER SUMMARY (review) → PLACE ORDER → QR PAYMENT → PAYMENT PENDING
```

This collapses the existing 2-step checkout (Shipping → "Payment," which currently means picking a fake gateway) into 2 steps with a clearer third screen (order confirmation *is* the QR payment screen):

**Step 1 — Delivery details** (keep existing fields, they're already minimal and appropriate):
- Full name, mobile number, email *(recommend keeping — needed for order lookup and confirmation, see §11)*
- Province, City, Full address, optional landmark
- **Drop:** postal code as a required field — Nepali addresses are not reliably structured around postal codes and the app doesn't use it for anything (no shipping-rate lookup depends on it). Keep it optional if the business wants it for courier handoff.

**Step 2 — Review & Place Order:**
- Existing order summary panel (cart items, subtotal) — extend to also show tax and the new shipping line once real shipping is modeled (§14 keeps shipping flat-rate/free by policy, just make it an explicit `Settings` value instead of a hardcoded string).
- Single "Place Order" action. No payment method picker needed in Phase 1 since there's only one method (QR).

**Step 3 — QR Payment / Order Confirmation (merged):**
- Real order number, real grand total, real QR image, "Awaiting Verification" status — see §6.

---

## 6. Payment QR Flow — Phase 1

No eSewa/Khalti/Fonepay integration yet, per the constraint. After the server successfully creates the order:

```
Order Confirmed
Order #HT-20260810-000123
Amount to Pay: NPR 4,850

[ Business QR code image ]
Scan this QR using your banking/payment app to pay.

Payment Status: Awaiting Verification
```

Rules:
- The QR is a **single static image** the business controls (e.g., served from `/public/payment-qr.png`, swappable by an admin without a deploy if wired to `Settings`).
- Never show "Payment Successful" until an admin (or, later, a verified webhook) has actually set the payment to `PAID`.
- No fake transaction IDs are generated client-side.
- This screen doubles as the real order-confirmation page — replacing today's static `OrderConfirmed.tsx`.

---

## 7. Payment Verification

```
Customer places order        → Order: AWAITING_PAYMENT   Payment: PENDING
Customer pays via QR (off-app)
Admin sees order in dashboard, confirms funds received in their bank/wallet
Admin clicks "Verify Payment" → Payment: PAID             Order: CONFIRMED
                                  (or)
Admin clicks "Reject Payment"  → Payment: FAILED           Order: CANCELLED
```

After `CONFIRMED`: `PROCESSING → SHIPPED → DELIVERED`, all admin-only transitions (§16).

**Who can change what:**

| Actor | Can do |
|---|---|
| Customer | Create order (server computes all money fields); view own order(s); nothing else |
| Admin | Verify/reject payment; move order through `CONFIRMED → PROCESSING → SHIPPED → DELIVERED`; cancel an order; add internal notes |
| System (server-side only, no external actor) | Sets initial `AWAITING_PAYMENT` / `PENDING` at creation; will set `PAID` automatically once a real gateway webhook exists (Phase 2/future) |

No one — customer or otherwise — can set `paymentStatus` or privileged `status` values directly through a general-purpose `PUT`. That endpoint should not exist in its current unrestricted form (§3, §17).

---

## 8. Payment Proof — Evaluated, Not Required Yet

Given the business is small-scale and manual verification is already required (admin checks their own bank/wallet), a mandatory screenshot upload adds file-handling complexity (storage, validation, admin review UI) without removing any manual step — the admin still has to check their actual bank/wallet balance regardless of what screenshot is shown.

**Recommendation: skip payment-proof upload in Phase 1.** Instead:
- Show the customer's order number prominently on the QR screen and ask them to **use it as the payment remark/note** when paying via their banking app — this alone makes admin reconciliation fast without any new upload feature.
- Optionally collect a **transaction reference number** as a plain text field (no file upload) if the business finds reconciliation difficult in practice — this is cheap to add later (`Payment.transactionReference` already exists in the schema, §18) without needing file storage at all.

If file upload is added later, it must include: file type allow-list (image/jpeg, image/png only), a size cap (e.g., 5 MB), storage outside the public web root (or signed URLs), admin-only read access, and randomized (non-guessable) filenames — but this is explicitly deferred.

---

## 9. Order Number

Do not expose the raw Prisma `cuid()` as the customer-facing identifier — it's not human-friendly and needlessly reveals implementation details.

**Format:** `HT-YYYYMMDD-XXXXXX`
Example: `HT-20260810-000123`

- `YYYYMMDD` = order creation date (server clock).
- `XXXXXX` = a zero-padded, atomically-incremented daily sequence, OR a random 6-digit segment — either works; a DB-level `@unique` constraint on `orderNumber` is enforced either way, with the create wrapped in a retry-on-conflict loop if using randomness.
- The internal `Order.id` (cuid) remains the primary key and is used for foreign keys/lookups server-side; it should **not** appear in URLs or customer-facing UI.
- Order numbers must not be sequential-without-jitter across the *entire* history if guessability matters at your scale (e.g., `000001`, `000002`…) — the daily-reset scheme above bounds the guessable range to one day's volume, which combined with the auth requirement in §12 is sufficient (an attacker still can't do anything with a guessed number since `GET /api/orders/[id]` will require ownership).
- Internal DB IDs (`Order.id`, `Customer.id`) are never returned in API responses to non-admin callers beyond what's needed to operate the UI (avoid exposing raw sequential `Customer.id` in customer-facing payloads where avoidable).

---

## 10. Order Summary (Confirmation Page)

Replace the static `OrderConfirmed.tsx` with a page that fetches the real order (by the order number in the URL, e.g. `/order-confirmed/HT-20260810-000123`) and renders:

- Order number, order date
- Customer name, delivery address
- Line items: product name, quantity, unit price
- Subtotal, shipping charge, tax, discount (if a coupon was applied), grand total
- Payment status (`Awaiting Verification` / `Paid` / `Rejected`)
- Order status
- The QR code (while `AWAITING_PAYMENT`)

All values come from the server response for that order — no client-computed numbers on this page, ever.

---

## 11. Customer Order Tracking

Keep the existing `CustomerAccount.tsx` "My Orders" list — it's already correctly wired to `GET /api/orders` and just needs its status vocabulary aligned to §16:

```
Awaiting Payment → Payment Verified (shown as "Confirmed") → Processing → Shipped → Delivered
                                                            ↘ Cancelled
```

No guest checkout exists today (checkout already requires login — see the "Sign in to Checkout" gate in `Checkout.tsx`), so no anonymous order-lookup-by-ID mechanism is needed. **Recommendation: keep checkout login-required** — it's simpler and already implemented, and avoids having to design a secure guest-order-lookup flow (magic link / order-number + email combo) that the "minimal" goal doesn't require yet.

---

## 12. Security Requirements

**Server-side validation** — every field that affects money or state must be validated/derived server-side: product existence, current price, stock availability, tax rate, shipping cost, and the resulting totals. The client's numbers are never trusted, only used for optimistic UI display before the real order is created.

**Authorization**
- Customers: may create orders for themselves only (session-derived `customerId`); may read only their own orders; may not update or delete orders.
- Admins: may read all orders; may verify/reject payment and transition order status through the allowed state machine (§16); may add internal notes. Hard delete of an order should not be exposed at all — use `CANCELLED` instead, preserving history.
- Every order-related route must call `getCurrentUser()`/`getCurrentAdmin()` before touching the database. This closes the current critical hole in `orders/[id]`.

**Price protection** — never accept `price`, `total`, `tax`, `grandTotal`, or `shippingCost` from the request body when creating an order. Always derive from `Product.price` and `Settings` at write time.

**Payment protection** — the client can never set `paymentStatus`. Only the new admin-only `PATCH /api/admin/orders/[id]/payment` route can transition it, and only along the allowed edges in §16.

**Order protection** — the client can never set privileged `status` values (`CONFIRMED`, `SHIPPED`, `DELIVERED`, etc.) directly. Only `PATCH /api/admin/orders/[id]/status`, admin-only, enforcing the state machine.

**API protection**
- Authentication: reuse existing JWT-in-httpOnly-cookie (`src/lib/auth.ts`) — it's a sound pattern, just needs to be applied consistently.
- Input validation: adopt the `zod` schemas already used in `auth.ts` for the orders/payment routes too (currently orders routes use untyped `any`).
- Rate limiting: add a basic limiter (e.g., per-IP or per-session token bucket) on `POST /api/orders` and the login routes to blunt spam-order and credential-stuffing attempts. A simple in-memory or Redis-backed limiter is enough at this scale — no need for a dedicated service.
- CSRF: since auth is cookie-based, ensure state-changing routes are POST/PATCH/DELETE only (already true) and consider `sameSite: 'strict'` for the session cookie if the app has no cross-site POST integrations (currently `'lax'`); at minimum keep `sameSite: 'lax'` and avoid ever accepting state-changing requests over GET.
- Secure error responses: never leak Prisma/DB error messages to the client (the existing generic `handleApiError` → `"Internal server error"` pattern in `api-utils.ts` is already correct — keep it, just make sure no route bypasses it with a raw `catch (e) { return NextResponse.json(e) }`).
- No secret keys in frontend code: N/A today since there's no real gateway key yet; when one is added (§22), it must live server-side only, never in a `NEXT_PUBLIC_*` variable.
- `JWT_SECRET`: currently falls back to a hardcoded dev string whenever `NODE_ENV !== 'production'`. Tighten this so any non-local/staging deployment fails fast without an explicit secret, rather than silently running with a known default.

**Database**
- Wrap order creation (order + items + stock decrement + inventory transaction + customer stats) in one `prisma.$transaction`.
- Add a unique constraint on `Order.orderNumber` and on the new idempotency key (§13).
- Add an index on `Order.customerId` and `Order.status` (used by both the customer "my orders" query and the admin dashboard filters) if not already implied by the FK.
- Atomic stock decrement: use a conditional update (`WHERE stock >= quantity`) inside the transaction, not a read-then-write, to avoid races between concurrent checkouts.

---

## 13. Duplicate Order Protection

**Where:** client generates a random idempotency key (e.g., `crypto.randomUUID()`) once, when the customer lands on the "Review & Place Order" step, and stores it in component state (not regenerated on retry). It's sent as a header (`Idempotency-Key`) or body field on `POST /api/orders`.

**Server side:** before creating the order, check whether an order already exists for `(customerId, idempotencyKey)`. If it does, return that existing order instead of creating a new one (safe to call twice). Enforce this with a **unique constraint** on `(customerId, idempotencyKey)` in the `Order` table (or a small companion table) so that even two simultaneous requests (e.g., a double-click firing two in-flight requests) can't both succeed — the second write fails the constraint and the handler falls back to returning the first order.

This is the entire idempotency strategy needed here — no distributed lock, no separate queue.

---

## 14. Stock Management

**Decision: Option A — decrement stock at order creation (not a timed reservation).**

Rationale: this business has a small catalog, manual QR payment with admin verification typically happening within hours/a day, and no evidence of high-concurrency flash-sale traffic. A timed "reserve then release" system (Option B) adds real complexity — background jobs to expire holds, a `reservedStock` field, cron/cleanup — for a problem this business doesn't have yet. Decrementing at creation, inside the same transaction as the order write, with an atomic conditional update, is the simplest safe option and prevents overselling without new infrastructure.

**What happens in each case:**

| Event | Stock effect |
|---|---|
| Order created (`AWAITING_PAYMENT`) | Stock decremented immediately (atomic, transactional) |
| Customer never pays | Admin (or an automated job, later) cancels the order after a grace period → stock is **restored** |
| Admin rejects payment | Order → `CANCELLED`, stock **restored** |
| Order refunded (post-delivery) | Stock is **not** automatically restored (physical goods already shipped/consumed) unless the admin explicitly logs a return via `InventoryTransaction` |
| Order delivered | No further stock effect — already decremented at creation |

Every stock change is written to `InventoryTransaction` (`type: 'ORDER_RESERVED'`, `'ORDER_CANCELLED_RESTOCK'`, etc.) so the existing (currently `GET`-only) inventory audit trail becomes real and admins can see exactly why stock moved.

---

## 15. Admin Order Management

Keep the existing `dashboard/Orders.tsx` UI/UX (table layout, filters, note-taking dialog, export/print) — it's well-built. **Rewire its data layer** from `useStore()` to real `fetch`/`api` calls against `/api/orders`, `/api/admin/orders/[id]/payment`, and `/api/admin/orders/[id]/status`, following the exact pattern already used correctly in `dashboard/Customers.tsx`.

Admin table (already close to this shape today):

| Order # | Customer | Amount | Payment | Order Status | Date | Action |
|---|---|---|---|---|---|---|

Admin actions, scoped to only what Phase 1–4 needs:
- View order (full detail incl. internal notes)
- Verify payment → `PAID` / `CONFIRMED`
- Reject payment → `FAILED` / `CANCELLED`
- Confirm → Process → Ship → Deliver (state machine buttons, §16)
- Cancel order (with reason, restores stock per §14)
- Add internal note (writes to the existing `InternalNote` model)

No bulk CSV import, no manual order creation form, no multi-warehouse routing — none of that exists today and none of it is needed for this business size.

---

## 16. Status Architecture

### Order status
```
AWAITING_PAYMENT
      ↓
  CONFIRMED
      ↓
  PROCESSING
      ↓
    SHIPPED
      ↓
  DELIVERED

(from AWAITING_PAYMENT or CONFIRMED) → CANCELLED
```

### Payment status
```
PENDING → PAID
PENDING → FAILED
PAID → REFUNDED
```

**Enforced transitions only** — the admin API rejects any transition not in this graph (e.g., `DELIVERED → PROCESSING`, or setting `PAID` while `Order.status` is already `DELIVERED` without going through `CONFIRMED` first). This replaces today's free-text `status`/`paymentStatus` strings that accept anything via `PUT`.

Map to existing schema: `Order.status` keeps its `String` type (no migration to a Postgres enum required — Prisma `String` + application-level validation is simplest and matches the existing style of the schema), but the **set of accepted values** becomes fixed and centrally validated (e.g., a shared `zod` enum used by both the admin route and any UI dropdown).

---

## 17. API Design

Only what's actually needed:

### `POST /api/orders`
- **Purpose:** create a real order from the customer's cart.
- **Auth:** required (customer session).
- **Request:** `{ items: [{ productId, quantity }], customerName, customerEmail, customerPhone, shippingAddress, idempotencyKey }` — **no price/total/tax/paymentStatus fields accepted.**
- **Validation:** items non-empty; each `productId` exists and is active; `quantity` is a positive integer ≤ available stock; contact/address fields present.
- **Server logic:** re-price every item from `Product.price`; compute subtotal, tax (`Settings.taxRate`), shipping (`Settings.shippingFlatRate` or free-shipping policy), grand total; generate `orderNumber`; run the whole write (order + items + stock decrement + inventory transaction + customer stats) in one transaction; create a `Payment` row (`status: PENDING`).
- **Response:** the created order (with `orderNumber`, computed totals, `status: AWAITING_PAYMENT`, `payment.status: PENDING`).
- **Errors:** `401` unauthenticated, `400` invalid items/insufficient stock (naming which item), `409` idempotency replay-with-different-payload conflict, `500` generic.

### `GET /api/orders/:id`
- **Purpose:** fetch one order (by internal id, or resolve `orderNumber` → id).
- **Auth:** required. Customer: only if `order.customerId === session.id`. Admin: always.
- **Response:** full order incl. items and payment status; `internalNotes` included **only** for admin callers.
- **Errors:** `401`, `403` (authenticated but not the owner and not admin), `404`.

### `GET /api/my-orders`
*(or reuse existing `GET /api/orders` which already branches correctly by role — no need for a second endpoint; document it as the customer-facing list.)*
- **Purpose:** the logged-in customer's own order history.
- **Auth:** required (customer session).
- **Response:** array of the caller's own orders — already implemented correctly today.

### `POST /api/orders/:id/payment-proof` *(deferred — see §8; only build if the business asks for it)*
- **Purpose:** attach an optional transaction reference (and, later, a screenshot) to an order awaiting verification.
- **Auth:** required, owner only.
- **Validation:** order must be `AWAITING_PAYMENT`; reference is a plain string (file upload deferred).

### `PATCH /api/admin/orders/:id/payment`
- **Purpose:** admin verifies or rejects a manual QR payment.
- **Auth:** admin only.
- **Request:** `{ decision: "PAID" | "FAILED" }`.
- **Server logic:** enforce `PENDING → PAID` or `PENDING → FAILED` only; on `PAID`, also move `Order.status` to `CONFIRMED`; on `FAILED`, move `Order.status` to `CANCELLED` and restore stock (§14); write an `InternalNote` recording who verified it and when.
- **Errors:** `401`, `403` (not admin), `409` (invalid transition, e.g. already `PAID`).

### `PATCH /api/admin/orders/:id/status`
- **Purpose:** admin advances order fulfillment status.
- **Auth:** admin only.
- **Request:** `{ status: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED", trackingNumber?, courierPartner? }`.
- **Server logic:** enforce the state graph in §16; only allow `CANCELLED` from `AWAITING_PAYMENT`/`CONFIRMED`; restore stock if cancelling.
- **Errors:** `401`, `403`, `409` (invalid transition).

**Removed/restricted from today's surface:**
- The current unrestricted `PUT /api/orders/[id]` (accepts any body field) is replaced by the two narrow, validated `PATCH` endpoints above.
- `DELETE /api/orders/[id]` is removed from the customer-facing/admin-facing surface — cancellation via status change preserves history and audit trail instead.

---

## 18. Database Design

```
Customer 1───* Order 1───* OrderItem *───1 Product
                 │
                 1
                 │
                 1
              Payment
```

**`Order` — additive changes only:**
```prisma
model Order {
  id              String   @id @default(cuid())
  orderNumber     String   @unique          // NEW — e.g. HT-20260810-000123
  customerId      Int
  customerName    String
  customerEmail   String
  customerPhone   String
  shippingAddress String
  subtotal        Float                      // NEW name for clarity (was "total")
  shippingCost    Float    @default(0)      // NEW — currently unmodeled
  tax             Float
  grandTotal      Float
  status          String   @default("AWAITING_PAYMENT")   // enum-by-convention, see §16
  idempotencyKey  String                      // NEW
  orderDate       DateTime @default(now())
  trackingNumber  String?
  courierPartner  String?
  refundReason    String?
  refundAmount    Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  internalNotes   InternalNote[]
  customer        Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  items           OrderItem[]
  payment         Payment?

  @@unique([customerId, idempotencyKey])
}
```

**`Payment` — new model:**
```prisma
model Payment {
  id                    String   @id @default(cuid())
  orderId               String   @unique
  order                 Order    @relation(fields: [orderId], references: [id])
  method                String   @default("MANUAL_QR")   // MANUAL_QR | ESEWA | KHALTI | FONEPAY | CARD (future)
  status                String   @default("PENDING")     // PENDING | PAID | FAILED | REFUNDED
  amount                Float
  transactionReference  String?                            // optional, customer- or admin-entered
  verifiedByAdminId     Int?
  verifiedAt            DateTime?
  paidAt                DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**`Settings` — one additive field:**
```prisma
model Settings {
  ...
  shippingFlatRate Float @default(0)   // NEW — makes "Free shipping" an explicit, admin-editable policy instead of a hardcoded UI string
  qrImageUrl       String?             // NEW — lets an admin update the payment QR without a redeploy
}
```

No existing fields are removed; `OrderItem`, `Product`, `Customer`, `InternalNote`, `InventoryTransaction` are unchanged.

---

## 19. Error Handling

Customer-facing, plain-language, no internals:

| Situation | Message |
|---|---|
| Item out of stock at checkout | "Sorry, [Product name] is no longer available in the requested quantity." |
| Order creation failed (generic) | "We couldn't place your order. Please try again." |
| Order successfully created | "Your order has been created. Please complete payment using the QR code below." |
| Awaiting admin verification | "Your payment is awaiting verification. We'll update your order status shortly." |
| Payment rejected by admin | "We couldn't verify your payment for this order. Please contact support or place a new order." |
| Not authenticated | "Please sign in to view this order." |
| Viewing someone else's order | "This order could not be found." *(same message as a genuine 404 — don't reveal existence of orders that aren't the caller's)* |

Never surface: Prisma/DB error text, stack traces, internal field names, or secrets. `handleApiError` already does this correctly (`"Internal server error"`) — every route must go through it, with no ad hoc `catch` blocks that leak `error.message` to the response body.

---

## 20. UX Requirements

Target flow (already close to this after removing the fake payment-method picker):

```
CART → DELIVERY DETAILS → ORDER SUMMARY → PLACE ORDER → QR PAYMENT → PAYMENT PENDING
```

- Checkout stays 2 real steps (delivery, review) instead of today's "step 2 = pick a fake gateway."
- No account creation flow needed beyond what exists — login is already required pre-checkout.
- The QR payment screen should be large, high-contrast, and mobile-first (most customers will scan it with the same phone they're checking out on, or a second device) — show the amount and order number in large text directly above/below the QR image.
- Replace the blocking `alert()` calls in `Checkout.tsx` with inline error states (the pattern already used in `CustomerAccount.tsx` — reuse it).
- Do not add a payment-method selector until a second real method exists (§22) — one method, no choice paralysis.

---

## 21. What NOT to Build Yet

Per the brief, explicitly deferred:
- eSewa / Khalti / Fonepay API integration
- Card/gateway integration
- Wallet system
- Automated payment reconciliation
- Loyalty points logic *(the `LoyaltyProgram`/`tier`/`loyaltyPoints` fields already exist in the schema and `Customer` model but are unrelated to fixing the order/payment flow — leave as-is, don't extend)*
- New coupon features beyond the existing model (just add the missing auth check, §3)
- Complex refunds (beyond the existing `refundReason`/`refundAmount` fields and a manual admin-set `REFUNDED` payment status)
- Subscription billing (a `/subscribe` marketing page exists but has no backend order logic today — out of scope)
- Advanced shipping (multi-carrier rates, live tracking webhooks) — a single flat/free rate is enough
- Complex invoicing beyond the existing order-summary/export
- Guest checkout / order-lookup-without-login (checkout already requires login; keep it that way for now, §11)
- Microservices, message queues, separate payment service — everything stays in the one Next.js app

---

## 22. Future Payment Gateway Readiness

The `Payment` model (§18) is deliberately shaped so a real gateway slots in without another schema rewrite:

```
Payment
- id
- orderId
- method                 (MANUAL_QR today → add ESEWA | KHALTI | FONEPAY | CARD later)
- status                 (PENDING | PAID | FAILED | REFUNDED — unchanged)
- amount
- transactionReference   (becomes the gateway's transaction ID)
- verifiedByAdminId      (null once a gateway webhook verifies automatically)
- paidAt
- createdAt / updatedAt
```

When a real gateway is added later: add a webhook route (`/api/payments/webhook/esewa` etc.) that verifies the gateway's signature server-side and flips `Payment.status` to `PAID` automatically — the manual "Verify Payment" admin action simply becomes unnecessary for that method, while `MANUAL_QR` can keep working as a fallback. No changes needed to `Order`, `OrderItem`, or the state machine in §16.

---

## 23. Final Recommended Flow

```
CUSTOMER
   │
   ▼
PRODUCT → CART → CHECKOUT
                   ├── Delivery Details
                   └── Order Review
   │
   ▼
SERVER (all authoritative logic)
   ├── Authenticate session
   ├── Validate items & quantities
   ├── Re-fetch product prices from DB
   ├── Check & atomically decrement stock
   ├── Compute subtotal / tax / shipping / grand total
   ├── Generate orderNumber
   ├── Create Order (status: AWAITING_PAYMENT)
   ├── Create OrderItems
   └── Create Payment (status: PENDING)
   │
   ▼
ORDER CREATED → shown to customer with QR
   │
   ▼
PAYMENT PENDING (customer pays off-app via QR)
   │
   ▼
ADMIN VERIFICATION (dashboard, now reading REAL data)
   ├── Verify → Payment: PAID, Order: CONFIRMED
   └── Reject → Payment: FAILED, Order: CANCELLED (stock restored)
   │
   ▼
PROCESSING → SHIPPED → DELIVERED
```

---

## 24. Implementation Plan

### Phase 1 — Cleanup
- Remove the fake payment-method picker (eSewa/Khalti/Card cards) and unused card-number/expiry/CVV fields from `Checkout.tsx`.
- Remove the client-set `paymentStatus` logic from checkout.
- Remove the static "suggested products" block and lack of real-order-fetch in `OrderConfirmed.tsx`.
- Remove the unrestricted `PUT`/`DELETE` on `/api/orders/[id]`.

### Phase 2 — Real Order
- Add `orderNumber`, `idempotencyKey`, `shippingCost` to `Order`; add the `Payment` model; migrate.
- Rewrite `POST /api/orders` to: require auth, ignore client-sent money fields, re-price from `Product`, check/decrement stock atomically, compute tax/shipping from `Settings`, wrap in a transaction, create the `Payment` row as `PENDING`, generate `orderNumber`.
- Wire the real order-confirmation page to fetch by `orderNumber`.

### Phase 3 — QR Payment
- Add `Settings.qrImageUrl` (admin-editable business QR).
- Render the QR + amount + order number on the confirmation/payment-pending screen.
- No proof upload yet (§8) unless the business specifically asks after Phase 4 goes live.

### Phase 4 — Admin Verification
- Rewire `dashboard/Orders.tsx` from `useStore()`/localStorage to real `/api/orders` + the two new `PATCH` endpoints.
- Build `PATCH /api/admin/orders/[id]/payment` and `PATCH /api/admin/orders/[id]/status`, admin-only, state-machine-enforced.
- Wire `InternalNote` writes into every admin action (who verified/cancelled/shipped, when).

### Phase 5 — Security
- Add `getCurrentUser`/`getCurrentAdmin` checks to `/api/orders/[id]`, `/api/settings` (PUT), `/api/coupons` (POST).
- Add the idempotency unique constraint + server-side dedup check.
- Wrap order creation in `prisma.$transaction`.
- Add basic rate limiting to `POST /api/orders` and the auth routes.
- Tighten the `JWT_SECRET` dev-fallback condition.

### Phase 6 — Testing
See the checklist in §25 below — execute all of it before considering this launch-ready.

---

## 25. Testing Checklist

- [ ] Successful order: correct server-computed totals persisted regardless of what the client sends.
- [ ] Out-of-stock order: rejected with a clear per-item message; no partial order created.
- [ ] Invalid product ID: rejected before any DB write.
- [ ] Invalid/zero/negative quantity: rejected.
- [ ] Duplicate submission (double-click / retry with same idempotency key): exactly one order created, second call returns the same order.
- [ ] Two concurrent checkouts for the last unit of stock: exactly one succeeds, the other gets a clean "out of stock" error, no negative stock.
- [ ] Payment pending state: shown correctly on both the confirmation page and "My Orders."
- [ ] Admin payment verification: `PENDING → PAID` correctly cascades `Order.status → CONFIRMED`.
- [ ] Admin payment rejection: `PENDING → FAILED` correctly cascades `Order.status → CANCELLED` and restores stock.
- [ ] Invalid status transition attempt (e.g., `AWAITING_PAYMENT → DELIVERED`) is rejected with `409`.
- [ ] Customer requests another customer's order → `403`/`404` (no data leak, no distinguishing error message).
- [ ] Unauthenticated request to any order-mutating endpoint → `401`.
- [ ] Client attempts to set `paymentStatus`/`status`/`price`/`grandTotal` directly in a `POST /api/orders` body → values are ignored/overridden by server computation, not merely "validated."
- [ ] Admin dashboard order list matches actual DB rows (regression test specifically for the `localStorage`-disconnect bug being fixed).
- [ ] Mobile checkout: QR screen legible and scannable on a small viewport.
- [ ] `Settings` (tax rate, shipping rate, QR image) changes by admin immediately affect the *next* order's computed totals without a redeploy.

---

## 26. What to Remove

- Fake payment-method selector (eSewa/Khalti/Card cards) and unused card input fields in `Checkout.tsx`.
- Client-side `paymentStatus` assignment in checkout.
- Static "suggested products" + non-functional confirmation content in `OrderConfirmed.tsx`.
- Unrestricted `PUT`/`DELETE` on `/api/orders/[id]`.
- `localStorage`-backed order/customer-stats data path in `StoreContext` as the *admin's* source of truth for orders (the Context can stay for genuinely local-only UI state if any exists, but must stop being where admin order data lives).
- Hardcoded `"Free"` shipping string in the UI (replaced by an explicit `Settings.shippingFlatRate`, which can still be `0` by policy — the point is it becomes a real, admin-controlled value instead of dead text).
- Silent `customerId || 1` fallback in `POST /api/orders`.

## 27. What to Keep

- Existing `Order`/`OrderItem`/`Customer`/`Product`/`InternalNote`/`InventoryTransaction`/`Settings` schema shapes (additive changes only, §18).
- Existing JWT-cookie auth primitives (`getCurrentUser`, `getCurrentAdmin`) in `src/lib/auth.ts`.
- Existing `CustomerAccount.tsx` "My Orders" page — already correctly wired to the real API.
- Existing checkout's shipping-details form fields and validation (minus postal code as required — make optional).
- Existing admin `dashboard/Orders.tsx` UI/UX (table, filters, note dialog, export) — rewire its data source only.
- Existing `handleApiError`/`createErrorResponse` pattern in `api-utils.ts`.
- Login-required checkout (no guest checkout needed yet).

## 28. What to Build

- `Payment` Prisma model + migration.
- `orderNumber`, `idempotencyKey`, `shippingCost` fields on `Order`; `shippingFlatRate`, `qrImageUrl` fields on `Settings`.
- Server-side re-pricing, tax, and shipping computation in `POST /api/orders`.
- Atomic stock check-and-decrement + `InventoryTransaction` write, inside a single order-creation transaction.
- `PATCH /api/admin/orders/[id]/payment` and `PATCH /api/admin/orders/[id]/status`, both admin-only and state-machine-enforced.
- Real order-confirmation page that fetches by `orderNumber` and displays the QR.
- Rewired `dashboard/Orders.tsx` data layer (real API instead of `localStorage`).
- Basic rate limiting on order-creation and auth endpoints.
