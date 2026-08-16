import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import { normalizeEmail } from '@/lib/email-validation'
import { USER_ERRORS } from '@/lib/error-messages'
import bcrypt from 'bcryptjs'

const CUSTOMER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  loyaltyPoints: true,
  tier: true,
  ordersCount: true,
  totalSpent: true,
  createdAt: true,
  updatedAt: true
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(USER_ERRORS.AUTH.TOO_MANY_ATTEMPTS, 429)
    }

    const body = await request.json()
    const { email, password } = body
    const normalizedEmail = normalizeEmail(typeof email === 'string' ? email : '')

    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail }
    })

    if (!customer) {
      return createErrorResponse(USER_ERRORS.AUTH.EMAIL_NOT_FOUND, 401)
    }

    if (!customer.emailVerified) {
      return createErrorResponse('Please verify your email address before logging in.', 403)
    }

    let passwordMatch = false
    try {
      passwordMatch = await bcrypt.compare(password, customer.passwordHash ?? '')
    } catch {
      return createErrorResponse(USER_ERRORS.AUTH.INVALID_CREDENTIALS, 401)
    }

    if (!passwordMatch) {
      return createErrorResponse(USER_ERRORS.AUTH.PASSWORD_MISMATCH, 401)
    }

    await setAuthCookie({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    }, {
      currentUserCookieValue: JSON.stringify({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        loyaltyPoints: customer.loyaltyPoints,
        tier: customer.tier,
        ordersCount: customer.ordersCount,
        totalSpent: customer.totalSpent,
        createdAt: customer.createdAt,
        type: 'customer'
      }),
      userTypeCookieValue: 'customer'
    })

    const user = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: CUSTOMER_USER_SELECT
    })

    return createResponse({
      user,
      success: true
    })
  } catch (error) {
    return handleApiError(error)
  }
}
