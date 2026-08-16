import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import { USER_ERRORS } from '@/lib/error-messages'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(USER_ERRORS.AUTH.TOO_MANY_ATTEMPTS, 429)
    }

    const body = await request.json()
    const { username, password } = body

    const adminUser = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    })

    if (!adminUser) {
      return createErrorResponse(USER_ERRORS.AUTH.INVALID_CREDENTIALS, 401)
    }

    if (!adminUser.isActive) {
      return createErrorResponse(USER_ERRORS.AUTH.ACCOUNT_INACTIVE, 403)
    }

    let passwordMatch = false
    try {
      passwordMatch = await bcrypt.compare(password, adminUser.passwordHash ?? '')
    } catch {
      return createErrorResponse(USER_ERRORS.AUTH.INVALID_CREDENTIALS, 401)
    }

    if (!passwordMatch) {
      return createErrorResponse(USER_ERRORS.AUTH.PASSWORD_MISMATCH, 401)
    }

    const { passwordHash, ...userWithoutPassword } = adminUser

    await setAuthCookie({
      id: adminUser.id,
      email: adminUser.email,
      type: 'admin'
    }, {
      currentUserCookieValue: JSON.stringify({
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        createdAt: adminUser.createdAt,
        type: 'admin'
      }),
      userTypeCookieValue: 'admin'
    })

    return createResponse({
      user: userWithoutPassword,
      success: true
    })
  } catch (error) {
    return handleApiError(error)
  }
}
