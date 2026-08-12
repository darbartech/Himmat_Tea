import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin, passwordSchema } from '@/lib/auth'
import { validateSignupEmail, normalizeEmail } from '@/lib/email-validation'
import { z } from 'zod'

const adminUserUpdateSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes and underscores'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'superadmin']),
  isActive: z.boolean()
})

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'superadmin') {
      return createErrorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: parseInt(id) },
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

    if (!adminUser) {
      return createErrorResponse('Admin user not found', 404)
    }

    return createResponse(adminUser)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'superadmin') {
      return createErrorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const body = await request.json()
    const { password, ...rest } = body

    const parsed = adminUserUpdateSchema.safeParse(rest)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const email = normalizeEmail(parsed.data.email)

    const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } })
    if (existing && existing.id !== parseInt(id)) {
      return createErrorResponse('This email is already registered to another admin user.', 400)
    }

    const emailCheck = await validateSignupEmail(email, 'admin')
    if (!emailCheck.ok) {
      return createErrorResponse(emailCheck.error || 'Invalid email address', 400)
    }

    let data: Record<string, unknown> = { ...parsed.data, email }

    if (password) {
      const pwResult = passwordSchema.safeParse(password)
      if (!pwResult.success) {
        return createErrorResponse(pwResult.error.issues[0].message, 400)
      }
      data.passwordHash = await bcrypt.hash(password, 12)
    }

    const adminUser = await prisma.adminUser.update({
      where: { id: parseInt(id) },
      data,
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

    return createResponse(adminUser)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'superadmin') {
      return createErrorResponse('Unauthorized', 401)
    }

    const { id } = await params

    await prisma.adminUser.delete({
      where: { id: parseInt(id) }
    })

    return createResponse({ message: 'Admin user deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
