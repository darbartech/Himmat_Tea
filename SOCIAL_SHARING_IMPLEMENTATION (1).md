# Social Sharing — Implementation Guide
**Project:** Himmat Tea / Godgifted
**Scope:** Product pages, Blog posts, Careers page, and sitewide OG defaults
**Status of audit:** completed against the uploaded codebase (`Himmat_Tea.zip`)

---

## 0. Current-state summary

| Surface | Buttons work? | OG/Twitter meta tags? | Notes |
|---|---|---|---|
| Product Detail (`/products/[id]`) | ✅ Yes | ✅ Yes (dynamic, DB-driven) | Reference implementation — copy this pattern everywhere else |
| Blog Post (`/blog/[slug]`) | ❌ No | ❌ No (falls back to sitewide default) | Buttons have no `onClick`; "Copy link" doesn't call clipboard |
| Careers (`/careers`) | ❌ Doesn't exist | ❌ No | Single page, no share affordance at all |
| Sitewide default (`layout.tsx`) | n/a | ⚠️ Broken | Points to `/og-image.jpg`, which is not in `public/` |
| Footer social icons | ❌ Dead | n/a | All point to `href="#"`, no URLs in config |

This document gives you a single reusable share utility, then wires it into each surface, then fixes metadata and the footer.

> **See also:** `RICH_LINK_PREVIEWS_IMPLEMENTATION.md` — the full OG/Twitter-card spec for *every* content type (products, blog, careers, collections, brewing guides, product lines), with field names verified against `prisma/schema.prisma`. This doc's §2 (blog metadata) is superseded by that one.

---

## 1. Build one shared utility (don't repeat `handleShare` per page)

Today `ProductDetail.tsx` has its own local `handleShare()`/`trackShare()`. Blog and Careers need the exact same behavior. Extract it once.

### 1.1 Create `src/lib/social-share.ts`

```ts
// src/lib/social-share.ts
export type SharePlatform =
  | "facebook"
  | "twitter"
  | "linkedin"
  | "whatsapp"
  | "copy"
  | "native";

export interface ShareOptions {
  url: string;          // absolute URL of the thing being shared
  title: string;        // e.g. product name / blog title / "Careers at Himmat Tea"
  text?: string;         // short one-liner, falls back to title
}

function openPopup(shareUrl: string) {
  if (typeof window === "undefined") return;
  window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
}

export async function shareTo(platform: SharePlatform, opts: ShareOptions): Promise<"opened" | "copied" | "shared" | "unsupported" | "cancelled"> {
  const { url, title } = opts;
  const text = opts.text ?? title;

  switch (platform) {
    case "facebook":
      openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
      return "opened";

    case "twitter":
      openPopup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
      return "opened";

    case "linkedin":
      openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      return "opened";

    case "whatsapp":
      openPopup(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
      return "opened";

    case "copy":
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return "copied";
      }
      return "unsupported";

    case "native":
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return "shared";
        } catch {
          // user dismissed the native sheet — not an error
          return "cancelled";
        }
      }
      return "unsupported";
  }
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
```

Why this shape:
- Every share surface (product, blog, career) calls the same function with different `url`/`title`/`text` — no copy-pasted popup logic.
- Returns a result string instead of throwing, so callers decide how to show a toast without wrapping every call in try/catch.
- `supportsNativeShare()` lets you conditionally render the native-share button, same as `ProductDetail.tsx` already does inline.

### 1.2 Create one reusable component: `src/app/components/ShareBar.tsx`

```tsx
'use client';

import { useState, useEffect } from "react";
import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { shareTo, supportsNativeShare, type ShareOptions } from "@/lib/social-share";
import { useTranslation } from "@/hooks/useTranslation";

interface ShareBarProps extends ShareOptions {
  /** i18n namespace prefix, e.g. "productDetail.share" or "blog.share" or "careers.share" */
  labelPrefix: string;
  variant?: "icons" | "buttons"; // icons = ProductDetail style, buttons = BlogPost style
}

export default function ShareBar({ url, title, text, labelPrefix, variant = "icons" }: ShareBarProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // IMPORTANT: don't call navigator.share/supportsNativeShare() directly in the
  // render body. `typeof navigator` differs between the server (no navigator,
  // always false) and the client's real capabilities, so branching on it during
  // the render that must match SSR output causes a hydration mismatch — the
  // native-share button (and everything after it) renders in a different
  // position server- vs client-side. Instead default to false (matches SSR),
  // then flip it true in an effect, which only runs after hydration completes.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(supportsNativeShare());
  }, []);

  async function handle(platform: Parameters<typeof shareTo>[0]) {
    const result = await shareTo(platform, { url, title, text });
    if (result === "copied") {
      setCopied(true);
      toast.success(t(`${labelPrefix}.copied`) || "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
    if (result === "unsupported" && platform === "copy") {
      toast.error("Copy isn't supported in this browser.");
    }
  }

  const iconCls = "h-4 w-4";

  return (
    <div className="flex flex-wrap gap-2">
      {canNativeShare && (
        <button
          onClick={() => handle("native")}
          aria-label={t(`${labelPrefix}.native`)}
          title={t(`${labelPrefix}.native`)}
          className="flex items-center gap-2 px-3 py-2.5 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#234832] transition-colors"
        >
          <Share2 className={iconCls} />
          <span className="text-sm font-medium hidden sm:inline">{t(`${labelPrefix}.button`)}</span>
        </button>
      )}
      <button onClick={() => handle("facebook")} aria-label={t(`${labelPrefix}.facebook`)} title={t(`${labelPrefix}.facebook`)}
        className="p-2.5 bg-[#1877f2] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877f2]">
        <Facebook className={iconCls} />
      </button>
      <button onClick={() => handle("twitter")} aria-label={t(`${labelPrefix}.twitter`)} title={t(`${labelPrefix}.twitter`)}
        className="p-2.5 bg-black text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
        <Twitter className={iconCls} />
      </button>
      <button onClick={() => handle("whatsapp")} aria-label={t(`${labelPrefix}.whatsapp`)} title={t(`${labelPrefix}.whatsapp`)}
        className="p-2.5 bg-[#25d366] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25d366]">
        <MessageCircle className={iconCls} />
      </button>
      <button onClick={() => handle("linkedin")} aria-label={t(`${labelPrefix}.linkedin`)} title={t(`${labelPrefix}.linkedin`)}
        className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077b5]">
        <Linkedin className={iconCls} />
      </button>
      <button
        onClick={() => handle("copy")}
        aria-label={t(`${labelPrefix}.copyLink`)}
        title={copied ? "Copied!" : "Copy Link"}
        className={`p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          copied ? "bg-[#2d5a3d] text-white focus:ring-[#2d5a3d]" : "bg-[#78746e] text-white hover:opacity-90 focus:ring-[#78746e]"
        }`}
      >
        {copied ? <Check className={iconCls} /> : <Link2 className={iconCls} />}
      </button>
    </div>
  );
}
```

This is literally `ProductDetail.tsx`'s existing markup, lifted into a component that any page can drop in with 4 props. `ProductDetail.tsx` can now delete its local `handleShare`/`trackShare`/share buttons and just render `<ShareBar url={...} title={...} labelPrefix="productDetail.share" />` — behavior is unchanged, code is deduplicated.

### ⚠️ Hydration pitfall — read before implementing

`ProductDetail.tsx`'s original code checks `typeof navigator !== 'undefined' && typeof navigator.share === 'function'` **directly in the JSX** to decide whether to render the native-share button. `ShareBar` above does **not** do this — it uses `useState(false)` + `useEffect` instead. This is deliberate, not a style choice:

- On the **server**, `navigator` doesn't exist, so any server-rendered check is always `false`.
- On the **client's first render** (before/during hydration), React must produce output identical to the server's HTML, or it throws `Hydration failed because the server rendered HTML didn't match the client` and discards/re-renders that subtree.
- If a client device *does* support `navigator.share` (most mobile browsers), checking it inline means the client's first render already differs from the server's — mismatch, and React logs an error and regenerates the tree (visible as a console error + a flash where buttons reorder).

The fix pattern, used above: default the flag to `false` (matching SSR) via `useState`, then set the real value inside `useEffect`. Effects only run after hydration completes, so the first client render always matches the server, and the native button correctly appears a tick later without any console error. **Apply this same fix if you copy the pattern from the original `ProductDetail.tsx` rather than using `ShareBar`.**

```tsx
// ❌ Don't do this in a component that's server-rendered:
{typeof navigator !== 'undefined' && navigator.share && (
  <button onClick={...}>Share</button>
)}

// ✅ Do this instead:
const [canShare, setCanShare] = useState(false);
useEffect(() => { setCanShare(typeof navigator !== 'undefined' && !!navigator.share); }, []);
{canShare && <button onClick={...}>Share</button>}
```

This same principle applies anywhere else in the codebase that branches on `window`/`navigator`/`document` inside a component's render body (search for `typeof window !== 'undefined'` and `typeof navigator !== 'undefined'` across `src/` — several show up in the grep from the original audit, e.g. inside `handleShare` itself, which is safe since those only run inside event handlers, not render).

---

## 2. Blog post sharing

### 2.1 Fix `src/app/pages/BlogPost.tsx`

Replace the dead `handleCopyLink` and inert buttons (around line 32 and lines 158–179) with `ShareBar`:

```tsx
// Remove: const [copied, setCopied] = useState(false);
// Remove: const handleCopyLink = () => { ... };

// Replace the whole "{/* Share */}" block with:
<div className="mt-12 pt-8 border-t border-[rgba(28,25,23,0.08)]">
  <p className="text-sm font-medium text-[#78746e] mb-4 flex items-center gap-2">
    <Share2 className="h-4 w-4" />
    {t('blog.share.title')}
  </p>
  <ShareBar
    url={typeof window !== 'undefined' ? window.location.href : `https://${BRAND.domain}/blog/${slug}`}
    title={post.title}
    text={post.excerpt ?? post.title}
    labelPrefix="blog.share"
    variant="icons"
  />
</div>
```

Add the import: `import ShareBar from "@/app/components/ShareBar";` and `import { BRAND } from "@/config/brand";`.

### 2.2 Add blog post metadata (this is the part that actually makes shared links look good)

`src/app/blog/[slug]/page.tsx` is currently a client component with **no `generateMetadata`**, so every shared blog link in WhatsApp/iMessage/Facebook previews shows the generic sitewide title/image instead of the article. Fix it the same way `products/[id]/page.tsx` already does it.

> **This section is superseded by `RICH_LINK_PREVIEWS_IMPLEMENTATION.md` §3.** My first draft here guessed field names (`coverImage`, `isPublished`) that don't exist on your actual `BlogPost` model — verified against `prisma/schema.prisma`, the real fields are `slug`, `title`, `excerpt`, `image` (not `coverImage`), and there's **no publish/status field at all** (every row is implicitly public). Use the corrected snippet in the companion doc instead of copying the block below. It's left here only so this section's surrounding context (the `'use client'` split explanation) still makes sense.

```tsx
// src/app/blog/[slug]/page.tsx  — see RICH_LINK_PREVIEWS_IMPLEMENTATION.md §3 for the correct version
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

Since `page.tsx` can no longer be `'use client'` (Next.js forbids `generateMetadata` in client components), and `BlogPost.tsx` itself must stay `'use client'` for its `useParams`/interactivity — that split is exactly what's shown above and matches how `ProductDetail`/`products/[id]/page.tsx` are already split.

### 2.3 Add translation keys

Add a `blog.share` block to **all 5** locale files (`en.json`, `ja.json`, `ne.json`, `zh.json`, `hi.json`), mirroring the existing `productDetail.share` keys:

```json
"blog": {
  "share": {
    "title": "Share this article",
    "button": "Share",
    "native": "Share via native share dialog",
    "facebook": "Share on Facebook",
    "twitter": "Share on X (Twitter)",
    "whatsapp": "Share on WhatsApp",
    "linkedin": "Share on LinkedIn",
    "copyLink": "Copy article link",
    "copied": "Link copied to clipboard!"
  }
}
```

(Translate the values for `ja`/`ne`/`zh`/`hi` — the `productDetail.share` block in each file is your reference for tone/phrasing.)

---

## 3. Careers page sharing

Careers is a single page (`/careers`) with jobs listed inline via `<Careers />` and an `<ApplyDialog>` — there's no per-job route/slug today, so there's no per-job link to share. Two options, pick one:

### Option A — Share the whole careers page (minimal effort)
Add one `ShareBar` near the top of `Careers.tsx` (e.g. under the hero/intro), sharing the page itself:

```tsx
<ShareBar
  url={`https://${BRAND.domain}/careers`}
  title={`Careers at ${BRAND.companyName}`}
  text={`We're hiring — check out open roles at ${BRAND.companyName}`}
  labelPrefix="careers.share"
/>
```

### Option B — Per-job share links (better, more work)
Give each job a shareable deep link and a "Share this role" button:

1. Add an anchor id to each job card: `id={`job-${job.id}`}` in the job list render.
2. On page load, if the URL has a hash matching a job id, auto-scroll/expand that job (`useEffect` + `window.location.hash`).
3. Add a small "Share" icon-button per job card that calls:
   ```tsx
   shareTo("copy", {
     url: `https://${BRAND.domain}/careers#job-${job.id}`,
     title: job.title,
     text: `${job.title} — ${job.department} at ${BRAND.companyName}`,
   })
   ```
4. For rich previews to work per-job (not just deep-linking), you'd eventually want real routes like `/careers/[id]`, each with its own `generateMetadata` — same pattern as section 2.2. This is a bigger change (new route, new page, migrate the apply-dialog flow) — recommend doing this only if job posts are actively shared/promoted individually (e.g. on LinkedIn).

**Recommendation:** ship Option A now; revisit Option B only if you start posting individual job links on LinkedIn/social and want rich previews per role.

### Translation keys for Careers

```json
"careers": {
  "share": {
    "title": "Share our openings",
    "button": "Share",
    "native": "Share via native share dialog",
    "facebook": "Share on Facebook",
    "twitter": "Share on X (Twitter)",
    "whatsapp": "Share on WhatsApp",
    "linkedin": "Share on LinkedIn",
    "copyLink": "Copy careers link",
    "copied": "Link copied to clipboard!"
  }
}
```

---

## 4. Sitewide fixes

### 4.1 Missing OG image (breaks every link preview that doesn't have its own image)

`src/app/layout.tsx` references `/og-image.jpg` for both `openGraph.images` and `twitter.images`, but it doesn't exist in `public/` (only `logo.png`, `logo.svg`, hero images, `payment-qr.png` are there).

- Create a **1200×630px** branded image (logo + tagline on a background, matches the tea/dal brand colors `#2d5a3d` / `#b8862f`).
- Save it as `public/og-image.jpg`.
- This becomes the fallback for any page without its own `openGraph.images` (e.g. static pages like `/about`, `/careers` if you don't add per-page metadata there too).

### 4.2 Careers page metadata

`src/app/careers/page.tsx` is currently `'use client'` with no metadata export, so it also falls back to the sitewide default. If you want a proper preview when someone shares `/careers`, split it the same way as blog/products:

```tsx
// src/app/careers/page.tsx
import { Metadata } from 'next';
import Careers from '@/app/pages/Careers';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: `Careers - ${BRAND.companyName}`,
  description: `Join the ${BRAND.companyName} team — open roles across sourcing, operations, and growth.`,
  openGraph: {
    title: `Careers at ${BRAND.companyName}`,
    description: `Join the ${BRAND.companyName} team.`,
    url: `https://${BRAND.domain}/careers`,
    siteName: BRAND.companyName,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: `Careers at ${BRAND.companyName}` }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Careers at ${BRAND.companyName}`,
    images: ['/og-image.jpg'],
  },
};

export default function CareersPage() {
  return <Careers />;
}
```

Note this is a **static** `metadata` export (not `generateMetadata`), since there's no dynamic param to fetch — much simpler than the blog/product case.

### 4.3 Footer social icons

`src/app/components/Footer.tsx` (~line 62–77) renders Instagram/Facebook/YouTube icons all pointing to `href="#"`. Fix in two steps:

**Add real URLs to `src/config/brand.ts`:**
```ts
export const BRAND = {
  // ...existing fields
  socialLinks: {
    instagram: "https://instagram.com/himmattea",   // replace with real handle
    facebook: "https://facebook.com/himmattea",
    youtube: "https://youtube.com/@himmattea",
  },
};
```

**Wire them into `Footer.tsx`:**
```tsx
import { Instagram, Facebook, Youtube } from "lucide-react";

const socialIcons = [
  { Icon: Instagram, label: "Instagram", href: BRAND.socialLinks.instagram },
  { Icon: Facebook, label: "Facebook", href: BRAND.socialLinks.facebook },
  { Icon: Youtube, label: "YouTube", href: BRAND.socialLinks.youtube },
];

// ...

<div className="flex gap-3 mb-8">
  {socialIcons.map(({ Icon, label, href }) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#2d5a3d] transition-colors"
    >
      <Icon className="h-4 w-4" />
    </a>
  ))}
</div>
```

If the brand doesn't have live social profiles yet, either omit the icons entirely (don't ship dead links) or point them to a "coming soon" or contact page temporarily — dead `#` links hurt trust more than no icons at all.

---

## 5. File-by-file checklist

| File | Action |
|---|---|
| `src/lib/social-share.ts` | **Create** — shared `shareTo()` utility |
| `src/app/components/ShareBar.tsx` | **Create** — reusable share button row |
| `src/app/pages/ProductDetail.tsx` | **Refactor** — replace inline share code with `<ShareBar />` (no behavior change) |
| `src/app/pages/BlogPost.tsx` | **Fix** — wire real handlers via `<ShareBar />`, remove dead `handleCopyLink` |
| `src/app/blog/[slug]/page.tsx` | **Fix** — add `generateMetadata()`, keep `<BlogPost />` as client child |
| `src/app/pages/Careers.tsx` | **Add** — `<ShareBar />` for the page (Option A) or per-job share (Option B) |
| `src/app/careers/page.tsx` | **Add** — static `metadata` export |
| `src/config/brand.ts` | **Add** — `socialLinks` object |
| `src/app/components/Footer.tsx` | **Fix** — point icons at `BRAND.socialLinks.*`, add `target="_blank"` |
| `public/og-image.jpg` | **Add** — 1200×630 branded fallback image |
| `src/locales/{en,ja,ne,zh,hi}.json` | **Add** — `blog.share.*` and `careers.share.*` keys |

---

## 6. Testing checklist

- [ ] Product page: Facebook/Twitter/LinkedIn/WhatsApp buttons open correct share intent with correct URL + product name
- [ ] Product page: Copy Link actually copies (paste into a new tab to confirm) and shows "Copied!" for 2s
- [ ] Product page: native share button only appears on mobile/supported browsers
- [ ] Blog post: same 6 checks as above, for an actual article
- [ ] Blog post link pasted into WhatsApp/Slack/iMessage shows the article's own title/image, not the sitewide default
- [ ] Product link pasted into WhatsApp/Slack/iMessage shows the product's own title/image (already working — regression-check after refactor)
- [ ] Careers page share works and shows a sensible title/text
- [ ] `/og-image.jpg` loads (visit the URL directly) and renders in a link-preview debugger (e.g. Facebook's Sharing Debugger, X's Card Validator, or `https://www.opengraph.xyz/`)
- [ ] Footer social icons open the correct external profile in a new tab
- [ ] No hydration warnings/errors in the browser console on `/products/[id]`, `/blog/[slug]`, or `/careers` — check on a mobile browser that supports `navigator.share` (the mismatch only shows there, not on desktop Chrome without the API)
- [ ] All share labels render correctly in all 5 locales (switch language selector and re-check tooltips/aria-labels)

---

## 7. Open questions before implementing

1. **Real social profile URLs** — Instagram/Facebook/YouTube handles for `brand.ts` (`socialLinks`) — do these exist yet, or should the icons be hidden until they do?
2. **Per-job share (Option B)** — worth the extra route/schema work, or is Option A (share the whole careers page) sufficient for now?
3. **OG image design** — who's producing the 1200×630 branded image — you, or should I draft one? (Same question as `RICH_LINK_PREVIEWS_IMPLEMENTATION.md` §12.)
