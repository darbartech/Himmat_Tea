# Language Translation — Implementation Guide

**Goal:** Same idea as currency — auto-detect and let the visitor override, but for
UI language instead of price. Unlike currency, most of the plumbing for this
**already exists** in the codebase; it just isn't complete or connected to
country-detection yet.

---

## 1. What's already in place

| Piece | Status |
|---|---|
| `src/context/TranslationContext.tsx` | ✅ exists — provides `t()`, `lang`, `setLang()` |
| `TranslationProvider` wired in `src/app/layout.tsx` | ✅ already wrapping the app |
| `src/locales/{en,ne,hi,ja,zh}.json` | ⚠️ exist, but incomplete (see below) |
| Components calling `useTranslation()` / `t('key')` | ⚠️ only 21 of the app's files use it — rest still hardcode English |
| Auto-detect language from visitor's country | ❌ not implemented |
| Manual language switcher in the UI | ❌ not implemented |
| Product data (names/descriptions) translated | ❌ not implemented — `t()` only covers static UI strings |

So the work is: **fill gaps → auto-detect → let user override → extend coverage →
handle product content separately**.

---

## 2. Fill in missing translation keys

Current key counts:

```
en.json  612 keys   (complete — source of truth)
ne.json  612 keys   (complete)
hi.json  396 keys   (216 missing)
ja.json  396 keys   (216 missing)
zh.json  396 keys   (216 missing)
```

The same 216 keys are missing from all three files — mostly the admin dashboard
namespace (`dashboard.settings.*`, `dashboard.home.*`, etc). Because `t()` already
falls back to English when a key is missing, nothing crashes — but a third of the
dashboard is silently showing English to Hindi/Japanese/Chinese admins right now.

**Find them yourself with:**

```bash
node -e "
const en = require('./src/locales/en.json');
const hi = require('./src/locales/hi.json');
const missing = Object.keys(en).filter(k => !(k in hi));
console.log(missing.join('\n'));
"
```

Run for `ja.json` and `zh.json` too, translate the resulting key lists, and merge
them back into each file (keep the same key names, just localized values).

---

## 3. Auto-detect language from country

You already stamp a `himmat_country` cookie in `middleware.ts` for the currency
system. Reuse that same signal for language, so one geo lookup drives both.

`src/lib/locale.ts`

```ts
export const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  NP: "ne", IN: "hi", JP: "ja", CN: "zh",
  // everything else defaults to English
};

export function languageForCountry(countryCode?: string | null): string {
  if (!countryCode) return "en";
  return LANGUAGE_BY_COUNTRY[countryCode.toUpperCase()] ?? "en";
}
```

Then, on first load, `TranslationContext` should read the `himmat_country` cookie
(the same helper `readCookie()` already used in `AuthContext.tsx`) and call
`setLang()` once — but only if the visitor hasn't picked a language manually before:

```ts
// inside TranslationProvider, in a useEffect that runs once on mount
useEffect(() => {
  const manualChoice = localStorage.getItem("himmat_lang"); // see step 4
  if (manualChoice) {
    setLang(manualChoice);
    return;
  }
  const country = readCookie("himmat_country");
  setLang(languageForCountry(country));
}, []);
```

This mirrors exactly how `CurrencyProvider` reads the same cookie — no second geo
API call needed.

---

## 4. Add a manual language switcher

Add a dropdown (next to the currency switcher you already have, e.g. in
`Navigation.tsx` or the footer) that calls `setLang(code)` from
`useTranslation()`:

```tsx
const { lang, setLang } = useTranslation();

<select value={lang} onChange={(e) => {
  setLang(e.target.value);
  localStorage.setItem("himmat_lang", e.target.value); // persist the manual override
}}>
  <option value="en">English</option>
  <option value="ne">नेपाली</option>
  <option value="hi">हिन्दी</option>
  <option value="ja">日本語</option>
  <option value="zh">中文</option>
</select>
```

Two small upgrades worth making to `TranslationContext.tsx` while you're in there:

- It currently caches loaded translations in `sessionStorage` (`tr_{lang}`). Since
  you're now persisting the *choice* in `localStorage`, consider moving the cached
  translation data to `localStorage` too, so a returning visitor doesn't refetch the
  locale JSON on every new browser session.
- `setLang()` doesn't currently set `isLoading` around the `import()` call even
  though the provider renders a loading bar keyed off `isLoading` — wire that up so
  the shimmer bar actually shows while a locale file loads.

---

## 5. Extend `t()` coverage to the rest of the app

Only 21 files currently call `useTranslation()`. Everything else — buttons, form
labels, toasts, empty states, error messages — is still hardcoded English JSX text.

Process for each remaining file:

1. Find hardcoded string literals in JSX (`grep -rn '>[A-Z][a-z]' src/app` is a rough
   starting point, or just eyeball each component).
2. Add a key to `en.json` and `ne.json` using the existing dot-namespace convention
   (`checkout.placeOrder`, `wishlist.empty`, etc — match the section the string lives
   in).
3. Replace the literal with `t('your.new.key')`.
4. Add the same key (translated) to `hi.json`, `ja.json`, `zh.json`.

This is mechanical but has no shortcut — budget it as ongoing work rather than a
single pass, and prioritize customer-facing pages (`Checkout`, `ProductDetail`,
`Cart`, `Navigation`) over admin dashboard pages.

---

## 6. Product content (names, descriptions, reviews) — separate problem

`t()` only translates static UI chrome. Product data comes from the database
(`Product` model in `prisma/schema.prisma`, seeded via `mock-data.ts`), so a Nepali
tea name won't automatically become a Japanese one just by switching `lang`.

Two options:

**Option A — per-language columns (recommended for accuracy)**
Add `name_ne`, `name_hi`, `name_ja`, `name_zh`, `description_ne`, etc. to the
`Product` model (or a related `ProductTranslation` table keyed by `productId` +
`locale`, which scales better than adding a column per language). Populate them
manually or via a one-time translation pass, and have the product-fetching code pick
the right field based on the current `lang`.

```ts
// ProductTranslation table (cleaner than N columns per language)
model ProductTranslation {
  id        Int    @id @default(autoincrement())
  productId Int
  locale    String // "ne" | "hi" | "ja" | "zh" | "en"
  name      String
  description String
  product   Product @relation(fields: [productId], references: [id])

  @@unique([productId, locale])
}
```

**Option B — on-demand machine translation with caching**
Call a translation API (Google Cloud Translation, DeepL, etc.) the first time a
product is requested in a given language, cache the result (Redis, or a
`ProductTranslation` table used as a cache instead of a manually-curated table), and
serve the cache on subsequent requests. Scales without manual translation work, but
machine-translated tea tasting notes may need a human review pass for a product this
description-heavy.

For a tea business where exact sensory language matters (tasting notes, terroir
descriptions), Option A with human translation is the safer choice; Option B is
reasonable for less nuanced fields like shipping/FAQ pages.

---

## 7. Testing checklist

- [ ] Missing 216 keys filled in `hi.json` / `ja.json` / `zh.json` — no more silent
      English fallback in the admin dashboard.
- [ ] Setting `himmat_country` cookie to `NP` / `IN` / `JP` / `CN` and reloading
      switches both **language and currency** together (shared geo signal).
- [ ] Manually picking a language via the switcher overrides the geo-detected one,
      and persists across a reload (`localStorage`).
- [ ] Manually picking a language does **not** change the detected currency, and
      vice versa — the two systems stay decoupled.
- [ ] Loading indicator (`isLoading` shimmer bar) shows briefly while a non-English
      locale file loads on first switch.
- [ ] Spot-check a few pages not yet covered by `t()` (per step 5) to confirm they're
      now translated, not just the original 21 files.
- [ ] Product names/descriptions render correctly per-language once Option A or B
      (step 6) is implemented — this is a separate rollout from the static-string
      work above.
