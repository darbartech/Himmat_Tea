import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const noteCreateSchema = z.object({
  text: z.string().min(1, 'Note text is required').max(5000, 'Note is too long (max 5000 chars)'),
}).strict()

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    const body = await request.json()
    const parsed = noteCreateSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return createErrorResponse(
        `Invalid field: ${first.path.join('.')} - ${first.message}`,
        400
      )
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    const note = await prisma.internalNote.create({
      data: {
        orderId,
        text: parsed.data.text,
        adminId: String(adminUser.id),
        adminName: adminUser.username,
      },
    })

    return createResponse({ success: true, data: note })
  } catch (error) {
    return handleApiError(error)
  }
}
