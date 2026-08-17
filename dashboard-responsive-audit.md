# Himmat Tea Admin Dashboard — Responsive Design Audit & Implementation Guide

*Prepared by Claude · August 17, 2026*

## Update note

The first pass of this audit checked the Orders page's outer structure (page
header, search/filter bar, table wrapper, dialog max-width) and called the
order/invoice/payment-verify flow "OK." That was wrong — it missed real bugs
*inside* the order-details modal itself. This revision documents those bugs
and the fixes now applied to `Orders.tsx`.

---

## 1. Bugs found in the Order Details modal (Orders.tsx)

### 1.1 Invoice preview left a large blank gap on phones/tablets

**Where:** the invoice preview at the bottom of the order-details modal.

**What was wrong:** the invoice is a fixed 794px-wide "A4" layout, and the
code scaled it down to fit narrow screens with CSS `transform: scale(...)`.
`transform` only changes what's *painted* — it does **not** change the
element's layout box. So on a phone, where the invoice might be scaled to
~40% to fit, the wrapper still reserved the invoice's full unscaled height
(a4-sized, 1100px+), while the visible content only filled the top ~40% of
that space. The rest showed up as empty gray space below the invoice before
the modal ended.

```tsx
// Before
<div className="shadow-xl rounded mx-auto origin-top"
     style={{ width: 794, transform: `scale(${invoiceScale})`, transformOrigin: 'top center' }}>
  <OrderInvoice ... />
</div>
```

**Fix:** measure the invoice's real rendered height (`scrollHeight`) and size
an outer wrapper to `naturalHeight * scale`, so the layout box actually
matches what's visible — no more blank space.

```tsx
// After
const [invoiceNaturalHeight, setInvoiceNaturalHeight] = useState<number>(0);

// inside the existing resize/ResizeObserver effect:
if (invoiceRef.current) {
  setInvoiceNaturalHeight(invoiceRef.current.scrollHeight);
}
```

```tsx
<div className="mx-auto" style={{
  width: 794 * invoiceScale,
  height: invoiceNaturalHeight ? invoiceNaturalHeight * invoiceScale : undefined,
}}>
  <div className="shadow-xl rounded origin-top-left" style={{ width: 794, transform: `scale(${invoiceScale})` }}>
    <OrderInvoice ... />
  </div>
</div>
```

### 1.2 Modal toolbar (title + Print/Download) could overflow the dialog

**Where:** the sticky header inside the order-details modal.

**What was wrong:** the title and the "Print Invoice" / "Download" buttons
were in a single non-wrapping flex row (`flex items-start justify-between`),
with the buttons marked `shrink-0` so they'd never give up space. On a
~375px phone, the order number title plus both full-width buttons don't fit
on one line, and nothing was allowed to wrap — the row overflowed sideways,
which (combined with the dialog's `overflow-y-auto`) could force an
unwanted horizontal scrollbar inside the modal.

```tsx
// Before
<div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
  <div>...title...</div>
  <div className="flex gap-2 shrink-0">
    <Button ...>Print Invoice</Button>
    <Button ...>Download</Button>
  </div>
</div>
```

**Fix:** stack the title above the buttons on small screens, let the title
truncate safely, and let the buttons share the row width.

```tsx
// After
<div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
  <div className="min-w-0">
    <DialogTitle className="text-lg sm:text-xl font-bold text-[#1c1917] break-words">...</DialogTitle>
    ...
  </div>
  <div className="flex gap-2 shrink-0">
    <Button ... className="flex-1 sm:flex-initial">Print Invoice</Button>
    <Button ... className="flex-1 sm:flex-initial">Download</Button>
  </div>
</div>
```

### 1.3 Payment-status row didn't wrap

**Where:** the "Update Payment Status" panel, for orders that are no longer
pending (already paid/failed).

**What was wrong:** the status badge and the "Order was cancelled and stock
restored." note were in a non-wrapping flex row. On a narrow column, a
longer note could push past the edge instead of wrapping to a second line.

```tsx
// Before
<div className="flex items-center gap-2">

// After
<div className="flex flex-wrap items-center gap-2">
```

### 1.4 Verify/Reject Payment buttons — safety margin added

The two buttons were already `flex-1` (equal width), which measures out
fine down to ~360px. Added `flex-wrap` on the row and a `min-w-[140px]` on
each button as a safety margin so they drop to their own line rather than
compressing illegibly on very small or unusual devices (e.g. a folded phone
at ~280px):

```tsx
<div className="flex flex-wrap gap-2">
  <Button className="flex-1 min-w-[140px] ...">Verify Payment</Button>
  <Button className="flex-1 min-w-[140px] ...">Reject Payment</Button>
</div>
```

---

## 2. Still just a scroll, not a true mobile layout: the Orders table

**Not changed in this pass — flagging it explicitly.** The main Orders list
(9 columns: checkbox, order #, customer, date, items, total, status, payment,
actions) is wrapped in `overflow-x-auto` with `min-w-[1000px]`, so on a phone
you scroll it sideways rather than it re-flowing into something built for a
narrow screen. That's functional but is fairly reported as "not really
responsive" — it's a scrollable table, not an adaptive one.

I didn't rewrite this in the same pass as the modal fixes because several
rows (e.g. the "Refund" action) drive an `AlertDialog` off shared component
state, and duplicating that interaction into a second, mobile-only card
layout risks subtly breaking the refund flow if done without a real
browser/QA pass. Recommended approach for a follow-up:

- Keep the `<table>` for `md:` and above (`hidden md:block` wrapper).
- Add a `md:hidden` stacked-card list that reuses the *same* row data and
  the *same* action handlers (`setSelectedOrder`, refund dialog, etc.) —
  just rendered as a card instead of `<tr>`, so no logic is duplicated,
  only markup.
- Same pattern applies to Inventory's and Purchase Orders' larger tables if
  you want them to match.

I'm glad to build that card view next — it's a bigger, riskier change than
the fixes above (new markup + shared state wiring across every row action),
so calling it out separately rather than bundling it in silently.

---

## 3. Recap of the previous pass (already fixed, still true)

- **Coupons.tsx / Products.tsx** — 7 modal form grids changed from a fixed
  `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`, so fields stack on phones
  instead of squeezing to ~150px each.
- **Inventory.tsx** — the "Filter by product" row now wraps
  (`flex-wrap`) and its `Select` goes full-width below `sm` instead of a
  fixed 250px that could overflow.

---

## 4. Files changed (included in the zip)

- `src/app/pages/dashboard/Orders.tsx`
- `src/app/pages/dashboard/Coupons.tsx`
- `src/app/pages/dashboard/Products.tsx`
- `src/app/pages/dashboard/Inventory.tsx`

All four were syntax-checked with `esbuild` after editing.

## 5. Suggested test matrix

| Breakpoint | Width | Focus |
|---|---|---|
| Small phone | 375px | Modal toolbar stacks, invoice has no blank gap, payment buttons wrap |
| Large phone | 428px | Same, plus check refund dialog on the table (still scrolls) |
| Tablet portrait | 768px | Sidebar drawer, 2-column grids activate |
| Tablet landscape / small laptop | 1024px | Table shows more columns before needing to scroll |
| Desktop | 1280px+ | Full table width, invoice at 100% scale |
