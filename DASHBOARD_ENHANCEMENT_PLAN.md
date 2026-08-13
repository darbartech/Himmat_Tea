# Himmat Tea Admin Dashboard — Enhancement Audit & Implementation Plan

Act as a **senior Next.js, Prisma/PostgreSQL, full-stack engineer**.

You are working on the existing **Himmat Tea** admin dashboard at
`/himmat_admin_8526/dashboard`. Do **not** rebuild the application or
replace working screens — most of the backend already exists and is
solid (Prisma models, API routes, Cloudinary upload). The job is to
finish **wiring the remaining dashboard screens to that backend**,
make every action give loading feedback, and confirm responsiveness.

First inspect the existing implementation (this doc already did that
part), then make the minimum changes needed to close each gap below.

---

## 0. What's already solid — don't touch

- **Cloudinary upload** is fully implemented: `src/lib/cloudinary.ts`,
  `src/app/api/upload/route.ts` (size/type validation, timeouts,
  admin-only auth, `DELETE` for cleanup), and a reusable
  `ImageUploadField` component (`src/app/components/ui/image-upload-field.tsx`)
  that supports upload **or** paste-URL. Every section below should
  reuse `ImageUploadField`, not build a new uploader.
- **Auth-gated API pattern**: routes use `getCurrentAdmin()` +
  `createResponse` / `handleApiError` (`src/lib/api-utils.ts`) —
  follow this exact pattern for any new/edited route.
- **`api` client** (`src/lib/api-client.ts`): typed `get/post/put/patch/delete`
  wrapper around `fetch` with credentials + error parsing. Prefer this
  over raw `fetch()` in new code (Blog and Settings use raw `fetch()`
  today and both work fine — leave them, just don't copy that pattern
  going forward).
- **Sidebar/topbar responsiveness**: `DashboardLayout.tsx` already has
  a working mobile drawer (`lg:hidden` toggle + `sidebarOpen` state).
  Section content still needs page-level responsive passes (see §3).
- **Prisma schema** already has every model needed: `ProductLine`,
  `Review`, `BlogPost`, `PurchaseOrder`/`PurchaseOrderItem`,
  `InventoryTransaction`, `HeroVisual`, `Settings`, etc.

## 1. Root cause found

Several dashboard screens render from `StoreContext`
(`src/context/StoreContext.tsx`), a client-only mock store seeded with
`sampleXxx` arrays. Its `addX/updateX/deleteX` functions only call
`setState` — **nothing is persisted**, and a page refresh silently
discards every change. Meanwhile a real, working API + Prisma model
exists for most of these entities. That mismatch is the reason "CRUD
doesn't really work" even though the UI looks complete.

## 2. Section-by-section audit

| Section | Backend API | Frontend wiring today | Loading states | Status |
|---|---|---|---|---|
| Hero Visuals | ✅ full CRUD (`/api/hero-visuals[/:id]`) | ✅ **fixed in this pass** — now calls the real API | ✅ added (save spinner, per-row delete spinner, disabled buttons) | **Done** |
| Blog | ✅ full CRUD (`/api/blog[/:id]`) | ✅ already wired via raw `fetch()` | ⚠️ check/standardize | Wired, polish only |
| Settings | ✅ GET/PUT (`/api/settings`) | ✅ already wired via raw `fetch()` | ⚠️ check/standardize | Wired, polish only |
| Orders | ✅ CRUD incl. status `PATCH` | ✅ wired via `api` client | ⚠️ partial (some actions lack spinners) | Mostly done |
| Customers | ✅ CRUD | ✅ wired via `api` client | ⚠️ partial | Mostly done |
| Coupons | ✅ (verify `PUT`/`DELETE` on `/api/coupons/[id]`) | ✅ wired via `api` client | ✅ has spinners | Verify routes only |
| Admin Users | ✅ CRUD | ✅ wired via `api` client | ⚠️ partial | Mostly done |
| Products | ✅ CRUD | ✅ wired, uses `ImageUploadField` | ✅ has spinners | Reference implementation |
| **Product Lines** | ✅ full CRUD exists (`/api/product-lines[/:id]`) | ❌ **StoreContext only — not persisted** | ❌ none | **Needs rewiring** (see §4) |
| **Reviews** | ⚠️ **GET + POST only** — `PUT`/`DELETE` routes missing | ❌ **StoreContext only** | ❌ none | **Needs new API routes + rewiring** |
| **Purchase Orders** | ⚠️ **GET + POST only** — `PUT`/`DELETE` routes missing | ❌ **StoreContext only** | ❌ none | **Needs new API routes + rewiring** |
| **Inventory** | ⚠️ read-only today (`/api/inventory/transactions` is `GET`-only; no stock-adjustment `POST`) | ⚠️ **read-only**, no create/adjust/delete UI | ❌ none | **Needs adjustment endpoint + write UI** |
| Analytics | n/a (read-only by nature) | ✅ reads live data | n/a | Fine as-is |

## 3. Responsiveness pass

Layout shell is responsive already. Do a per-page pass for:
- Tables: wrap in `overflow-x-auto` and give the `<table>` a
  `min-w-[...]` so columns don't crush on mobile (see the fixed
  `HeroVisuals.tsx` for the pattern).
- Dialog/modal forms: add `max-h-[90vh] overflow-y-auto` so long forms
  don't get clipped on short mobile viewports.
- Header rows with a title + action button: `flex-col md:flex-row`
  so the button doesn't overflow next to a long title on small screens.

## 4. The standard pattern to replicate (already applied to Hero Visuals)

For every section still on `StoreContext`:

1. Add local `useState` for the list, `isLoading` (initial fetch),
   `isSaving` (create/update), and `deletingId` (per-row delete) —
   don't use one global "saving" flag for delete, or every row's
   button will spin when only one is deleted.
2. `useEffect(() => { fetchX(); }, [])` calling `api.get('/x')`.
3. Replace the `StoreContext` add/update/delete calls with
   `api.post`, `api.put`, `api.delete`, updating local state from the
   **server's response** (not from the optimistic local object) so
   generated fields (`id`, `createdAt`, etc.) stay correct.
4. Every Save/Update/Delete button:
   - `disabled={isSaving}` (or `disabled={deletingId === row.id}` for
     a delete button in a row),
   - swap label for `<Loader2 className="h-4 w-4 animate-spin" /> Saving...`
     while in flight.
5. Toast on success and on failure (`err.message` from `ApiError`).
6. Remove the now-unused add/update/delete functions for that entity
   from `StoreContext` once nothing references them, to stop the two
   sources of truth from drifting further apart. Leave the rest of
   `StoreContext` alone — it's still used elsewhere (cart, wishlist,
   public site state) and is out of scope here.

## 5. Work items, in priority order

1. **Product Lines** — API already supports full CRUD; straightforward
   rewire using the pattern in §4. Note: `ProductLine.id` is an
   `Int` in Prisma but the current frontend `type ProductLine` declares
   `id: string` — fix the type when rewiring, and `parseInt` any id
   used in a URL.
2. **Reviews** — add `src/app/api/reviews/[id]/route.ts` with `PUT`
   (approve/reject/edit) and `DELETE`, following the exact shape of
   `src/app/api/blog/[id]/route.ts`. Then rewire `Reviews.tsx` per §4.
3. **Purchase Orders** — add `src/app/api/purchase-orders/[id]/route.ts`
   (`PUT` for status changes/receiving stock, `DELETE`), mirroring
   `src/app/api/blog/[id]/route.ts`. Rewire `PurchaseOrders.tsx`.
4. **Inventory** — add a `POST` (and maybe `PUT`) to
   `src/app/api/inventory/transactions/route.ts` for stock
   adjustments (restock, correction, waste), have it write an
   `InventoryTransaction` row and update the related `Product`/`Batch`
   quantity in the same request (wrap in `prisma.$transaction`). Add
   an "Adjust Stock" dialog to `Inventory.tsx` using §4's pattern.
5. **Consistency pass** — audit Orders/Customers/Admin Users/Coupons
   for any action button missing a spinner or `disabled` state per §4
   item 4, since those sections are otherwise already wired.
6. **Responsiveness pass** — apply §3 to any page not yet using
   `overflow-x-auto` tables or `flex-col md:flex-row` header rows.

## 6. Definition of done, per section

- [ ] Data loads from Prisma via a real API route, not `StoreContext` mock arrays.
- [ ] Create, edit, and delete all persist (verified by a hard page refresh after each).
- [ ] Save/update/delete buttons disable and show a spinner while in flight, and can't be double-clicked.
- [ ] Image fields use `ImageUploadField` → Cloudinary, not a raw `<input type=file>`.
- [ ] Table scrolls horizontally and the add/edit dialog fits a mobile viewport.
- [ ] Success/error toasts on every write.

---

### Progress log

- **Hero Visuals** — rewired to `/api/hero-visuals`, added `isSaving`/
  `deletingId` states with spinners, responsive table + dialog. Done
  in this pass.
- Everything else in §2 is scoped above and ready to execute
  section-by-section using the same pattern.
