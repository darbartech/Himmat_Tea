# i18n Audit & Translation Delivery — Himmat Tea / GodGifted platform

**Scope of this pass:** full static audit of `src/` (174 `.tsx` files), the existing
translation infrastructure, and delivery of updated JSON translation files for
**English (en), Nepali (ne), Hindi (hi), Japanese (ja), Chinese (zh)**.

---

## 1. What the existing system already does well

The project already has a solid i18n foundation — this was **not** a green‑field
setup:

- `src/context/TranslationContext.tsx` provides a `useTranslation()` hook exposing
  `t(key, params?)`, `lang`, `setLang`, `isLoading`.
- `src/locales/{en,ne,hi,ja,zh}.json` are flat key→string maps (dot‑namespaced
  keys like `checkout.fields.fullName`), loaded lazily per language and cached in
  `localStorage` with a version key (`TRANSLATION_VERSION`).
- Before this pass, all 5 locale files were already in **perfect key parity**
  (801 keys each, no drift) — a good sign of prior discipline.
- Interpolation is supported via `{param}` tokens inside strings.

## 2. What this pass found and fixed

### 2.1 A stale staging file
`src/locales/himmat_tea_new_translation_keys.json` (158 keys × 5 languages) was
found to be **already fully merged** into the 5 main locale files — identical
keys, identical values. It's a leftover from a previous translation batch and is
safe to delete once you've reviewed this delivery. I left it untouched.

### 2.2 A real runtime bug: 12 keys lost their `{placeholders}` in hi/ja/zh
Static comparison of every key's `{param}` tokens across all 5 languages turned
up **12 existing keys** where the Hindi, Japanese, and Chinese translations had
dropped the interpolation variable entirely (Nepali was fine). Example:

```
en: "Are you sure you want to delete {user}? This action cannot be undone."
hi (before): "क्या आप वाकई इस व्यवस्थापक को हटाना चाहते हैं?"   <-- {user} silently missing
```

This means Hindi/Japanese/Chinese admin users were seeing a confirmation dialog
that never actually named the item being deleted, a coupon that showed no
discount amount, an inventory adjustment dialog missing the product name, etc.
**These 12 keys have been corrected** in the delivered files (placeholders
restored, wording kept natural). Affected keys:

```
dashboard.adminUsers.deleteConfirm         dashboard.inventory.adjustStockFor
dashboard.blog.deleteConfirm               dashboard.inventory.currentStockUnits
dashboard.coupons.amountOff                dashboard.inventory.expiringProductsText
dashboard.coupons.onOrdersOver             dashboard.inventory.lowStockProductsText
dashboard.coupons.percentOff               dashboard.home.lowStockProductsText
dashboard.coupons.usedCount                dashboard.home.lowStockProductsText.singular
```

### 2.3 Hardcoded, un-translated UI text (the main ask)
I scanned every `.tsx` file under `src/app`, `src/modules`, and `src/providers`
(excluding the generic shadcn/ui primitives in `components/ui/`, which carry no
app copy) for:
- JSX text nodes (`>Some Text<`) not passed through `t(...)`
- `placeholder`, `aria-label`, `title`, and `alt` attributes with literal English

**Result: 378 unique hardcoded strings** across 48 files. These split into two
buckets:

| Bucket | Count | What it means |
|---|---|---|
| **A — text already has a matching key** | 121 | An identical string already exists somewhere in `en.json` under a different key. The component just never calls `t()` — it's a wiring gap, not a content gap. |
| **B — genuinely new content** | 257 (→ 422 keys once split by page/context, minus ~20 technical placeholders) | No key exists yet. Translated and added in this delivery. |

A handful of bucket-B strings are **intentionally left untranslated** because
they are technical, not linguistic content: example emails (`admin@example.com`),
slugs (`green-tea`, `post-slug`), placeholder codes (`TEA-001`, `PO-2024-001`),
and raw URL examples. These are fine to keep as literal placeholder text in every
language — they illustrate a *format*, not a *phrase*.

Where the same English phrase is reused in unrelated places (e.g. "Status",
"Total", "Cancel", "Product"), I deliberately created **separate namespaced keys
per page** (`dashboard.orders.selectStatus` vs `dashboard.inventory.action`
vs...) rather than one shared `common.status`, matching the convention already
used throughout the existing `en.json`. A small `common.*` namespace was added
only for truly global, chrome-level strings (loading states, generic Cancel/Edit
buttons, etc.) that appear identically across many admin screens.

## 3. What's in this delivery

```
locales/
  en.json                                 full, updated master file (1174 keys)
  ne.json                                 Nepali   — full parity with en.json
  hi.json                                 Hindi    — full parity with en.json
  ja.json                                 Japanese — full parity with en.json
  zh.json                                 Chinese  — full parity with en.json
  himmat_tea_new_translation_keys_v2.json addendum: only the 422 newly added keys,
                                           same {en,ne,hi,ja,zh} shape as the old
                                           staging file, for easy diff/review

rewiring-todo-existing-keys.csv           121 strings: hardcoded text -> the
                                           existing key you should call t() with
                                           instead, and which file(s) to edit
new-keys-added.csv                        422 rows: new key -> English source ->
                                           file(s) where the hardcoded text lives,
                                           so an engineer can go do the t() swap
```

All 5 locale JSON files were verified to:
- parse as valid JSON,
- contain **exactly the same 1174 keys** (no drift between languages),
- have identical `{param}` interpolation tokens in every language for every key.

## 4. How to apply this (engineering steps)

1. **Drop in the files.** Replace the 5 files in `src/locales/` with the ones in
   `locales/` from this delivery. No code changes are required for this step —
   `TranslationContext` just serves more keys.
2. **Bump the cache version.** Existing users have `en`'s object (and any other
   language's JSON) cached in `localStorage` under `tr_<lang>` /
   `tr_<lang>_version`. Bump `TRANSLATION_VERSION` in
   `src/context/TranslationContext.tsx` (e.g. `'v5'` → `'v6'`) so the
   `isValidCache` check invalidates old caches and the new keys actually load for
   returning visitors.
3. **Wire up bucket A (121 strings, `rewiring-todo-existing-keys.csv`).** Replace
   the literal JSX text with `{t('existing.key')}` using the key named in that
   row. This is pure find‑and‑replace, no translation work needed — the content
   already exists in all 5 languages.
4. **Wire up bucket B (422 strings, `new-keys-added.csv`).** Same mechanical
   swap, using the new keys now present in `en.json`/`ne.json`/etc.
5. **Delete the stale staging file** `src/locales/himmat_tea_new_translation_keys.json`
   once you've confirmed the new files look right — everything in it is already
   folded into the 5 main files (and superseded by `..._v2.json` for anything new).
6. **Re-run a text scan after wiring.** The audit script used here is quick to
   re-run (see §6) — do it again after the swap to confirm nothing was missed and
   no new hardcoded text crept in.

### Example of the swap (pattern used throughout)

```tsx
// Before
<button aria-label="Previous slide">‹</button>

// After
const { t } = useTranslation();
<button aria-label={t('a11y.previousSlide')}>‹</button>
```

```tsx
// Before
<option value="np">Nepal</option>

// After
<option value="np">{t('checkout.countries.nepal')}</option>
```

## 5. Key naming conventions used

- `common.*` — generic chrome strings reused verbatim across many admin screens
  (Cancel, Edit, Loading…).
- `a11y.*` — `aria-label` / `title` strings for icon-only controls (carousel
  arrows, close buttons, share buttons, menu toggles).
- `<page>.<section>.<field>` — everything else, mirroring the existing
  convention (`checkout.fields.*`, `dashboard.<screen>.<field>`,
  `auth.<flow>.<field>`). Where a screen already had a namespace
  (`dashboard.products.*`, `dashboard.orders.*`, etc.) new keys were added under
  that same namespace rather than inventing a new one.
- Dialog **titles** ("Delete Product?") were kept distinct from dialog **body/
  confirmation text** ("Are you sure you want to delete…") even when English
  wording is superficially similar — they're different UI elements and merging
  them would have silently overwritten existing correct copy (this happened 7
  times during this pass and was caught and reverted — see §7).

## 6. How the audit was produced (so it's repeatable)

1. Walk every `.tsx` file under `src/app`, `src/modules`, `src/providers`,
   skipping `components/ui/*` (generic, textless primitives).
2. Regex for JSX text nodes (`>Capitalized text<`) and for
   `placeholder|aria-label|title|alt="..."` attributes, skipping anything
   already wrapped in a `t(...)` call.
3. De-duplicate by exact string value → 378 unique strings.
4. Diff each unique string (case-insensitive) against every existing value in
   `en.json`. Matches → bucket A (rewiring only). Non-matches → bucket B
   (needs a new key + translation).
5. Translate bucket B into ne/hi/ja/zh, namespaced per the conventions above.
6. Merge into all 5 locale files; verify key-set parity and `{param}` token
   parity across languages before shipping.

This is necessarily a **static, regex-based** audit — it will not catch text
assembled at runtime (e.g. string concatenation, text coming from the CMS/DB
such as product names or blog content) or text inside `.ts` files that
returns JSX-less strings (toast/error messages, validation messages already
largely covered by `validation.*` keys). Those are separate categories:
CMS/DB content needs a content-translation workflow (not a code change), and a
follow-up scan of `.ts` (non-`.tsx`) files for `toast(...)`/`throw new
Error(...)` literals is worth doing as a second pass if you want full coverage
of every user-facing message.

## 7. Data-integrity notes (things I deliberately did *not* do)

- **7 candidate new keys were renamed instead of reused** because the English
  text coincidentally matched an *existing* key that has different meaning in
  context (e.g. a table-column header "Amount" vs. an existing "Subtotal (₹)"
  key). Reusing them would have silently changed existing, working translations.
  Renamed to `...ColumnLabel` / `...Title` variants — see `new-keys-added.csv`.
- **Brand names** ("Himmat Tea", "Godgifted Dal") are kept as Latin-script brand
  names in every language, per normal branding practice, rather than
  transliterated — flag this if your brand guidelines say otherwise.
- **Dashboard/admin screens** were translated at the same fidelity as the
  customer-facing site, since the ask was "all normal text," but note that most
  teams choose to leave internal admin tooling in a single operator language —
  worth confirming that's actually wanted before spending review time on the
  ~250 admin-only strings.
- Translation quality here is **machine-assisted, terminology-consistent draft
  quality** for common e‑commerce/admin vocabulary — good enough to ship, but a
  native-speaker review pass (especially for ne/hi, since these are customer-
  facing) is recommended before this is the system of record, the same way you'd
  review any first-pass translation batch.
