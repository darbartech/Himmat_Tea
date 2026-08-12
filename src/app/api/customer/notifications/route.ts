import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.type !== 'customer') {
      return createErrorResponse('Unauthorized', 401)
    }

    const customerOrders = await prisma.order.findMany({
      where: { customerId: user.id },
      select: { id: true },
    })
    const orderIds = customerOrders.map(o => o.id)

    const notifications = await prisma.notification.findMany({
      where: {
        orderId: { in: orderIds },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    return createResponse({ success: true, data: notifications })
  } catch (error) {
    return handleApiError(error)
  }
}
