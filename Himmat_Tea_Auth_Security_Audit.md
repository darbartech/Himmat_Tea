# Himmat Tea — Authentication System Security Audit

**Prepared by:** Senior QA / Application Security Review
**Scope:** Customer & Admin authentication (signup, login, session handling, route protection, admin user management)
**Codebase reviewed:** `src/app/api/**`, `src/lib/auth.ts`, `src/context/AuthContext.tsx`, `src/modules/auth/**`, `src/app/components/ProtectedRoute.tsx`, `prisma/schema.prisma`
**Overall verdict:** 🔴 **NOT PRODUCTION READY.** The authentication system has multiple critical vulnerabilities that allow full account takeover, unauthenticated admin creation, and mass data exposure, in addition to the functional bugs already reported.

---

## 1. Summary of Reported Bugs (Root Cause Confirmed)

| # | Reported symptom | Root cause | File |
|---|---|---|---|
| 1 | "Invalid strong password" — cannot sign up/log in even with a strong password | Password regex only allows the special characters `@ $ ! % * ? &`. Any other symbol (e.g. `#`, `_`, `-`, `.`, `+`) makes zod reject an objectively strong password. | `src/modules/auth/SignupForm/validation.ts` |
| 2 | Auth form doesn't scroll | Modal panel has no `max-height` / `overflow-y-auto`. On short viewports the content (social buttons + divider + tabs + full signup form) exceeds the visible modal area, and nothing inside it can scroll. | `src/modules/auth/AuthModal/AuthModal.tsx` |
| 3 | "Create Account" button requires zooming out to see | Direct consequence of #2 — the submit button is the last element in a non-scrolling, overflowing container, so it renders below the fold on mobile/small desktop windows. | Same as above |

These three are UX/functional defects, but while auditing them we found the surrounding authentication and authorization logic to be **critically insecure**. Details below, ordered by severity.

---

## 2. Critical Findings

### 🔴 C-1. Admin user management API has ZERO authentication
**Endpoints:** `GET/POST /api/admin-users`, `GET/PUT/DELETE /api/admin-users/[id]`

```ts
// src/app/api/admin-users/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password, ...rest } = body
  const passwordHash = await bcrypt.hash(password, 10)
  const adminUser = await prisma.adminUser.create({ data: { ...rest, passwordHash }, ... })
  return createResponse(adminUser, 201)
}
```

None of these four route handlers call `getCurrentUser()` or check any session/role. Anyone on the internet can:
- `POST /api/admin-users` with `{ "username": "hacker", "email": "x@x.com", "password": "x", "role": "superadmin" }` → **creates a brand-new super-admin account**, no login required.
- `PUT /api/admin-users/1` with a new password → **takes over the existing admin account.**
- `DELETE /api/admin-users/1` → deletes any admin account (denial of service on the whole back office).
- `GET /api/admin-users` → enumerates every admin's username/email/role.

**Impact:** Complete, trivial, unauthenticated takeover of the entire back-office/admin panel. This is the single most severe issue in the codebase.

**Fix:** Require a valid admin session (`getCurrentUser()` + `type === 'admin'` + `role === 'superadmin'` for user-management operations) on every handler in this route group, server-side, before touching Prisma.

---

### 🔴 C-2. Admin dashboard access control is entirely client-side and trivially bypassed
**File:** `src/app/components/ProtectedRoute.tsx`, `src/context/AuthContext.tsx`

`ProtectedRoute` decides whether to render the admin dashboard based solely on React state (`isLoggedIn`, `userType`) which is hydrated from `localStorage`:

```ts
const savedUser = localStorage.getItem("himmat_auth_user");
const savedUserType = localStorage.getItem("himmat_auth_user_type");
...
if (isLoggedIn && userType === 'admin') { return <>{children}</>; }
```

There is **no `middleware.ts`** and **no server-side check** on any page under `/himmat_admin_8526/dashboard`. Anyone can open DevTools on the public site and run:

```js
localStorage.setItem("himmat_auth_user_type", "admin");
localStorage.setItem("himmat_auth_user", JSON.stringify({id:1, username:"admin", role:"superadmin"}));
```
…then navigate to `/himmat_admin_8526/dashboard` and the UI renders as a logged-in super-admin — no valid credentials, no server verification, ever required. Combined with C-1/C-4 (unauthenticated data APIs), the fake "admin" can also read/write real data.

**Fix:** Route protection must happen in `middleware.ts` (or server components) by validating the signed session cookie server-side. Client-side state must never be the source of truth for authorization — it should only drive UI (e.g., show a spinner), never gate access.

---

### 🔴 C-3. Session token is unsigned, unencrypted Base64 — forgeable by anyone
**File:** `src/lib/auth.ts`

```ts
const token = Buffer.from(JSON.stringify(payload)).toString('base64')
cookieStore.set('himmat_sessionToken', token, { httpOnly: true, ... })
```

`payload` is `{ id, email, type }`. Base64 is an *encoding*, not encryption or a signature. Anyone who obtains or guesses the format can construct:

```js
btoa(JSON.stringify({ id: 1, email: "admin@himmattea.com", type: "admin" }))
```
…set it as the `himmat_sessionToken` cookie, and `getCurrentUser()` will happily look up and return admin user id 1. There is no HMAC/JWT signature to prevent tampering, and no server secret is involved at all.

**Impact:** Full authentication bypass / impersonation of any customer or admin account by ID, without ever knowing a password.

**Fix:** Use signed, server-verified sessions — e.g. `jose`/`jsonwebtoken` HS256/RS256 JWTs signed with a server-only secret (`JWT_SECRET` from env, never committed), or an opaque session ID stored server-side (DB/Redis) and looked up on each request. Never trust client-decodable data for identity without a signature check.

---

### 🔴 C-4. Customer PII (including password hashes) exposed with no authentication
**Endpoints:** `GET/POST /api/customers`, `GET/PUT /api/customers/[id]`

```ts
// src/app/api/customers/route.ts
export async function GET() {
  const customers = await prisma.customer.findMany({ include: { orders: true }, ... })
  return createResponse({ success: true, data: customers })
}
```

No `select` clause excludes `passwordHash`, and no auth check exists. `GET /api/customers` (or `/api/customers/17`) returns **every customer's name, email, phone, address, order history, and bcrypt password hash** to an unauthenticated caller.

**Impact:** Full customer database breach + offline brute-force target (password hashes) in one unauthenticated GET request. This is a GDPR/PII-class incident waiting to happen and also an IDOR (`/api/customers/[id]` lets you enumerate every customer by sequential ID).

**Fix:** Require admin session for these routes; always `select` only the fields the caller needs and **never** include `passwordHash` in any API response, ever (see C-5).

---

### 🔴 C-5. Password hash is returned to the client on login/signup and stored in `localStorage`
**Files:** `src/app/api/customer/signup/route.ts`, `src/app/api/customer/login/route.ts`, `src/context/AuthContext.tsx`

```ts
// login route
return createResponse({ user: customer, success: true })   // `customer` is the raw Prisma row → includes passwordHash
```
```ts
// AuthContext.tsx
localStorage.setItem("himmat_auth_user", JSON.stringify(response.user)); // passwordHash now sits in localStorage, in plaintext, indefinitely
```

Compare with the admin login route, which correctly does `const { passwordHash, ...userWithoutPassword } = adminUser` — the customer routes were never given the same treatment.

**Impact:** The bcrypt hash of every customer's password is shipped to the browser and persisted in `localStorage`, readable by any XSS payload, browser extension, or anyone with local machine/device access — a durable, high-value target for offline cracking.

**Fix:** Never select/return `passwordHash` from any API. Store only non-sensitive profile fields in the response. Do not persist auth/session state in `localStorage` at all — rely on the httpOnly cookie plus a `/api/auth/me` call (see C-6).

---

### 🔴 C-6. `/api/auth/me` is a stub that always returns 401 — session validation doesn't actually work
**File:** `src/app/api/auth/me/route.ts`

```ts
export async function GET(request: NextRequest) {
  // For now, we'll just return a 401 since we don't have session handling yet
  return createResponse({ success: false }, 401)
}
```

This route ignores the `himmat_sessionToken` cookie entirely and never calls `getCurrentUser()`, even though that function already exists in `src/lib/auth.ts`. Since the front end falls back to `localStorage` first (see C-2/C-5), this stub is effectively why the app "works" at all today — but it also means there is **no real server-side session check anywhere in the request lifecycle**.

**Fix:**
```ts
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return createErrorResponse('Unauthorized', 401)
  return createResponse({ success: true, user })
}
```
And stop relying on `localStorage` in `AuthContext` — always resolve identity through this endpoint.

---

### 🔴 C-7. Logout does not clear the session cookie
**File:** `src/app/api/auth/logout/route.ts`

```ts
export async function POST(request: NextRequest) {
  return createResponse({ success: true })  // never deletes himmat_sessionToken / himmat_isLoggedIn
}
```

The client clears `localStorage`, but the httpOnly `himmat_sessionToken` cookie is left intact on the browser and remains valid until it expires (4 days) or is manually deleted. Anyone who later gets access to that browser/device (shared computer, stolen session, XSS-exfiltrated cookie) is still authenticated as that user after they believed they'd logged out.

**Fix:**
```ts
const cookieStore = await cookies()
cookieStore.delete('himmat_sessionToken')
cookieStore.delete('himmat_isLoggedIn')
```
Consider also invalidating server-side session state if you move to a DB-backed session model.

---

### 🔴 C-8. Login has a silent authentication-bypass fallback
**File:** `src/app/api/customer/login/route.ts`

```ts
let passwordMatch = false;
try {
  passwordMatch = await bcrypt.compare(password, customer.passwordHash || '');
} catch (e) {
  passwordMatch = customer.name === password; // fallback for demo
}
```

If `bcrypt.compare` ever throws (malformed/legacy hash, null handling edge case, library error), the code **falls back to comparing the submitted password against the customer's plaintext `name` field**. This is effectively a backdoor: an attacker who knows (or guesses/scrapes) a customer's name could potentially log in as them under the right error conditions, with no password knowledge at all.

**Fix:** Remove the fallback entirely. Any error from `bcrypt.compare` should be treated as **authentication failure**, not success:
```ts
try {
  passwordMatch = await bcrypt.compare(password, customer.passwordHash ?? '');
} catch {
  return createErrorResponse('Invalid credentials', 401);
}
```

---

### 🔴 C-9. Publicly accessible seed endpoint creates a hardcoded default admin
**File:** `src/app/api/seed/route.ts`

```ts
export async function GET() { return POST(); }
export async function POST() {
  const existingAdmin = await prisma.adminUser.findFirst()
  if (existingAdmin) return createResponse({ message: 'Database already seeded' })
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.create({ data: { username: 'admin', email: 'admin@himmattea.com', passwordHash, role: 'superadmin', isActive: true } })
  ...
}
```

This route accepts unauthenticated `GET` *and* `POST`, and on a fresh/emptied database will (re)create a well-known super-admin account: `admin` / `admin123`. If this route is reachable in production (it is, unless explicitly blocked) it is a guaranteed credential an attacker can try first — and it's a public GET request, so it can even be triggered by a `<img src="...">` tag on another site (CSRF-style) or a crawler.

**Fix:** Remove this route from the production build entirely, or gate it behind a build-time environment flag (`NODE_ENV !== 'production'`) and a secret token. Never ship demo/seed endpoints that create credentialed accounts in a public API surface. Default admin passwords should also be randomly generated and forced to reset on first login, never hardcoded.

---

## 3. High-Severity Findings

### 🟠 H-1. No server-side password policy enforcement
`src/app/api/customer/signup/route.ts` accepts `password` from the request body and hashes it directly — there is no length/complexity check on the server. The strong-password rule in `validation.ts` is **zod, running client-side only**. Anyone calling the API directly (Postman, curl, a script) can register an account with a 1-character password.

**Fix:** Re-validate the same (corrected — see U-1 below) password policy server-side with zod before hashing, and reject weak passwords with a 400.

### 🟠 H-2. No rate limiting / brute-force protection on any auth endpoint
`/api/customer/login`, `/api/auth/login`, `/api/customer/signup`, and `/api/seed` have no throttling, no CAPTCHA, no account lockout, and no IP/attempt tracking. Combined with C-3/C-8, this makes credential stuffing and brute-force attacks trivial and undetectable.

**Fix:** Add rate limiting (e.g. per-IP + per-account, via middleware or a service like Upstash/Redis) and progressive lockout/backoff on repeated failures. Log and alert on abnormal attempt volume.

### 🟠 H-3. Verbose logging of authentication attempts and PII
Multiple routes log raw email addresses and internal state to the server console on every request (`console.log("/api/customer/login: Login attempt for email:", email)`, `AuthContext: Attempting login with username:`, etc.). In most hosting setups these logs are retained and often shipped to third-party log aggregators.

**Fix:** Remove or gate behind `if (process.env.NODE_ENV !== 'production')`. Never log credentials, and treat email addresses as PII subject to your retention policy.

### 🟠 H-4. Broken "Forgot Password" flow
`LoginForm.tsx` links to `/forgot-password`, but no such route or API endpoint exists anywhere in the codebase. Users who forget their password have no self-service recovery path today, and — once implemented — this flow needs its own security review (token expiry, single-use, no user enumeration via response timing/content).

**Fix:** Implement a full reset flow: signed, time-limited, single-use reset token emailed to the user; generic "if that email exists, we sent a link" response to prevent account enumeration; invalidate the token and all existing sessions after a successful reset.

### 🟠 H-5. No CSRF defense beyond `SameSite=Lax`
Cookie-based session auth relies only on `SameSite=Lax`. That mitigates most cross-site GET-triggered abuse but does not fully protect state-changing `POST/PUT/DELETE` requests from all CSRF vectors (e.g. top-level navigations, some subdomain scenarios). Given how many mutating endpoints currently have no auth at all (C-1, C-4), this is a secondary concern right now, but must be addressed once those are fixed.

**Fix:** Add a CSRF token (double-submit cookie or synchronizer token) for state-changing requests, or move fully to `SameSite=Strict` where UX allows.

---

## 4. Medium / UX-Impacting Findings (the bugs you originally reported)

### 🟡 U-1. Overly restrictive password regex rejects valid strong passwords
**File:** `src/modules/auth/SignupForm/validation.ts`
```ts
.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, ...)
```
This pattern does two things wrong:
1. It **requires** one of only 6 special characters (`@ $ ! % * ? &`).
2. The character class at the end (`[A-Za-z\d@$!%*?&]`) means **any password containing a symbol outside that set is entirely rejected**, even if it's long and complex (e.g. `Correct-Horse_Battery9!` fails because of `-` and `_`).

This is the direct cause of "cannot sign up/log in due to invalid strong password."

**Fix — recommended pattern (broader allowed symbol set, still enforces complexity):**
```ts
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine(pw => /[a-z]/.test(pw), 'Must include a lowercase letter')
  .refine(pw => /[A-Z]/.test(pw), 'Must include an uppercase letter')
  .refine(pw => /\d/.test(pw), 'Must include a number')
  .refine(pw => /[^A-Za-z0-9]/.test(pw), 'Must include a special character')
```
Using separate `.refine()` checks (rather than one all-in-one regex with a restrictive whitelist) avoids silently blocking valid characters, gives clearer per-rule error messages, and is easier to test. Also raise the minimum length to 12 (NIST SP 800-63B guidance favors length over forced complexity). **This same rule must also run server-side** (see H-1).

### 🟡 U-2. Auth modal doesn't scroll — "Create Account" button hidden below the fold
**File:** `src/modules/auth/AuthModal/AuthModal.tsx`, lines ~128–141
```tsx
<div className="fixed inset-0 z-[101] flex items-center justify-center px-4 sm:px-6" ...>
  <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden ..." ...>
```
The panel has `overflow-hidden` and no height cap, so on shorter viewports (most phones in landscape, laptops with browser chrome, or simply the long Signup form) the content taller than the viewport is clipped with no way to scroll to it.

**Fix:**
```tsx
<div className="fixed inset-0 z-[101] flex items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto">
  <div className="w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl ...">
    {/* header, body, form */}
  </div>
</div>
```
i.e. cap the panel's height to the viewport and let *it* scroll internally (`max-h-[...] overflow-y-auto`), while keeping the outer wrapper centered. This resolves both the "form doesn't scroll" and "must zoom out to see Create Account" reports in one fix — no zoom will be necessary once the button is reachable via normal scrolling.

### 🟡 U-3. `AuthContext` default value silently masks the "used outside provider" guard
```ts
const AuthContext = createContext<AuthContextType | undefined>({ isLoggedIn: false, ... }); // not `undefined`
...
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error(...) } // this branch can now never trigger
  return context;
};
```
The generic says `AuthContextType | undefined`, but the actual default passed to `createContext` is a full fake object, not `undefined`. The subsequent `undefined` check in `useAuth` is dead code — if `AuthProvider` is ever accidentally omitted from the tree, components will silently get fake "logged out" behavior instead of a clear developer error.

**Fix:** `createContext<AuthContextType | undefined>(undefined)`.

---

## 5. Severity Summary

| ID | Finding | Severity | Category |
|---|---|---|---|
| C-1 | Unauthenticated admin-user CRUD (create/edit/delete admins) | Critical | Broken Access Control |
| C-2 | Admin dashboard gated only by client-side `localStorage` | Critical | Broken Access Control |
| C-3 | Session token is unsigned Base64 — forgeable | Critical | Broken Authentication |
| C-4 | Unauthenticated customer PII + password-hash dump | Critical | Sensitive Data Exposure |
| C-5 | `passwordHash` returned to client & stored in `localStorage` | Critical | Sensitive Data Exposure |
| C-6 | `/api/auth/me` stubbed — no real session validation | Critical | Broken Authentication |
| C-7 | Logout doesn't clear session cookie | Critical | Broken Session Management |
| C-8 | Login has a plaintext-name fallback bypass on bcrypt error | Critical | Broken Authentication |
| C-9 | Public seed endpoint creates default `admin`/`admin123` | Critical | Insecure Default Credentials |
| H-1 | No server-side password policy enforcement | High | Input Validation |
| H-2 | No rate limiting / brute-force protection | High | Broken Authentication |
| H-3 | Verbose logging of emails/credentialed attempts | High | Information Disclosure |
| H-4 | Broken/missing "Forgot Password" flow | High | Broken Authentication |
| H-5 | No CSRF token on mutating requests | High | CSRF |
| U-1 | Password regex rejects valid strong passwords | Medium (reported bug) | Input Validation / UX |
| U-2 | Auth modal not scrollable, hides submit button | Medium (reported bug) | UX / Accessibility |
| U-3 | `AuthContext` default value defeats provider guard | Low | Code Quality |

---

## 6. Recommended Remediation Order

1. **Stop the bleeding (do first, before anything else ships):**
   - Add auth checks to `/api/admin-users*` and `/api/customers*` (C-1, C-4).
   - Remove/gate `/api/seed` in production (C-9).
   - Remove the bcrypt fallback bypass in customer login (C-8).
   - Strip `passwordHash` from every API response (C-5) via Prisma `select`.
2. **Fix session integrity:**
   - Replace the Base64 token with signed JWT/session (C-3).
   - Implement real `/api/auth/me` (C-6) and fix logout to clear cookies (C-7).
   - Move `ProtectedRoute`/admin gating to server-verified session, not `localStorage` (C-2).
3. **Harden the perimeter:**
   - Server-side password validation (H-1), rate limiting (H-2), reduce logging (H-3), CSRF tokens (H-5).
   - Build the forgot-password flow properly (H-4).
4. **Ship the UX/functional fixes:**
   - Correct the password regex (U-1).
   - Make the auth modal scrollable so the submit button is always reachable (U-2).
   - Clean up the `AuthContext` default value (U-3).
5. **Before go-live:** run an authenticated + unauthenticated pass with a tool like OWASP ZAP or Burp Suite against every route in `src/app/api`, confirm every mutating/read endpoint that touches customer or admin data enforces the correct role, and rotate/regenerate any credentials or secrets that existed during development (including the seeded `admin123` password, if that route was ever deployed).

---

*This audit covers the authentication and authorization surface only. A full audit should also review payment/checkout, order management, and file upload paths, as similar unauthenticated-route patterns may exist there.*
