import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin, passwordSchema } from '@/lib/auth'

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

    const pwResult = passwordSchema.safeParse(password)
    if (!pwResult.success) {
      return createErrorResponse(pwResult.error.issues[0].message, 400)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const adminUser = await prisma.adminUser.create({
      data: {
        ...rest,
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
