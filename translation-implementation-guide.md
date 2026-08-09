# Himmat Tea — Translation System Implementation Guide

> **Goal:** Free, fully automatic multilingual support (en, ne, hi, zh, ja) for both static UI and admin-uploaded content, with no paid APIs.

---

## Architecture Overview

```
Two-Tier Translation Strategy
─────────────────────────────────────────────────────────────────
Tier A │ STATIC UI STRINGS     │ Pre-translated JSON files      │ 0ms, free forever
       │ (Navigation, Hero,    │ committed to repo              │
       │  Features, Footer…)   │ Generated once by AI           │
───────┼───────────────────────┼────────────────────────────────┼──────────────────
Tier B │ DYNAMIC CMS CONTENT   │ MyMemory API (free)            │ ~200ms first load
       │ (Products, blog posts,│ Background worker on admin save│ then cached
       │  announcements)       │ Cached to filesystem           │
─────────────────────────────────────────────────────────────────
```

**User switches language → frontend fetches `/api/translations?lang=ne` → backend returns merged Tier A + Tier B JSON → sessionStorage caches it → instant on revisit.**

---

## Final File Structure

```
your-project/
├── src/
│   ├── locales/                        ← Tier A: static translations (committed)
│   │   ├── en.json
│   │   ├── ne.json
│   │   ├── hi.json
│   │   ├── zh.json
│   │   └── ja.json
│   ├── context/
│   │   └── TranslationContext.tsx      ← global language state + t() function
│   ├── hooks/
│   │   └── useTranslation.ts           ← convenience hook for components
│   ├── app/
│   │   └── App.tsx                     ← wrap with <TranslationProvider>
│   └── components/
│       └── Navigation.tsx              ← wire setLang into existing picker
│
└── server/                             ← backend (Express / Fastify / Next API routes)
    ├── translate.ts                    ← MyMemory batch function + cache
    ├── merge.ts                        ← combines en.json + DB rows → flat object
    └── routes/
        ├── translations.ts             ← GET /api/translations?lang=
        └── admin.ts                    ← POST /admin/products → save + bg translate
```

---

## Step-by-Step Implementation

### STEP 1 — Generate Locale JSON Files (One-Time, Free)

Paste the following prompt into Claude (this chat) along with all your component files:

```
Extract every hardcoded English string from these React components.
Assign each a dot-notation key (e.g. nav.products, hero.headline).
Return six JSON objects: en, ne, hi, zh, ja.
Keep identical keys in all five. Return only JSON, no commentary.
```

Paste the output into `src/locales/en.json`, `ne.json`, etc.

**Example output structure:**
```json
// src/locales/en.json
{
  "nav.products": "Products",
  "nav.collections": "Collections",
  "nav.wholesale": "Wholesale",
  "nav.ourStory": "Our Story",
  "nav.dashboard": "Dashboard",
  "hero.badge": "Trusted by 10,000+ tea lovers",
  "hero.headline": "Discover the Art of Fine Tea",
  "hero.subheadline": "Hand-sourced from the world's most storied gardens...",
  "hero.cta.shop": "Shop the Collection",
  "hero.cta.story": "Our Story",
  "hero.stat.blends": "50+",
  "hero.stat.blendsLabel": "Premium Blends",
  "hero.stat.organic": "100%",
  "hero.stat.organicLabel": "Certified Organic",
  "hero.stat.countries": "30+",
  "hero.stat.countriesLabel": "Countries Sourced",
  "features.eyebrow": "Why Us",
  "features.headline": "Quality without compromise",
  "features.subheadline": "From the garden to your cup...",
  "features.cta.headline": "Discover Your Perfect Tea",
  "features.cta.sub": "Let our experts guide you...",
  "features.cta.button": "Find My Match",
  "footer.newsletter.headline": "The GodGifted Newsletter",
  "footer.newsletter.sub": "New arrivals, seasonal picks...",
  "footer.newsletter.placeholder": "your@email.com",
  "footer.newsletter.button": "Subscribe",
  "footer.newsletter.success": "You're in! Welcome to the family.",
  "footer.tagline": "Bringing the world's finest teas...",
  "products.eyebrow": "Our Collection",
  "products.headline": "Premium teas, carefully sourced",
  "products.viewAll": "View All 50+ Teas"
}
```

Commit all five locale files. **You never pay for these again.**

---

### STEP 2 — Create TranslationContext.tsx

```tsx
// src/context/TranslationContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from '../locales/en.json';

type Translations = Record<string, string>;

interface TranslationCtx {
  t: (key: string) => string;
  lang: string;
  setLang: (lang: string) => void;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationCtx>({
  t: (k) => k,
  lang: 'en',
  setLang: () => {},
  isLoading: false,
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState('en');
  const [translations, setTranslations] = useState<Translations>(en);
  const [isLoading, setIsLoading] = useState(false);

  const setLang = useCallback(async (newLang: string) => {
    setLangState(newLang);

    if (newLang === 'en') {
      setTranslations(en);
      return;
    }

    // 1. Check sessionStorage (instant on revisit)
    const cached = sessionStorage.getItem(`tr_${newLang}`);
    if (cached) {
      setTranslations(JSON.parse(cached));
      return;
    }

    // 2. Fetch from backend (first visit to this language)
    setIsLoading(true);
    try {
      const res = await fetch(`/api/translations?lang=${newLang}`);
      const data: Translations = await res.json();
      sessionStorage.setItem(`tr_${newLang}`, JSON.stringify(data));
      setTranslations(data);
    } catch (err) {
      console.error('Translation fetch failed, falling back to English', err);
      setTranslations(en);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Falls back to the key itself — page never shows blank
  const t = useCallback(
    (key: string) => translations[key] ?? en[key as keyof typeof en] ?? key,
    [translations]
  );

  return (
    <TranslationContext.Provider value={{ t, lang, setLang, isLoading }}>
      {/* Thin progress bar during language fetch */}
      {isLoading && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: 3, background: '#2d5a3d', zIndex: 9999,
            animation: 'shimmer 1.2s ease-in-out infinite',
          }}
        />
      )}
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext);
```

---

### STEP 3 — Create useTranslation Hook

```ts
// src/hooks/useTranslation.ts
export { useTranslation } from '../context/TranslationContext';
```

---

### STEP 4 — Wrap App with Provider

```tsx
// src/app/App.tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { TranslationProvider } from "../context/TranslationContext"; // ADD

export default function App() {
  return (
    <TranslationProvider>                    {/* ADD */}
      <RouterProvider router={router} />
      <Toaster />
    </TranslationProvider>                   {/* ADD */}
  );
}
```

---

### STEP 5 — Wire Navigation.tsx to Context

Replace the existing local `selectedLang` state with context:

```tsx
// src/components/Navigation.tsx — CHANGES ONLY

// ADD these imports
import { useTranslation } from '../hooks/useTranslation';

export default function Navigation() {
  // REMOVE: const [selectedLang, setSelectedLang] = useState("en");
  // ADD:
  const { lang: selectedLang, setLang, t } = useTranslation();

  // In the language picker button — CHANGE:
  // BEFORE: onClick={() => { setSelectedLang(code); setLangOpen(false); }}
  // AFTER:
  onClick={() => { setLang(code); setLangOpen(false); }}

  // Replace hardcoded nav labels with t():
  // BEFORE: label: "Products"
  // AFTER:  label: t('nav.products')
  // (do this for all navLinks labels)
}
```

---

### STEP 6 — Update Each Component

Pattern is identical in every component. Add one import, one line, swap strings.

**Hero.tsx**
```tsx
import { useTranslation } from '../hooks/useTranslation';

export default function Hero() {
  const { t } = useTranslation();

  // Replace every hardcoded string:
  // "Trusted by 10,000+ tea lovers"  →  {t('hero.badge')}
  // "Discover the Art of Fine Tea"   →  {t('hero.headline')}
  // "of Fine Tea"                    →  {t('hero.subheadlineAccent')}
  // "Shop the Collection"            →  {t('hero.cta.shop')}
  // "Our Story"                      →  {t('hero.cta.story')}
  // stat labels                      →  {t('hero.stat.blendsLabel')} etc.
}
```

**Features.tsx** — move the `features` array inside the component so it can use `t()`:
```tsx
export default function Features() {
  const { t } = useTranslation();

  const features = [
    { title: t('features.f1.title'), description: t('features.f1.desc'), icon: <...> },
    // ... repeat for all 6 features
  ];
  // rest of JSX unchanged, just replace hardcoded strings
}
```

**ProductsSection.tsx** — same pattern for static products:
```tsx
export default function ProductsSection() {
  const { t } = useTranslation();

  // Replace "Our Collection", "Premium teas...", "View All 50+ Teas"
  // Product names/descriptions from DB will come via Tier B (see Step 8)
}
```

**Testimonials.tsx, Footer.tsx** — same: add `useTranslation`, replace strings with `t()`.

---

### STEP 7 — Backend: translate.ts

```ts
// server/translate.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'translation-cache');
const DELAY_MS = 150; // respect MyMemory rate limit

async function translateString(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.responseData?.translatedText ?? text;
}

export async function translatePayload(
  payload: Record<string, string>,
  targetLang: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    result[key] = await translateString(value, targetLang);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  return result;
}

export async function getOrCreateTranslations(
  payload: Record<string, string>,
  lang: string
): Promise<Record<string, string>> {
  // Cache key = hash of the content + language
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 8);
  const cacheFile = path.join(CACHE_DIR, `${lang}-${hash}.json`);

  try {
    // Cache hit → instant, zero API calls
    const cached = await fs.readFile(cacheFile, 'utf8');
    return JSON.parse(cached);
  } catch {
    // Cache miss → translate and store
    const translated = await translatePayload(payload, lang);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(translated, null, 2));
    return translated;
  }
}
```

---

### STEP 8 — Backend: merge.ts

```ts
// server/merge.ts
import en from '../src/locales/en.json';
import { db } from './db'; // your database client

export async function mergePayload(): Promise<Record<string, string>> {
  // Tier A: all static UI strings from en.json
  const staticStrings = { ...en };

  // Tier B: all dynamic product content from DB
  const products = await db.products.findAll();
  const dynamicStrings: Record<string, string> = {};

  for (const product of products) {
    dynamicStrings[`product.${product.id}.name`] = product.name;
    dynamicStrings[`product.${product.id}.description`] = product.description;
    dynamicStrings[`product.${product.id}.origin`] = product.origin;
    dynamicStrings[`product.${product.id}.tag`] = product.tag;
  }

  return { ...staticStrings, ...dynamicStrings };
}
```

---

### STEP 9 — Backend: API Routes

**GET /api/translations**
```ts
// server/routes/translations.ts
import { mergePayload } from '../merge';
import { getOrCreateTranslations } from '../translate';
import en from '../../src/locales/en.json';

export async function translationsRoute(req: Request, res: Response) {
  const lang = String(req.query.lang || 'en');

  if (lang === 'en') {
    const payload = await mergePayload();
    return res.json(payload); // English: no translation needed
  }

  const payload = await mergePayload();
  const translated = await getOrCreateTranslations(payload, lang);
  return res.json(translated);
}
```

**POST /admin/products — trigger background re-translation**
```ts
// server/routes/admin.ts
import { mergePayload } from '../merge';
import { getOrCreateTranslations } from '../translate';

const LANGS = ['ne', 'hi', 'zh', 'ja'];

export async function saveProduct(req: Request, res: Response) {
  // 1. Save to DB (your existing logic)
  await db.products.save(req.body);

  // 2. Respond to admin immediately — don't make them wait
  res.json({ ok: true });

  // 3. Pre-translate all languages in background
  mergePayload().then((payload) => {
    for (const lang of LANGS) {
      getOrCreateTranslations(payload, lang).catch(console.error);
    }
  });
}
```

---

### STEP 10 — Update ProductsSection.tsx to Use Dynamic Keys

When admin has uploaded products, the frontend reads them via translation keys:

```tsx
// src/components/ProductsSection.tsx
export default function ProductsSection() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  return (
    // ...
    {products.map((product) => (
      <div key={product.id}>
        <h3>{t(`product.${product.id}.name`)}</h3>
        <p>{t(`product.${product.id}.description`)}</p>
        <span>{t(`product.${product.id}.origin`)}</span>
      </div>
    ))}
  );
}
```

---

## SEO Setup (Vite)

For each language to be indexed by Google separately, add `vite-plugin-ssg`:

```bash
pnpm add -D vite-plugin-ssg
```

In `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import ssg from 'vite-plugin-ssg';

export default defineConfig({
  plugins: [ssg()],
});
```

Each language gets its own URL and pre-rendered HTML:
- `yourdomain.com/en/` → `<html lang="en">`
- `yourdomain.com/ne/` → `<html lang="ne">`
- `yourdomain.com/hi/` → `<html lang="hi">`

Add `<link rel="alternate" hreflang="ne" href="https://yourdomain.com/ne/">` to the `<head>` of each page.

---

## Quick Reference: Component Checklist

| Component | Keys to replace | Status |
|---|---|---|
| `Navigation.tsx` | Wire `setLang`, 4 nav labels | Wire context |
| `Hero.tsx` | 8 strings (headline, subhead, 2 CTAs, 3 stats) | Add `useTranslation` |
| `Features.tsx` | 20 strings (titles, descriptions, CTA) | Move array inside component |
| `ProductsSection.tsx` | Section header, filter labels, view-all CTA | Static strings only |
| `Testimonials.tsx` | Section label, trust stats | Quotes can stay in English |
| `Footer.tsx` | 25 strings (newsletter, links, tagline) | Add `useTranslation` |
| `DashboardLayout.tsx` | Nav item labels | Add `useTranslation` |

**Total unique string keys: ~90**

---

## Cost & Performance Summary

| Scenario | Latency | API Cost |
|---|---|---|
| User visits in English | 0ms (bundled JSON) | $0 |
| User switches to Nepali (first time) | ~200ms fetch | $0 (MyMemory free) |
| User switches back or returns | 0ms (sessionStorage) | $0 |
| Admin saves a new product | 0ms for admin (background) | $0 |
| MyMemory calls/month (typical tea shop) | — | $0 (well under 500/day free limit) |

---

## Implementation Order

```
Day 1
  └─ Generate locale JSON files (AI prompt → paste → commit)
  └─ Create TranslationContext.tsx
  └─ Wrap App.tsx with TranslationProvider
  └─ Wire Navigation.tsx to context

Day 2
  └─ Update Hero, Features, Footer with t() calls
  └─ Update Testimonials, ProductsSection static strings

Day 3
  └─ Build backend translate.ts + merge.ts
  └─ Build /api/translations route
  └─ Wire admin save → background translation trigger

Day 4 (optional)
  └─ SEO: vite-plugin-ssg per-language routes
  └─ Add hreflang tags
  └─ Test all 5 languages end-to-end
```
