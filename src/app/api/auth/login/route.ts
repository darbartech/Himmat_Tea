import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
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

    if (!adminUser || !adminUser.isActive) {
      return createErrorResponse('Invalid credentials', 401)
    }

    let passwordMatch = false
    try {
      passwordMatch = await bcrypt.compare(password, adminUser.passwordHash ?? '')
    } catch {
      return createErrorResponse('Invalid credentials', 401)
    }

    if (!passwordMatch) {
      return createErrorResponse('Invalid credentials', 401)
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
