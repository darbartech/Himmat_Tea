# Himmat Tea — Functionality, Error & Security Audit

**Scope:** Static + runtime review of the uploaded `PPPPP.zip` codebase (Next.js 15 / React 18 / TypeScript / Prisma). No source code was modified — this is a read-only audit. Verified by: installing dependencies, running the TypeScript compiler, running `next build`, and booting the dev server and requesting the homepage.

**Verdict: The site is not currently functional.** The homepage itself returns HTTP 500 in dev mode, and the production build fails to compile. Both stem from the same root cause: an unfinished automated "wire up translations" pass (`auto_rewire.js`, `inject_translation_hooks.js`, `fix_all_t_undefined.js`, etc., left in the project root) that renamed some files and injected `t(...)` calls faster than it updated the files that depend on them.

---

## 1. Blocking Issues (site is down / won't build)

### 1.1 Site-wide crash — every page fails to render
`src/app/components/Navigation.tsx` (used on effectively every page) imports from `src/modules/auth/index.ts`, which re-exports `loginFormSchema`, `signupFormSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, and `verifyOtpSchema` from each form's `validation.ts`.

Those `validation.ts` files were refactored to **factory functions** (e.g. `createLoginFormSchema(t)` instead of a static `loginFormSchema`) so error messages can be translated — but the five `index.ts` barrel files were never updated to match. Result: the named export doesn't exist, webpack/Next.js fails the module, and **the homepage returns HTTP 500** (confirmed by booting the dev server and requesting `/`).

Affected files:
- `src/modules/auth/LoginForm/index.ts` ↔ `LoginForm/validation.ts`
- `src/modules/auth/SignupForm/index.ts` ↔ `SignupForm/validation.ts`
- `src/modules/auth/ForgotPasswordForm/index.ts` ↔ `ForgotPasswordForm/validation.ts`
- `src/modules/auth/ResetPasswordForm/index.ts` ↔ `ResetPasswordForm/validation.ts`
- `src/modules/auth/VerifyResetForm/index.ts` ↔ `VerifyResetForm/validation.ts`

**Fix shape (not applied):** update each `index.ts` to export the `create*Schema` factory (and construct the schema with a `t` function, or export a thin non-translated default) instead of the old static name.

### 1.2 Production build fails to compile
`npm run build` fails at the type-checking stage:
```
./src/app/api/admin/orders/[id]/payment/route.ts:88:54
Type error: Parameter 'tx' implicitly has an 'any' type.
    const updated = await prisma.$transaction(async (tx) => {
```
This alone is fatal to `next build` under the project's strict TypeScript config, meaning **the app cannot currently be deployed to production** regardless of the issue in 1.1.

### 1.3 ~300 "t is not defined" errors across the admin dashboard
`npx tsc --noEmit` reports **367 TypeScript errors total**; **304 of them** are `Cannot find name 't'`, concentrated in admin dashboard screens:

| File | Errors |
|---|---|
| `src/app/pages/dashboard/Inventory.tsx` | 56 |
| `src/app/pages/dashboard/Products.tsx` | 38 |
| `src/app/pages/dashboard/PurchaseOrders.tsx` | 34 |
| `src/app/pages/dashboard/ProductLines.tsx` | 30 |
| `src/app/pages/dashboard/Customers.tsx` | 25 |
| `src/app/pages/dashboard/HeroVisuals.tsx` | 19 |
| `src/app/pages/dashboard/BrewingGuidesAdmin.tsx` | 19 |
| `src/app/pages/dashboard/FAQs.tsx` | 18 |
| `src/app/pages/dashboard/Blog.tsx` | 16 |
| `src/app/pages/dashboard/AdminUsers.tsx` | 15 |
| `src/app/pages/CustomerAccount.tsx` | 13 |
| `src/app/pages/dashboard/CollectionsAdmin.tsx` | 11 |
| `src/app/pages/dashboard/Orders.tsx` | 6 |
| `src/modules/auth/AuthModal/AuthModal.tsx` | 1 |

The translation-rewiring script inserted calls like `t('some.key')` into JSX throughout these files but did not add `const { t } = useTranslation();` to each component. **Any admin page in this list will throw `ReferenceError: t is not defined` and crash as soon as it's opened**, even after fixing 1.1 and 1.2.

**Fix shape (not applied):** add `const { t } = useTranslation();` (from `@/hooks/useTranslation` or `@/context/TranslationContext`) to each affected component.

### 1.4 Type errors unrelated to translation (real bugs)
- `src/context/StoreContext.tsx` — 9 errors, `Type 'string' is not assignable to type 'number'` (lines 405, 430, 463, 471, 475, 478, 481, 484, 487). Numeric fields (likely prices/quantities) are being assigned string values somewhere in this context — worth checking wherever these fields are populated from API responses or form input without parsing to `Number`.
- `src/app/api/orders/route.ts` — 14 type errors.
- `src/app/api/admin/orders/[id]/status/route.ts` — 8 errors; `.../payment/route.ts` — 8 errors (includes the build-breaking one above).
- Several `[id]/route.ts` files under `products`, `product-lines`, `collections`, `batches` — 2 errors each.

---

## 2. Security Findings

### 2.1 Real credentials found in a committed `.env` file — HIGH
A `.env` file containing what appear to be **live, non-placeholder values** was included in the delivered archive: a database URL, `JWT_SECRET`, SMTP host/user/password, Cloudinary API key & secret, `NEXTAUTH_SECRET`, and Google + GitHub OAuth client IDs/secrets. `.env` is correctly listed in `.gitignore`, so it likely isn't in git history, but it **was shipped in this handoff** and has now passed through this review.

**Action recommended:** treat every one of those values as compromised and rotate them (new JWT/NextAuth secrets, new Cloudinary API key, new SMTP password, new OAuth client secrets, new DB credentials if the DB is remotely accessible) before this codebase is used anywhere beyond your own machine. Ship an `.env.example` with empty/placeholder values instead of a real `.env`.

### 2.2 Hardcoded default super-admin password — HIGH
`prisma/seed.ts` creates a `superadmin` account with a hardcoded plaintext password (`Admin@123456`) that gets hashed and inserted on every seed run. If this seed is ever run against a real/production database and the password isn't changed immediately, it's a well-known, guessable admin credential sitting in source control.

**Action recommended:** generate a random password at seed time and print/log it once, or require it via an environment variable, rather than hardcoding it.

### 2.3 Database file included in the handoff — MEDIUM
`prisma/dev.db` (a real SQLite database containing 3 customer records and 1 admin user) was included in the zip, even though `*.db` is gitignored. Database files — even dev ones — can contain real emails and password hashes and shouldn't be part of a code deliverable.

### 2.4 In-memory rate limiting won't hold up outside a single long-running process — MEDIUM
`src/lib/rate-limit.ts` implements a token-bucket limiter using an in-process `Map`. This is fine for a single Node server that stays running, but:
- On serverless/edge platforms (e.g. Vercel functions), each invocation can get a fresh instance, so the limiter effectively resets constantly and provides little real protection.
- Even on a persistent server, a restart clears all buckets, and the limiter doesn't share state across multiple instances behind a load balancer.

**Action recommended:** back this with a shared store (Redis, Upstash, etc.) if deploying to more than one instance/serverless.

### 2.5 Positive findings (things that are done well)
- Passwords are hashed with `bcryptjs` (seed uses cost factor 12) — not stored in plaintext.
- Session tokens are JWTs signed with `HS256`, stored in an `httpOnly`, `sameSite=lax` cookie, `secure` in production — good baseline session hygiene.
- `src/middleware.ts` centrally guards `/himmat_admin_8526/dashboard/*`, `/account/*`, and the sensitive `/api/admin*`, `/api/customers*`, `/api/coupons*`, `/api/admin-users*`, `/api/orders*` routes, redirecting or 401-ing unauthenticated requests before they reach the route handler.
- Login/auth endpoints are rate-limited and return generic error messages rather than leaking whether a username exists via response differences (a quick spot-check of `POST /api/auth/login` didn't reveal an obvious user-enumeration path).
- Password policy (`src/lib/auth.ts`) enforces length + upper/lower/digit/special character.
- JWT secret has an explicit hard failure in production if `JWT_SECRET` isn't set (only silently falls back to a dev secret when `NODE_ENV === 'development'`).
- The admin path (`/himmat_admin_8526`) isn't a secret defense on its own, but it's paired with real auth (JWT) rather than relying on obscurity alone.

### 2.6 Dependency vulnerabilities (via `npm audit`)
7 known vulnerabilities in current dependency versions — 1 critical, 5 high, 1 moderate:

| Package | Severity | Notes |
|---|---|---|
| `tar` (transitive) | **Critical** | DoS via crafted archives (multiple CVEs) |
| `next` | High | Several: SSRF via Server Actions/rewrites, cache confusion, DoS via SVG image optimization, unauthenticated disclosure of internal Server Function endpoints |
| `nodemailer` | High | SMTP/header injection issues, TLS cert validation bypass in OAuth2 flow, potential SSRF via raw message option |
| `postcss` | High | XSS via unescaped output, arbitrary `.map` file disclosure |
| `sharp` (libvips) | High | Multiple 2026 CVEs |
| `nanoid` (transitive) | High | Infinite loop with bad size param |
| `dompurify` (transitive) | Moderate | Sanitizer bypass paths → XSS |

Run `npm audit` for the full dependency tree and update `next`, `nodemailer`, `postcss`, and `sharp` to patched versions; `npm audit fix` will resolve what it safely can.

---

## 3. Internationalization / Auto-Translate Feature — Status

You asked about automatic, country-based language switching "like Google Translate." **This already exists in the codebase**, just not as live machine translation:

- `src/middleware.ts` detects the visitor's country and sets a `himmat_country` cookie.
- `src/lib/locale.ts` maps country codes to a language (`NP→ne`, `IN→hi`, `JP→ja`, `CN→zh`, else `en`).
- `src/context/TranslationContext.tsx` picks up that cookie on first load and auto-selects the matching dictionary from `src/locales/{lang}.json`; a manual override is remembered in `localStorage`.
- Dictionaries exist for `en`, `hi`, `ja`, `ne`, `zh` (`src/locales/*.json`), plus several scratch/working files (`himmat_tea_new_translation_keys*.json`, `new-keys-added.csv`, `rewiring-todo-existing-keys.csv`, `HIMMAT_TEA_I18N_GUIDE.md`) that look like intermediate output from the automated rewiring pass rather than app code.

This is **static pre-translated content**, not a live translation API — every string has to exist in each locale JSON ahead of time; it won't automatically translate new/未-added text the way Google Translate does. The mechanism itself is sound, but it's currently only **partially wired into the UI** — see Finding 1.3: most admin dashboard screens call `t()` without importing the hook that provides it, so those screens are still effectively untranslated (and currently crash instead of falling back to English).

---

## 4. Housekeeping / Cleanup Recommendations (non-blocking)
The project root has a number of one-off Node scripts and planning docs from the translation work that aren't part of the running app: `auto_rewire.js`, `fix_all_t_undefined.js`, `fix_placeholders.js`, `fix_syntax.js`, `fix_translation_issues.js`, `inject_translation_hooks.js`, `make_rewire_plan.js`, `merge_all_translations.js`, `merge_translations.js`, `plan_rewiring.js`, `projectwide_t_scan.js`, `scan_missing_useTranslation.js`, `verify_translations.js`, plus `finalfix.md`, `FINAL_SUMMARY.md`, `content-audit-and-reduction-plan.md`, `page-wise-content-rewrite.md`, `dev-server.log`, and `tsconfig.tsbuildinfo`. None of these affect functionality, but moving them to a `/scripts` and `/docs` folder (or removing the ones already run) would make the repo much easier to navigate — and `dev-server.log` / `tsconfig.tsbuildinfo` shouldn't be committed at all (add to `.gitignore`).

---

## 5. Suggested Priority Order to Fix
1. Fix the 5 auth `index.ts` re-exports (1.1) — this alone will bring the whole site back from a 500 error.
2. Fix the implicit-`any` in the payment route (1.2) so `next build` succeeds.
3. Add `useTranslation()` imports to the ~13 admin dashboard files missing it (1.3), or roll back the incomplete rewiring pass on those files if the translation work isn't ready to finish.
4. Investigate the 9 string/number type mismatches in `StoreContext.tsx` (1.4) — likely a real data bug, not just a type annotation issue.
5. Rotate every credential in the shipped `.env` (2.1) and remove the default admin password (2.2) before any real deployment.
6. Run `npm audit fix` / bump `next`, `nodemailer`, `postcss`, `sharp` (2.6).
