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
  type: 'customer' | 'admin'
}

function verifyTokenWithSecret(token: string): DecodedPayload | null {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as DecodedPayload
    if (
      typeof decoded.id === 'number' &&
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

function verifyAnyAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get('himmat_sessionToken')?.value
  if (!token) return false
  const decoded = verifyTokenWithSecret(token)
  return decoded !== null && typeof decoded.id === 'number'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const ADMIN_DASHBOARD_PREFIX = '/himmat_admin_8526/dashboard'
  const ADMIN_LOGIN_PATH = '/himmat_admin_8526'
  if (pathname.startsWith(ADMIN_DASHBOARD_PREFIX)) {
    if (!verifyAdminToken(req)) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (
    pathname.startsWith('/api/admin-users') ||
    pathname.startsWith('/api/customers') ||
    pathname.startsWith('/api/coupons') ||
    pathname.startsWith('/api/admin') ||
    (pathname.startsWith('/api/settings') && req.method !== 'GET')
  ) {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
  }

  if (pathname.startsWith('/api/orders')) {
    if (!verifyAnyAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
  }

  if (pathname.startsWith('/api/seed')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found', success: false }, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/himmat_admin_8526/dashboard/:path*',
    '/api/admin-users/:path*',
    '/api/customers/:path*',
    '/api/orders/:path*',
    '/api/coupons/:path*',
    '/api/seed/:path*',
    '/api/admin/:path*',
    '/api/settings/:path*'
  ]
}
