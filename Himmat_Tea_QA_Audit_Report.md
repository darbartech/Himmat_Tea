# Himmat Tea — Full-Site QA & Security Audit

**Scope:** Full codebase review of the uploaded `Himmat_Tea.zip` (Next.js App Router, Prisma/SQLite, JWT auth, Cloudinary uploads) covering data flow, access control, input validation, UI/UX, performance, and content accuracy. Reviewed as a senior QA engineer (static/code-level audit) and as a normal site visitor (user-flow walkthrough).

**Note on method:** No `package.json`, `.env`, or `next.config.*` were present in the export, so dependency versions, environment variable wiring, and HTTP security headers could not be fully verified — flagged below as "verify" items rather than confirmed bugs.

**Severity key:** 🔴 Critical (fix before any deploy) · 🟠 High · 🟡 Medium · 🟢 Low / polish

---

## Executive Summary

The codebase is generally well-built for an e‑commerce storefront — the checkout flow does proper server-side price/stock revalidation inside a DB transaction, order ownership is checked correctly, JWT cookies are `httpOnly`, and OTP-based password reset has attempt limits and expiry. However, the audit found **one critical broken-access-control bug that leaks business data to anonymous users**, and **two "fake" customer-facing flows that silently do nothing** (Contact form, Subscription checkout) — both of which are the kind of bug a real customer would hit immediately and a QA pass must block on.

| Severity | Count |
|---|---|
| 🔴 Critical | 3 |
| 🟠 High | 6 |
| 🟡 Medium | 8 |
| 🟢 Low / polish | 7 |

---

## 🔴 Critical

### C1. `/api/analytics` leaks full business data with no authentication
**File:** `src/app/api/analytics/route.ts`
The route has no `getCurrentAdmin()`/`getCurrentUser()` check at all, and it is **not** in `middleware.ts`'s protected path list (`/api/admin*`, `/api/admin-users*`, `/api/customers*`, `/api/coupons*`). Anyone — logged in or not — can hit this endpoint and receive:
- Total order count, total product count, total customer count
- **Total revenue** (`grandTotal` sum across all orders)
- The 10 most recent orders, including customer name/email/phone (via `SAFE_CUSTOMER_SELECT`)
- The 5 lowest-stock products

**Impact:** Direct data exposure of revenue and customer PII to competitors or anyone who finds the URL. This is the same class of data the admin dashboard's "Analytics" widget shows, just unauthenticated.
**Fix:** Add a `getCurrentAdmin()` guard (matching every other `/api/*` admin route) and also add `/api/analytics` to the `middleware.ts` matcher/protected list as defense in depth.

### C2. Contact form does not actually send anything
**Files:** `src/app/pages/Contact.tsx` (used by `src/app/contact/page.tsx`)
```tsx
<form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
```
The submit handler never calls `fetch()`/an API route. There is no `/api/contact` route anywhere in the codebase. The form simply flips local state and shows a "Thank You!" success screen. **Every message submitted through this form is lost — no email, no DB row, nothing.**
**Impact:** Customers believe their enquiry was received; it never reaches anyone. This is a silent data-loss bug on a core conversion channel.
**Fix:** Wire the form to a real `/api/contact` route (mirror the existing, correctly-built `/api/partnership` route: Zod validation + `sendXAlertEmail` + optional dedupe/rate limit), or explicitly remove the form and replace with a `mailto:`/contact-info block if a backend isn't planned.

### C3. "Subscribe Now" claims success and charges nothing / saves nothing
**File:** `src/app/pages/Subscribe.tsx`
```tsx
const handleSubscribe = (planName: string) => {
  toast.success("Subscription started! Check your email.");
  void planName;
};
```
Clicking "Subscribe Now" on any of the three paid plans (₹999–₹2999/mo) immediately shows a success toast claiming the subscription started and to "check your email" — with **no payment step, no API call, no order/subscription record created, and no email actually sent.**
**Impact:** This is worse than a broken button — it actively misleads the visitor into believing they've completed a purchase. If this ships, expect support tickets from customers who think they're being billed and never receive a box.
**Fix:** Either gate the button behind a real checkout/payment flow (reuse the QR/order infrastructure already built for product checkout) or, until that's built, change the CTA to route to `/contact` or a waitlist form rather than fabricating a success state.

---

## 🟠 High

### H1. Access control is enforced per-route, not centrally — and it's already inconsistent
`middleware.ts` only centrally protects `/api/admin*`, `/api/admin-users*`, `/api/customers*`, `/api/coupons*`, `/api/orders*`, and non-GET `/api/settings`. All other admin-only endpoints (`/api/products`, `/api/upload`, `/api/collections`, `/api/blog`, `/api/purchase-orders`, `/api/inventory/transactions`, `/api/batches`, `/api/product-lines`, `/api/faqs`, `/api/brewing-guides`, `/api/hero-visuals`) rely entirely on each route handler individually calling `getCurrentAdmin()`. Most do — but **C1 (`/api/analytics`) proves the pattern already has a hole**, and every future route added to this list is one missed `if (!adminUser)` away from the same leak.
**Fix:** Move to a single allow-list/deny-list in `middleware.ts` (e.g., "everything under `/api/*` except an explicit public list requires auth") so a forgotten check in a route file can't become a silent vulnerability.

### H2. Login endpoint allows email enumeration
**File:** `src/app/api/customer/login/route.ts`
```ts
if (!customer) return createErrorResponse(USER_ERRORS.AUTH.EMAIL_NOT_FOUND, 401)
...
if (!passwordMatch) return createErrorResponse(USER_ERRORS.AUTH.PASSWORD_MISMATCH, 401)
```
Two distinct, differently-worded errors let an attacker script a check for which emails are registered customers (useful for phishing/credential-stuffing target lists). The unknown-email path also skips `bcrypt.compare` entirely, so it returns faster than a wrong-password response — a timing oracle that reinforces the same leak even if the messages were unified.
**Fix:** Return one generic message ("Invalid email or password") for both cases, and run a dummy/fixed-cost hash comparison on the not-found path so response times don't diverge.

### H3. Non-`httpOnly` cookie carries full customer PII in plaintext
**File:** `src/lib/auth.ts` (`himmat_currentUser` cookie)
On login/signup, a second cookie is set with `httpOnly: false` containing a JSON blob of `id, name, email, phone, address, loyaltyPoints, tier, ordersCount, totalSpent`. This is readable by any JavaScript running on the page — meaning a single XSS bug anywhere on the site (or in a third-party script) can exfiltrate a customer's full profile and spend history, not just their session.
**Fix:** Keep only non-sensitive UI hints (e.g., first name, login flag) in the readable cookie, or better — remove it and fetch profile data from `/api/auth/me` (already implemented) on the client instead of trusting a cookie mirror.

### H4. SVG accepted as an upload MIME type
**File:** `src/app/api/upload/route.ts` (`ALLOWED_MIME_TYPES` includes `image/svg+xml`)
SVGs can embed `<script>`/event-handler payloads. If any admin-uploaded SVG (product image, hero visual, blog image, etc.) is later rendered inline or opened directly rather than always going through an `<img>` tag with proper `Content-Type`/CSP, this is a stored-XSS vector. Validation also only checks the client-supplied `file.type` — a spoofable header — not the file's actual magic bytes/content.
**Fix:** Drop SVG from the allow-list (or run it through an SVG sanitizer such as `DOMPurify`/`svgo` server-side before storing), and validate file signatures server-side instead of trusting `file.type`.

### H5. Rate limiting is in-memory and IP-spoofable
**File:** `src/lib/rate-limit.ts`
`InMemoryRateLimiter` stores buckets in a plain `Map` in process memory. On any horizontally-scaled/serverless deployment (multiple Lambda/Edge instances, or a redeploy), each instance has its own counter — so the "10 orders/min" and "15 auth attempts/min" caps are trivially bypassed by hitting different instances, and reset completely on every cold start/restart. Additionally, the limiter keys off `x-forwarded-for`, which a direct client can set to an arbitrary value unless the platform strips/overwrites it — worth confirming the deployment target does this.
**Fix:** Move rate limiting to a shared store (Redis/Upstash, or the platform's built-in edge rate limiting) for anything running on more than one instance.

### H6. Coupon system exists in the admin dashboard but is completely disconnected from checkout
**Files:** `src/app/api/coupons/route.ts`, `src/app/pages/dashboard/Coupons.tsx` vs. `src/app/checkout/page.tsx`, `src/context/CartContext.tsx`, `src/app/api/orders/route.ts`
There's a full CRUD API and admin UI for coupons, but no coupon-code input anywhere in the checkout page, no discount field in `CartContext`, and `createOrderSchema` in the orders API has no `couponCode`/discount field at all. An admin can create a "SAVE20" coupon that no customer can ever apply.
**Fix:** Either finish wiring coupons into checkout (apply + validate server-side against the order total, the same way stock/price are already validated) or remove the admin coupon UI until it's connected, so it doesn't look like a working feature during a demo/UAT.

---

## 🟡 Medium

### M1. Currency fallback rate is wrong for NPR↔INR
**File:** `src/app/api/exchange-rates/route.ts`
`FALLBACK_RATES` lists `NPR: 1` and `INR: 1` as equal. NPR is pegged to INR at **1 INR = 1.60 NPR**, not 1:1. Whenever the live `open.er-api.com` call fails/times out (no retry, single external dependency with no server-side timeout set), Indian customers viewing prices in INR would see figures ~38% too high (or Nepali customers too low), until the next successful fetch.
**Fix:** Correct the fallback ratio (`INR: 0.625` relative to NPR base, or equivalent), and add an explicit fetch timeout so a hung request doesn't hold the route open indefinitely.

### M2. Exchange-rate cache is per-instance, not shared
Same file — `let cache` is a module-level variable, so like the rate limiter (H5) it doesn't survive cold starts and isn't shared across instances in a serverless deployment, causing more external calls than the "6-hour TTL" implies, and potentially different users seeing different rates simultaneously.

### M3. Email validation performs a live DNS MX lookup on the signup request path
**File:** `src/lib/email-validation.ts`
Signup (and admin user creation) does a synchronous `resolveMx`/`resolve4`/`resolve6` check against the submitted email's domain with up to a 4-second timeout before responding. On a slow/unreachable DNS resolver this adds multiple seconds to a first-impression flow (signup), and a burst of signups (or intentional abuse) against a domain with no MX record ties up server time per request. Consider caching resolved domains and/or moving this to an async/best-effort check that doesn't block the response.

### M4. Order confirmation/checkout has no visible cart quantity ceiling
**File:** `src/context/CartContext.tsx`
`updateQuantity` only rejects `quantity <= 0`; there's no upper bound tied to the product's known stock at add-to-cart time, so the UI will happily show "Qty: 500" for a product with 12 in stock and only fail at the very end of checkout (server does correctly reject it — see Positives below — but the failure surfaces late, not inline in the cart).

### M5. Bcrypt cost factor is inconsistent (8 vs 12)
`prisma/seed.ts` / `src/app/api/seed/route.ts` hash the seeded admin password with `bcrypt.hash(password, 8)` while `src/app/api/admin-users/route.ts` uses cost `12` for admin creation. Dev-only impact today (seed route is blocked in production), but worth standardizing so a copy-paste of seed logic into a real flow doesn't quietly ship a weaker hash.

### M6. Partnership/wholesale enquiry form has no spam or duplicate-submission protection
**File:** `src/app/api/partnership/route.ts`
Unlike login/signup/order creation, this route doesn't call `rateLimitAuth`/`rateLimitOrderCreate` or any equivalent, despite triggering an outbound alert email on every submission. It does build a normalized "fingerprint" of the payload — worth confirming that's actually used to reject duplicates (it's computed but not obviously checked against prior submissions in the excerpt reviewed) and adding basic rate limiting/honeypot protection to stop it being used to spam the alert inbox.

### M7. Console logging left in client-facing auth flows
`LoginForm.tsx`, `SignupForm.tsx`, and `AuthModal.tsx` all `console.log` redirect targets and auth flow state directly in the browser console (`[AUTH] LoginForm → self-redirecting to ...`). Not a security hole on its own, but it's debug scaffolding shipping to production and is worth stripping — especially in an auth module — as a matter of hygiene.

### M8. `internalNote.adminId` stored as a string cast of a number
**File:** `src/app/api/orders/[id]/route.ts` — `adminId: String(adminUser.id)`. Low risk, but if `internalNote.adminId` is ever joined/queried as a foreign key against `AdminUser.id` (an int), the type mismatch will silently fail to match rather than erroring, making audit-trail lookups unreliable. Worth confirming the Prisma schema's intended type for this field.

---

## 🟢 Low / Polish

- **L1. Stray empty route folder:** `src/app/godgifted-dal/` exists with no `page.tsx` inside it (confirmed empty directory). It won't resolve as a route, but an odd internal-joke-sounding folder name sitting in the shipped source tree is worth removing before a client/stakeholder browses the repo.
- **L2. `console.log` sprinkled through non-auth UI too** (`ProductDetail.tsx` share tracking, `DashboardHome.tsx` report download) — same cleanup recommendation as M7, lower priority since it's not in the auth path.
- **L3. Locale placeholder text left in source language:** ~80 keys per locale (`hi`, `ne`, `ja`, `zh`) are byte-identical to the English string — mostly things like `you@example.com` placeholders, which is often intentional, but worth a manual pass to confirm none of them are genuinely untranslated UI copy rather than placeholders.
- **L4. Security headers unverifiable:** no `next.config.*` was included in the export, so CSP, `X-Frame-Options`, `Strict-Transport-Security`, and `Referrer-Policy` couldn't be confirmed either way. Given H4 (SVG upload) and H3 (readable PII cookie), a strong CSP is especially worth double-checking is actually configured.
- **L5. `.env`/dependency versions unverifiable:** no `package.json` or `.env(.example)` was present in the export, so exact framework/library versions (and whether `JWT_SECRET`, `CLOUDINARY_*`, `SEED_ADMIN_PASSWORD` etc. are actually set outside of dev) couldn't be checked from this bundle. Recommend a dependency `npm audit`/`pnpm audit` pass separately, since it wasn't possible here.
- **L6. Order number retry loop has no hard cap on total attempts across concurrent requests:** `generateOrderNumber` retries up to 5 times on collision, which is fine at low volume but could theoretically thrash under a burst of simultaneous same-day orders; not urgent, just worth a load test before a big sale/launch.
- **L7. Humanized file-size helper duplicated:** `humanFileSize` and file-size/MIME validation logic appears twice in `src/app/api/upload/route.ts` (`uploadWithOptions` and `uploadSingleFile` both re-validate size/type). Functionally harmless (defense in depth), but worth consolidating into one validator to avoid the two checks drifting out of sync later.

---

## ✅ What's working well (worth preserving as you fix the above)

- **Checkout is server-authoritative:** `POST /api/orders` re-reads price and stock from the database (never trusts client-submitted prices), decrements stock inside a DB transaction with a race-condition guard (`updateMany` with `stock: { gte: quantity }`), and supports idempotency keys to prevent duplicate orders on retry/double-click.
- **Order access control is correctly scoped:** `GET/PUT /api/orders/[id]` verifies the requester is either the owning customer or an admin before returning data, and strips internal notes from the customer-facing response.
- **Password reset OTP flow is solid:** 6-digit OTP, 15-minute expiry, capped at 5 attempts, signed/verified via JWT with a dedicated `purpose` claim so reset tokens can't be reused for login.
- **Password policy is reasonable:** 8–50 chars with upper/lower/number/symbol requirements via a shared Zod schema.
- **Translation coverage is complete key-for-key** across `en/hi/ne/ja/zh` — no missing keys in any locale file.
- **Admin user management correctly restricted to `superadmin` role**, with proper Zod validation and bcrypt(12) hashing on creation.
- **`/api/seed` is double-gated** (blocked in `middleware.ts` *and* inside the route itself) against running in production.

---

## Suggested Fix Order

1. **C1** (unauthenticated analytics leak) — one-line-ish fix, ship immediately.
2. **C2 / C3** (fake Contact + Subscribe flows) — block launch/UAT sign-off until these actually do something or are visibly disabled.
3. **H1–H6** — before the next round of QA regression, prioritizing H2 (enumeration) and H3 (PII cookie) since both are cheap fixes with real exposure.
4. **M1–M8** — before the next pricing-sensitive release (M1 especially, since it affects money shown to customers).
5. **L1–L7** — housekeeping pass, any time before hand-off.
