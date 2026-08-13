# Social Media Sharing — Diagnosis & Implementation Guide

**Symptom:** links shared to Facebook, Twitter/X, LinkedIn, or WhatsApp don't show
the right title, description, or image — either a generic preview, no image at all,
or a preview that doesn't match the page being shared.

This document identifies the root causes found in the codebase and lays out the fix.

---

## 1. Root causes found

| # | Issue | Where |
|---|---|---|
| 1 | **No fallback share image exists anywhere in the project.** `openGraph` in the root layout has no `images` field, and there's no `og-image` file in `public/`. Any page without its own image (which is most of them) shares with a blank preview. | `src/app/layout.tsx`, `public/` |
| 2 | **Domain mismatch.** The brand config's canonical domain is `godgifted.com` (`BRAND.domain`), but the product page's share metadata hardcodes `https://himmattea.com/products/${id}`. Whichever one isn't the real production domain will produce broken share links. | `src/config/brand.ts` vs `src/app/products/[id]/page.tsx` |
| 3 | **Product share previews are disconnected from real product data.** `generateMetadata()` on the product page reads from a hardcoded `productsData` object with 8 fixed entries — not from the actual product source (`mock-data.ts` / database). Any product added or edited through the admin dashboard will share with a generic "Product Not Found" preview. | `src/app/products/[id]/page.tsx` |
| 4 | **Most content pages have no share metadata at all.** Only the product detail page defines `generateMetadata()`. Blog posts, collections, brewing guides, and other content pages fall back to the site-wide default title/description — so sharing a specific blog post or tea collection shows the homepage preview instead of that content. | `src/app/blog/[slug]/page.tsx`, `src/app/blog/page.tsx`, `src/app/collections/[slug]/page.tsx`, `src/app/brewing-guides/*` |
| 5 | **Locale is hardcoded to `en_US`.** Given the multi-language work in progress, share previews won't reflect the visitor's language. | `src/app/layout.tsx`, `src/app/products/[id]/page.tsx` |
| 6 | Share *buttons* themselves (Facebook, Twitter, LinkedIn, WhatsApp, native share) are implemented correctly and only need the metadata problems above fixed — the buttons currently exist only on the product page, not on blog posts. | `src/app/pages/ProductDetail.tsx` |

Items 1–4 are the actual "sharing looks broken" bug reports. Item 5 is a
polish item. Item 6 is a scope gap (share buttons missing from blog).

---

## 2. Fix plan

### 2.1 Add a default share image

Add a single fallback image at `public/og-image.jpg` (recommended: **1200×630px**,
the standard OG size — anything shared without a more specific image should use this).
Set it as the site-wide default in the root layout:

```ts
// src/app/layout.tsx
export const metadata: Metadata = {
  title: BRAND.companyName,
  description: `...`,
  openGraph: {
    title: BRAND.companyName,
    description: `...`,
    url: `https://${BRAND.domain}`,
    siteName: BRAND.companyName,
    images: [{ url: `https://${BRAND.domain}/og-image.jpg`, width: 1200, height: 630, alt: BRAND.companyName }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.companyName,
    description: `...`,
    images: [`https://${BRAND.domain}/og-image.jpg`],
  },
  metadataBase: new URL(`https://${BRAND.domain}`), // enables relative image URLs on child pages
};
```

Adding `metadataBase` also means every page-level `generateMetadata()` below can use
a relative image path instead of repeating the full domain.

### 2.2 Fix the domain

Confirm which domain is actually live in production, then use `BRAND.domain`
**everywhere** instead of a hardcoded string — never write the domain literally in a
second place again:

```ts
// src/app/products/[id]/page.tsx
import { BRAND } from '@/config/brand';
...
url: `https://${BRAND.domain}/products/${id}`,
```

### 2.3 Pull real product data into share metadata

Replace the hardcoded `productsData` object in `products/[id]/page.tsx` with a real
fetch from the same source `ProductDetail.tsx` uses (database via Prisma, or the
shared product-fetching function/hook already used elsewhere in the app):

```ts
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id); // reuse existing data-fetching logic, not a hardcoded object

  if (!product) {
    return { title: `Product Not Found - ${BRAND.companyName}` };
  }

  return {
    title: `${product.name} - ${BRAND.companyName}`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      url: `https://${BRAND.domain}/products/${id}`,
      siteName: BRAND.companyName,
      images: [{ url: product.images[0], width: 800, height: 800, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.images[0]],
    },
  };
}
```

This guarantees every product — including ones added after launch through the admin
dashboard — gets an accurate share preview automatically, with no code changes
needed per product.

### 2.4 Add metadata to the remaining content pages

Add the same `generateMetadata()` pattern to every page currently missing it,
pulling from that page's own data source:

- `src/app/blog/[slug]/page.tsx` → post title, excerpt, and featured image
- `src/app/collections/[slug]/page.tsx` → collection name, description, cover image
- `src/app/brewing-guides/[slug]/page.tsx` → guide title, summary, image
- `src/app/[slug]/page.tsx` (generic CMS pages, if applicable) → page title/description

Each of these should follow the exact shape used in §2.3 — title, description, one
`openGraph.images` entry, and a matching `twitter` block — just swap the data source.

### 2.5 Add share buttons to shareable content beyond products

The share-button logic in `ProductDetail.tsx` (`handleShare`, `trackShare`, and the
Facebook/Twitter/LinkedIn/WhatsApp/native-share handlers) is solid and doesn't need
rewriting — extract it into a shared component so it can be reused:

```
src/app/components/ShareButtons.tsx
```

```tsx
interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  // move handleShare / trackShare logic here, parameterized by url/title/description
  // instead of the product-specific variables currently used
}
```

Then drop `<ShareButtons url={postUrl} title={post.title} />` into `BlogPost.tsx` and
anywhere else content should be shareable (collections, brewing guides).

---

## 3. Verifying fixes (how to test)

Social platforms cache previews aggressively and don't respect your browser's cache —
you need each platform's own debug/inspection tool, and you must re-fetch after every
metadata change:

| Platform | Debug tool |
|---|---|
| Facebook / Instagram | [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/) — paste the URL, click "Scrape Again" to force a refresh |
| Twitter / X | [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) (may require login) |
| LinkedIn | [linkedin.com/post-inspector](https://www.linkedin.com/post-inspector/) |
| WhatsApp | No public debugger — clear the link preview by changing the URL slightly (e.g. adding `?v=2`) while testing, since WhatsApp caches per-URL client-side |
| General / quick check | View page source and confirm `<meta property="og:image">`, `og:title`, `og:description`, and the `twitter:*` equivalents are present and correct before testing on any platform |

**Test checklist:**

- [ ] Homepage share shows `og-image.jpg`, correct title/description, correct domain.
- [ ] A product page share shows that product's actual name, description, and photo —
      test with a product added through the admin dashboard, not just a seeded one.
- [ ] A blog post share shows that post's title/excerpt/image, not the homepage's.
- [ ] A collection page share shows that collection's own preview.
- [ ] All share URLs resolve to `BRAND.domain` — no leftover hardcoded domain anywhere.
- [ ] Facebook Sharing Debugger, Twitter Card Validator, and LinkedIn Post Inspector
      all render a correct preview after a forced re-scrape.
- [ ] Share buttons (Facebook/Twitter/LinkedIn/WhatsApp/native) work correctly from
      both the product page and blog posts.
- [ ] Native share (`navigator.share`) still works correctly on mobile for both.

---

## 4. Optional next step: dynamic OG images

Right now product/blog images used for sharing are the same photos used on the page
itself, which is fine. If you later want share cards with the product name/price
overlaid on the image (common for e-commerce), Next.js supports generating these on
the fly with `next/og` (`ImageResponse`) at a route like
`src/app/products/[id]/opengraph-image.tsx` — no third-party service required. This
is a nice-to-have, not part of the current bug fix.
