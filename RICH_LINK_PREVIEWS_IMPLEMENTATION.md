# Rich Link Previews (Open Graph / Twitter Cards) — Implementation Guide
**Project:** Himmat Tea / Godgifted
**Goal:** When *anyone* — visitor, customer, or admin — shares a link to a product, blog post, career listing, collection, brewing guide, or any other page, the preview card that appears in WhatsApp, iMessage, Facebook, X/Twitter, LinkedIn, Slack, Telegram, etc. shows a real image, title, and description for that specific piece of content — never a generic/broken fallback.
**Companion doc:** `SOCIAL_SHARING_IMPLEMENTATION.md` (share *buttons*). This doc covers what makes the *preview card itself* look professional regardless of how the link was shared — pasting a URL manually has the exact same requirement as clicking a share button.

---

## 0. What "professional" actually requires

A share card is built by the receiving app (WhatsApp, iMessage, Slack...) reading `<meta>` tags from the shared URL — not by your app. There's no button or code that "sends" a nice card; the app scrapes these tags the moment the link is pasted or opened. Three tags matter:

| Tag | Purpose | Requirement |
|---|---|---|
| `og:title` (+ `twitter:title`) | Headline in the card | Specific to the content — never "Himmat Tea" for every page |
| `og:description` (+ `twitter:description`) | Subtext | 1–2 sentences, no HTML, ~155 chars ideal |
| `og:image` (+ `twitter:image`) | The photo/thumbnail | **Absolute URL**, ideally exactly **1200×630px**, under ~5MB, `.jpg`/`.png` |
| `og:url` | Canonical link | Must match the actual shareable URL, no tracking params |
| `og:type` | Content type | `article` for blog posts, `product` isn't a real OG type (use `website`) |

Two failure modes cause "unprofessional" cards, and you currently have both somewhere in the app:

1. **No per-page metadata → generic fallback everywhere.** Every `'use client'` page with no `generateMetadata`/`metadata` export falls back to whatever `layout.tsx` defines. Right now that's the same title/description/image for the homepage, every blog post, every collection, the careers page, etc.
2. **Missing/broken image → ugly/no image at all.** `layout.tsx` points to `/og-image.jpg`, which doesn't exist in `public/`. Until that file exists, *every* fallback card (any page without its own image) shows broken or no image.

Fix both, for every content type, below.

---

## 1. Audit: what exists today, verified against your actual Prisma schema

I checked `prisma/schema.prisma` directly rather than guessing field names (my first draft of the blog snippet had this wrong — corrected in §3 below).

| Route | Page file | Has its own metadata? | DB model | Real fields to use |
|---|---|---|---|---|
| `/products/[id]` | `src/app/products/[id]/page.tsx` | ✅ Yes, dynamic | `Product` | `name`, `description`, `imageUrl` |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | ❌ No | `BlogPost` | `title`, `excerpt`, `image`, `slug` — **no `isPublished`/status field exists on this model** |
| `/blog` (index) | `src/app/blog/page.tsx` | ❌ No | — | static |
| `/careers` | `src/app/careers/page.tsx` | ❌ No | `Career` / `CareerJob` | `title`, `department`, `description` — **no `image` field on either model, and no per-job route/slug exists** |
| `/collections/[slug]` | `src/app/collections/[slug]/page.tsx` | ❌ No | `Collection` | `title`, `description`, `image`, `slug`, `isActive` |
| `/collections` (index) | `src/app/collections/page.tsx` | ❌ No | — | static |
| `/brewing-guides/[slug]` | `src/app/brewing-guides/[slug]/page.tsx` | ❌ No | `BrewingGuide` | `title`, `description`, `image`, `slug`, `isActive` |
| `/brewing-guides` (index) | `src/app/brewing-guides/page.tsx` | ❌ No | — | static |
| `/[slug]` (product line landing, e.g. `/himmat-tea`) | `src/app/[slug]/page.tsx` | ❌ No | `ProductLine` | `name`, `description`, `heroImage` (nullable), `slug` |
| `/products` (index) | `src/app/products/page.tsx` | ❌ No | — | static |
| `/about`, `/faq`, `/contact`, `/wholesale`, `/privacy-policy`, `/terms`, `/shipping-returns` | various | ❌ No | — | static, low priority (see §7) |

**Good news on images:** `Product.imageUrl`, `BlogPost.image`, `Collection.image`, `BrewingGuide.image`, and `ProductLine.heroImage` are all uploaded via Cloudinary (`src/lib/cloudinary.ts`), so they're **already absolute URLs** (`https://res.cloudinary.com/...`) — no path-joining or `metadataBase` resolution needed for these. `metadataBase` in `layout.tsx` only matters for relative paths like `/og-image.jpg`.

**Bad news on careers:** the `Career`/`CareerJob` models have **no image field at all**, and there's no `/careers/[id]` route — so a shared careers link can only ever use the sitewide fallback image, never a per-job photo. This isn't a bug to fix in code; it's a data-model gap (see §5).

---

## 2. Shared helper — stop repeating the same OG boilerplate

Every one of the snippets below repeats the same `openGraph`/`twitter` shape. Extract it once:

### `src/lib/metadata.ts`

```ts
import { Metadata } from 'next';
import { BRAND } from '@/config/brand';

interface BuildMetadataArgs {
  title: string;
  description: string;
  path: string;            // e.g. "/blog/my-post" — no domain, no trailing slash issues
  image?: string | null;    // absolute URL (Cloudinary) or undefined/null to use sitewide fallback
  type?: 'website' | 'article';
}

const FALLBACK_IMAGE = '/og-image.jpg'; // resolved against metadataBase in layout.tsx

export function buildMetadata({ title, description, path, image, type = 'website' }: BuildMetadataArgs): Metadata {
  const url = `https://${BRAND.domain}${path}`;
  const resolvedImage = image || FALLBACK_IMAGE;

  return {
    title: `${title} - ${BRAND.companyName}`,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND.companyName,
      images: [{ url: resolvedImage, width: 1200, height: 630, alt: title }],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolvedImage],
    },
  };
}

export function notFoundMetadata(label: string): Metadata {
  return {
    title: `${label} Not Found - ${BRAND.companyName}`,
    description: `The ${label.toLowerCase()} you are looking for could not be found.`,
  };
}
```

Every `generateMetadata` below becomes 3–5 lines instead of 20.

---

## 3. Blog posts — `/blog/[slug]` (corrected)

> **Correction to my earlier draft:** I previously wrote this against a guessed schema (`coverImage`, `isPublished`). Your actual `BlogPost` model is `slug`, `title`, `excerpt`, `image` — and has **no publish/status field**, meaning every row in the table is implicitly public. Use the version below.

```tsx
// src/app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import BlogPost from '@/app/pages/BlogPost';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, image: true },
  });

  if (!post) return notFoundMetadata('Article');

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    image: post.image,
    type: 'article',
  });
}

export default function BlogPostPage() {
  return <BlogPost />;
}
```

`BlogPost.tsx` itself stays `'use client'` (it needs `useParams` for the interactive parts) — this is the standard Next.js split: a thin server `page.tsx` that only exports `generateMetadata` and renders the client component as a child.

If you *do* want draft/unpublished posts later, that's a schema change (`ALTER TABLE` adding an `isPublished Boolean` column via a Prisma migration) — flag this if editorial drafting is something admins need; right now everything in the table is live the moment it's saved.

---

## 4. Products — already correct, no action needed

`src/app/products/[id]/page.tsx` already does this correctly against real fields (`name`, `description`, `imageUrl`) with a proper not-found fallback. Nothing to change here — it's the reference implementation the rest of this doc copies.

One small improvement worth making: swap its hardcoded `https://himmattea.com/products/${id}` and `siteName: 'Himmat Tea'` (the comment literally says "Replace with your actual domain") for `buildMetadata()` from §2, so it uses `BRAND.domain`/`BRAND.companyName` and stays correct if the domain or brand name ever changes:

```tsx
// src/app/products/[id]/page.tsx
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const parsedId = parseInt(id, 10);

  const product = Number.isNaN(parsedId)
    ? null
    : await prisma.product.findUnique({
        where: { id: parsedId },
        select: { name: true, description: true, imageUrl: true, isActive: true },
      });

  if (!product || product.isActive === false) return notFoundMetadata('Product');

  return buildMetadata({
    title: product.name,
    description: product.description,
    path: `/products/${id}`,
    image: product.imageUrl,
  });
}
```

---

## 5. Careers — page-level only (no per-job image exists)

Since `Career`/`CareerJob` have no image field and no `/careers/[id]` route, the most "professional" achievable today is a strong **page-level** card using the sitewide OG image, applied as *static* metadata (no DB fetch needed — it doesn't vary per visit):

```tsx
// src/app/careers/page.tsx
import { Metadata } from 'next';
import Careers from '@/app/pages/Careers';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Careers at ${BRAND.companyName}`,
  description: `Join the ${BRAND.companyName} team — open roles across sourcing, operations, and growth.`,
  path: '/careers',
});

export default function CareersPage() {
  return <Careers />;
}
```

**If per-job cards matter to you** (e.g. you want a shared LinkedIn post for "Senior Roaster" to show that job's title, not just "Careers"), you need two things that don't exist yet:
1. An `image` column on `CareerJob` (or a sensible category-based fallback image, e.g. a generic "We're Hiring" graphic per department).
2. A real route, `/careers/[id]/page.tsx`, with its own `generateMetadata` pulling `title`, `department`, `location` into the description — same pattern as blog/product above.

This is a data-model + routing change, not just a metadata fix — flag it back to me if you want it scoped out; I didn't want to invent a `CareerJob.image` field and route that don't exist in your schema.

---

## 6. Collections — `/collections/[slug]`

```tsx
// src/app/collections/[slug]/page.tsx
import { Metadata } from 'next';
import CollectionDetail from '@/app/pages/CollectionDetail';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { title: true, description: true, image: true, isActive: true },
  });

  if (!collection || collection.isActive === false) return notFoundMetadata('Collection');

  return buildMetadata({
    title: collection.title,
    description: collection.description,
    path: `/collections/${slug}`,
    image: collection.image,
  });
}

export default function CollectionDetailPage() {
  return <CollectionDetail />;
}
```

---

## 7. Brewing guides — `/brewing-guides/[slug]`

```tsx
// src/app/brewing-guides/[slug]/page.tsx
import { Metadata } from 'next';
import BrewingGuideDetail from '@/app/pages/BrewingGuideDetail';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const guide = await prisma.brewingGuide.findUnique({
    where: { slug },
    select: { title: true, description: true, image: true, isActive: true },
  });

  if (!guide || guide.isActive === false) return notFoundMetadata('Brewing Guide');

  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: `/brewing-guides/${slug}`,
    image: guide.image,
  });
}

export default function BrewingGuideDetailPage() {
  return <BrewingGuideDetail />;
}
```

---

## 8. Product line landing pages — `/[slug]` (e.g. `/himmat-tea`, `/godgifted-dal`)

This route reads from `ProductLine` (via `useStore()` client-side today). `heroImage` is **nullable**, so the fallback matters here more than anywhere else:

```tsx
// src/app/[slug]/page.tsx
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';
// ...keep existing client component imports, rename the default export's
// current content into a child client component if it isn't already split out.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const productLine = await prisma.productLine.findUnique({
    where: { slug },
    select: { name: true, description: true, heroImage: true, isActive: true },
  });

  if (!productLine || productLine.isActive === false) return notFoundMetadata('Page');

  return buildMetadata({
    title: productLine.name,
    description: productLine.description,
    path: `/${slug}`,
    image: productLine.heroImage, // null-safe: buildMetadata() falls back to /og-image.jpg
  });
}
```

> **Heads up:** `src/app/[slug]/page.tsx` is currently `'use client'` with the whole render inline (not a thin wrapper around a separate component like the blog/product pages are). To add `generateMetadata`, you'll need to split it: move the existing JSX/hooks into a new `src/app/pages/ProductLine.tsx` (`'use client'`), and make `page.tsx` a server component that only exports `generateMetadata` + renders `<ProductLine slug={slug} />`. This is a bigger refactor than the other pages in this doc — budget extra time for it.

---

## 9. List/index pages — static metadata, still worth doing

`/blog`, `/collections`, `/brewing-guides`, `/products` don't need `generateMetadata` (nothing dynamic to fetch) — just a static `metadata` export so *sharing the index itself* (e.g. "check out our whole blog") looks intentional instead of falling back to the homepage's card:

```tsx
// src/app/blog/page.tsx
import { Metadata } from 'next';
import Blog from '@/app/pages/Blog';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Blog`,
  description: `Stories, brewing tips, and sourcing notes from ${BRAND.companyName}.`,
  path: '/blog',
});

export default function BlogPage() {
  return <Blog />;
}
```

Repeat the same shape for `collections/page.tsx`, `brewing-guides/page.tsx`, `products/page.tsx` with content-appropriate title/description. Lower priority: `about`, `faq`, `contact`, `wholesale`, `privacy-policy`, `terms`, `shipping-returns` — these are rarely shared socially, but the same 5-line pattern applies if you want full coverage.

---

## 10. Testing — this is the part people skip and then wonder why it "doesn't work"

Two things trip everyone up:

1. **Your own chat app caches previews.** If you test by pasting the same URL into WhatsApp/iMessage to yourself repeatedly, you'll often see the *old* cached card even after fixing the code — the receiving app cached it the first time it saw that URL. Use the platform's own debugger tools instead, which let you force a re-scrape:
   - Facebook/WhatsApp: `https://developers.facebook.com/tools/debug/` → paste URL → "Scrape Again"
   - X/Twitter: `https://cards-dev.twitter.com/validator` (may require login)
   - LinkedIn: `https://www.linkedin.com/post-inspector/`
   - Generic (no login needed): `https://www.opengraph.xyz/` — paste any URL, see exactly what tags it finds

2. **Localhost won't work in these tools.** OG scrapers fetch the URL over the public internet — they can't reach `localhost:3000`. Test against your deployed/staging domain, or a tunnel (ngrok/cloudflared) if you need to test before deploying.

### Checklist

- [ ] `public/og-image.jpg` exists, is exactly 1200×630, loads directly in a browser
- [ ] Product page → opengraph.xyz shows the product's own name/description/photo
- [ ] Blog post → shows the post's own title/excerpt/image (not the sitewide default)
- [ ] Collection page → shows the collection's own title/image
- [ ] Brewing guide page → shows the guide's own title/image
- [ ] Product line page (`/himmat-tea`, `/godgifted-dal`) → shows that line's name/image, falls back to `/og-image.jpg` gracefully if `heroImage` is null for a line
- [ ] Careers page → shows "Careers at [Brand]" with the sitewide image (expected — no per-job image exists)
- [ ] A **deleted/inactive** product, blog post, collection, or guide → shows the "Not Found" metadata, not a stale cached card or a 500 error
- [ ] Every card's description is under ~200 characters (long DB descriptions can make some platforms truncate mid-word or drop the image entirely)
- [ ] Re-scrape via Facebook's debugger after any content edit — if an admin changes a product's photo, the *old* shared links will show the old image until re-scraped (this is normal, unavoidable platform-side caching, not a bug)

---

## 11. File-by-file checklist

| File | Action |
|---|---|
| `src/lib/metadata.ts` | **Create** — shared `buildMetadata()`/`notFoundMetadata()` helpers |
| `public/og-image.jpg` | **Create** — 1200×630 branded fallback (see `SOCIAL_SHARING_IMPLEMENTATION.md` §4.1) |
| `src/app/blog/[slug]/page.tsx` | **Fix** — correct field names (`image`, no `isPublished`), use `buildMetadata()` |
| `src/app/products/[id]/page.tsx` | **Refactor** — swap hardcoded domain/name for `buildMetadata()` (optional cleanup) |
| `src/app/careers/page.tsx` | **Add** — static metadata via `buildMetadata()` |
| `src/app/collections/[slug]/page.tsx` | **Add** — `generateMetadata()` |
| `src/app/brewing-guides/[slug]/page.tsx` | **Add** — `generateMetadata()` |
| `src/app/[slug]/page.tsx` | **Refactor + add** — split into server `page.tsx` + client child, add `generateMetadata()` |
| `src/app/blog/page.tsx`, `collections/page.tsx`, `brewing-guides/page.tsx`, `products/page.tsx` | **Add** — static metadata |
| `src/app/about/page.tsx`, `faq/page.tsx`, `contact/page.tsx`, etc. | Optional — same static pattern, lower priority |

---

## 12. Open questions

1. **Careers per-job cards** — do you want to invest in a `CareerJob.image` field + `/careers/[id]` route so individual roles get their own preview (§5), or is the page-level "Careers at [Brand]" card sufficient?
2. **Blog draft/publish state** — right now every `BlogPost` row is publicly shareable the moment it's saved (no status field). Is that intended, or do you want an `isPublished` flag added so admins can draft before going live?
3. **`/[slug]` refactor scope** — this is the one page in the list that needs a real component split, not just an added export. OK to schedule as slightly larger than the others?
4. **OG image ownership** — same open question as the companion doc: who's producing the branded 1200×630 fallback image?
