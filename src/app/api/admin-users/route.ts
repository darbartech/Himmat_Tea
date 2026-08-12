import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin, passwordSchema } from '@/lib/auth'
import { validateSignupEmail, normalizeEmail } from '@/lib/email-validation'
import { z } from 'zod'

const adminUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes and underscores'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'superadmin']).default('admin'),
  isActive: z.boolean().default(true)
})

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'superadmin') {
      return createErrorResponse('Unauthorized', 401)
    }

    const adminUsers = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { id: 'desc' }
    })
    return createResponse(adminUsers)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'superadmin') {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { password, ...rest } = body

    const parsed = adminUserSchema.safeParse(rest)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const email = normalizeEmail(parsed.data.email)

    const emailCheck = await validateSignupEmail(email, 'admin')
    if (!emailCheck.ok) {
      return createErrorResponse(emailCheck.error || 'Invalid email address', 400)
    }

    const pwResult = passwordSchema.safeParse(password)
    if (!pwResult.success) {
      return createErrorResponse(pwResult.error.issues[0].message, 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const adminUser = await prisma.adminUser.create({
      data: {
        ...parsed.data,
        email,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return createResponse(adminUser, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
