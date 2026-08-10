import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin, passwordSchema } from '@/lib/auth'

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

    let data: any = { ...rest }

    if (password) {
      const pwResult = passwordSchema.safeParse(password)
      if (!pwResult.success) {
        return createErrorResponse(pwResult.error.issues[0].message, 400)
      }
      data.passwordHash = await bcrypt.hash(password, 10)
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
