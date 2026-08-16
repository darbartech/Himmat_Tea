# Himmat Tea — E-Commerce Platform

A full-stack **Next.js 15 (App Router)** e-commerce site for Himmat Tea, a specialty tea/chiya brand. Includes a public storefront, customer accounts, and a full admin dashboard, backed by **Prisma** (SQLite in dev) with multi-language and multi-currency support.

> ⚠️ **Current status: not deployable as-is.** An in-progress automatic-translation rewiring pass left the codebase in a broken state — the homepage currently fails to render (HTTP 500) and `next build` fails. See [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) for the full list of blocking issues found during this review, in priority order, before you run or ship this.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 4, MUI (`@mui/material`), Radix UI primitives, `shadcn`-style components |
| Data | Prisma ORM 5 → SQLite (dev), `prisma/schema.prisma` |
| Auth | Custom JWT (httpOnly cookie) + `next-auth` (Google/GitHub OAuth) + bcrypt |
| Email | Nodemailer (SMTP) |
| Images | Cloudinary |
| Forms/validation | `react-hook-form` + `zod` |
| i18n | Custom `TranslationContext` + static JSON dictionaries (`src/locales/*.json`) |
| State | React Context (`StoreContext`, `CartContext`, `CurrencyContext`, `WishlistContext`, `AuthContext`) |

## Features

**Storefront**
- Home / landing page, product catalog & detail pages, collections, product lines
- Cart, checkout, order confirmation
- Wishlist, customer account & order history
- Blog, brewing guides, FAQ, About/Sourcing, Careers, Wholesale, Subscribe (loyalty program)
- Static/legal pages: Privacy Policy, Terms, Shipping & Returns
- Country-aware language switching (see [Internationalization](#internationalization)) and multi-currency pricing (`CurrencyContext`, `/api/exchange-rates`)

**Customer accounts**
- Signup with email OTP verification, login, password reset (OTP-based), Google/GitHub OAuth via NextAuth

**Admin dashboard** (`/himmat_admin_8526`, intentionally non-guessable path — see audit report)
- Products, Product Lines, Batches/Inventory, Purchase Orders
- Orders (status, payments, internal notes)
- Customers, Admin Users (role-based)
- Blog, Collections, Brewing Guides, FAQs, Hero Visuals, Reviews
- Coupons, Settings, Analytics, Notifications

**API**
- REST-style route handlers under `src/app/api/**` for every resource above, protected by `src/middleware.ts`

## Internationalization

Language is **auto-selected from the visitor's country** and can be overridden manually:

1. `src/middleware.ts` reads the visitor's country (Vercel geo header / `x-vercel-ip-country`, defaulting to `NP`) and stores it in a `himmat_country` cookie.
2. `src/lib/locale.ts` maps country → language:
   ```
   NP → ne (Nepali)   IN → hi (Hindi)   JP → ja (Japanese)   CN → zh (Chinese)   (else → en)
   ```
3. `src/context/TranslationContext.tsx` reads that cookie on first load, picks the matching dictionary from `src/locales/{lang}.json`, and exposes it via the `useTranslation()` hook (`t()` function). A manual choice saved to `localStorage` (`himmat_lang`) takes priority over the country default.

This is **static, pre-translated dictionary content** (not a live machine-translation API call like Google Translate) — each supported language needs its strings present in `src/locales/{lang}.json` ahead of time. Currently `en`, `hi`, `ja`, `ne`, `zh` are populated. This mechanism is present but **partially wired up** — see the audit report for pages missing the `useTranslation()` hook.

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
npm install
cp .env.example .env   # fill in real values — see Environment Variables below
npx prisma generate
npx prisma migrate dev
npx prisma db seed      # creates sample data + a super-admin user
npm run dev
```
App runs at `http://localhost:3000`. Admin dashboard: `http://localhost:3000/himmat_admin_8526`.

> The seed script creates a default admin (`superadmin` / a hardcoded password in `prisma/seed.ts`). **Change this password immediately in any non-local environment** — see audit report, Finding 3.

### Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (currently fails — see audit report) |
| `npm start` | Start production server (requires successful build) |
| `npm run lint` | ESLint via `next lint` |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:migrate` | Run/create dev migrations |
| `npm run prisma:seed` | Re-run the seed script |

### Environment Variables
Set in `.env` (never commit real values — see audit report, Finding 1):

```
DATABASE_URL=              # Prisma connection string (SQLite path or hosted DB URL)
JWT_SECRET=                # signs the custom session cookie
SMTP_HOST= / SMTP_PORT= / SMTP_SECURE= / SMTP_USER= / SMTP_PASS= / SMTP_FROM=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME= / CLOUDINARY_API_KEY= / CLOUDINARY_API_SECRET= / CLOUDINARY_UPLOAD_PRESET=
NEXTAUTH_URL= / NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID= / GITHUB_CLIENT_SECRET=
```

## Project Structure
```
src/
  app/
    api/                # Route handlers (one folder per resource)
    himmat_admin_8526/  # Admin dashboard (login + /dashboard/*)
    pages/               # Page-level components rendered by app router routes
      dashboard/         # Admin dashboard screens
    components/          # Shared UI (Navigation, Hero, Footer, ui/*)
  context/               # React Context providers (Store, Cart, Auth, Currency, Wishlist, Translation)
  lib/                   # auth, prisma client, email, currency, rate-limit, slug, etc.
  locales/               # en/hi/ja/ne/zh JSON dictionaries
  middleware.ts          # Auth guarding + country/locale cookie
prisma/
  schema.prisma          # Data model
  seed.ts                # Sample data + super-admin bootstrap
  migrations/
public/                  # Static assets
```

## Security Notes (summary)
See `AUDIT_REPORT.md` for full detail. Headlines:
- Real-looking secrets (SMTP password, Cloudinary secret, JWT/NextAuth secrets, OAuth client secrets, DB URL) were present in a committed `.env` — rotate all of them.
- Hardcoded default super-admin password in `prisma/seed.ts`.
- Rate limiting is in-memory only — resets per server instance/restart, not safe for serverless/multi-instance production deployment.
- `prisma/dev.db` (a real SQLite database with customer/admin records) was included in the delivered files — don't ship database files.

## Known Issues
See `AUDIT_REPORT.md` for the full, prioritized list. Top blockers:
1. Site-wide runtime crash (HTTP 500 on every page) due to mismatched exports between auth form `validation.ts` files and their `index.ts` barrels.
2. `next build` fails to compile (implicit `any` type error in the payment route), so the app **cannot currently be deployed to production**.
3. ~300 TypeScript errors — most admin dashboard pages call the translation function `t()` without importing `useTranslation()`, which will throw `ReferenceError: t is not defined` at runtime for any admin page that has been touched by the translation rewiring pass.
