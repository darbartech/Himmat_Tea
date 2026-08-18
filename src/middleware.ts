import { NextResponse, NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      return 'himmat-tea-dev-secret-change-in-production'
    }
    throw new Error(
      `JWT_SECRET environment variable is required in ${process.env.NODE_ENV || 'unspecified'} environment. ` +
      'Dev fallback allowed only when NODE_ENV === "development".'
    )
  }
  return secret
}

interface DecodedPayload {
  id: number
  email: string
  type: 'customer' | 'admin'
}

function verifyTokenWithSecret(token: string): DecodedPayload | null {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as DecodedPayload
    if (
      typeof decoded.id === 'number' &&
      typeof decoded.email === 'string' &&
      (decoded.type === 'customer' || decoded.type === 'admin')
    ) {
      return decoded
    }
    return null
  } catch {
    return null
  }
}

function verifyAdminToken(req: NextRequest): boolean {
  const token = req.cookies.get('himmat_sessionToken')?.value
  if (!token) return false
  const decoded = verifyTokenWithSecret(token)
  return decoded?.type === 'admin' && typeof decoded.id === 'number'
}

function verifyCustomerToken(req: NextRequest): boolean {
  const token = req.cookies.get('himmat_sessionToken')?.value
  if (!token) return false
  const decoded = verifyTokenWithSecret(token)
  return decoded?.type === 'customer' && typeof decoded.id === 'number'
}

function stripTrailingSlash(p: string): string {
  return p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p
}

type PublicRouteSpec = {
  path: (pathname: string) => boolean
  methods: string[] | '*'
}

function pathPrefix(prefix: string): (p: string) => boolean {
  return (p) => p === prefix || p.startsWith(prefix + '/')
}

function pathExact(exact: string): (p: string) => boolean {
  return (p) => p === exact
}

function pathMatch(matcher: (p: string) => boolean): (p: string) => boolean {
  return matcher
}

const PUBLIC_API_ROUTES: PublicRouteSpec[] = [
  // ===== Contact / partnership (public writes) =====
  { path: pathExact('/api/contact'), methods: ['POST'] },
  { path: pathExact('/api/partnership'), methods: ['POST'] },

  // ===== Auth endpoints (public: login, signup, pw reset) =====
  { path: pathExact('/api/auth/login'), methods: ['POST'] },
  { path: pathExact('/api/auth/logout'), methods: ['POST', 'GET'] },
  { path: pathExact('/api/auth/me'), methods: ['GET'] },
  { path: pathExact('/api/auth/forgot-password'), methods: ['POST'] },
  { path: pathExact('/api/auth/reset-password'), methods: ['POST'] },
  { path: pathExact('/api/auth/verify-reset-otp'), methods: ['POST'] },
  { path: pathExact('/api/auth/resend-reset-otp'), methods: ['POST'] },
  { path: pathPrefix('/api/auth'), methods: '*' },

  // ===== Customer auth endpoints (public: signup + login) =====
  { path: pathExact('/api/customer/signup'), methods: ['POST'] },
  { path: pathExact('/api/customer/signup/verify'), methods: ['POST'] },
  { path: pathExact('/api/customer/signup/resend'), methods: ['POST'] },
  { path: pathExact('/api/customer/login'), methods: ['POST'] },

  // ===== Customer-scoped routes (per-route auth enforces customer session) =====
  { path: pathPrefix('/api/customer/notifications'), methods: '*' },

  // ===== Storefront: public GETs (content reads) =====
  { path: pathExact('/api/products'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/products\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathExact('/api/collections'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/collections\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathExact('/api/faqs'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/faqs\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathExact('/api/blog'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/blog\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathExact('/api/brewing-guides'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/brewing-guides\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathExact('/api/product-lines'), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/product-lines\/[^/]+$/.test(p)), methods: ['GET'] },
  { path: pathMatch((p) => /^\/api\/reviews\/[^/]+$/.test(p)), methods: ['GET'] },

  // ===== Settings (GET public, PUT admin — already per-route guarded) =====
  { path: pathExact('/api/settings'), methods: ['GET'] },

  // ===== Exchange rates (public read) =====
  { path: pathExact('/api/exchange-rates'), methods: ['GET'] },

  // ===== Coupons (public GET ?public=true for validation) =====
  { path: pathExact('/api/coupons'), methods: ['GET'] },

  // ===== Orders (public POST for checkout; GET is customer/admin scoped per-route) =====
  { path: pathExact('/api/orders'), methods: ['GET', 'POST'] },
  { path: pathMatch((p) => /^\/api\/orders\/[^/]+$/.test(p)), methods: ['GET', 'PUT', 'POST'] },
]

function isPublicApiRoute(pathname: string, method: string): boolean {
  const p = stripTrailingSlash(pathname)
  for (const spec of PUBLIC_API_ROUTES) {
    if (spec.path(p)) {
      if (spec.methods === '*' || spec.methods.includes(method)) {
        return true
      }
    }
  }
  return false
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  const res = NextResponse.next()

  const existing = req.cookies.get('himmat_country')?.value
  if (!existing) {
    const country =
      (req as any).geo?.country ||
      req.headers.get('x-vercel-ip-country') ||
      'NP'
    res.cookies.set('himmat_country', country, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  const ADMIN_DASHBOARD_PREFIX = '/himmat_admin_8526/dashboard'
  const ADMIN_LOGIN_PATH = '/himmat_admin_8526'
  if (pathname.startsWith(ADMIN_DASHBOARD_PREFIX)) {
    if (!verifyAdminToken(req)) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const ACCOUNT_PATH = '/account'
  const CUSTOMER_AUTH_PATH = '/customer-auth'
  if (pathname === ACCOUNT_PATH || pathname.startsWith(ACCOUNT_PATH + '/')) {
    if (!verifyCustomerToken(req)) {
      const loginUrl = new URL(CUSTOMER_AUTH_PATH, req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ===== Deny-by-default for /api/* =====
  if (pathname.startsWith('/api/')) {
    const p = stripTrailingSlash(pathname)

    // Seed endpoint: prod block regardless of auth
    if (p.startsWith('/api/seed') && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found', success: false }, { status: 404 })
    }

    if (!isPublicApiRoute(p, method)) {
      if (!verifyAdminToken(req)) {
        return NextResponse.json(
          { error: 'Unauthorized', success: false },
          { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="admin"' } }
        )
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/',
    '/:path*',
    '/himmat_admin_8526/dashboard/:path*',
    '/account/:path*',
    '/account',
    '/api/:path*',
  ]
}
