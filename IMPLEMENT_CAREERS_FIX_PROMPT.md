# Implementation Prompt — Fix Careers Page Access & Duplicate Applications

Paste this whole prompt into Claude Code (or another coding agent) with the `himmat_tea` repo open.

---

## Context

The `/careers` page is broken for real visitors: `src/middleware.ts` denies every `/api/*` request by default unless the route is explicitly allowlisted or the caller has an **admin** session cookie. Two career-related routes were never added to that allowlist:

- `GET /api/careers` (job listings) — currently blocks even logged-in **customers**, not just anonymous visitors. The frontend (`src/app/pages/Careers.tsx`) swallows the resulting 401 in a `.catch()` and just renders an empty list, so it silently looks like "no jobs" instead of "blocked."
- `POST /api/career-applications` (submitting an application) — same problem; the route's own code comment already says "public, no visitor login" but the middleware never allowed it through.

There's also a separate leak in the same GET handler: it trusts a `?admin=true` query param to decide whether to include inactive/unpublished jobs, without checking that the requester is actually an admin — so anyone could append that param and see jobs that aren't public yet.

Finally, there's no protection against the same email submitting multiple applications to the same job.

## Task

Make four changes:

### 1. `src/middleware.ts`

Add two entries to the `PUBLIC_API_ROUTES` array:

```ts
// ===== Contact / partnership (public writes) =====
{ path: pathExact('/api/contact'), methods: ['POST'] },
{ path: pathExact('/api/partnership'), methods: ['POST'] },

// ===== Career applications (public write — no visitor login required) =====
{ path: pathExact('/api/career-applications'), methods: ['POST'] },
```

```ts
// ===== Storefront: public GETs (content reads) =====
// Career listings: public so visitors don't need to be logged in (as a
// customer OR admin) to see open roles. The route itself still gates the
// ?admin=true param behind getCurrentAdmin() server-side (see
// /api/careers/route.ts), so this only exposes the same active-jobs-only
// view every visitor is meant to see.
{ path: pathExact('/api/careers'), methods: ['GET'] },
{ path: pathExact('/api/products'), methods: ['GET'] },
```

(Insert the second block right before the existing `/api/products` GET entry — same section, same list.)

### 2. `src/app/api/careers/route.ts` — close the `?admin=true` leak

Replace:

```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'

    const jobs = await prisma.careerJob.findMany({
      where: isAdminView ? {} : { isActive: true },
```

With:

```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // `?admin=true` must not be trusted on its own — anyone (not just an
    // admin) could append it and see inactive/unpublished jobs. Only honor
    // it when the request actually carries a valid admin session.
    const requestedAdminView = searchParams.get('admin') === 'true'
    const isAdminView = requestedAdminView && !!(await getCurrentAdmin())

    const jobs = await prisma.careerJob.findMany({
      where: isAdminView ? {} : { isActive: true },
```

(`getCurrentAdmin` is already imported at the top of this file for the POST handler — reuse it, don't re-import.)

### 3. Database — one application per email, per job

**Schema** (`prisma/schema.prisma`), in the `CareerApplication` model, add a unique constraint:

```prisma
model CareerApplication {
  id          String   @id @default(cuid())
  careerJobId String
  fullName    String
  email       String
  phone       String
  address     String
  coverLetter String
  resumeUrl   String
  status      String   @default("New")
  adminNotes  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  careerJob   CareerJob @relation(fields: [careerJobId], references: [id], onDelete: Cascade)

  // One application per email, per job. `email` is normalized to lowercase
  // before every write (see /api/career-applications POST), so this also
  // catches "Jane@x.com" vs "jane@x.com" as the same applicant.
  @@unique([careerJobId, email])
  @@index([careerJobId])
  @@index([status])
}
```

Then generate a real migration by running (do NOT hand-write the SQL — let Prisma generate it against the actual dev database):

```bash
npx prisma migrate dev --name add_career_application_unique_email_per_job
```

Before that migration can apply cleanly, any **pre-existing duplicate** `(careerJobId, email)` rows in the `CareerApplication` table need to be resolved first (Prisma's migration won't do this for you — a unique index can't be created over duplicate data). Two options, pick based on what's in the database:

- If the table is empty or has no duplicates today, the generated migration will apply with no extra work.
- If duplicates exist, either manually resolve them first, or extend the generated migration SQL to lowercase all existing emails and delete extra duplicate rows (keeping the oldest per pair) before the `CREATE UNIQUE INDEX` statement — ask me for the exact SQL for this step if it's needed; don't invent it without checking what's actually in the table.

### 4. `src/app/api/career-applications/route.ts` — enforce it at the API layer too

In the `POST` handler, after the existing `job`/`isActive` check and before the resume upload, add:

```ts
const job = await prisma.careerJob.findUnique({ where: { id: data.careerJobId } })
if (!job || !job.isActive) {
  return createErrorResponse('This role is no longer accepting applications', 404)
}

// One application per email, per job. Emails are normalized to lowercase
// so "Jane@x.com" and "jane@x.com" are treated as the same applicant.
const normalizedEmail = data.email.toLowerCase()

const existing = await prisma.careerApplication.findUnique({
  where: {
    careerJobId_email: {
      careerJobId: data.careerJobId,
      email: normalizedEmail,
    },
  },
  select: { id: true },
})
if (existing) {
  return createErrorResponse(
    'An application from this email already exists for this role. Each email may apply to a given role once.',
    409
  )
}

let resumeUrl: string
try {
  resumeUrl = await uploadResume(resumeFile as File)
} catch (err: any) {
  return createErrorResponse(err?.message || 'Failed to upload resume', 400)
}
```

Then wrap the existing `prisma.careerApplication.create(...)` call in a try/catch that catches the race-condition case (two identical submissions landing at nearly the same instant, both passing the check above before either commits):

```ts
let application
try {
  application = await prisma.careerApplication.create({
    data: {
      careerJobId: data.careerJobId,
      fullName: data.fullName,
      email: normalizedEmail,   // use the normalized value, not data.email
      phone: data.phone,
      address: data.address,
      coverLetter: data.coverLetter,
      resumeUrl,
      status: 'New',
    },
  })
} catch (err: any) {
  if (err?.code === 'P2002') {
    return createErrorResponse(
      'An application from this email already exists for this role. Each email may apply to a given role once.',
      409
    )
  }
  throw err
}

return createResponse(
  { message: 'Application submitted successfully', id: application.id },
  201
)
```

No changes are needed in `src/app/pages/Careers.tsx` — its `ApplyDialog` component already reads `result?.error` from the API response and renders it in the dialog's `{error}` span, so the 409 message above will surface automatically.

## Verification steps (do these after implementing)

1. Log out completely (clear the `himmat_sessionToken` cookie, or use an incognito window). Load `/careers`. Job listings must appear — previously this rendered an empty list with no visible error.
2. While still logged out, submit an application through the "Apply" dialog for any open role. It should succeed (this proves the POST route is now actually public, not just the GET).
3. Submit a second application to the **same role** using the **same email** (case doesn't need to match — try `Jane@x.com` then `jane@x.com`). The second attempt must fail with: *"An application from this email already exists for this role. Each email may apply to a given role once."*
4. Submit an application with that same email to a **different** role. This must succeed — the constraint is per-job, not global.
5. As an anonymous visitor, try `GET /api/careers?admin=true` directly (e.g. via browser devtools or curl, no cookies). It must return only active jobs, identical to the response without the `admin=true` param — confirming the param is no longer trusted on its own.
6. Log in as an admin and confirm the admin dashboard's career management view (`?admin=true` from an authenticated admin request) still shows inactive/draft jobs as before — this must be unaffected by the fix.
