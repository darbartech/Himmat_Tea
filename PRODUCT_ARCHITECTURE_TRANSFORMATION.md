# Godgifted / Himmat Tea — Product Line Architecture Transformation Plan

**Scope:** Make "Admin adds a Product Line → shows in nav dropdown" and "Admin adds a Product under a line → shows on that line's page" actually work end‑to‑end, with the smallest possible set of changes.

**Verdict up front:** You don't need to build this — you need to **connect what's already built**. The database schema is correct, the admin CRUD screens are correct and already write to the database. The problem is entirely on the **public/storefront side**, which was never wired to the database and instead runs on hardcoded mock arrays. This doc explains exactly why, and gives a minimal, file‑by‑file fix list.

---

## 1. What's actually happening today (root cause analysis)

### 1.1 Three competing sources of truth for "product lines"

| Source | File | What it is | Synced with DB? |
|---|---|---|---|
| **Real DB model** | `prisma/schema.prisma` → `ProductLine`, `Product` | Correct, well-designed schema with `slug`, `name`, `description`, `heroImage`, `color`, `categories`, CTA fields, `isActive`, `sortOrder`, and a proper `Product.productLineId` relation | ✅ (this is the real source of truth) |
| **Static config** | `src/config/brand.ts` → `BRAND.productLines` | Hardcoded array with exactly 2 entries (Himmat Tea, Godgifted Dal) and their own `subcategories` | ❌ never touches DB |
| **Mock in-memory state** | `src/context/StoreContext.tsx` → `sampleProductLines`, `sampleProducts` | Large hardcoded sample arrays used as the *initial (and only)* state of `useStore()` | ❌ never fetched from `/api/product-lines` or `/api/products` — confirmed via grep, zero `fetch`/`api.get` calls for these anywhere in `StoreContext.tsx` |

Any component that reads `useStore().productLines` or `useStore().products` is reading **hardcoded sample data that can never change**, no matter what an admin does in the dashboard.

### 1.2 The admin panel is correctly wired — it's the exception, not the rule

`src/app/pages/dashboard/ProductLines.tsx` and `src/app/pages/dashboard/Products.tsx` both use `@tanstack/react-query` + `src/lib/api-client.ts` to call the real `/api/product-lines` and `/api/products` routes, which use Prisma and write to Postgres. **This part works correctly today.** New product lines and products created here are persisted in the database.

The problem is that nothing on the customer-facing site reads from that same database.

### 1.3 Storefront pages are split into two inconsistent camps

**Camp A — actually fetch from the API (correct pattern, but incomplete):**
- `src/app/pages/ProductsCatalog.tsx` (`/products`) — fetches `/api/products` and `/api/product-lines` via `useQuery`
- `src/app/pages/ProductDetail.tsx` (`/products/[id]`) — fetches `/api/products` via `useQuery`

**Camp B — read from `useStore()` mock data only (broken):**
- `src/app/components/Navigation.tsx` — the "Products" nav dropdown is built from `useStore().productLines` (mock, static, 2 hardcoded lines forever)
- `src/app/components/Footer.tsx` — product-line links built from `BRAND.productLines` (static config, same problem)
- `src/app/[slug]/page.tsx` — the *intended* generic product-line landing page (for any line an admin creates) filters `useStore().products` — mock data, so a newly created line will render with **zero products**, always
- `src/app/himmat-tea/page.tsx` and `src/app/godgifted-dal/page.tsx` — fully hardcoded standalone pages (own `teaCategories` array, own hero copy) that also pull products from `useStore()` mock data

### 1.4 A routing trap makes it worse

Next.js resolves the **static** route `/himmat-tea` before the **dynamic** catch‑all `/[slug]`. So even after you fix everything else, editing the "Himmat Tea" product line in the admin panel (hero image, description, color, CTA) will have **zero visible effect**, because `/himmat-tea` never renders `[slug]/page.tsx` — it always renders the fully hardcoded `himmat-tea/page.tsx`. The same applies to `/godgifted-dal`. Any *new* line an admin creates (e.g. "Godgifted Ghee") *would* hit `[slug]/page.tsx` — but that page is reading mock data, so it would show an empty product grid.

### 1.5 A silent data-shape bug in `ProductLine.categories`

- Prisma schema: `categories String[]` (array of plain strings)
- Admin UI (`ProductLines.tsx`) builds and submits: `categories: { id, name, description, image }[]` (array of **objects**)
- `StoreContext.ProductLine` interface also expects the object shape

Sending an array of objects into a Prisma `String[]` column will throw a validation error (or Prisma will coerce/stringify unpredictably depending on client version). **Today, saving categories from the admin form is broken or silently corrupts data.** This must be fixed before categories can safely drive the storefront's tea/dal category sections.

### 1.6 An auth bug blocks the public storefront from ever working

`GET /api/product-lines` currently requires `getCurrentAdmin()` and returns `401` for anyone not logged in as admin:

```ts
// src/app/api/product-lines/route.ts
export async function GET() {
  const adminUser = await getCurrentAdmin();
  if (!adminUser) {
    return createErrorResponse('Unauthorized - admin only', 401);
  }
  ...
}
```

But `ProductsCatalog.tsx` (a **public** page) already calls this same endpoint. Right now, any anonymous visitor to `/products` silently fails to load product lines. This is the single highest-leverage bug fix in this whole plan — it's one `if` block.

By contrast, `GET /api/products` is correctly public today (no auth check) — that's the pattern to copy.

### 1.7 No role separation for "SuperAdmin creates product lines"

`AdminUser.role` already supports `'admin' | 'superadmin'` (see `getCurrentAdmin()` in `src/lib/auth.ts`), but `/api/product-lines` currently only checks "is *any* admin logged in," not role. Per your requirement — **only SuperAdmin creates/edits/deletes product lines; regular Admins manage products within existing lines** — the route needs a role check.

---

## 2. Target architecture (minimal-diff version)

```
                     ┌─────────────────────────┐
                     │   Postgres (Prisma)      │
                     │  ProductLine ⇄ Product   │
                     └───────────┬──────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                      │
   /api/product-lines (GET public,          /api/products (GET public,
   POST/PUT/DELETE = superadmin only)        POST/PUT/DELETE = admin only)
              │                                      │
              └──────────────────┬───────────────────┘
                                 │
                    StoreContext (fetches on mount,
                    single shared cache for the whole app)
                                 │
        ┌────────────┬───────────┼────────────┬───────────────┐
        │             │           │            │               │
   Navigation     Footer     [slug]/page   ProductsCatalog  ProductDetail
   (nav dropdown) (link list) (per-line page)  (/products)   (/products/[id])
```

**Key decision: keep `StoreContext` as the single client-side cache**, but make it fetch real data instead of holding it hardcoded. Every component already reading `useStore()` (Navigation, Footer if updated, `[slug]` page) starts working automatically once this one file is fixed — that's what makes this a *minimal* change instead of a rewrite.

**Key decision: delete the two hardcoded static pages** (`himmat-tea/page.tsx`, `godgifted-dal/page.tsx`) and let `[slug]/page.tsx` serve every product line — including these two — from the database. Port their nicer visual design into the shared `[slug]` template so nothing looks downgraded. This is what makes "when admin adds a product it appears on the line's page" true for *every* line, present and future, with one template instead of N hand-maintained pages.

---

## 3. Step-by-step implementation

### Step 1 — Fix the `ProductLine.categories` type mismatch (schema + migration)

```prisma
// prisma/schema.prisma
model ProductLine {
  ...
- categories     String[]
+ categories     Json?     // [{ id, name, description, image }]
  ...
}
```

Run:
```bash
npx prisma migrate dev --name product_line_categories_json
```

This unblocks the admin "Categories" editor and lets each line's category tiles (e.g. Green Tea / Black Tea / Herbal for Himmat Tea, Toor / Moong / Chana for Godgifted Dal) be **admin-defined data** instead of hardcoded JSX arrays.

### Step 2 — Fix `/api/product-lines` auth: public read, SuperAdmin write

```ts
// src/app/api/product-lines/route.ts
export async function GET() {
  // No auth required — this powers the public nav dropdown & storefront
  try {
    const productLines = await prisma.productLine.findMany({
      where: { isActive: true },          // public callers only see live lines
      include: { products: { where: { isActive: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return createResponse(productLines)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await getCurrentAdmin();
  if (!adminUser) return createErrorResponse('Unauthorized', 401);
  if (adminUser.role !== 'superadmin') {
    return createErrorResponse('Only SuperAdmin can create product lines', 403);
  }
  ...
}
```

Apply the same `role !== 'superadmin'` guard to `PUT`/`DELETE` in `src/app/api/product-lines/[id]/route.ts`.

> Note: the admin *dashboard* itself should keep an authenticated variant if you want inactive/draft lines visible to admins while editing — simplest minimal option is to add an `?admin=1` query param or a separate lightweight check: if `getCurrentAdmin()` succeeds, return all lines (including inactive); otherwise return only `isActive: true`. This keeps one endpoint doing both jobs without new files.

Also add the same `role !== 'superadmin'` guard on the **admin-users management** actions if not already present, since SuperAdmin-only boundaries should be consistent — check `src/app/api/admin-users/route.ts` while you're in there (out of scope to detail here, but flagged since it's the same pattern).

### Step 3 — Make `StoreContext` fetch real data instead of mock data

This is the single highest-impact change. In `src/context/StoreContext.tsx`:

```tsx
const [productLines, setProductLines] = useState<ProductLine[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [isCatalogLoading, setIsCatalogLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const [linesRes, productsRes] = await Promise.all([
        fetch('/api/product-lines').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
      ]);
      if (!cancelled) {
        setProductLines(Array.isArray(linesRes) ? linesRes : []);
        setProducts(Array.isArray(productsRes) ? productsRes : []);
      }
    } catch (e) {
      console.error('Failed to load storefront catalog', e);
    } finally {
      if (!cancelled) setIsCatalogLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

- Delete `sampleProductLines` and `sampleProducts` (or keep them renamed as `FALLBACK_*` only for empty-state/dev-seed convenience — don't use them as initial state).
- Expose `isCatalogLoading` on the context so `Navigation` can render a lightweight skeleton/placeholder in the dropdown while the first fetch resolves, instead of a flash of empty state.
- All the existing local CRUD helper functions in `StoreContext` (`addProduct`, `updateProduct`, etc.) can stay as-is for now — they're unused by the admin dashboard (which already talks to the API directly via react-query) and unused by the storefront (read-only). No regression risk; removing them is a nice-to-have cleanup, not required for this fix.

**Result of this one change:** `Navigation.tsx`'s nav dropdown and `[slug]/page.tsx`'s product grid start reflecting real DB data immediately, with zero changes to either file.

### Step 4 — Make `Footer.tsx` use live data instead of `BRAND.productLines`

```diff
- ...BRAND.productLines.map(pl => ({ label: pl.name, href: `/${pl.slug}` })),
+ ...useStore().productLines.filter(pl => pl.isActive).map(pl => ({ label: pl.name, href: `/${pl.slug}` })),
```

One line. `BRAND.productLines` can stay in `brand.ts` purely as design-time reference/fallback copy; just stop using it as the render source for link lists.

### Step 5 — Retire the two hardcoded pages; let `[slug]` serve every line

1. Enhance `src/app/[slug]/page.tsx` to:
   - Group `productLineProducts` by `product.category`
   - For each category, render a section header using the matching entry from `productLine.categories` (name/description/image) if the admin has defined one for that category key, else a sensible fallback (title-cased category string, no image)
   - Reuse the visual sections that currently make `himmat-tea/page.tsx` and `godgifted-dal/page.tsx` look polished (hero, category tiles, CTA band) — move that JSX into `[slug]/page.tsx` so it applies to every line, not just two
2. Delete `src/app/himmat-tea/` and `src/app/godgifted-dal/` route folders.
3. Because `ProductLine.slug` in the DB is already `"himmat-tea"` / `"godgifted-dal"` (seeded), those exact URLs keep working — now correctly, dynamically, and identically to any future line an admin creates (e.g. `/godgifted-ghee`).

This is what actually satisfies your requirement: *"when admin add the product then these product should add within a particular product like different tea in tea page and section."* One template, driven entirely by `productLineId` + `category`, works for every current and future line — no per-line page to hand-edit ever again.

### Step 6 — (Optional but recommended) Wire the nav search to real products

`Navigation.tsx`'s search modal currently searches a hardcoded `SEARCH_PRODUCTS` array (10 fixed items). Once `useStore().products` is real (Step 3), swap the filter source:

```diff
- : SEARCH_PRODUCTS.filter(...)
+ : products.filter(p => p.isActive && (p.name...includes... || p.category...includes...))
```

Not required for the core admin→storefront flow, but it's the same class of bug and cheap to fix while you're in the file.

### Step 7 — SuperAdmin-only "Add Product Line" UI gate

In `src/app/pages/dashboard/ProductLines.tsx` (and the sidebar link that leads to it in `dashboard/layout.tsx`), hide/disable the "Add Product Line" button and edit/delete actions unless the logged-in admin's `role === 'superadmin'`. The API-level check from Step 2 is the real security boundary; this is just UX polish so regular Admins aren't shown a button that will 403.

---

## 4. File-by-file change summary

| File | Change | Size |
|---|---|---|
| `prisma/schema.prisma` | `ProductLine.categories`: `String[]` → `Json?` | 1 line |
| *(new migration)* | `npx prisma migrate dev` | generated |
| `src/app/api/product-lines/route.ts` | GET → public (filter `isActive` for anon); POST → require `role === 'superadmin'` | ~10 lines |
| `src/app/api/product-lines/[id]/route.ts` | PUT/DELETE → require `role === 'superadmin'` | ~6 lines |
| `src/context/StoreContext.tsx` | Replace mock `useState(sample...)` with `useState([])` + `useEffect` fetch; drop/rename sample arrays | ~30 lines |
| `src/app/components/Footer.tsx` | Use `useStore().productLines` instead of `BRAND.productLines` | 1 line |
| `src/app/components/Navigation.tsx` | *(optional)* wire search to real `products`; nav dropdown needs no change — already reads `useStore()` | 0–15 lines |
| `src/app/[slug]/page.tsx` | Add category grouping + admin-defined category sections; port hero/CTA styling from the two static pages | ~80–120 lines |
| `src/app/himmat-tea/page.tsx` | **Delete** | — |
| `src/app/godgifted-dal/page.tsx` | **Delete** | — |
| `src/app/pages/dashboard/ProductLines.tsx` | Gate "Add/Edit/Delete" UI by `role === 'superadmin'` | ~10 lines |

**Total: ~8 files touched, no new pages, no new data models, no new admin screens.** Everything required already exists — this is a wiring fix, not a build-out.

---

## 5. Why this satisfies your requirements

- **"SuperAdmin should have an option to add a product line with its name and other minimal info"** → already exists (`ProductLines.tsx` admin form); Step 2/7 adds the missing role restriction.
- **"The line should display in the dropdown menu of the first nav item, which already contains Himmat Tea, Godgifted Dal, All Products"** → already coded in `Navigation.tsx` via `productLines.map(...)`; it only needs Step 3 (real data) to actually reflect admin changes.
- **"Image and short description with buttons should display in their related sections"** → `ProductLine.heroImage`, `.description`, `.ctaTitle/.ctaDescription/.ctaLinkText/.ctaLink` fields already exist in the schema and admin form; Step 5 makes the public page actually render them for every line.
- **"When admin adds a product, it should add within a particular product line — e.g. different teas in the tea page/section"** → `Product.productLineId` + `Product.category` already exist; Step 5's category-grouped `[slug]` page is what finally surfaces this.
- **"Page architecture should be clean, simple, professional, with minimal changes"** → collapsing two hand-maintained hardcoded pages into one data-driven template *reduces* code while fixing the bug — this is the minimal-footprint option, not a rewrite.

---

## 6. Suggested rollout order (safest sequence)

1. Prisma migration (Step 1) — non-breaking, additive
2. API fixes (Step 2) — test `/api/product-lines` returns data with no auth header
3. `StoreContext` fetch (Step 3) — test Navigation dropdown now shows DB-backed lines
4. Footer (Step 4)
5. `[slug]` page rebuild + delete static pages (Step 5) — visually verify `/himmat-tea` and `/godgifted-dal` still look right, then verify a **newly created** test product line also renders correctly end-to-end
6. Search wiring (Step 6, optional)
7. SuperAdmin UI gating (Step 7)

## 7. Manual test checklist after implementation

- [ ] Log in as `admin` (non-super) → "Add Product Line" is hidden/blocked (403 if forced via API)
- [ ] Log in as `superadmin` → create a new product line "Godgifted Ghee" with name, slug, description, hero image, one category, CTA
- [ ] Log out → visit site as anonymous visitor → "Products" nav dropdown shows Himmat Tea, Godgifted Dal, **Godgifted Ghee**, All Products
- [ ] Visit `/godgifted-ghee` → hero image/description/CTA render from what SuperAdmin entered
- [ ] As `admin`, add a product with `productLineId` = Godgifted Ghee, `category = "cow-ghee"`
- [ ] Refresh `/godgifted-ghee` → product appears under a "Cow Ghee" section
- [ ] Visit `/himmat-tea` and `/godgifted-dal` → still render correctly (now via `[slug]`, not the old hardcoded pages)
- [ ] `/products` catalog and `/products/[id]` detail pages still work (unaffected — they already fetched real data)
- [ ] Deactivate a product line (`isActive = false`) as SuperAdmin → it disappears from nav dropdown and footer, and its URL 404s for anonymous visitors
