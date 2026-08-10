import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    return 'himmat-tea-dev-secret-change-in-production'
  }
  return secret
}

interface AuthPayload {
  id: number
  email: string
  type: 'customer' | 'admin'
}

export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine(pw => /[a-z]/.test(pw), 'Must include a lowercase letter')
  .refine(pw => /[A-Z]/.test(pw), 'Must include an uppercase letter')
  .refine(pw => /\d/.test(pw), 'Must include a number')
  .refine(pw => /[^A-Za-z0-9]/.test(pw), 'Must include a special character')

export async function setAuthCookie(payload: AuthPayload): Promise<string> {
  const cookieStore = await cookies()
  const secret = getJwtSecret()
  const maxAgeSec = 60 * 60 * 24 * 4
  const token = jwt.sign(payload, secret, { expiresIn: maxAgeSec, algorithm: 'HS256' })

  cookieStore.set('himmat_sessionToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec
  })
  cookieStore.set('himmat_isLoggedIn', 'true', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec
  })

  return token
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('himmat_sessionToken')
  cookieStore.delete('himmat_isLoggedIn')
}

export function decodeToken(token: string): AuthPayload | null {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AuthPayload
    if (typeof decoded.id === 'number' && typeof decoded.email === 'string' && (decoded.type === 'customer' || decoded.type === 'admin')) {
      return decoded
    }
    return null
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<{ id: number; name?: string; email: string; username?: string; type: 'customer' | 'admin' } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('himmat_sessionToken')?.value

  if (!token) return null

  const payload = decodeToken(token)
  if (!payload) return null

  try {
    if (payload.type === 'customer') {
      const customer = await prisma.customer.findUnique({
        where: { id: payload.id }
      })
      if (!customer) return null
      return { id: customer.id, name: customer.name, email: customer.email, type: 'customer' }
    }

    if (payload.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: payload.id }
      })
      if (!admin) return null
      return { id: admin.id, username: admin.username, email: admin.email, type: 'admin' }
    }

    return null
  } catch {
    return null
  }
}

export async function getCurrentAdmin(): Promise<{ id: number; username: string; email: string; role: 'admin' | 'superadmin'; isActive: boolean } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('himmat_sessionToken')?.value

  if (!token) return null

  const payload = decodeToken(token)
  if (!payload || payload.type !== 'admin') return null

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.id }
    })
    if (!admin || !admin.isActive) return null
    return { id: admin.id, username: admin.username, email: admin.email, role: admin.role as 'admin' | 'superadmin', isActive: admin.isActive }
  } catch {
    return null
  }
}
