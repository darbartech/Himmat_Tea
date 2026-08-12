import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    const notifications = await prisma.notification.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    return createResponse({ success: true, data: notifications })
  } catch (error) {
    return handleApiError(error)
  }
}

interface MarkReadParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    const body = await request.json()
    const { id, all } = body

    if (all) {
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
      })
    } else if (id) {
      await prisma.notification.update({
        where: { id: Number(id) },
        data: { read: true },
      })
    }

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    let body: { id?: number } = {}
    try {
      body = await request.json()
    } catch (_e) {
      body = {}
    }

    if (body?.id) {
      await prisma.notification.delete({
        where: { id: Number(body.id) },
      })
    } else {
      await prisma.notification.deleteMany()
    }

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
