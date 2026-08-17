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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  if (
    pathname.startsWith('/api/admin-users') ||
    pathname.startsWith('/api/customers') ||
    pathname.startsWith('/api/coupons') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/analytics') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/batches') ||
    pathname.startsWith('/api/purchase-orders') ||
    pathname.startsWith('/api/inventory/transactions') ||
    pathname.startsWith('/api/hero-visuals') ||
    pathname.startsWith('/api/product-lines') ||
    pathname.startsWith('/api/reviews') ||
    (pathname.startsWith('/api/settings') && req.method !== 'GET')
  ) {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
  }

  if (pathname.startsWith('/api/seed')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found', success: false }, { status: 404 })
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
    '/api/admin-users/:path*',
    '/api/customers/:path*',
    '/api/orders/:path*',
    '/api/coupons/:path*',
    '/api/seed/:path*',
    '/api/admin/:path*',
    '/api/settings/:path*',
    '/api/exchange-rates/:path*',
    '/api/analytics/:path*'
  ]
}
