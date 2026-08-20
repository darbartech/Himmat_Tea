# Himmat Tea — Full-Site Translation Audit (Phase 2)

**Scope of this pass:** the entire application — every admin panel page (`/himmat_admin_8526/dashboard/*`), every public page, shared components, toasts/alerts/notifications, form validation, and buttons — as it exists in the codebase today. This is a follow-up to `HIMMAT_TEA_I18N_GUIDE.md` (which covered only login/signup/checkout) and to the two CSV audits already in `src/locales/` (`rewiring-todo-existing-keys.csv`, `new-keys-added.csv`), which covered most of the dashboard as it existed at the time.

**Companion file:** `phase2-hardcoded-findings.csv` — every finding below (214 rows) with exact file, line number, the hardcoded text, and a suggested key, in the same format as your existing audit CSVs so it drops into the same workflow.

---

## 1. Where things actually stand

I verified rather than assumed. Good news first:

- **The i18n system itself is solid.** `TranslationContext.tsx` + `src/locales/{en,hi,ja,ne,zh}.json`, flat dot-notation keys, `{param}` interpolation, localStorage caching with a version key. All 5 locale files have **exactly 1,253 keys each, zero missing, zero extra** — the translation data itself is complete and in sync.
- **The Phase 1 auth/checkout work was mostly done correctly.** `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `VerifyResetForm.tsx`, `CustomerAuth.tsx`, and `Checkout.tsx`'s field labels/`validateStep1()` all correctly call `useTranslation()` and `t()`, exactly as the Phase 1 guide specified.
- **Most of the admin dashboard is wired up.** `Products.tsx`, `Orders.tsx`, `AdminUsers.tsx`, `Analytics.tsx`, `Navigation.tsx`, `Footer.tsx` — no meaningful hardcoded strings left in these.

Now the problems. I found **214 distinct hardcoded strings/issues** across five categories, ranging from a single subtle bug that silently breaks validation messages in *five* forms, to an entire admin module that was never connected to the translation system at all. None of this is scattered typos — each category below is a **repeating pattern**, which is actually good news: fixing the pattern once fixes every instance of it.

---

## 2. Critical bug: the Phase 1 validation fix didn't actually apply — same bug in all 5 auth forms

This is the highest-priority item in this report because it's invisible in code review unless you look closely.

The Phase 1 guide recommended converting each Zod schema into a factory function `createXSchema(t)` so validation messages could be translated. **That refactor happened structurally in all five files** — but the function bodies were never actually updated to call `t()`. `t` is accepted as a parameter and then never used:

```ts
// src/modules/auth/LoginForm/validation.ts — current code
export const createLoginFormSchema = (t: TFunc) => z.object({
  email: z.string()
    .email("Please enter a valid email address")   // ← t is right there, unused
    .min(1, "Email is required"),
  password: z.string()
    .min(1, "Password is required"),
  rememberMe: z.boolean().optional()
});
```

So `LoginForm.tsx` correctly does `useMemo(() => createLoginFormSchema(t), [t])`, and the schema *does* rebuild when the language changes — but it rebuilds with the same hardcoded English every time, because nothing inside the function reads `t`. A Japanese-language visitor who enters an invalid email still sees "Please enter a valid email address" in English.

**The same bug, verbatim, exists in all five files:**

| File | Hardcoded literals still in place |
|---|---|
| `LoginForm/validation.ts` | 2 (email, password required) |
| `SignupForm/validation.ts` | 15 (name×4, email×2, password×6, phone, address×3, terms, match) |
| `ForgotPasswordForm/validation.ts` | 2 (email) |
| `ResetPasswordForm/validation.ts` | 7 (password×6, match) |
| `VerifyResetForm/validation.ts` | 1 (OTP length) |

**The fix is mechanical and identical in every file** — wrap each literal in `t()` using the key the Phase 1 JSON deliverable already defined:

```ts
// after
export const createLoginFormSchema = (t: TFunc) => z.object({
  email: z.string()
    .email(t('validation.email.invalid'))
    .min(1, t('validation.email.required')),
  password: z.string()
    .min(1, t('validation.password.required')),
  rememberMe: z.boolean().optional()
});
```

No new keys are needed here — `validation.email.invalid`, `validation.password.required`, etc. already exist in all 5 locale files from Phase 1 (verified). This is purely swapping ~27 string literals for `t()` calls across 5 files. **Do this first — it's the smallest, highest-confidence fix in this whole report and it silently affects every customer using login, signup, password reset, and OTP verification in a non-English language.**

`src/lib/auth.ts` (`passwordSchema`, lines 26–31) has the identical six password-rule messages hardcoded, but this one runs **server-side** inside the signup API route — see §5 below, it needs a different fix.

---

## 3. Admin panel: the sidebar navigation itself is inconsistently translated

`DashboardLayout.tsx` renders the left navigation on **every single admin page**, so this affects the whole admin experience, not just one screen. The pattern here is identical to the validation bug above — some items in a list are correctly wired, and their immediate siblings are not:

```tsx
// src/app/pages/dashboard/DashboardLayout.tsx (abridged)
{
  type: "group",
  name: "CRM",                          // ← hardcoded
  children: [
    { name: t("dashboard.nav.products") },      // ✓ translated
    { name: t("dashboard.nav.productLines") },  // ✓ translated
    // ...6 more, all correctly translated
  ],
},
{
  type: "group",
  name: "Vacancy",                      // ← hardcoded
  children: [
    { name: "Careers" },                // ← hardcoded
    { name: "Career Applications" },    // ← hardcoded
  ],
},
{ name: t("dashboard.nav.orders") },    // ✓ translated
{
  type: "group",
  name: "Users",                        // ← hardcoded
  children: [
    { name: t("dashboard.nav.customers") },     // ✓ translated
    { name: t("dashboard.nav.adminUsers") },    // ✓ translated
  ],
},
{
  type: "group",
  name: "Settings",                     // ← hardcoded
  children: [
    { name: "General Settings" },       // ← hardcoded
    { name: t("dashboard.nav.coupons") },       // ✓ translated
  ],
},
```

Every **group container label** (`CRM`, `Vacancy`, `Users`, `Settings`) is hardcoded, plus the three newest leaf items (`Careers`, `Career Applications`, `General Settings`). Every other leaf item is correctly translated. This tells me the four group labels were added in one pass that predates translation, and never revisited.

**Fix:** add four new keys and wire them in, plus the three leaf items:

```ts
// New keys needed under dashboard.nav.groups.*
"dashboard.nav.groups.crm": "CRM",
"dashboard.nav.groups.vacancy": "Vacancy",
"dashboard.nav.groups.users": "Users",
"dashboard.nav.groups.settings": "Settings",
"dashboard.nav.careers": "Careers",
"dashboard.nav.careerApplications": "Career Applications",
"dashboard.nav.generalSettings": "General Settings",
```

The exact same "some options in a dropdown are wired, the rest aren't" pattern also shows up in **`Settings.tsx`'s Currency and Time Zone dropdowns** — e.g. the Currency `<Select>` has 5 `<SelectItem>` options; the Nepalese Rupee option uses `t('dashboard.settings.nepaleseRupee')` but Indian Rupee, US Dollar, Euro, and British Pound sitting right beside it are plain strings. Same fix, same place: 4 new keys, wrap each option.

---

## 4. Admin panel: notifications (the toast system) — 65 messages, one file, zero translation

You specifically asked about notifications — this is the big one. **`src/context/StoreContext.tsx`** is the data layer behind every admin CRUD action (products, orders, customers, coupons, blog, reviews, product lines, hero visuals, purchase orders, admin users, collections, brewing guides, FAQs, settings). Every single success/error toast it fires — the notification the admin actually sees after clicking Save, Delete, or Update — is a hardcoded English string. I counted **65 separate instances** in this one file, e.g.:

```ts
toast.success('Product added successfully!');
toast.success('Order confirmation email sent to ${order.customerEmail} with order ID ${newOrder.id}');
toast.error('Cannot delete the last superadmin!');
toast.success('New order ${newOrder.id} received! ${pointsToAdd} loyalty points awarded.');
```

This is genuinely good news from an effort standpoint: **one file, one pattern, 65 mechanical swaps.** Most follow a `{Entity} {action}(ed)!` template, so I'd group them under a `notifications.admin.*` namespace rather than inventing 65 unrelated keys:

```ts
// suggested namespace shape
"notifications.admin.productAdded": "Product added successfully!",
"notifications.admin.productUpdated": "Product updated!",
"notifications.admin.productDeleted": "Product deleted!",
"notifications.admin.orderRefunded": "Order {id} refunded successfully!",
"notifications.admin.loyaltyPointsAdded": "{points} loyalty points added!",
// ...61 more, same shape — full list with source text is in phase2-hardcoded-findings.csv
```

Interpolated ones (order IDs, point counts, entity names) map directly onto the `t(key, {params})` your `TranslationContext` already supports — no new capability needed, e.g.:

```ts
// before
toast.success(`New order ${newOrder.id} received! ${pointsToAdd} loyalty points awarded.`);
// after
toast.success(t('notifications.admin.newOrderReceived', { id: newOrder.id, points: pointsToAdd }));
```

One thing worth flagging while you're in this file: `StoreContext.tsx` is a client-side context module (not a component), so it needs `t` passed in or imported the same way `Checkout.tsx`'s non-Zod validation does — either accept `t` as an argument to each mutation function, or (cleaner, since this file already has ~40 functions) call `useTranslation()` once near the top of the provider component and reference `t` via closure, same as any other component-scoped hook.

The exact same "hardcoded toast" pattern also shows up **outside** `StoreContext.tsx`, on public pages, for cart/wishlist/stock actions the customer sees directly — `ProductCard.tsx`, `ProductDetail.tsx`, `Wishlist.tsx`, `ProductsCatalog.tsx`, `Cart.tsx`, `Checkout.tsx`'s coupon flow, `Login.tsx`'s "Welcome back!", and `Reviews.tsx`/`Settings.tsx`/`Blog.tsx` on the admin side. Full list with line numbers is in the CSV; all follow the same fix.

Three `alert()` popups in `ExportUtils.tsx` (used by the admin Products page's PDF/CSV export) and one `window.confirm()` in `CareersAdmin.tsx` (see §5) are worth calling out separately — `alert()`/`confirm()` are browser-native dialogs that can't be styled, and they're also invisible to `t()` unless you wrap the string before passing it in. Same fix mechanically (`alert(t('...'))`), but consider swapping these for the app's own toast/dialog components while you're in there, for consistency with the rest of the admin UI.

---

## 5. Admin panel: the Careers module was built after the last audit and was never connected to i18n at all

This is the cleanest finding in the report: **`CareersAdmin.tsx`** and **`CareerApplicationsAdmin.tsx`** don't import `useTranslation` at all. I cross-checked: the Prisma migrations for the career/career-application tables (`add_career`, `add_career_job`, `add_career_application`) are dated **Aug 18–19**, clearly the newest feature in the app — built after the last translation pass, and it shows. Every label, table header, button, empty state, and placeholder in both files is a plain string literal — roughly **37 strings across the two files** (full list in the CSV), for example:

```tsx
// CareerApplicationsAdmin.tsx — table headers, all hardcoded
<th>Applicant</th>
<th>Position</th>
<th>Email</th>
<th>Phone</th>
<th>Applied</th>
<th>Status</th>
<th>Actions</th>
```

Two things worth fixing beyond just the text:

1. **`CareersAdmin.tsx` line 107** uses `window.confirm(...)` for its delete confirmation — every other admin list in the app (Coupons, Blog, FAQs, Product Lines, etc.) uses a styled `AlertDialog` component instead, per the existing `dashboard.*.deleteX` key pattern in `rewiring-todo-existing-keys.csv`. Worth aligning this one for UX consistency, not just translation.
2. The public-facing `careers.*` and `careers.jobShare.*` keys already exist (23 keys, Phase-1-adjacent work covered the public Careers page) — the admin side is the gap. Suggest new namespaces `careersAdmin.*` and `careerApplicationsAdmin.*` to keep it distinct from the public-facing `careers.*` keys.

---

## 6. Admin panel: smaller gaps scattered across otherwise-translated pages

These are one-off misses in pages that are *mostly* done — the kind of thing that's easy for a reviewer to miss because 90% of the page is already correct. Grouped by pattern (full line-by-line list in the CSV):

- **Form field labels ending in `*` (required marker)**: `Title *`, `Slug *`, `Description *`, `Name *`, `Question *`, `Answer *`, `PO Number *`, `Supplier *` — appear hardcoded in `CollectionsAdmin.tsx`, `ProductLines.tsx`, `Blog.tsx`, `BrewingGuidesAdmin.tsx`, `FAQs.tsx`, `PurchaseOrders.tsx`. Likely copy-pasted between these forms before translation, since the pattern repeats identically across files.
- **Image-upload field labels**: `Collection Image`, `Hero Image` (×2 files), `Post Image`, `Featured Image` — five instances, one per content-type admin page.
- **Example placeholders**: brewing guide fields (`"80°C"`, `"3 min"`, `"2g per 200ml"`), phone format hints (`"+91 9876543210"`, `"+977 000 0000"`, `"+1 555 000 0000"`), `"0.00"` in Inventory.
- **Currency-labeled field names**: `Maximum Discount (₹)`, `Minimum Order Amount (₹)`, `Unit Price (₹)`, `Shipping Flat Rate (₹)` — the ₹ symbol should stay, the label text should translate.
- **Settings.tsx toasts**: 6 more hardcoded toasts for the settings-save flow specifically (separate from the StoreContext.tsx 65, since Settings.tsx has its own local save handler).
- **`DashboardHome.tsx`**: the "Your daily shortcuts" section heading on the admin home screen.

All of these map onto the existing per-page namespace convention already in use (`dashboard.collectionsAdmin.*`, `dashboard.productLines.*`, etc.) — no new architecture needed, just filling gaps in namespaces that already exist.

---

## 7. Public pages: the same toast/error pattern, customer-facing

Same category as §4 but on pages customers actually see, so arguably higher priority even though the count is smaller. Notable ones:

- **Stock/cart/wishlist toasts** across `ProductCard.tsx`, `ProductDetail.tsx`, `Wishlist.tsx`, `ProductsCatalog.tsx`, `Cart.tsx` — "added to cart", "added/removed from wishlist", "out of stock", "promo code applied" all hardcoded, all shown directly after a customer action.
- **Checkout coupon flow** (`Checkout.tsx` lines 244–273): "Please enter a coupon code.", "Coupon "X" applied!", and the failure variant — none of these use `t()`, even though the rest of `Checkout.tsx` does.
- **Checkout inline errors** (lines 281–339): five `setError(...)` calls for empty-cart, invalid-item, session-expired, unauthorized, and not-found states — these read almost identically to strings in `src/lib/error-messages.ts` (§8 below), suggesting some duplication between client-side defensive messages and the server catalog worth reconciling while you're in there.
- **Login.tsx**: "Please enter your username" / "Please enter your password" (client-side pre-submit checks, separate from the Zod schema in §2) and the "Welcome back!" success toast.
- **A few remaining placeholders and one aria-label**: `Checkout.tsx`'s email/phone/postal/coupon-code placeholders and "Remove coupon" label; `Careers.tsx`'s application-form placeholders and its two `setError()` validation messages; `Wholesale.tsx`'s phone placeholder; `CustomerAccount.tsx`'s "Notifications" aria-label and "No notifications yet." empty state.
- **Sort dropdown options** in `ProductsCatalog.tsx`: "Price: Low → High" / "Price: High → Low".

Full list with line numbers in the CSV. All of these are one-line `t()` swaps — no structural work needed, they're just gaps.

---

## 8. Two things worth understanding, not fixing today

### 8.1 The server-side error-message system needs a real architectural decision

The Phase 1 guide flagged this in passing ("server-side API error messages... would need a larger change"). Having now traced it, it's a bigger and better-defined piece than that note suggested — worth deciding on deliberately rather than patching around.

**`src/lib/error-messages.ts`** is a 101-line catalog: `USER_ERRORS` (35 messages across AUTH/PRODUCTS/ORDERS/PAYMENT/COUPONS/VALIDATION/GENERAL/CART categories) plus an `ERROR_CODE_MAP` and a `resolveErrorMessage()` function. It's imported only by **server-side API routes** (`/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/customer/login`) and `api-utils.ts`. These routes bake the final English string into the JSON response before it ever reaches the browser — `t()` running client-side has no way to intercept it.

The genuinely good news: **this file already has the right seam to fix it properly.** `ERROR_CODE_MAP` maps machine-readable codes (`"INVALID_CREDENTIALS"`, `"OUT_OF_STOCK"`, `"COUPON_EXPIRED"`, etc.) to the English text. The fix isn't "translate 35 strings" — it's:

1. Have the API routes return the **code** (`"INVALID_CREDENTIALS"`) instead of, or alongside, `resolveErrorMessage()`'s pre-resolved English text.
2. On the client, add a small `resolveErrorMessage(t, code)` that looks the code up against a new `errors.*` namespace via `t()`, falling back to the current English catalog only if the code is unrecognized (keeps it robust against server/client version drift).

This is a real (if contained) piece of work — new API response shape, new client helper, new `errors.*` namespace (~35 keys, one per existing `USER_ERRORS` entry) — so I'm flagging it precisely rather than including it in the line-item fixes above. It's the reason things like Checkout's "Your session has expired" (§7) stay English no matter what you fix client-side.

### 8.2 Transactional emails are a separate system, out of the browser i18n system by design

**`src/lib/email.ts`** (order confirmation, OTP/verification codes, payment-status updates, wholesale enquiry, contact-form notifications — roughly 25 pieces of copy) is server-side email-template code, always sent in English regardless of the site language the customer had selected. This is legitimately a different problem than everything else in this report — the browser's `TranslationContext` doesn't exist at send-time, so it needs the customer's preferred language stored somewhere durable (e.g. on the `Customer`/`Order` record) and a server-side locale-aware template lookup, not a `t()` call. I'm flagging this so it's a known, deliberate scope decision rather than a silent gap — not recommending you build it as part of this pass.

---

## 9. Rollout plan

1. **§2 — fix the validation.ts bug in all 5 auth files + `src/lib/auth.ts`.** ~30 minutes, no new keys, highest confidence, fixes a real production bug where the Phase 1 work looks done but isn't.
2. **§3 — sidebar nav labels + Settings dropdown options.** Small, self-contained, 11 new keys, immediately visible on every admin page once fixed.
3. **§4 — `StoreContext.tsx` notifications.** The biggest single chunk (65 keys under `notifications.admin.*`), but mechanical — same swap repeated. Do this before §5/§6 since some admin pages call into it.
4. **§5 — wire up the Careers admin module end-to-end** (new `useTranslation` import + ~37 keys under `careersAdmin.*`/`careerApplicationsAdmin.*`), and swap `window.confirm` for the app's AlertDialog pattern while there.
5. **§6 and §7 — sweep the scattered admin and public gaps** from the CSV; these are independent one-line fixes, safe to parallelize across pages/developers.
6. **§8.1 — decide on the error-code architecture** for `error-messages.ts` as a separate, scoped ticket (new `errors.*` namespace + client resolver + API response shape change).
7. **§8.2 — decide, separately, whether/when to localize transactional emails.**
8. **QA pass:** switch the language selector through all 5 languages and click through: admin sidebar (all groups expanded), Settings currency/timezone dropdowns, one full CRUD cycle per admin module (create/edit/delete, checking the toast each time), the Careers admin list + application review flow, then on the public side: add-to-cart/wishlist/out-of-stock toasts, checkout coupon entry (valid and invalid code), and a deliberately-wrong login/signup to confirm validation messages now translate.

---

## 10. Summary

| Category | Count | File(s) | Fix effort |
|---|---|---|---|
| Validation `t` bug (§2) | 27 literals / 5 files | auth `validation.ts` × 5 | Trivial — swap literals for existing keys |
| Sidebar nav + settings dropdowns (§3) | 11 | `DashboardLayout.tsx`, `Settings.tsx` | Trivial — 11 new keys |
| Admin notifications (§4) | 65 | `StoreContext.tsx` | Mechanical — 1 file, 1 pattern |
| Careers admin module (§5) | ~37 | `CareersAdmin.tsx`, `CareerApplicationsAdmin.tsx` | Moderate — new module, needs `useTranslation` added |
| Scattered admin gaps (§6) | ~30 | 12 dashboard pages | Trivial — independent one-liners |
| Scattered public gaps (§7) | ~35 | 12 public pages/components | Trivial — independent one-liners |
| Server error catalog (§8.1) | ~35 | `error-messages.ts` + 4 API routes | Architectural — separate scoped ticket |
| Transactional emails (§8.2) | ~25 | `email.ts` | Architectural — separate scoped ticket, needs stored locale |

**~214 findings total**, of which **~163 are direct `t()` swaps** you can work through against the CSV today, and **2 are scoped architectural decisions** worth their own ticket rather than squeezing into this pass.
