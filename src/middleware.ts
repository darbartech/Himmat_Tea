import { NextResponse, NextRequest } from 'next/server'

function decodeTokenBase64(token: string): { type?: string; id?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4)
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded)
    return parsed
  } catch {
    return null
  }
}

function verifyAdminToken(req: NextRequest): boolean {
  const token = req.cookies.get('himmat_sessionToken')?.value
  if (!token) return false
  const decoded = decodeTokenBase64(token)
  return decoded?.type === 'admin' && typeof decoded.id === 'number'
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

  if (pathname.startsWith('/api/admin-users') || pathname.startsWith('/api/customers')) {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (pathname.startsWith('/api/seed')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/himmat_admin_8526/dashboard/:path*',
    '/api/admin-users/:path*',
    '/api/customers/:path*',
    '/api/seed/:path*'
  ]
}
