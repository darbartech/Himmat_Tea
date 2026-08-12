Act as a senior Next.js + TypeScript authentication engineer.

I have a Next.js application with customer authentication, admin authentication, an AuthModal login popup, an AuthContext, protected customer account pages, and server-side authentication cookies.

I am experiencing this authentication bug:

CURRENT BUG
-----------

When I:

1. Start the Next.js project.
2. Open the website in an Incognito window.
3. Click "Sign In" in the header.
4. The login popup/modal opens.
5. Enter valid customer login credentials.
6. Login succeeds.

The application then incorrectly redirects to:

http://localhost:3000/customer-auth?redirect=/account

That page displays another login form.

If I enter the credentials again:
- the page remains at /customer-auth?redirect=/account
- it appears to refresh or remain on the same page.

However, if I manually refresh the browser:
- the authentication cookie is detected
- the user is recognized as logged in
- the application redirects to:

http://localhost:3000/account

This means the server-side login/cookie is probably successful, but the client-side authentication state is stale or not synchronized immediately after login.

There is also a distinction between:

ADMIN:
 /himmat_admin_8526/dashboard

CUSTOMER:
 /account

Do NOT mix admin and customer authentication.

GOAL
----

Fix the authentication architecture so that the following flow works:

Header
  ↓
Click Sign In
  ↓
AuthModal opens
  ↓
Enter customer credentials
  ↓
POST customer login API
  ↓
Server validates credentials
  ↓
HTTP-only authentication cookie is created
  ↓
API returns authenticated customer information
  ↓
AuthContext immediately updates
  ↓
AuthModal closes
  ↓
router.replace("/account")
  ↓
Customer account opens immediately

There must be NO:
- second login form
- redirect loop
- manual browser refresh
- unnecessary /customer-auth page after successful modal login
- stale isLoggedIn state
- authentication state mismatch
- admin/customer authentication confusion


IMPORTANT ENGINEERING REQUIREMENTS
==================================

1. FIRST inspect the existing project.

Do not blindly rewrite files.

Find and inspect:

- AuthModal
- AuthContext
- useAuth hook
- customer login API
- admin login API
- logout API
- /customer-auth page
- /account page
- middleware.ts if present
- authentication utilities
- cookie utilities
- rate limiting
- Prisma customer model
- Prisma adminUser model
- Navigation component
- protected route logic
- any redirect utilities
- any localStorage/sessionStorage authentication logic

Search the entire project for:

- customer-auth
- redirect=/account
- isLoggedIn
- userType
- useAuth
- AuthContext
- AuthModal
- setAuthCookie
- getAuth
- cookies()
- document.cookie
- localStorage
- sessionStorage
- router.push("/account")
- router.replace("/account")
- /api/auth
- /api/customer
- adminUser
- customer


2. DO NOT create multiple competing authentication states.

The server-side HTTP-only authentication cookie must be the source of truth.

Do NOT use:

localStorage.setItem("isLoggedIn", ...)
localStorage.setItem("user", ...)
sessionStorage authentication
client-only fake authentication flags

unless the existing application specifically requires non-security UI preferences.

Authentication must be based on the server-side cookie/session.


3. CUSTOMER AND ADMIN AUTHENTICATION MUST BE SEPARATE.

Customer authentication:

/account

Admin authentication:

/himmat_admin_8526/dashboard

Do not authenticate a customer through an adminUser table.

Do not set:

userType = "admin"

for a customer.

Do not redirect customers to the admin dashboard.

Do not allow the admin login API to be accidentally called by AuthModal.


4. Create/use separate authentication APIs if necessary.

Prefer a structure such as:

POST /api/auth/customer/login
POST /api/auth/customer/logout
GET  /api/auth/customer/me

POST /api/auth/admin/login
POST /api/auth/admin/logout
GET  /api/auth/admin/me

If the project already has different API paths, preserve the existing architecture where possible rather than unnecessarily renaming everything.

The important requirement is that customer and admin authentication are logically separated.


5. CUSTOMER LOGIN API

Inspect the existing customer login implementation.

It should:

- validate request body
- validate username/email
- validate password
- find the customer
- check active status
- use bcrypt.compare()
- create the appropriate secure HTTP-only cookie
- return authenticated user information
- never return passwordHash
- never return sensitive password data

Use something equivalent to:

const passwordMatch = await bcrypt.compare(
  password,
  customer.passwordHash ?? ""
);

If credentials are invalid:

return createErrorResponse("Invalid credentials", 401)

Do not reveal whether the username/email exists.


6. COOKIE CONFIGURATION

Inspect setAuthCookie().

Make sure the authentication cookie is correctly configured.

For localhost development, ensure cookie settings do not prevent the browser from storing or sending the cookie.

Use appropriate settings such as:

httpOnly: true
secure: process.env.NODE_ENV === "production"
sameSite: "lax"
path: "/"

Do NOT blindly use:

secure: true

during localhost HTTP development, because that can cause cookies not to behave correctly over:

http://localhost:3000

In production HTTPS, secure should be enabled.


7. FETCH REQUESTS

All authentication-related client requests must include:

credentials: "include"

where appropriate.

For example:

const response = await fetch("/api/auth/customer/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    username,
    password,
  }),
});

Also ensure GET /api/auth/customer/me uses:

credentials: "include"

Do not rely on manually reading HTTP-only cookies from JavaScript.


8. AUTHCONTEXT

Refactor AuthContext if necessary.

The context should expose something similar to:

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  userType: "customer" | "admin" | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

The important point is:

After successful login, AuthModal must immediately update AuthContext.

Do NOT wait for a full browser refresh.


9. AUTH INITIALIZATION

When AuthProvider mounts:

- set loading = true
- call the appropriate /me endpoint
- read authenticated user from the server
- set user
- set userType
- set loading = false

Example conceptual behavior:

useEffect(() => {
  refreshAuth();
}, []);

async function refreshAuth() {
  try {
    const response = await fetch("/api/auth/customer/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      setUser(null);
      return;
    }

    const data = await response.json();

    setUser(data.user ?? null);
  } catch {
    setUser(null);
  } finally {
    setLoading(false);
  }
}


10. LOGIN MUST UPDATE CONTEXT IMMEDIATELY

This is the most important fix.

After the login API returns success:

const data = await response.json();

await login(data.user);

Then:

onClose();

router.replace("/account");

router.refresh();

Do NOT redirect first and update the context later.

Correct sequence:

API login
  ↓
Cookie created
  ↓
data.user returned
  ↓
AuthContext.login(data.user)
  ↓
setUser(...)
  ↓
setIsLoggedIn(true) if derived state is not used
  ↓
close modal
  ↓
router.replace("/account")
  ↓
router.refresh()


11. AVOID DUPLICATE AUTH STATE

Prefer:

const isLoggedIn = !!user;

instead of maintaining independent states such as:

const [user, setUser] = useState(null);
const [isLoggedIn, setIsLoggedIn] = useState(false);

If both are required by the existing application, keep them synchronized in exactly one place.

Prefer deriving:

const isLoggedIn = user !== null;

This avoids situations where:

user = authenticated customer

but:

isLoggedIn = false


12. AUTHMODAL

Inspect AuthModal carefully.

It should NOT do this after successful modal login:

router.push("/customer-auth?redirect=/account");

That is the main behavior that needs to be corrected.

For a login initiated from the header modal:

successful login
→ close modal
→ router.replace("/account")

The modal should support an optional redirect prop if the project requires it.

For example:

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

Default:

redirectTo = "/account";

After successful login:

const destination = redirectTo || "/account";

onClose();

router.replace(destination);

router.refresh();


13. CUSTOMER-AUTH PAGE

Keep /customer-auth as a valid standalone login page if the application needs it.

However, if a logged-in customer visits:

/customer-auth

or:

/customer-auth?redirect=/account

the page must detect authentication and redirect to the requested destination.

Example:

useEffect(() => {
  if (!loading && isLoggedIn) {
    router.replace(redirectTo || "/account");
  }
}, [loading, isLoggedIn, redirectTo, router]);


IMPORTANT:

Do not redirect before authentication loading has finished.

Bad:

if (isLoggedIn) ...

while auth is still being initialized.

Correct conceptual flow:

loading
  ↓
show loading state
  ↓
authentication determined
  ↓
if logged in → redirect
if not logged in → show login form


14. CUSTOMER-AUTH REDIRECT PARAMETER

Safely parse:

/customer-auth?redirect=/account

Do not blindly redirect to arbitrary external URLs.

Only allow internal paths.

For example:

/account
/orders
/profile

should be allowed.

But:

https://malicious-site.com

must NOT be allowed.

Implement a safe internal redirect helper if one does not already exist.

Conceptually:

function getSafeRedirect(value: string | null) {
  if (!value) return "/account";

  if (!value.startsWith("/")) {
    return "/account";
  }

  if (value.startsWith("//")) {
    return "/account";
  }

  return value;
}


15. NAVIGATION COMPONENT

Inspect the provided Navigation component.

This section:

{isLoggedIn ? (
  ...
) : (
  <button onClick={() => setAuthModalOpen(true)}>
    Sign In
  </button>
)}

is conceptually correct.

Do not unnecessarily rewrite the entire Navigation component.

After authentication:

isLoggedIn must immediately become true.

Then:

customer → /account

admin → /himmat_admin_8526/dashboard

The header should update without a full page reload.


16. ADMIN AUTHENTICATION

Preserve the existing admin login behavior.

The admin login API currently uses:

prisma.adminUser.findFirst({
  where: {
    OR: [
      { username },
      { email: username }
    ]
  }
})

and:

bcrypt.compare(
  password,
  adminUser.passwordHash ?? ""
)

This is fine if it is genuinely the admin login endpoint.

However, ensure the customer AuthModal never calls this API.

The admin cookie must not be mistaken for a customer cookie.

If both user types use a common cookie, design the cookie payload/type carefully so:

type: "admin"

and:

type: "customer"

cannot be confused.


17. LOGOUT

Logout must:

- call server logout API
- clear the authentication cookie server-side
- clear AuthContext state
- reset user
- reset userType
- redirect to "/"

Use:

router.replace("/");

not:

router.push("/");

where appropriate.

After logout, refresh the auth state if necessary.


18. ACCOUNT PAGE

Inspect /account.

It must not rely solely on client state for security.

The server should verify authentication.

If /account is a Server Component, use the server-side auth utility to validate the cookie.

If unauthenticated:

redirect("/customer-auth?redirect=/account")

If authenticated:

render customer account.

Do not expose private customer information based solely on client-side isLoggedIn.


19. MIDDLEWARE

If middleware.ts protects /account, inspect it carefully.

Avoid this situation:

Client says logged in
but middleware thinks not logged in

or:

Middleware redirects to /customer-auth
even though the cookie has just been created.

Ensure the middleware uses the same cookie/session format as the authentication API.

Do not create a second authentication mechanism in middleware.


20. SERVER VS CLIENT AUTH

Respect Next.js Server Component and Client Component boundaries.

Do not import Prisma directly into client components.

Do not import server-only authentication utilities into browser components.

Do not run Prisma in AuthContext.

Client:

AuthContext
AuthModal
Navigation

Server:

Prisma
cookie/session validation
login APIs
account server validation
middleware authentication


21. HANDLE RACE CONDITIONS

Prevent this sequence:

login succeeds
→ router navigation happens
→ AuthContext still loading
→ customer-auth sees false
→ redirects incorrectly
→ refresh fixes it

The login success handler must update the client state before navigation.

Also ensure AuthProvider is mounted high enough in the application tree so both:

Navigation

and:

AuthModal

and:

/customer-auth

use the SAME AuthContext instance.

Check:

app/layout.tsx

or the application's provider hierarchy.

Do not accidentally mount multiple AuthProviders.


22. PROVIDER STRUCTURE

Ensure the architecture is approximately:

RootLayout
  └── AuthProvider
       ├── Navigation
       ├── pages
       └── AuthModal

There should not be separate AuthProviders around Navigation and pages.

If multiple providers exist, consolidate them unless there is a very specific reason not to.


23. RESPONSE FORMAT

Ensure API responses are consistent.

Successful login:

{
  "success": true,
  "user": {
    ...
  }
}

Failed login:

{
  "success": false,
  "error": "Invalid credentials"
}

Adapt this to the project's existing createResponse/createErrorResponse utilities rather than unnecessarily replacing them.


24. PASSWORD SECURITY

Never return:

passwordHash

in the API response.

The current code:

const { passwordHash, ...userWithoutPassword } = adminUser;

is acceptable for admin.

Apply the same principle to customer responses.


25. RATE LIMITING

Keep the existing rateLimitAuth() functionality.

Do not remove authentication rate limiting while fixing the bug.

If customer and admin login have separate endpoints, both should have appropriate login rate limiting.


26. ERROR HANDLING

Preserve:

handleApiError(error)

or the existing centralized API error handling.

Do not expose:

- database errors
- Prisma errors
- password information
- internal stack traces

to the client.


27. LOADING STATES

Auth-dependent UI must distinguish:

loading
authenticated
unauthenticated

Example:

if (loading) {
  return null;
}

if (isLoggedIn) {
  ...
}

else {
  ...
}

Avoid showing "Sign In" for a brief moment when the user is actually authenticated.


28. DO NOT BREAK EXISTING FEATURES

The Navigation component contains:

- announcement bar
- language selector
- search modal
- wishlist
- cart
- desktop navigation
- mobile navigation
- product dropdowns
- admin dashboard link
- customer account link
- logout
- AuthModal

Do not remove or break any of these.

Only modify authentication-related behavior where necessary.


29. TEST ALL AUTHENTICATION SCENARIOS

After implementation, test all of these.

TEST 1 — Fresh Incognito

Open:

http://localhost:3000

Expected:

Sign In

Click Sign In.

Expected:

AuthModal opens.


TEST 2 — Valid CUSTOMER login from modal

Enter valid customer credentials.

Expected:

Modal closes.

Expected:

Immediate navigation to:

/account

Expected:

NO:

/customer-auth?redirect=/account


TEST 3 — No refresh

After login, do NOT manually refresh.

Expected:

Account page opens immediately.


TEST 4 — Header state

After login:

Header should show:

Account
Logout

and should NOT show:

Sign In


TEST 5 — Refresh after login

Refresh /account.

Expected:

Customer remains authenticated.


TEST 6 — Direct customer-auth visit

Open:

/customer-auth?redirect=/account

while logged out.

Expected:

Login form appears.


TEST 7 — Already authenticated customer

While logged in, open:

/customer-auth?redirect=/account

Expected:

Immediate redirect to:

/account

No login form should remain visible.


TEST 8 — Invalid credentials

Enter wrong password.

Expected:

"Invalid credentials"

No redirect.

No authentication cookie.


TEST 9 — Customer logout

Click Logout.

Expected:

Cookie removed.

AuthContext cleared.

Header shows Sign In.

User cannot access /account.


TEST 10 — Admin login

Login using admin credentials.

Expected:

/himmat_admin_8526/dashboard

Header shows admin dashboard.

Customer account must NOT be shown.


TEST 11 — Customer login

Login using customer credentials.

Expected:

/account

Admin dashboard must NOT be shown.


TEST 12 — Browser/incognito restart

Close Incognito.

Open a new Incognito session.

Authenticate again.

Expected:

Normal login behavior.


TEST 13 — Direct /account while logged out

Open:

/account

Expected:

/customer-auth?redirect=/account

Then after successful login:

/account

without requiring a manual refresh.


30. DEBUGGING REQUIREMENT

While implementing, add temporary development-only logs where useful:

[AUTH] login started
[AUTH] login API success
[AUTH] cookie created
[AUTH] AuthContext login
[AUTH] redirecting to /account

Do not leave sensitive information in logs.

NEVER log:

password
passwordHash
authentication token
HTTP-only cookie value
session secret


31. FINAL CODE QUALITY

Use:

TypeScript
strict typing
async/await
proper error handling
Next.js App Router conventions
React hooks correctly
no unnecessary useEffect loops
no duplicated authentication state
no unnecessary full page reload
no Prisma code in client components

Do not use:

window.location.reload()

as the solution.

Do not use:

window.location.href = "/account"

as the primary solution.

Use:

router.replace("/account")

and:

router.refresh()

when appropriate.


32. IMPORTANT: DO NOT JUST PATCH THE SYMPTOM

Do not solve this by simply changing:

/customer-auth?redirect=/account

to:

/account

without fixing AuthContext synchronization.

The actual goal is to make the authentication state consistent between:

Server cookie
        ↕
API
        ↕
AuthContext
        ↕
Navigation
        ↕
AuthModal
        ↕
Protected account page
        ↕
Middleware


33. AFTER IMPLEMENTATION

Provide me with:

A. List of files changed

B. Exact reason for the bug

C. Explanation of the new authentication flow

D. Important code changes

E. Any database/schema changes, if required

F. Any environment variables required

G. Testing results for all scenarios above

H. Any remaining warnings or issues

Do not claim a test passed unless you actually verified it.


MOST IMPORTANT EXPECTED RESULT
==============================

When I click:

Header → Sign In

and enter valid customer credentials:

I must get:

Sign In
  ↓
AuthModal
  ↓
Successful login
  ↓
Auth cookie created
  ↓
AuthContext updated immediately
  ↓
AuthModal closes
  ↓
/account

I must NEVER get:

Sign In
  ↓
AuthModal
  ↓
Successful login
  ↓
/customer-auth?redirect=/account
  ↓
Login form again
  ↓
Refresh
  ↓
/account

Fix the root authentication synchronization problem and preserve the existing UI/design/features.


