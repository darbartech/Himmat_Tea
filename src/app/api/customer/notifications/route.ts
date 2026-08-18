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

// Note: intentionally no PATCH/DELETE here. The Notification.read flag is
// shared with the admin inbox (it's what powers the admin "unread" badge
// for orders awaiting attention). If a customer's view mutated that same
// flag, it would silently mark the notification "read" for admins too,
// even though they hadn't seen it — masking orders that still need
// action. Read/seen state for the customer bell is tracked client-side
// (localStorage) instead, so it never touches the shared record.
